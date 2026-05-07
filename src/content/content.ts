const IBM_CHECK_REQUEST = "THINQ_A11Y_CHECK_REQUEST";
const IBM_CHECK_RESPONSE = "THINQ_A11Y_CHECK_RESPONSE";
const IBM_RUNNER_READY = "THINQ_A11Y_IBM_RUNNER_READY";
const LOG_PREFIX = "[ThinQ-A11y]";
const MESSAGE_SOURCE = "THINQ_A11Y_EXTENSION";
const THINQ_HOST = "my.lgthinq.com";
const TRANSITION_TIMEOUT_MS = 6000;
const TRANSITION_STABLE_MS = 700;
const UNSAFE_TRANSITION_STABLE_MS = 1200;
const TRANSITION_POLL_MS = 150;
const OVERLAY_SELECTOR =
  '[role="dialog"], [aria-modal="true"], [data-modal="true"], [bottomsheet="1"], #portal_container, [class*="Bottom"], [class*="bottom"], [class*="Sheet"], [class*="sheet"], [class*="Popup"], [class*="popup"], [class*="Modal"], [class*="modal"]';

import type { Branch, CandidateSnapshot, CheckerSettings, LogEntry, RunResult, RuntimeMessage, ScreenResult } from "../shared/types";
import {
  branchLabel,
  collectClickCandidates,
  collectSkippedCandidates,
  diagnoseRequiredControls,
  extractScreenTitle,
  findBackButton,
  getAccessibleName,
  getBranchControls,
  getProductBoundary,
  findProductShell,
  findRequiredControls,
  isDatePickerTriggerName,
  isVisible,
  screenSignature
} from "./dom";
import { isSameDepthVariantName, shouldTraverseFrameCandidates } from "./traversal";

let stopRequested = false;
let activeRun: Promise<void> | undefined;

