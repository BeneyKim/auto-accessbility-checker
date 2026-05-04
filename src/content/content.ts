const IBM_CHECK_REQUEST = "THINQ_A11Y_CHECK_REQUEST";
const IBM_CHECK_RESPONSE = "THINQ_A11Y_CHECK_RESPONSE";
const IBM_RUNNER_READY = "THINQ_A11Y_IBM_RUNNER_READY";
const LOG_PREFIX = "[ThinQ-A11y]";
const MESSAGE_SOURCE = "THINQ_A11Y_EXTENSION";
const THINQ_HOST = "my.lgthinq.com";

import type { Branch, CheckerSettings, LogEntry, RunResult, RuntimeMessage, ScreenResult } from "../shared/types";
import {
  branchLabel,
  collectClickCandidates,
  collectSkippedCandidates,
  diagnoseRequiredControls,
  extractScreenTitle,
  findBackButton,
  findRequiredControls,
  screenSignature
} from "./dom";

let stopRequested = false;
let activeRun: Promise<void> | undefined;

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "START_RUN") {
    if (activeRun) {
      sendResponse({ ok: false, error: "A run is already active." });
      return true;
    }
    stopRequested = false;
    activeRun = runTraversal(message.settings).finally(() => {
      activeRun = undefined;
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "STOP_RUN") {
    stopRequested = true;
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

async function runTraversal(settings: CheckerSettings): Promise<void> {
  const startedAt = new Date().toISOString();
  const results: ScreenResult[] = [];
  const logs: LogEntry[] = [];

  const log = (level: LogEntry["level"], message: string, data?: unknown): void => {
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    logs.push(entry);
    console[level === "debug" ? "debug" : level](`${LOG_PREFIX} ${message}`, data ?? "");
    void chrome.runtime.sendMessage({ type: "RUN_LOG", entry } satisfies RuntimeMessage);
  };

  try {
    validateLocation();
    await ensureIbmRunner(log);

    const controls = findRequiredControls();
    if (!controls) {
      const diagnostic = diagnoseRequiredControls();
      log("error", "Required ThinQ product controls were not detected.", diagnostic);
      const message = "제품 탭, 유용한 기능 탭, 설정 아이콘을 모두 찾을 수 없어 탐색을 시작하지 않습니다.";
      alert(message);
      throw new Error(message);
    }

    log("info", "Required ThinQ product controls detected.");
    const visited = new Set<string>();
    const branches: Array<{ branch: Branch; entry: HTMLElement }> = [
      { branch: "product", entry: controls.productTab },
      { branch: "usefulFeatures", entry: controls.usefulFeaturesTab },
      { branch: "settings", entry: controls.settingsButton }
    ];

    for (const item of branches) {
      if (stopRequested) {
        break;
      }
      log("info", `Entering branch: ${branchLabel(item.branch)}`);
      await clickAndWait(item.entry);
      await waitForIdle();
      const refreshed = findRequiredControls();
      const shell = refreshed?.shell ?? controls.shell;
      await scanDepth({
        settings,
        shell,
        branch: item.branch,
        menuPath: [branchLabel(item.branch)],
        depth: 0,
        visited,
        results,
        log
      });
    }

    const finalControls = findRequiredControls();
    if (finalControls) {
      await clickAndWait(finalControls.productTab);
      log("info", "Returned to product tab.");
    }

    const result: RunResult = {
      metadata: {
        title: settings.title || "ThinQ Web",
        startedAt,
        completedAt: new Date().toISOString(),
        url: location.href,
        userAgent: navigator.userAgent,
        settings
      },
      results,
      logs
    };

    await chrome.runtime.sendMessage({ type: "RUN_COMPLETE", result } satisfies RuntimeMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", message);
    await chrome.runtime.sendMessage({ type: "RUN_FAILED", error: message } satisfies RuntimeMessage);
  }
}

interface ScanContext {
  settings: CheckerSettings;
  shell: HTMLElement;
  branch: Branch;
  menuPath: string[];
  depth: number;
  visited: Set<string>;
  results: ScreenResult[];
  log: (level: LogEntry["level"], message: string, data?: unknown) => void;
}

async function scanDepth(context: ScanContext): Promise<void> {
  if (stopRequested) {
    context.log("warn", "Traversal stopped by user.");
    return;
  }

  const controls = findRequiredControls();
  const shell = controls?.shell ?? context.shell;
  const signature = screenSignature(shell);
  const visitKey = `${context.branch}:${context.menuPath.join(">")}:${signature}`;
  if (context.visited.has(visitKey)) {
    context.log("debug", "Skipping already visited screen.", { visitKey });
    return;
  }
  context.visited.add(visitKey);

  const skipped = collectSkippedCandidates(shell);
  const candidates = collectClickCandidates(shell);
  const title = extractScreenTitle(shell, context.menuPath.at(-1) ?? branchLabel(context.branch));
  context.log(candidates.length === 0 ? "warn" : "info", "Click candidates collected before IBM check.", {
    count: candidates.length,
    candidates: candidates.map((candidate) => candidate.snapshot),
    shell: describeShell(shell),
    shellTextSample: candidates.length === 0 ? shell.innerText?.replace(/\s+/g, " ").trim().slice(0, 700) : undefined
  });

  const ibmReport = await runIbmCheckSafely(context.settings.accessibilityStandard, context.settings.ruleSet, shell, context.log);
  const screenshot = await requestScreenshot(context.log);

  context.results.push({
    depth: context.depth,
    menuPath: context.menuPath,
    branch: context.branch,
    title,
    url: location.href,
    timestamp: new Date().toISOString(),
    screenshot,
    ibmReport,
    summary: extractSummary(ibmReport),
    navigation: {
      screenSignature: signature,
      skipped
    }
  });
  context.log("info", "Screen scanned.", { title, depth: context.depth, branch: context.branch });

  if (context.depth >= context.settings.maxDepth) {
    context.log("debug", "Depth limit reached.", { depth: context.depth });
    return;
  }

  for (const candidate of candidates) {
    if (stopRequested) {
      return;
    }

    const beforeSignature = screenSignature(shell);
    const triggerName = candidate.snapshot.name || candidate.snapshot.role;
    context.log("info", "Trying candidate.", { triggerName, depth: context.depth });

    await clickAndWait(candidate.element);
    const changed = await waitForSignatureChange(beforeSignature);
    if (!changed) {
      context.log("debug", "Candidate did not change screen.", { triggerName });
      continue;
    }

    const nextControls = findRequiredControls();
    const nextShell = nextControls?.shell ?? shell;
    const nextPath = [...context.menuPath, triggerName];
    await scanDepth({
      ...context,
      shell: nextShell,
      menuPath: nextPath,
      depth: context.depth + 1
    });

    const restored = await restorePreviousScreen(beforeSignature, nextShell, context.log);
    if (!restored) {
      context.log("warn", "Could not restore previous screen. Re-entering branch.", { triggerName });
      await reenterBranch(context.branch);
    }
  }
}

function describeShell(shell: HTMLElement): Record<string, unknown> {
  const rect = shell.getBoundingClientRect();
  return {
    tagName: shell.tagName.toLowerCase(),
    id: shell.id || undefined,
    role: shell.getAttribute("role") || undefined,
    dataName: shell.getAttribute("data-name") || undefined,
    className: String(shell.className || "").slice(0, 160),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    left: Math.round(rect.left)
  };
}

function validateLocation(): void {
  if (location.hostname !== THINQ_HOST || location.protocol !== "https:") {
    throw new Error("Open https://my.lgthinq.com/ before starting.");
  }
}

async function ensureIbmRunner(log: (level: LogEntry["level"], message: string, data?: unknown) => void): Promise<void> {
  if ((window as Window & { __THINQ_A11Y_IBM_READY__?: boolean }).__THINQ_A11Y_IBM_READY__) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("IBM runner did not load.")), 10000);
    const onReady = (event: MessageEvent) => {
      if (event.source === window && event.data?.type === IBM_RUNNER_READY) {
        window.clearTimeout(timeout);
        window.removeEventListener("message", onReady);
        (window as Window & { __THINQ_A11Y_IBM_READY__?: boolean }).__THINQ_A11Y_IBM_READY__ = true;
        resolve();
      }
    };
    window.addEventListener("message", onReady);

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("ibmRunner.js");
    script.dataset.aceUrl = chrome.runtime.getURL("vendor/ace.js");
    script.onload = () => log("debug", "IBM runner script injected.");
    script.onerror = () => reject(new Error("Failed to inject IBM runner script."));
    (document.head || document.documentElement).appendChild(script);
  });
}

