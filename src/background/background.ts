import JSZip from "jszip";
import { DEFAULT_SETTINGS, STORAGE_KEYS, THINQ_HOST } from "../shared/constants";
import { buildHtmlReport, buildJsonReport, buildMarkdownReport, makeFileBase } from "../shared/report";
import type { CheckerSettings, LogEntry, ReconSnapshot, RunResult, RunState, RuntimeMessage } from "../shared/types";

let state: RunState = {
  status: "idle",
  logs: [],
  screenCount: 0
};

let lastResult: RunResult | undefined;
let lastRecon: ReconSnapshot | undefined;
let debugLog: LogEntry[] = [];

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  if (!stored[STORAGE_KEYS.settings]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleMessage(message, sender)
    .then(sendResponse)
    .catch((error: unknown) => {
      const messageText = error instanceof Error ? error.message : String(error);
      appendLog("error", messageText);
      sendResponse({ ok: false, error: messageText });
    });
  return true;
});

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case "GET_STATUS":
      return { ok: true, state, hasResult: Boolean(lastResult) };
    case "START_RUN":
      return startRun(message.settings);
    case "STOP_RUN":
      return stopRun();
    case "DOWNLOAD_REPORT":
      return downloadReport();
    case "DOWNLOAD_DEBUG_LOG":
      return downloadDebugLog();
    case "CAPTURE_SCREENSHOT":
      return captureScreenshot(sender.tab?.windowId);
    case "RUN_LOG": {
      state = {
        ...state,
        currentDepth: typeof message.currentDepth === "number" ? message.currentDepth : state.currentDepth,
        maxDepth: typeof message.maxDepth === "number" ? message.maxDepth : state.maxDepth,
        screenCount: typeof message.screenCount === "number" ? message.screenCount : state.screenCount,
        currentScreenTitle: typeof message.currentScreenTitle === "string" ? message.currentScreenTitle : state.currentScreenTitle
      };
      appendLog(message.entry.level, message.entry.message, message.entry.data, message.entry.timestamp);
      notifyPopup();
      return { ok: true };
    }
    case "RUN_COMPLETE":
      lastResult = message.result;
      state = {
        ...state,
        status: "completed",
        screenCount: message.result.results.length,
        currentScreenTitle: ""
      };
      await chrome.storage.local.set({ [STORAGE_KEYS.result]: lastResult, [STORAGE_KEYS.status]: state });
      notifyPopup();
      return { ok: true };
    case "RUN_FAILED":
      state = {
        ...state,
        status: "failed",
        error: message.error
      };
      appendLog("error", message.error);
      await chrome.storage.local.set({ [STORAGE_KEYS.status]: state });
      notifyPopup();
      return { ok: true };
    case "RECON_SCAN":
      return startRecon();
    case "RECON_COMPLETE":
      lastRecon = message.snapshot;
      appendLog("info", "Recon scan complete.", message.snapshot.summary);
      await downloadRecon();
      return { ok: true };
    case "DOWNLOAD_RECON":
      return downloadRecon();
    default:
      return { ok: false, error: "Unknown message type" };
  }
}

async function startRun(settings: CheckerSettings): Promise<unknown> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found.");
  }
  const url = new URL(tab.url);
  if (url.hostname !== THINQ_HOST || url.protocol !== "https:") {
    throw new Error("Open https://my.lgthinq.com/ and enter a product page before starting.");
  }

  lastResult = undefined;
  debugLog = [];
  state = { status: "running", logs: [], screenCount: 0, currentDepth: 0, maxDepth: settings.maxDepth };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings, [STORAGE_KEYS.status]: state, [STORAGE_KEYS.debugLog]: debugLog });
  appendLog("info", "Run started.", { maxDepth: settings.maxDepth });

  await sendStartRunMessage(tab.id, settings);
  return { ok: true };
}

async function sendStartRunMessage(tabId: number, settings: CheckerSettings): Promise<void> {
  const message = { type: "START_RUN", settings } satisfies RuntimeMessage;
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return;
  } catch (error) {
    if (!isMissingReceivingEnd(error)) {
      throw error;
    }
  }

  appendLog("warn", "Content script was not attached; injecting and retrying START_RUN.");
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  await wait(250);
  await chrome.tabs.sendMessage(tabId, message);
}

async function stopRun(): Promise<unknown> {
  state = { ...state, status: "stopping" };
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "STOP_RUN" } satisfies RuntimeMessage).catch(() => undefined);
  }
  appendLog("warn", "Stop requested.");
  return { ok: true };
}

async function captureScreenshot(windowId?: number): Promise<unknown> {
  try {
    const screenshot =
      typeof windowId === "number"
        ? await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 45 })
        : await chrome.tabs.captureVisibleTab({ format: "jpeg", quality: 45 });
    appendLog("debug", "Screenshot captured.");
    return { ok: true, screenshot };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog("warn", "Screenshot capture failed.", { message });
    return { ok: false, error: message };
  }
}