async function sendRuntimeMessageSafely(message: RuntimeMessage): Promise<unknown> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} Runtime message delivery failed.`, { type: message.type, message: errorMessage });
    return { ok: false, error: errorMessage };
  }
}

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
    void sendRuntimeMessageSafely({ type: "RUN_LOG", entry } satisfies RuntimeMessage);
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
    const traversal: TraversalContext = {
      settings,
      visited: new Set<string>(),
      attemptedCandidates: new Set<string>(),
      navigationStack: [],
      results,
      log,
      state: "ROOT_BRANCH",
      aborted: false
    };
    const branches: Branch[] = ["product", "usefulFeatures", "settings"];

    for (const branch of branches) {
      if (stopRequested || traversal.aborted) {
        break;
      }
      log("info", `Entering branch: ${branchLabel(branch)}`);
      const branchCompleted = await traverseBranch(traversal, branch);
      log(branchCompleted ? "info" : "error", "Branch traversal finished.", { branch, completed: branchCompleted, aborted: traversal.aborted });
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

    await sendRuntimeMessageSafely({ type: "RUN_COMPLETE", result } satisfies RuntimeMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", message);
    await sendRuntimeMessageSafely({ type: "RUN_FAILED", error: message } satisfies RuntimeMessage);
  }
}

type TraversalState = "ROOT_BRANCH" | "CLICK_PENDING" | "CHILD_OPEN" | "RESTORE_PENDING" | "BRANCH_RECOVERY" | "ABORTED";
type TransitionClassification =
  | "no-change"
  | "state-change"
  | "overlay-opened"
  | "in-product-child"
  | "branch-changed"
  | "out-of-scope"
  | "home-navigation"
  | "unknown";

interface TraversalContext {
  settings: CheckerSettings;
  visited: Set<string>;
  attemptedCandidates: Set<string>;
  navigationStack: NavigationFrame[];
  results: ScreenResult[];
  log: (level: LogEntry["level"], message: string, data?: unknown) => void;
  state: TraversalState;
  aborted: boolean;
}

interface NavigationFrame {
  branch: Branch;
  depth: number;
  menuPath: string[];
  rootSignature: string;
  shellSelector: string;
  candidateSnapshot?: CandidateSnapshot;
  transitionClassification?: TransitionClassification;
  terminalOverlay?: boolean;
}

interface ScreenSnapshot {
  url: string;
  title: string;
  selectedBranch?: Branch;
  hasRequiredControls: boolean;
  boundaryPresent: boolean;
  isHomeLike: boolean;
  isOutOfScopeLike: boolean;
  overlayDescriptors: string[];
  candidateNames: string[];
  signature: string;
  shell?: HTMLElement;
  boundary?: HTMLElement;
}

interface ClassifiedTransition {
  classification: TransitionClassification;
  reason: string;
  before: ScreenSnapshot;
  after: ScreenSnapshot;
}

interface RestoreResult {
  restored: boolean;
  method: "already-restored" | "overlay-close" | "back-button" | "escape" | "branch-entry" | "failed";
  reason?: string;
}

async function traverseBranch(context: TraversalContext, branch: Branch): Promise<boolean> {
  if (!(await ensureProductRoot(context, branch))) {
    return false;
  }

  const entered = await activateBranch(context, branch);
  if (!entered) {
    context.aborted = true;
    context.state = "ABORTED";
    return false;
  }

  const snapshot = getCurrentScreenSnapshot();
  if (!snapshot.shell || !snapshot.boundaryPresent || snapshot.isHomeLike || snapshot.isOutOfScopeLike) {
    context.log("error", "Branch root snapshot is not a safe product screen.", summarizeSnapshot(snapshot));
    context.aborted = true;
    context.state = "ABORTED";
    await recordFailureResult(context, branch, [branchLabel(branch)], snapshot, "branch-root-out-of-scope");
    return false;
  }

  const frame: NavigationFrame = {
    branch,
    depth: 0,
    menuPath: [branchLabel(branch)],
    rootSignature: snapshot.signature,
    shellSelector: describeStableShell(snapshot.shell)
  };

  context.navigationStack = [frame];
  await traverseFrame(context, frame);
  if (context.aborted) {
    return false;
  }

  const restored = await ensureProductRoot(context, branch);
  return restored && !context.aborted;
}

async function ensureProductRoot(context: TraversalContext, branch: Branch): Promise<boolean> {
  context.state = "BRANCH_RECOVERY";
  let snapshot = getCurrentScreenSnapshot();
  context.log("info", "Ensuring product root before branch.", { branch, snapshot: summarizeSnapshot(snapshot) });

  if (snapshot.boundaryPresent && !snapshot.isHomeLike && !snapshot.isOutOfScopeLike) {
    return true;
  }

  const recoveryFrame = context.navigationStack.at(-1);
  if (recoveryFrame) {
    const restored = await restoreToFrame(context, recoveryFrame);
    snapshot = getCurrentScreenSnapshot();
    context.log(restored.restored ? "info" : "error", "Product root recovery result.", {
      branch,
      restore: restored,
      snapshot: summarizeSnapshot(snapshot)
    });
    return restored.restored && snapshot.boundaryPresent && !snapshot.isHomeLike && !snapshot.isOutOfScopeLike;
  }

  context.log("error", "Product root is not available and no recovery frame exists.", summarizeSnapshot(snapshot));
  return false;
}

async function activateBranch(context: TraversalContext, branch: Branch): Promise<boolean> {
  context.state = "ROOT_BRANCH";
  const before = getCurrentScreenSnapshot();
  const controls = getBranchControls();
  if (!controls) {
    context.log("error", "Branch controls missing before branch activation.", { branch, snapshot: summarizeSnapshot(before) });
    return false;
  }

  const target = branch === "product" ? controls.productTab : branch === "usefulFeatures" ? controls.usefulFeaturesTab : controls.settingsButton;
  context.log("info", "Clicking branch entry.", { branch, target: describeElement(target) });
  await clickAndWait(target);

  const accepted = await waitForBranchActivation(branch, before);
  context.log(accepted ? "info" : "error", "Branch activation result.", { branch, accepted, snapshot: summarizeSnapshot(getCurrentScreenSnapshot()) });
  return accepted;
}

async function waitForBranchActivation(branch: Branch, before: ScreenSnapshot, timeoutMs = 3500): Promise<boolean> {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    await wait(150);
    const snapshot = getCurrentScreenSnapshot();
    if (snapshot.isHomeLike || snapshot.isOutOfScopeLike || !snapshot.boundaryPresent) {
      return false;
    }
    if (branch !== "settings" && snapshot.selectedBranch === branch) {
      return true;
    }
    if (branch === "settings" && snapshot.signature !== before.signature && Boolean(findBackButton(snapshot.shell ?? document.body))) {
      return true;
    }
    if (branch === "settings" && snapshot.title !== before.title && snapshot.candidateNames.length > 0) {
      return true;
    }
  }
  return false;
}

async function traverseFrame(context: TraversalContext, frame: NavigationFrame): Promise<void> {
  if (stopRequested || context.aborted) {
    return;
  }

  context.state = frame.depth === 0 ? "ROOT_BRANCH" : "CHILD_OPEN";
  let snapshot = getCurrentScreenSnapshot();
  if (!snapshot.shell || !snapshot.boundaryPresent || snapshot.isHomeLike || snapshot.isOutOfScopeLike) {
    context.log("error", "Unsafe frame snapshot; aborting traversal.", { frame, snapshot: summarizeSnapshot(snapshot) });
    context.aborted = true;
    context.state = "ABORTED";
    await recordFailureResult(context, frame.branch, frame.menuPath, snapshot, "unsafe-frame-snapshot");
    return;
  }

  const visitKey = `${frame.branch}:${frame.menuPath.join(">")}:${snapshot.signature}`;
  if (context.visited.has(visitKey)) {
    context.log("debug", "Skipping already visited frame.", { visitKey, frame });
    return;
  }
  context.visited.add(visitKey);

  await recordScreenResult(context, frame, snapshot);
  if (!shouldTraverseFrameCandidates(frame)) {
    context.log("info", "overlay frame scanned; skipping inner candidate traversal.", {
      frame,
      snapshot: summarizeSnapshot(snapshot)
    });
    return;
  }

  if (frame.depth >= context.settings.maxDepth) {
    context.log("debug", "Depth limit reached.", { depth: frame.depth, menuPath: frame.menuPath });
    return;
  }

  while (!stopRequested && !context.aborted) {
    snapshot = getCurrentScreenSnapshot();
    if (!snapshot.shell || snapshot.isHomeLike || snapshot.isOutOfScopeLike || !snapshot.boundaryPresent) {
      context.log("error", "Frame became unsafe before collecting next candidate.", { frame, snapshot: summarizeSnapshot(snapshot) });
      context.aborted = true;
      context.state = "ABORTED";
      await recordFailureResult(context, frame.branch, frame.menuPath, snapshot, "frame-became-unsafe");
      return;
    }

    const candidates = collectClickCandidates(snapshot.shell);
    context.log(candidates.length === 0 ? "warn" : "info", "candidate collected.", {
      frame,
      count: candidates.length,
      candidates: candidates.map((candidate) => candidate.snapshot),
      snapshot: summarizeSnapshot(snapshot)
    });

    const candidate = candidates.find((item) => {
      const key = candidateAttemptKey(frame, item.snapshot);
      const triggerName = item.snapshot.name || item.snapshot.role;
      return !context.attemptedCandidates.has(key) && !frame.menuPath.includes(triggerName);
    });

    if (!candidate) {
      return;
    }

    const key = candidateAttemptKey(frame, candidate.snapshot);
    context.attemptedCandidates.add(key);
    await clickCandidateAndHandleTransition(context, frame, candidate.snapshot);
  }
}

async function clickCandidateAndHandleTransition(context: TraversalContext, frame: NavigationFrame, candidateSnapshot: CandidateSnapshot): Promise<void> {
  const before = getCurrentScreenSnapshot();
  if (!before.shell) {
    context.log("error", "Cannot click candidate without a safe shell.", { frame, candidateSnapshot });
    return;
  }
  const restoreFrame: NavigationFrame = {
    ...frame,
    rootSignature: before.signature,
    shellSelector: describeStableShell(before.shell)
  };

  const candidate = collectClickCandidates(before.shell).find((item) => candidateAttemptKey(frame, item.snapshot) === candidateAttemptKey(frame, candidateSnapshot));
  if (!candidate) {
    context.log("warn", "candidate skipped.", { reason: "fresh-candidate-not-found", frame, candidateSnapshot });
    return;
  }

  const triggerName = candidate.snapshot.name || candidate.snapshot.role;
  context.state = "CLICK_PENDING";
  context.log("info", "candidate click started.", { frame, candidate: candidate.snapshot, snapshot: summarizeSnapshot(before) });
  await clickAndWait(candidate.element);

  let transition = await waitAndClassifyTransition(before, candidate.snapshot);
  if (transition.classification === "no-change") {
    context.log("warn", "candidate primary click produced no change; retrying keyboard activation.", {
      triggerName,
      candidate: candidate.snapshot
    });
    await activateWithKeyboard(candidate.element);
    transition = await waitAndClassifyTransition(before, candidate.snapshot);
  }
  context.log("info", "transition classified.", {
    triggerName,
    classification: transition.classification,
    reason: transition.reason,
    before: summarizeSnapshot(transition.before),
    after: summarizeSnapshot(transition.after)
  });

  if (isSameDepthVariantName(triggerName) && (transition.classification === "state-change" || transition.classification === "in-product-child")) {
    await recordSameDepthVariantResult(context, frame, candidate.snapshot, transition);
    return;
  }

  if (transition.classification === "no-change" || transition.classification === "state-change") {
    context.log("debug", "candidate skipped.", { triggerName, classification: transition.classification, reason: transition.reason });
    return;
  }

  if (transition.classification === "home-navigation" || transition.classification === "out-of-scope" || transition.classification === "unknown") {
    context.log("error", "Unsafe transition detected; aborting without auto-recovery click.", {
      triggerName,
      classification: transition.classification
    });
    context.aborted = true;
    context.state = "ABORTED";
    await recordFailureResult(context, frame.branch, [...frame.menuPath, triggerName], transition.after, transition.classification);
    return;
  }

  if (transition.classification === "branch-changed") {
    const restored = await restoreToFrame(context, frame);
    context.log(restored.restored ? "warn" : "error", "Unexpected branch transition recovery result.", restored);
    if (!restored.restored) {
      context.aborted = true;
      context.state = "ABORTED";
    }
    return;
  }

  const childSnapshot = transition.after;
  if (!childSnapshot.shell) {
    context.log("error", "Accepted child transition without a shell; aborting.", { triggerName, transition });
    context.aborted = true;
    context.state = "ABORTED";
    return;
  }

  const childFrame: NavigationFrame = {
    branch: frame.branch,
    depth: frame.depth + 1,
    menuPath: [...frame.menuPath, triggerName],
    rootSignature: childSnapshot.signature,
    shellSelector: describeStableShell(childSnapshot.shell),
    candidateSnapshot: candidate.snapshot,
    transitionClassification: transition.classification,
    terminalOverlay: transition.classification === "overlay-opened"
  };

  context.navigationStack.push(childFrame);
  context.state = "CHILD_OPEN";
  context.log("info", "depth pushed.", {
    triggerName,
    fromDepth: frame.depth,
    toDepth: childFrame.depth,
    menuPath: childFrame.menuPath,
    classification: transition.classification
  });

  let restored: RestoreResult = { restored: false, method: "failed" };
  try {
    await traverseFrame(context, childFrame);
  } finally {
    context.state = "RESTORE_PENDING";
    context.log("info", "restore started.", { targetFrame: restoreFrame, childFrame });
    if (context.aborted) {
      restored = { restored: false, method: "failed", reason: "traversal-already-aborted" };
      context.log("warn", "restore skipped because traversal is already aborted.", { targetFrame: restoreFrame, childFrame });
    } else {
      restored = await restoreToFrame(context, restoreFrame);
    }
    context.navigationStack.pop();
    context.log(restored.restored ? "info" : "error", "depth popped.", {
      triggerName,
      fromDepth: childFrame.depth,
      toDepth: frame.depth,
      restored: restored.restored,
      method: restored.method,
      reason: restored.reason
    });
  }

  if (!restored.restored) {
    context.aborted = true;
    context.state = "ABORTED";
    await recordFailureResult(context, frame.branch, childFrame.menuPath, getCurrentScreenSnapshot(), "restore-failed");
  }
}

async function recordSameDepthVariantResult(
  context: TraversalContext,
  frame: NavigationFrame,
  candidateSnapshot: CandidateSnapshot,
  transition: ClassifiedTransition
): Promise<void> {
  const snapshot = getCurrentScreenSnapshot();
  const triggerName = candidateSnapshot.name || candidateSnapshot.role;
  if (!snapshot.shell || snapshot.isHomeLike || snapshot.isOutOfScopeLike || !snapshot.boundaryPresent) {
    context.log("error", "Same-depth variant became unsafe; aborting traversal.", {
      triggerName,
      frame,
      snapshot: summarizeSnapshot(snapshot)
    });
    context.aborted = true;
    context.state = "ABORTED";
    await recordFailureResult(context, frame.branch, [...frame.menuPath, triggerName], snapshot, "same-depth-variant-unsafe");
    return;
  }

  const variantFrame: NavigationFrame = {
    ...frame,
    depth: frame.depth,
    menuPath: [...frame.menuPath, triggerName],
    rootSignature: snapshot.signature,
    shellSelector: describeStableShell(snapshot.shell),
    candidateSnapshot,
    transitionClassification: transition.classification,
    terminalOverlay: false
  };
  const visitKey = `${variantFrame.branch}:${variantFrame.menuPath.join(">")}:${snapshot.signature}`;
  context.log("info", "same-depth variant scanned.", {
    triggerName,
    depth: frame.depth,
    classification: transition.classification,
    reason: transition.reason,
    snapshot: summarizeSnapshot(snapshot)
  });
  if (context.visited.has(visitKey)) {
    context.log("debug", "Skipping already visited same-depth variant.", { visitKey, variantFrame });
    return;
  }

  context.visited.add(visitKey);
  await recordScreenResult(context, variantFrame, snapshot);
}

async function waitAndClassifyTransition(before: ScreenSnapshot, trigger: CandidateSnapshot, timeoutMs = TRANSITION_TIMEOUT_MS): Promise<ClassifiedTransition> {
  const started = performance.now();
  let latest = getCurrentScreenSnapshot();
  let latestClassification = classifyTransition(before, latest, trigger);
  let lastUnsafeTransition: ClassifiedTransition | undefined;
  let lastSafeTransition: ClassifiedTransition | undefined;
  let stableKey = transitionStableKey(latestClassification);
  let stableSince = performance.now();

  while (performance.now() - started < timeoutMs) {
    await wait(TRANSITION_POLL_MS);
    latest = getCurrentScreenSnapshot();
    latestClassification = classifyTransition(before, latest, trigger);
    const nextStableKey = transitionStableKey(latestClassification);
    if (nextStableKey !== stableKey) {
      stableKey = nextStableKey;
      stableSince = performance.now();
    }

    const stableFor = performance.now() - stableSince;
    if (latestClassification.classification === "out-of-scope" || latestClassification.classification === "unknown" || latestClassification.classification === "home-navigation") {
      lastUnsafeTransition = latestClassification;
      if (stableFor >= UNSAFE_TRANSITION_STABLE_MS) {
        return latestClassification;
      }
      continue;
    }
    if (latestClassification.classification !== "no-change") {
      lastSafeTransition = latestClassification;
    }
    if (latestClassification.classification !== "no-change") {
      if (stableFor >= TRANSITION_STABLE_MS) {
        return latestClassification;
      }
    }
  }

  return lastSafeTransition ?? lastUnsafeTransition ?? latestClassification;
}

function transitionStableKey(transition: ClassifiedTransition): string {
  return `${transition.classification}:${transition.after.url}:${transition.after.signature}:${transition.after.boundaryPresent}:${transition.after.overlayDescriptors.join("|")}`;
}

function classifyTransition(before: ScreenSnapshot, after: ScreenSnapshot, trigger: CandidateSnapshot): ClassifiedTransition {
  if (after.isHomeLike) {
    return { classification: "home-navigation", reason: "home-like-screen-detected", before, after };
  }
  if (after.isOutOfScopeLike) {
    return { classification: "out-of-scope", reason: "out-of-scope-screen-detected", before, after };
  }
  if (!after.boundaryPresent && after.overlayDescriptors.length === 0) {
    return { classification: "out-of-scope", reason: "product-boundary-missing", before, after };
  }
  if (before.selectedBranch && after.selectedBranch && before.selectedBranch !== after.selectedBranch) {
    return { classification: "branch-changed", reason: "selected-branch-changed", before, after };
  }
  if (after.overlayDescriptors.length > before.overlayDescriptors.length) {
    return { classification: "overlay-opened", reason: "overlay-count-increased", before, after };
  }
  if (after.signature === before.signature) {
    return { classification: "no-change", reason: "signature-unchanged", before, after };
  }

  const candidateSetChanged = after.candidateNames.join("|") !== before.candidateNames.join("|");
  const titleChanged = after.title !== before.title;
  const triggerName = trigger.name || trigger.role;
  if (after.boundaryPresent && (candidateSetChanged || titleChanged || after.title === triggerName)) {
    return { classification: "in-product-child", reason: titleChanged ? "title-changed" : "candidate-set-changed", before, after };
  }
  if (after.boundaryPresent) {
    return { classification: "state-change", reason: "signature-changed-without-child-evidence", before, after };
  }
  return { classification: "unknown", reason: "no-transition-rule-matched", before, after };
}

async function restoreToFrame(context: TraversalContext, frame: NavigationFrame): Promise<RestoreResult> {
  const already = getCurrentScreenSnapshot();
  if (isFrameRestored(frame, already)) {
    return { restored: true, method: "already-restored" };
  }

  const hadOverlay = Boolean(findTopOverlay(getProductBoundary()));
  const closeButton = findOverlayCloseButton();
  if (closeButton) {
    await clickAndWait(closeButton);
    await wait(250);
    const snapshot = getCurrentScreenSnapshot();
    if (isFrameRestored(frame, snapshot)) {
      return { restored: true, method: "overlay-close" };
    }
  }

  if (hadOverlay) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
    await waitForIdle();
    const snapshot = getCurrentScreenSnapshot();
    if (isFrameRestored(frame, snapshot)) {
      return { restored: true, method: "escape" };
    }
    context.log("warn", "Overlay restore did not return to target frame; skipping in-overlay back button to avoid home navigation.", {
      frame,
      snapshot: summarizeSnapshot(snapshot)
    });
  }

  const current = getCurrentScreenSnapshot();
  const backButton = current.shell ? findBackButton(current.shell) : undefined;
  if (backButton && !hadOverlay) {
    context.log("info", "Restoring with in-shell back button.", { name: getAccessibleName(backButton), frame });
    await clickAndWait(backButton);
    await wait(250);
    const snapshot = getCurrentScreenSnapshot();
    if (isFrameRestored(frame, snapshot)) {
      return { restored: true, method: "back-button" };
    }
  }

  let snapshot = getCurrentScreenSnapshot();
  if (!hadOverlay) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
    await waitForIdle();
    snapshot = getCurrentScreenSnapshot();
    if (isFrameRestored(frame, snapshot)) {
      return { restored: true, method: "escape" };
    }
  }

  const controls = getBranchControls();
  if (controls) {
    const target = frame.branch === "product" ? controls.productTab : frame.branch === "usefulFeatures" ? controls.usefulFeaturesTab : controls.settingsButton;
    await clickAndWait(target);
    await wait(250);
    snapshot = getCurrentScreenSnapshot();
    if (isFrameRestored(frame, snapshot)) {
      return { restored: true, method: "branch-entry" };
    }
  }

  return { restored: false, method: "failed", reason: "frame-signature-or-branch-not-restored" };
}

function isFrameRestored(frame: NavigationFrame, snapshot: ScreenSnapshot): boolean {
  return snapshot.boundaryPresent && !snapshot.isHomeLike && !snapshot.isOutOfScopeLike && snapshot.signature === frame.rootSignature;
}

async function recordScreenResult(context: TraversalContext, frame: NavigationFrame, snapshot: ScreenSnapshot): Promise<void> {
  const shell = snapshot.shell;
  if (!shell) {
    await recordFailureResult(context, frame.branch, frame.menuPath, snapshot, "missing-shell");
    return;
  }

  const skipped = collectSkippedCandidates(shell);
  const ibmReport = await runIbmCheckSafely(context.settings.accessibilityStandard, context.settings.ruleSet, shell, context.log);
  const screenshot = await requestScreenshot(context.log);

  context.results.push({
    depth: frame.depth,
    menuPath: frame.menuPath,
    branch: frame.branch,
    title: snapshot.title,
    url: location.href,
    timestamp: new Date().toISOString(),
    screenshot,
    ibmReport,
    summary: extractSummary(ibmReport),
    navigation: {
      trigger: frame.candidateSnapshot
        ? {
            name: frame.candidateSnapshot.name,
            role: frame.candidateSnapshot.role,
            skipReason: frame.candidateSnapshot.reason
          }
        : undefined,
      screenSignature: snapshot.signature,
      skipped
    }
  });
  context.log("info", "Screen scanned.", { title: snapshot.title, depth: frame.depth, branch: frame.branch });
}

async function recordFailureResult(
  context: TraversalContext,
  branch: Branch,
  menuPath: string[],
  snapshot: ScreenSnapshot,
  failureType: string
): Promise<void> {
  const screenshot = await requestScreenshot(context.log);
  const ibmReport = {
    report: {
      summary: { counts: {} },
      results: [],
      error: { message: failureType }
    }
  };
  context.results.push({
    depth: Math.max(0, menuPath.length - 1),
    menuPath,
    branch,
    title: snapshot.title || failureType,
    url: location.href,
    timestamp: new Date().toISOString(),
    screenshot,
    ibmReport,
    summary: extractSummary(ibmReport),
    navigation: {
      screenSignature: snapshot.signature,
      failed: failureType
    }
  });
}

function getCurrentScreenSnapshot(): ScreenSnapshot {
  const controls = getBranchControls();
  const boundary = getProductBoundary();
  const routeShell = boundary ? undefined : findInternalRouteShell();
  const overlay = findTopOverlay(boundary);
  const shell = overlay ?? boundary ?? routeShell;
  const title = shell ? extractScreenTitle(shell, branchLabel(getSelectedBranch(controls) ?? "product")) : document.title || "unknown";
  const overlayDescriptors = getOverlayDescriptors(boundary);
  const candidateNames = shell ? collectClickCandidates(shell).map((candidate) => candidate.snapshot.name || candidate.snapshot.role).sort() : [];
  const signature = shell ? screenSignature(shell) : makeDocumentSignature(title, overlayDescriptors, candidateNames);
  const isHomeLike = looksLikeThinQHome();
  const isOutOfScopeLike = !boundary && !routeShell && looksLikeOutOfScope();

  return {
    url: location.href,
    title,
    selectedBranch: getSelectedBranch(controls),
    hasRequiredControls: Boolean(controls),
    boundaryPresent: Boolean(boundary ?? routeShell),
    isHomeLike,
    isOutOfScopeLike,
    overlayDescriptors,
    candidateNames,
    signature,
    shell,
    boundary
  };
}

function getSelectedBranch(controls?: ReturnType<typeof getBranchControls>): Branch | undefined {
  if (!controls) {
    return undefined;
  }
  if (controls.productTab.getAttribute("aria-selected") === "true") {
    return "product";
  }
  if (controls.usefulFeaturesTab.getAttribute("aria-selected") === "true") {
    return "usefulFeatures";
  }
  return undefined;
}

function findInternalRouteShell(): HTMLElement | undefined {
  if (!isInternalThinQProductRoute()) {
    return undefined;
  }

  const productShell = findProductShell();
  if (productShell !== document.body && isVisible(productShell) && areaOf(productShell) > 20000) {
    return productShell;
  }

  return Array.from(document.querySelectorAll<HTMLElement>("#root_container, #body_container, [id*='container'], [role='main'], main, body > div"))
    .filter((element) => element !== document.body && isVisible(element) && areaOf(element) > 20000)
    .filter((element) => {
      const descriptor = `${element.id} ${String(element.className ?? "")} ${element.getAttribute("data-name") ?? ""}`;
      const textLength = (element.innerText || element.textContent || "").replace(/\s+/g, "").length;
      return !/background|bg|image/i.test(descriptor) || textLength > 20;
    })
    .sort((a, b) => areaOf(b) - areaOf(a))[0];
}

function isInternalThinQProductRoute(): boolean {
  try {
    const url = new URL(location.href);
    return url.hostname === THINQ_HOST && /\/GPM-20\//.test(url.pathname) && !looksLikeThinQHome();
  } catch {
    return false;
  }
}

function findTopOverlay(boundary?: HTMLElement): HTMLElement | undefined {
  const overlays = collectOverlayElements(boundary)
    .sort((a, b) => areaOf(b) - areaOf(a));
  return overlays[0];
}

function getOverlayDescriptors(boundary?: HTMLElement): string[] {
  return collectOverlayElements(boundary)
    .map((element) => `${element.tagName}:${element.getAttribute("role") ?? ""}:${getAccessibleName(element).slice(0, 80)}:${Math.round(areaOf(element))}`)
    .slice(0, 10);
}

function collectOverlayElements(boundary?: HTMLElement): HTMLElement[] {
  const overlays = new Set<HTMLElement>();
  for (const element of Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR))) {
    if (isVisible(element) && element !== boundary && !boundary?.contains(element)) {
      overlays.add(element);
    }
  }

  if (boundary && isModalLikeOverlayElement(boundary)) {
    overlays.add(boundary);
  }

  for (const element of Array.from(document.querySelectorAll<HTMLElement>("div,section,main"))) {
    if (isVisible(element) && element !== document.body && element !== boundary && !boundary?.contains(element) && isModalLikeOverlayElement(element)) {
      overlays.add(element);
    }
  }

  return Array.from(overlays);
}

function isModalLikeOverlayElement(element: HTMLElement): boolean {
  const descriptor = `${element.getAttribute("role") ?? ""} ${element.getAttribute("aria-modal") ?? ""} ${element.getAttribute("data-modal") ?? ""} ${element.getAttribute("bottomsheet") ?? ""} ${String(element.className ?? "")}`;
  if (/dialog|true|bottomsheet|bottom|sheet|popup|modal/i.test(descriptor)) {
    return true;
  }

  const title = extractScreenTitle(element, "");
  const candidateNames = collectClickCandidates(element).map((candidate) => candidate.snapshot.name || candidate.snapshot.role);
  const hasCancel = candidateNames.some((name) => /취소|cancel/i.test(name));
  const hasConfirm = candidateNames.some((name) => /확인|저장|ok|confirm|apply|save/i.test(name));
  const hasPickerValues = candidateNames.some((name) => /\b\d{4}\b|\d{4}\s*년|\d{1,2}\s*(월|일)/.test(name));
  const isPickerTitle = /^\d{4}$/.test(title) || isDatePickerTriggerName(title);

  return hasCancel && hasConfirm && (hasPickerValues || isPickerTitle);
}

function findOverlayCloseButton(): HTMLElement | undefined {
  const overlay = findTopOverlay(getProductBoundary());
  const overlayRoot = overlay ?? document.body;
  const buttonCandidates = Array.from(overlayRoot.querySelectorAll<HTMLElement>("button,[role='button'],a[href],[tabindex]")).filter((element) =>
    isVisible(element)
  );
  return buttonCandidates.find((element) => /close|cancel|dismiss|^x$|닫기|취소|팝업.*닫기|창.*닫기/i.test(getAccessibleName(element).trim()));
}

function summarizeSnapshot(snapshot: ScreenSnapshot): Record<string, unknown> {
  return {
    url: snapshot.url,
    title: snapshot.title,
    selectedBranch: snapshot.selectedBranch,
    hasRequiredControls: snapshot.hasRequiredControls,
    boundaryPresent: snapshot.boundaryPresent,
    isHomeLike: snapshot.isHomeLike,
    isOutOfScopeLike: snapshot.isOutOfScopeLike,
    overlayCount: snapshot.overlayDescriptors.length,
    candidateCount: snapshot.candidateNames.length,
    signature: snapshot.signature,
    shell: snapshot.shell ? describeShell(snapshot.shell) : undefined
  };
}

function describeStableShell(shell: HTMLElement): string {
  return `${shell.tagName.toLowerCase()}#${shell.id || ""}.${String(shell.className || "").split(/\s+/).slice(0, 3).join(".")}`;
}