async function runIbmCheck(policy: string, ruleSet: string, target: HTMLElement): Promise<unknown> {
  const requestId = crypto.randomUUID();
  const targetId = `thinq-a11y-target-${requestId}`;
  target.setAttribute("data-thinq-a11y-target", targetId);
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeAttribute("data-thinq-a11y-target");
    };
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      cleanup();
      reject(new Error("IBM accessibility check timed out."));
    }, 60000);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.type !== IBM_CHECK_RESPONSE || event.data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      cleanup();
      if (event.data.ok) {
        resolve(event.data.report);
      } else {
        reject(new Error(event.data.error ?? "IBM accessibility check failed."));
      }
    };

    window.addEventListener("message", onMessage);
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: IBM_CHECK_REQUEST,
        requestId,
        policy,
        ruleSet,
        targetSelector: `[data-thinq-a11y-target="${targetId}"]`
      },
      "*"
    );
  });
}

async function runIbmCheckSafely(
  policy: string,
  ruleSet: string,
  target: HTMLElement,
  log: (level: LogEntry["level"], message: string, data?: unknown) => void
): Promise<unknown> {
  try {
    return await runIbmCheck(policy, ruleSet, target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "IBM accessibility check failed for this screen.", { message });
    return {
      report: {
        summary: {
          counts: {
            violation: 0,
            potentialviolation: 0,
            recommendation: 0,
            potentialrecommendation: 0,
            manual: 0,
            pass: 0,
            ignored: 0
          }
        },
        results: [],
        error: {
          message,
          policy,
          ruleSet
        }
      }
    };
  }
}

