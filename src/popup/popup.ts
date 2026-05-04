import "../popup/popup.css";
import { DEFAULT_SETTINGS, DEPTH_OPTIONS, STORAGE_KEYS } from "../shared/constants";
import type { CheckerSettings, RunState, RuntimeMessage } from "../shared/types";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const titleInput = document.querySelector<HTMLInputElement>("#title");
const standardSelect = document.querySelector<HTMLSelectElement>("#accessibilityStandard");
const ruleSetSelect = document.querySelector<HTMLSelectElement>("#ruleSet");
const depthSelect = document.querySelector<HTMLSelectElement>("#maxDepth");
const startButton = document.querySelector<HTMLButtonElement>("#start");
const stopButton = document.querySelector<HTMLButtonElement>("#stop");
const downloadButton = document.querySelector<HTMLButtonElement>("#download");
const downloadLogButton = document.querySelector<HTMLButtonElement>("#downloadLog");
const statusText = document.querySelector<HTMLElement>("#status");
const screenCountText = document.querySelector<HTMLElement>("#screenCount");
const logsList = document.querySelector<HTMLOListElement>("#logs");

void initialize();

async function initialize(): Promise<void> {
  if (!form || !titleInput || !standardSelect || !ruleSetSelect || !depthSelect) {
    throw new Error("Popup UI failed to initialize.");
  }

  const stored = await chrome.storage.local.get([STORAGE_KEYS.settings, STORAGE_KEYS.status]);
  const settings = { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] as Partial<CheckerSettings> | undefined) };
  applySettings(settings);
  renderState((stored[STORAGE_KEYS.status] as RunState | undefined) ?? { status: "idle", logs: [], screenCount: 0 }, false);

  form.addEventListener("change", () => void saveSettings(readSettings()));
  titleInput.addEventListener("input", () => void saveSettings(readSettings()));
  startButton?.addEventListener("click", () => void startRun());
  stopButton?.addEventListener("click", () => void sendRuntimeMessage({ type: "STOP_RUN" }));
  downloadButton?.addEventListener("click", () => void sendRuntimeMessage({ type: "DOWNLOAD_REPORT" }));
  downloadLogButton?.addEventListener("click", () => void sendRuntimeMessage({ type: "DOWNLOAD_DEBUG_LOG" }));

  setInterval(() => void refreshStatus(), 1000);
}

function applySettings(settings: CheckerSettings): void {
  titleInput!.value = settings.title;
  standardSelect!.value = settings.accessibilityStandard;
  ruleSetSelect!.value = settings.ruleSet;
  depthSelect!.value = String(DEPTH_OPTIONS.includes(settings.maxDepth as (typeof DEPTH_OPTIONS)[number]) ? settings.maxDepth : 5);
}

function readSettings(): CheckerSettings {
  return {
    title: titleInput!.value.trim() || DEFAULT_SETTINGS.title,
    accessibilityStandard: standardSelect!.value,
    ruleSet: ruleSetSelect!.value,
    maxDepth: Number(depthSelect!.value)
  };
}

async function saveSettings(settings: CheckerSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

async function startRun(): Promise<void> {
  const settings = readSettings();
  await saveSettings(settings);
  const response = await sendRuntimeMessage({ type: "START_RUN", settings });
  if (!readOk(response)) {
    renderError(readError(response));
  }
}

async function refreshStatus(): Promise<void> {
  const response = await sendRuntimeMessage({ type: "GET_STATUS" });
  if (readOk(response)) {
    const payload = response as { state: RunState; hasResult: boolean };
    renderState(payload.state, payload.hasResult);
  }
}

async function sendRuntimeMessage(message: RuntimeMessage): Promise<unknown> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
    return { ok: false };
  }
}

function renderState(state: RunState, hasResult: boolean): void {
  if (statusText) {
    statusText.textContent = state.error ? `${state.status}: ${state.error}` : state.status;
  }
  if (screenCountText) {
    screenCountText.textContent = String(state.screenCount);
  }
  if (downloadButton) {
    downloadButton.disabled = !hasResult && state.status !== "completed";
  }
  if (startButton) {
    startButton.disabled = state.status === "running" || state.status === "stopping";
  }
  if (stopButton) {
    stopButton.disabled = state.status !== "running";
  }
  if (logsList) {
    logsList.replaceChildren(
      ...state.logs.slice(-30).map((entry) => {
        const item = document.createElement("li");
        item.className = `log-${entry.level}`;
        item.textContent = `${entry.timestamp.slice(11, 19)} ${entry.level.toUpperCase()} ${entry.message}`;
        return item;
      })
    );
  }
}

function renderError(message: string): void {
  renderState({ status: "failed", logs: [{ timestamp: new Date().toISOString(), level: "error", message }], screenCount: 0, error: message }, false);
}

function readOk(response: unknown): boolean {
  return Boolean(response && typeof response === "object" && "ok" in response && (response as { ok: unknown }).ok);
}

function readError(response: unknown): string {
  if (response && typeof response === "object" && "error" in response) {
    return String((response as { error: unknown }).error);
  }
  return "Request failed.";
}