function candidateAttemptKey(frame: NavigationFrame, candidate: CandidateSnapshot): string {
  const normalizedName = (candidate.name || candidate.role).replace(/\s+/g, " ").trim().toLowerCase();
  return `${frame.branch}:${frame.depth}:${normalizedName}:${candidate.role}:${candidate.tagName}`;
}

function makeDocumentSignature(title: string, overlays: string[], candidates: string[]): string {
  return `document:${location.href}:${title}:${overlays.join("|")}:${candidates.join("|")}`;
}

function looksLikeOutOfScope(): boolean {
  const text = document.body.innerText?.replace(/\s+/g, " ").trim() ?? "";
  return /ThinQ\s*Web|popup|external|browser|새\s*창|팝업|이동/i.test(text);
}

function areaOf(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
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

function describeElement(element: HTMLElement): Record<string, unknown> {
  const rect = element.getBoundingClientRect();
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    role: element.getAttribute("role") || undefined,
    ariaLabel: element.getAttribute("aria-label") || undefined,
    ariaSelected: element.getAttribute("aria-selected") || undefined,
    dataName: element.getAttribute("data-name") || undefined,
    text: element.innerText?.replace(/\s+/g, " ").trim().slice(0, 120),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    left: Math.round(rect.left)
  };
}

function looksLikeThinQHome(): boolean {
  const text = document.body.innerText?.replace(/\s+/g, " ").trim() ?? "";
  return [
    "3D \uD648",
    "\uC990\uACA8 \uCC3E\uB294 \uC81C\uD488",
    "\uC2A4\uB9C8\uD2B8 \uB8E8\uD2F4",
    "\uC5D0\uB108\uC9C0 \uBAA8\uB2C8\uD130\uB9C1",
    "ThinQ PLAY"
  ].some((keyword) => text.includes(keyword));
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
  const response = await sendRuntimeMessageSafely({ type: "CAPTURE_SCREENSHOT" } satisfies RuntimeMessage);
  if (response && typeof response === "object" && "ok" in response && "screenshot" in response && response.ok && response.screenshot) {
    return response.screenshot as string;
  }
  log("warn", "Screenshot not available.", response);
  return undefined;
}