async function downloadReport(): Promise<unknown> {
  if (!lastResult) {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.result);
    lastResult = stored[STORAGE_KEYS.result] as RunResult | undefined;
  }
  if (!lastResult) {
    throw new Error("No completed report is available.");
  }

  const base = makeFileBase(lastResult.metadata.title);
  
  // Clone to avoid mutating in-memory lastResult
  const reportResult = JSON.parse(JSON.stringify(lastResult)) as RunResult;

  // Package reports into a single ZIP file
  const zip = new JSZip();

  // Extract base64 screenshots to separate files in ZIP and replace with relative paths
  reportResult.results.forEach((screen, index) => {
    if (screen.screenshot) {
      const match = screen.screenshot.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1];
        const base64Data = match[2];
        const relativePath = `screenshots/screenshot_${index + 1}.${ext}`;
        zip.file(relativePath, base64Data, { base64: true });
        screen.screenshot = relativePath;
      }
    }
  });

  zip.file(`${base}.json`, buildJsonReport(reportResult));
  zip.file(`${base}.md`, buildMarkdownReport(reportResult));
  zip.file(`${base}.html`, buildHtmlReport(reportResult));
  
  // Generate base64 ZIP content for compatibility with MV3 Service Worker
  const base64Data = await zip.generateAsync({ type: "base64" });
  const dataUrl = `data:application/zip;base64,${base64Data}`;

  await chrome.downloads.download({
    url: dataUrl,
    filename: `${base}.zip`,
    saveAs: false
  });

  appendLog("info", "Report ZIP download started.", { filename: `${base}.zip` });
  return { ok: true };
}

async function downloadDebugLog(): Promise<unknown> {
  if (debugLog.length === 0) {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.debugLog);
    debugLog = (stored[STORAGE_KEYS.debugLog] as LogEntry[] | undefined) ?? [];
  }

  const storedSettings = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const settings = { ...DEFAULT_SETTINGS, ...(storedSettings[STORAGE_KEYS.settings] as Partial<CheckerSettings> | undefined) };
  const base = makeFileBase(`${settings.title || "ThinQ Web"}-debug-log`);
  await chrome.downloads.download({
    url: toDataUrl(JSON.stringify({ exportedAt: new Date().toISOString(), logs: debugLog }, null, 2), "application/json"),
    filename: `${base}.json`,
    saveAs: false
  });
  appendLog("info", "Debug log download started.", { count: debugLog.length });
  return { ok: true };
}

async function startRecon(): Promise<unknown> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found.");
  }
  const url = new URL(tab.url);
  if (url.hostname !== THINQ_HOST || url.protocol !== "https:") {
    throw new Error("Open https://my.lgthinq.com/ and enter a product page before running Recon.");
  }
  appendLog("info", "Starting Recon scan...");

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "RECON_SCAN" } satisfies RuntimeMessage);
  } catch (error) {
    if (!isMissingReceivingEnd(error)) throw error;
    appendLog("warn", "Content script not attached for Recon; injecting and retrying.");
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await wait(250);
    await chrome.tabs.sendMessage(tab.id, { type: "RECON_SCAN" } satisfies RuntimeMessage);
  }

  return { ok: true };
}

async function downloadRecon(): Promise<unknown> {
  if (!lastRecon) {
    throw new Error("No recon snapshot available. Run Recon first.");
  }

  const storedSettings = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const settings = { ...DEFAULT_SETTINGS, ...(storedSettings[STORAGE_KEYS.settings] as Partial<CheckerSettings> | undefined) };
  const base = makeFileBase(`${settings.title || "ThinQ"}-recon`);
  const content = JSON.stringify(lastRecon, null, 2);
  await chrome.downloads.download({
    url: toDataUrl(content, "application/json"),
    filename: `${base}.json`,
    saveAs: false
  });
  appendLog("info", "Recon snapshot download started.", { elements: lastRecon.elements.length, candidates: lastRecon.summary.candidates });
  return { ok: true };
}

function appendLog(level: LogEntry["level"], message: string, data?: unknown, timestamp = new Date().toISOString()): void {
  const entry: LogEntry = { timestamp, level, message, data: makeCloneSafe(data) };
  debugLog = [...debugLog, entry].slice(-2000);
  state = {
    ...state,
    logs: [...state.logs, entry].slice(-200)
  };
  void chrome.storage.local.set({ [STORAGE_KEYS.status]: state, [STORAGE_KEYS.debugLog]: debugLog });
  notifyPopup();
}

function notifyPopup(): void {
  chrome.runtime.sendMessage({
    type: "STATUS_UPDATED",
    state,
    hasResult: Boolean(lastResult)
  }).catch(() => {
    // Ignore error when popup is closed
  });
}

function isMissingReceivingEnd(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Receiving end does not exist|Could not establish connection/i.test(message);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDataUrl(content: string, mime: string): string {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  return `data:${mime};charset=utf-8;base64,${encoded}`;
}

function makeCloneSafe(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}