async function requestScreenshot(log: (level: LogEntry["level"], message: string, data?: unknown) => void): Promise<string | undefined> {
  const response = await chrome.runtime.sendMessage({ type: "CAPTURE_SCREENSHOT" } satisfies RuntimeMessage);
  if (response?.ok && response.screenshot) {
    return response.screenshot as string;
  }
  log("warn", "Screenshot not available.", response);
  return undefined;
}

async function clickAndWait(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ block: "center", inline: "center" });
  await wait(120);
  element.click();
  await waitForIdle();
}

async function waitForSignatureChange(previous: string, timeoutMs = 3500): Promise<boolean> {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    await wait(150);
    const controls = findRequiredControls();
    const shell = controls?.shell ?? document.body;
    if (screenSignature(shell) !== previous) {
      return true;
    }
  }
  return false;
}

async function restorePreviousScreen(previousSignature: string, shell: HTMLElement, log: ScanContext["log"]): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentControls = findRequiredControls();
    const currentShell = currentControls?.shell ?? shell;
    if (screenSignature(currentShell) === previousSignature) {
      return true;
    }

    const backButton = findBackButton(currentShell);
    if (backButton) {
      log("debug", "Restoring with back button.");
      await clickAndWait(backButton);
    } else {
      log("debug", "Restoring with Escape key.");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
      await waitForIdle();
    }
  }

  const controls = findRequiredControls();
  const currentShell = controls?.shell ?? shell;
  return screenSignature(currentShell) === previousSignature;
}

async function reenterBranch(branch: Branch): Promise<void> {
  const controls = findRequiredControls();
  if (!controls) {
    return;
  }
  if (branch === "product") {
    await clickAndWait(controls.productTab);
  } else if (branch === "usefulFeatures") {
    await clickAndWait(controls.usefulFeaturesTab);
  } else {
    await clickAndWait(controls.settingsButton);
  }
}

async function waitForIdle(): Promise<void> {
  await wait(350);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function extractSummary(ibmReport: unknown): ScreenResult["summary"] {
  const report = readObject(readObject(ibmReport).report);
  const summary = readObject(report.summary);
  const counts = readObject(summary.counts);
  return {
    violation: toNumber(counts.violation),
    potentialviolation: toNumber(counts.potentialviolation),
    recommendation: toNumber(counts.recommendation),
    potentialrecommendation: toNumber(counts.potentialrecommendation),
    manual: toNumber(counts.manual),
    pass: toNumber(counts.pass),
    ignored: toNumber(counts.ignored)
  };
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