async function clickAndWait(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ block: "center", inline: "center" });
  await wait(120);
  dispatchActivationSequence(element);
  await waitForIdle();
}

async function activateWithKeyboard(element: HTMLElement): Promise<void> {
  element.focus({ preventScroll: false });
  await wait(80);
  element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  element.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  await waitForIdle();
  element.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true }));
  element.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true, cancelable: true }));
  await waitForIdle();
}

function dispatchActivationSequence(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  const hitTarget = document.elementFromPoint(clientX, clientY);
  const target = hitTarget instanceof HTMLElement && element.contains(hitTarget) ? hitTarget : element;
  target.focus({ preventScroll: true });
  const pointerOptions: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX,
    clientY
  };
  const mouseOptions: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
    clientX,
    clientY
  };

  dispatchTouchSequence(target, clientX, clientY);
  target.dispatchEvent(new PointerEvent("pointerover", pointerOptions));
  target.dispatchEvent(new PointerEvent("pointerenter", pointerOptions));
  target.dispatchEvent(new MouseEvent("mouseover", mouseOptions));
  target.dispatchEvent(new MouseEvent("mouseenter", mouseOptions));
  target.dispatchEvent(new PointerEvent("pointerdown", pointerOptions));
  target.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
  target.dispatchEvent(new PointerEvent("pointerup", { ...pointerOptions, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("mouseup", { ...mouseOptions, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("click", { ...mouseOptions, buttons: 0 }));
  target.click();
  if (target !== element) {
    element.click();
  }
}

function dispatchTouchSequence(target: HTMLElement, clientX: number, clientY: number): void {
  try {
    const touch = new Touch({
      identifier: Date.now(),
      target,
      clientX,
      clientY,
      screenX: clientX,
      screenY: clientY,
      pageX: clientX + window.scrollX,
      pageY: clientY + window.scrollY
    });
    const eventInit: TouchEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch]
    };
    target.dispatchEvent(new TouchEvent("touchstart", eventInit));
    target.dispatchEvent(new TouchEvent("touchend", { ...eventInit, touches: [], targetTouches: [] }));
  } catch {
    // Some browsers restrict synthetic Touch construction; pointer/mouse activation still runs.
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
