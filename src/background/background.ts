import { DEFAULT_SETTINGS, STORAGE_KEYS, THINQ_HOST } from "../shared/constants";
import { buildHtmlReport, buildJsonReport, buildMarkdownReport, makeFileBase } from "../shared/report";
import type { CheckerSettings, LogEntry, RunResult, RunState, RuntimeMessage } from "../shared/types";

let state: RunState = {
  status: "idle",
  logs: [],
  screenCount: 0
};

let lastResult: RunResult | undefined;

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
    case "CAPTURE_SCREENSHOT":
      return captureScreenshot(sender.tab?.windowId);
    case "RUN_LOG":
      appendLog(message.entry.level, message.entry.message, message.entry.data, message.entry.timestamp);
      return { ok: true };
    case "RUN_COMPLETE":
      lastResult = message.result;
      state = {
        ...state,
        status: "completed",
        screenCount: message.result.results.length
      };
      await chrome.storage.local.set({ [STORAGE_KEYS.result]: lastResult, [STORAGE_KEYS.status]: state });
      return { ok: true };
    case "RUN_FAILED":
      state = {
        ...state,
        status: "failed",
        error: message.error
      };
      appendLog("error", message.error);
      await chrome.storage.local.set({ [STORAGE_KEYS.status]: state });
      return { ok: true };
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
  state = { status: "running", logs: [], screenCount: 0 };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings, [STORAGE_KEYS.status]: state });
  appendLog("info", "Run started.", { maxDepth: settings.maxDepth });

  await chrome.tabs.sendMessage(tab.id, { type: "START_RUN", settings } satisfies RuntimeMessage);
  return { ok: true };
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
        ? await chrome.tabs.captureVisibleTab(windowId, { format: "png" })
        : await chrome.tabs.captureVisibleTab({ format: "png" });
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
  const files = [
    { filename: `${base}.json`, content: buildJsonReport(lastResult), mime: "application/json" },
    { filename: `${base}.md`, content: buildMarkdownReport(lastResult), mime: "text/markdown" },
    { filename: `${base}.html`, content: buildHtmlReport(lastResult), mime: "text/html" }
  ];

  for (const file of files) {
    await chrome.downloads.download({
      url: toDataUrl(file.content, file.mime),
      filename: file.filename,
      saveAs: false
    });
  }
  appendLog("info", "Report downloads started.", { files: files.map((file) => file.filename) });
  return { ok: true };
}

function appendLog(level: LogEntry["level"], message: string, data?: unknown, timestamp = new Date().toISOString()): void {
  const entry: LogEntry = { timestamp, level, message, data };
  state = {
    ...state,
    logs: [...state.logs, entry].slice(-200)
  };
  void chrome.storage.local.set({ [STORAGE_KEYS.status]: state });
}

function toDataUrl(content: string, mime: string): string {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  return `data:${mime};charset=utf-8;base64,${encoded}`;
}
