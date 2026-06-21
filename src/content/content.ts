const IBM_CHECK_REQUEST = "THINQ_A11Y_CHECK_REQUEST";
const IBM_CHECK_RESPONSE = "THINQ_A11Y_CHECK_RESPONSE";
const IBM_RUNNER_READY = "THINQ_A11Y_IBM_RUNNER_READY";
const LOG_PREFIX = "[ThinQ-A11y]";
const MESSAGE_SOURCE = "THINQ_A11Y_EXTENSION";
const THINQ_HOST = "my.lgthinq.com";
const TRANSITION_TIMEOUT_MS = 6000;
const TRANSITION_STABLE_MS = 700;
const CHILD_TRANSITION_STABLE_MS = 1200;
const UNSAFE_TRANSITION_STABLE_MS = 1200;
const NO_CHANGE_STABLE_MS = 1800;
const TRANSITION_POLL_MS = 150;
const OVERLAY_SELECTOR =
  '[role="dialog"], [aria-modal="true"], [data-modal="true"], [bottomsheet="1"], #portal_container, [class*="Bottom"], [class*="bottom"], [class*="Sheet"], [class*="sheet"], [class*="Popup"], [class*="popup"], [class*="Modal"], [class*="modal"], [class*="calendar" i], [class*="picker" i], [class*="date" i], [class*="time" i], [class*="select" i]';

import exclusions from "../../public/exclusions.json";
import type { Branch, CandidateSnapshot, CheckerSettings, LogEntry, RunResult, RuntimeMessage, ScreenResult, TransitionLog } from "../shared/types";
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
  screenSignature,
  getElementSelector,
  hasActionSubRoute,
  normalizeUrl
} from "./dom";
import { isSameDepthVariantName, shouldTraverseFrameCandidates, ParentRedirection, normalizeStateIndicators, isDynamicListOrSearchPage } from "./traversal";

let stopRequested = false;
let activeRun: Promise<void> | undefined;

async function sendRuntimeMessageSafely(message: RuntimeMessage): Promise<unknown> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`${LOG_PREFIX} [WARN] Runtime message delivery failed.`, { type: message.type, message: errorMessage });
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
    try {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      window.__thinqSeed__ = ((arr[0] / 0xffffffff) + Math.random() + (Date.now() % 1000) / 1000) % 1;
    } catch {
      window.__thinqSeed__ = (Math.random() + (Date.now() % 1000) / 1000) % 1;
    }
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
  let traversalContext: TraversalContext | undefined;

  const log = (level: LogEntry["level"], message: string, data?: unknown): void => {
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    logs.push(entry);
    const consoleMethod = level === "debug" ? "debug" : "log";
    const prefix = `${LOG_PREFIX} [${level.toUpperCase()}]`;
    console[consoleMethod](`${prefix} ${message}`, data ?? "");

    let currentDepth = 0;
    if (traversalContext && traversalContext.navigationStack) {
      currentDepth = traversalContext.navigationStack.at(-1)?.depth ?? 0;
    }

    void sendRuntimeMessageSafely({
      type: "RUN_LOG",
      entry,
      currentDepth,
      maxDepth: settings.maxDepth,
      screenCount: results.length,
      currentScreenTitle: traversalContext?.navigationStack.at(-1)?.rootTitle ?? ""
    } satisfies RuntimeMessage);
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
      visitedSemantically: new Set<string>(),
      attemptedCandidates: new Set<string>(),
      navigationStack: [],
      results,
      log,
      state: "ROOT_BRANCH",
      aborted: false,
      transitionLogs: []
    };
    traversalContext = traversal;
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
        settings,
        toolVersion: chrome.runtime.getManifest().version
      },
      results,
      logs,
      transitionLogs: traversal.transitionLogs
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
  visitedSemantically: Set<string>;
  attemptedCandidates: Set<string>;
  navigationStack: NavigationFrame[];
  results: ScreenResult[];
  log: (level: LogEntry["level"], message: string, data?: unknown) => void;
  state: TraversalState;
  aborted: boolean;
  transitionLogs: TransitionLog[];
}

type RestoreMethod = "overlay-close" | "escape" | "back-button" | "history-back" | "tab-reentry" | "self-healing";

interface SemanticIdentity {
  title: string;
  urlPathname: string;
  overlayCount: number;
  signature: string;
}

interface NavigationFrame {
  branch: Branch;
  depth: number;
  menuPath: string[];
  rootSignature: string;
  rootTitle: string;
  shellSelector: string;
  restoreMethod?: RestoreMethod;
  semanticIdentity?: SemanticIdentity;
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
  method: RestoreMethod | "already-restored" | "failed";
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
    rootTitle: snapshot.title,
    shellSelector: describeStableShell(snapshot.shell),
    semanticIdentity: {
      title: snapshot.title,
      urlPathname: new URL(snapshot.url, location.href).pathname,
      overlayCount: snapshot.overlayDescriptors.length,
      signature: snapshot.signature
    }
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
    const restored = await restoreFrame(context, recoveryFrame, recoveryFrame);
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

  if (frame.depth > 0) {
    const normalizedUrl = normalizeUrl(location.href);
    const normalizedUrlLower = normalizedUrl.toLowerCase();
    const isListOrSearchPage = isDynamicListOrSearchPage(snapshot.shell, normalizedUrl);

    if (!isListOrSearchPage) {
      let semanticLayoutKey: string;
      if (normalizedUrlLower.includes("editfoodinfo")) {
        semanticLayoutKey = normalizedUrl;
      } else {
        const candidateRoles = snapshot.shell ? collectClickCandidates(snapshot.shell).map(c => `${c.snapshot.role}:${c.snapshot.tagName}`).sort().join("|") : "";
        const selectedTab = snapshot.shell
          ? Array.from(snapshot.shell.querySelectorAll<HTMLElement>('[aria-selected="true"], [aria-current="page"]'))
              .map(getAccessibleName)
              .filter(Boolean)
              .join("|")
          : "";
        semanticLayoutKey = `${normalizedUrl}[${candidateRoles}](tab:${selectedTab})`;
      }

      if (context.visitedSemantically.has(semanticLayoutKey)) {
        context.log("info", "Semantic match found: skipping duplicate sub-candidate traversal for this frame.", { semanticLayoutKey, frame });
        return;
      }
      context.visitedSemantically.add(semanticLayoutKey);
    }
  }

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
    await waitPageSettle();
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
      const isDirectLoop = frame.menuPath.length > 0 && frame.menuPath[frame.menuPath.length - 1] === triggerName;
      return !context.attemptedCandidates.has(key) && !isDirectLoop;
    });

    if (!candidate) {
      return;
    }

    const key = candidateAttemptKey(frame, candidate.snapshot);
    context.attemptedCandidates.add(key);
    try {
      await clickCandidateAndHandleTransition(context, frame, candidate.snapshot);
    } catch (err) {
      if (err instanceof ParentRedirection) {
        if (err.targetDepth === frame.depth) {
          context.log("info", `Unwinding stopped at target frame "${frame.rootTitle}" (depth ${frame.depth}). Continuing traversal here.`);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
  }
}

async function clickCandidateAndHandleTransition(context: TraversalContext, frame: NavigationFrame, candidateSnapshot: CandidateSnapshot): Promise<void> {
  const before = getCurrentScreenSnapshot();
  if (!before.shell) {
    context.log("error", "Cannot click candidate without a safe shell.", { frame, candidateSnapshot });
    return;
  }
  const restoreTarget: NavigationFrame = {
    ...frame,
    rootSignature: before.signature,
    shellSelector: describeStableShell(before.shell),
    semanticIdentity: {
      title: before.title,
      urlPathname: new URL(before.url, location.href).pathname,
      overlayCount: before.overlayDescriptors.length,
      signature: before.signature
    }
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

  let transition = await waitAndClassifyTransition(before, candidate.snapshot, candidate.element);
  if (transition.classification === "no-change") {
    const isKeyboardInteractive =
      ["button", "a"].includes(candidate.element.tagName.toLowerCase()) ||
      ["button", "link", "tab", "menuitem", "option", "checkbox", "radio"].includes(candidate.snapshot.role) ||
      candidate.element.hasAttribute("tabindex");

    if (isKeyboardInteractive) {
      context.log("warn", "candidate primary click produced no change; retrying keyboard activation.", {
        triggerName,
        candidate: candidate.snapshot
      });
      await activateWithKeyboard(candidate.element);
      transition = await waitAndClassifyTransition(before, candidate.snapshot, candidate.element);
    } else {
      context.log("debug", "candidate primary click produced no change; skipping keyboard activation retry for non-interactive role.", {
        triggerName,
        role: candidate.snapshot.role
      });
    }
  }
  context.log("info", "transition classified.", {
    triggerName,
    classification: transition.classification,
    reason: transition.reason,
    before: summarizeSnapshot(transition.before),
    after: summarizeSnapshot(transition.after)
  });  if (transition.classification !== "no-change" && transition.classification !== "unknown") {
    context.transitionLogs.push({
      triggerName,
      sourceTitle: before.title || "",
      targetTitle: transition.after.title || "",
      targetPathname: new URL(transition.after.url, location.href).pathname,
      selector: getElementSelector(candidate.element)
    });
  }

  if (isSameDepthVariantName(triggerName) && (transition.classification === "state-change" || transition.classification === "in-product-child")) {
    await recordSameDepthVariantResult(context, frame, candidate.snapshot, transition);
    return;
  }

  if (transition.classification === "state-change" && transition.reason === "overlay-count-decreased") {
    context.log("info", "Overlay count decreased; scanning new state as same-depth variant.", { triggerName });
    await recordSameDepthVariantResult(context, frame, candidate.snapshot, transition);

    // Update the stack frame in-place to keep signatures/titles consistent with the new main screen state.
    const snapshot = getCurrentScreenSnapshot();
    if (snapshot.shell && snapshot.boundaryPresent && !snapshot.isHomeLike && !snapshot.isOutOfScopeLike) {
      frame.rootSignature = snapshot.signature;
      frame.rootTitle = snapshot.title;
      frame.shellSelector = describeStableShell(snapshot.shell);
      if (frame.semanticIdentity) {
        frame.semanticIdentity.title = snapshot.title;
        frame.semanticIdentity.signature = snapshot.signature;
        frame.semanticIdentity.overlayCount = snapshot.overlayDescriptors.length;
      }
      const idxInStack = context.navigationStack.findIndex((f) => f.depth === frame.depth);
      if (idxInStack !== -1) {
        context.navigationStack[idxInStack] = { ...frame };
      }
    }
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
    const restored = await restoreFrame(context, frame, frame);
    context.log(restored.restored ? "warn" : "error", "Unexpected branch transition recovery result.", restored);
    if (!restored.restored) {
      context.aborted = true;
      context.state = "ABORTED";
    }
    return;
  }

  const childSnapshot = transition.after;
  const matchingParentFrame = context.navigationStack.find(f => 
    f.rootTitle === childSnapshot.title &&
    f.semanticIdentity?.urlPathname === new URL(childSnapshot.url, location.href).pathname
  );
  if (matchingParentFrame && matchingParentFrame.depth < frame.depth) {
    context.log("info", `Redirected back to parent frame "${matchingParentFrame.rootTitle}" (depth ${matchingParentFrame.depth}) via candidate "${triggerName}". Unwinding stack.`);
    throw new ParentRedirection(matchingParentFrame.depth);
  }

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
    rootTitle: childSnapshot.title,
    shellSelector: describeStableShell(childSnapshot.shell),
    candidateSnapshot: candidate.snapshot,
    transitionClassification: transition.classification,
    terminalOverlay: transition.classification === "overlay-opened",
    restoreMethod: transition.classification === "overlay-opened" ? "overlay-close" : "back-button",
    semanticIdentity: {
      title: childSnapshot.title,
      urlPathname: new URL(childSnapshot.url, location.href).pathname,
      overlayCount: childSnapshot.overlayDescriptors.length,
      signature: childSnapshot.signature
    }
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
  await wait(150);

  let redirectionThrown = false;
  let targetRedirectionDepth = -1;
  let restored: RestoreResult = { restored: false, method: "failed" };
  try {
    await traverseFrame(context, childFrame);
  } catch (err) {
    if (err instanceof ParentRedirection) {
      redirectionThrown = true;
      targetRedirectionDepth = err.targetDepth;
      context.log("info", `Propagating parent redirection to depth ${targetRedirectionDepth} (current frame depth: ${childFrame.depth})`);
      throw err;
    } else {
      throw err;
    }
  } finally {
    if (redirectionThrown) {
      restored = { restored: true, method: "self-healing", reason: "unwinding-redirection" };
      context.navigationStack.pop();
      context.log("info", "depth popped due to unwinding redirection.", {
        triggerName,
        fromDepth: childFrame.depth,
        toDepth: frame.depth
      });
    } else {
      context.state = "RESTORE_PENDING";
      context.log("info", "restore started.", { targetFrame: restoreTarget, childFrame });
      if (context.aborted) {
        restored = { restored: false, method: "failed", reason: "traversal-already-aborted" };
        context.log("warn", "restore skipped because traversal is already aborted.", { targetFrame: restoreTarget, childFrame });
      } else {
        restored = await restoreFrame(context, restoreTarget, childFrame);
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
    rootTitle: snapshot.title,
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

function isPageLoading(): boolean {
  const progress = document.querySelector('[role="progressbar"], [aria-busy="true"]');
  if (progress && isVisible(progress as HTMLElement)) {
    return true;
  }
  const spinners = document.querySelectorAll('[class*="spinner" i], [class*="loader" i], [class*="loading-spinner" i], [class*="loading_dimmed" i]');
  for (const el of Array.from(spinners)) {
    if (el instanceof HTMLElement && isVisible(el)) {
      return true;
    }
  }
  const overlays = document.querySelectorAll('[class*="dimmed" i], [class*="loading" i], [id*="loading" i]');
  for (const el of Array.from(overlays)) {
    if (el instanceof HTMLElement && isVisible(el)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9) {
        return true;
      }
    }
  }
  return false;
}

function isPageLoadingOrEmpty(snapshot: ScreenSnapshot): boolean {
  if (isPageLoading()) {
    return true;
  }
  if (hasActionSubRoute(snapshot.url)) {
    return true;
  }
  if (snapshot.boundaryPresent && snapshot.candidateNames.length === 0) {
    if (snapshot.overlayDescriptors.length === 0) {
      return true;
    }
  }
  return false;
}

async function waitPageSettle(timeoutMs = 3000): Promise<void> {
  const started = performance.now();
  let lastSig = "";
  let stableSince = performance.now();
  while (performance.now() - started < timeoutMs) {
    if (isPageLoading()) {
      stableSince = performance.now();
    } else {
      const snap = getCurrentScreenSnapshot();
      const currentSig = snap.signature;
      if (currentSig !== lastSig) {
        lastSig = currentSig;
        stableSince = performance.now();
      } else if (performance.now() - stableSince > 300) {
        return;
      }
    }
    await wait(100);
  }
}


async function waitAndClassifyTransition(
  before: ScreenSnapshot,
  trigger: CandidateSnapshot,
  triggerElement?: HTMLElement,
  timeoutMs = TRANSITION_TIMEOUT_MS
): Promise<ClassifiedTransition> {
  const started = performance.now();
  let latest = getCurrentScreenSnapshot();
  let latestClassification = classifyTransition(before, latest, trigger, triggerElement);
  let lastUnsafeTransition: ClassifiedTransition | undefined;
  let lastSafeTransition: ClassifiedTransition | undefined;
  let stableKey = transitionStableKey(latestClassification);
  let stableSince = performance.now();

  const isTab = Boolean(
    trigger.role === "tab" ||
    (triggerElement && (triggerElement.closest("[role='tab']") || triggerElement.closest("[role='tablist'] > *")))
  );

  while (performance.now() - started < timeoutMs) {
    await wait(TRANSITION_POLL_MS);
    latest = getCurrentScreenSnapshot();
    latestClassification = classifyTransition(before, latest, trigger, triggerElement);
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

    const isLoading = isPageLoadingOrEmpty(latest);

    const isStableSuccess =
      !isLoading && (
        latestClassification.classification === "in-product-child" ||
        latestClassification.classification === "overlay-opened" ||
        latestClassification.classification === "branch-changed" ||
        (latestClassification.classification === "state-change" && isTab)
      );

    if (isStableSuccess) {
      lastSafeTransition = latestClassification;
      let targetStableMs = latestClassification.classification === "in-product-child" ? CHILD_TRANSITION_STABLE_MS : TRANSITION_STABLE_MS;
      if (latestClassification.classification === "in-product-child" && latestClassification.after.url.includes("ENM01")) {
        targetStableMs = 2200;
      }
      if (stableFor >= targetStableMs) {
        return latestClassification;
      }
    } else {
      if (latestClassification.classification !== "no-change") {
        lastSafeTransition = latestClassification;
      }
      if (stableFor >= NO_CHANGE_STABLE_MS && !isLoading) {
        return latestClassification;
      }
    }
  }

  return lastSafeTransition ?? lastUnsafeTransition ?? latestClassification;
}

function transitionStableKey(transition: ClassifiedTransition): string {
  return `${transition.classification}:${transition.after.url}:${transition.after.signature}:${transition.after.boundaryPresent}:${transition.after.overlayDescriptors.join("|")}`;
}

function classifyTransition(
  before: ScreenSnapshot,
  after: ScreenSnapshot,
  trigger: CandidateSnapshot,
  triggerElement?: HTMLElement
): ClassifiedTransition {
  const stillInProductRoute = isUrlInProductRoute(after.url);

  if (after.isHomeLike && !stillInProductRoute) {
    return { classification: "home-navigation", reason: "home-like-screen-detected", before, after };
  }
  if (after.isOutOfScopeLike && !stillInProductRoute) {
    return { classification: "out-of-scope", reason: "out-of-scope-screen-detected", before, after };
  }
  if (!after.boundaryPresent && after.overlayDescriptors.length === 0) {
    if (stillInProductRoute) {
      return { classification: "no-change", reason: "product-route-loading", before, after };
    }
    return { classification: "out-of-scope", reason: "product-boundary-missing", before, after };
  }
  if (before.selectedBranch && after.selectedBranch && before.selectedBranch !== after.selectedBranch) {
    return { classification: "branch-changed", reason: "selected-branch-changed", before, after };
  }

  const titleChanged = after.title !== before.title;
  const urlChanged = after.url !== before.url;
  const candidateSetChanged = after.candidateNames.join("|") !== before.candidateNames.join("|");
  const triggerName = trigger.name || trigger.role;

  // 1. URL Changed navigation (always prioritize over overlay opening or closing)
  if (urlChanged) {
    return { classification: "in-product-child", reason: "url-changed", before, after };
  }

  // 2. Overlay count decrease
  if (after.overlayDescriptors.length < before.overlayDescriptors.length) {
    return { classification: "state-change", reason: "overlay-count-decreased", before, after };
  }

  // 3. Overlay count increase (when URL is unchanged)
  if (after.overlayDescriptors.length > before.overlayDescriptors.length) {
    return { classification: "overlay-opened", reason: "overlay-count-increased", before, after };
  }

  // 4. Signature unchanged
  if (after.signature === before.signature) {
    return { classification: "no-change", reason: "signature-unchanged", before, after };
  }

  // 5. Tab selection
  const isTab = Boolean(
    trigger.role === "tab" ||
    (triggerElement && (triggerElement.closest("[role='tab']") || triggerElement.closest("[role='tablist'] > *")))
  );

  if (isTab) {
    if (after.boundaryPresent) {
      return { classification: "state-change", reason: "tab-selected", before, after };
    }
  }

  // 6. Child Screen checks (when URL and overlay count are unchanged)
  let isChildScreen = false;
  let reason = "state-change";
  if (after.boundaryPresent) {
    if (titleChanged || after.title === triggerName) {
      isChildScreen = true;
      reason = titleChanged ? "title-changed" : "title-matches-trigger";
    } else if (candidateSetChanged) {
      const beforeSet = new Set(before.candidateNames);
      const afterSet = new Set(after.candidateNames);
      const intersection = new Set([...beforeSet].filter(x => afterSet.has(x)));
      const union = new Set([...beforeSet, ...afterSet]);
      const similarity = union.size === 0 ? 1.0 : intersection.size / union.size;

      if (similarity < 0.4) {
        isChildScreen = true;
        reason = `candidate-set-low-similarity-${similarity.toFixed(2)}`;
      }
    }
  }

  if (isChildScreen) {
    return { classification: "in-product-child", reason, before, after };
  }

  if (after.boundaryPresent) {
    return { classification: "state-change", reason: "signature-changed-without-child-evidence", before, after };
  }
  return { classification: "unknown", reason: "no-transition-rule-matched", before, after };
}

async function restoreFrame(context: TraversalContext, targetFrame: NavigationFrame, childFrame: NavigationFrame): Promise<RestoreResult> {
  const already = getCurrentScreenSnapshot();
  const verifiedAlready = verifyRestore(context, targetFrame, already, "already-restored");
  if (verifiedAlready.restored) {
    return verifiedAlready;
  }

  const method = childFrame.restoreMethod ?? "back-button";
  context.log("info", `Executing restore via: ${method}`, { targetTitle: targetFrame.rootTitle, currentTitle: already.title });

  if (method === "overlay-close") {
    const closeButton = findOverlayCloseButton();
    if (closeButton) {
      context.log("info", `Clicking overlay close button: ${getAccessibleName(closeButton)}`);
      await clickRestoreControlAndWait(closeButton);
      const snapshot = await waitForFrameRestore(targetFrame, 2500);
      const verified = verifyRestore(context, targetFrame, snapshot, "overlay-close");
      if (verified.restored) {
        return verified;
      }
    }

    context.log("info", "Overlay close button not found or failed; sending Escape.");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
    await waitForIdle();
    const snapshot = getCurrentScreenSnapshot();
    const verified = verifyRestore(context, targetFrame, snapshot, "escape");
    if (verified.restored) {
      return verified;
    }
  } else {
    const current = getCurrentScreenSnapshot();
    const backButton = current.shell ? findBackButton(current.shell) : undefined;
    if (backButton) {
      context.log("info", `Clicking back button: ${getAccessibleName(backButton)}`);
      await clickRestoreControlAndWait(backButton);
      const snapshot = await waitForFrameRestore(targetFrame, 3500);
      const verified = verifyRestore(context, targetFrame, snapshot, "back-button");
      if (verified.restored) {
        return verified;
      }
    }

    context.log("warn", "Back button not found or failed; trying history.back() fallback.");
    window.history.back();
    const snapshot = await waitForFrameRestore(targetFrame, 3500);
    const verified = verifyRestore(context, targetFrame, snapshot, "history-back");
    if (verified.restored) {
      return verified;
    }
  }

  if (targetFrame.depth === 0) {
    context.log("warn", "Standard restore methods failed to reach branch root; attempting Tab Re-entry.");
    const controls = getBranchControls();
    if (controls) {
      const target = targetFrame.branch === "product" ? controls.productTab : targetFrame.branch === "usefulFeatures" ? controls.usefulFeaturesTab : controls.settingsButton;
      await clickRestoreControlAndWait(target);
      const snapshot = await waitForFrameRestore(targetFrame, 2500);
      const verified = verifyRestore(context, targetFrame, snapshot, "tab-reentry");
      if (verified.restored) {
        return verified;
      }
    }
  }

  const selfHealed = await reNavigateToFrame(context, targetFrame);
  if (selfHealed) {
    return { restored: true, method: "self-healing" };
  }

  return { restored: false, method: "failed", reason: "frame-signature-or-branch-not-restored" };
}

async function reNavigateToFrame(context: TraversalContext, targetFrame: NavigationFrame): Promise<boolean> {
  context.log("info", `Attempting self-healing re-navigation to frame with menu path: ${targetFrame.menuPath.join(" > ")}`);
  
  let controls = getBranchControls();
  if (!controls) {
    context.log("warn", "Cannot re-navigate: branch controls not found. Attempting branch root URL navigation fallback.");
    const rootUrlPath = context.navigationStack[0]?.semanticIdentity?.urlPathname;
    if (rootUrlPath) {
      location.href = rootUrlPath;
      await wait(1000);
      await waitPageSettle();
      controls = getBranchControls();
    }
  }
  
  if (!controls) {
    context.log("warn", "Cannot re-navigate: branch controls not found after root URL recovery.");
    return false;
  }
  
  const rootTarget = targetFrame.branch === "product" 
    ? controls.productTab 
    : targetFrame.branch === "usefulFeatures" 
      ? controls.usefulFeaturesTab 
      : controls.settingsButton;
      
  context.log("info", `Re-navigating: clicking branch tab for ${targetFrame.branch}`);
  await clickRestoreControlAndWait(rootTarget);
  await waitForIdle();

  const pathItems = targetFrame.menuPath.filter(item => {
    const norm = item.replace(/\s+/g, " ").trim().toLowerCase();
    return norm !== "제품" && norm !== "유용한 기능" && norm !== "설정" && norm !== "settings";
  });

  context.log("info", `Cleaned menu path for re-navigation: ${pathItems.join(" > ")}`);

  for (const item of pathItems) {
    const snapshot = getCurrentScreenSnapshot();
    if (!snapshot.shell) {
      context.log("warn", "Cannot re-navigate: missing shell.");
      return false;
    }

    const candidates = collectClickCandidates(snapshot.shell);
    const targetCandidate = candidates.find(c => {
      const name = (c.snapshot.name || c.snapshot.role).replace(/\s+/g, " ").trim().toLowerCase();
      const match = item.replace(/\s+/g, " ").trim().toLowerCase();
      return name === match;
    });

    if (!targetCandidate) {
      context.log("warn", `Cannot re-navigate: menu item "${item}" not found in current candidates.`);
      return false;
    }

    context.log("info", `Re-navigating: clicking menu item "${item}"`);
    await clickRestoreControlAndWait(targetCandidate.element);
    await waitForIdle();
  }

  const finalSnapshot = getCurrentScreenSnapshot();
  if (isFrameRestored(targetFrame, finalSnapshot) || finalSnapshot.title === targetFrame.rootTitle) {
    context.log("info", "Self-healing re-navigation succeeded!");
    return true;
  }

  context.log("warn", `Self-healing re-navigation finished, but target frame signature was not restored (expected: ${targetFrame.rootSignature}, got: ${finalSnapshot.signature})`);
  return false;
}

function verifyRestore(context: TraversalContext, frame: NavigationFrame, snapshot: ScreenSnapshot, method: RestoreResult["method"]): { restored: boolean; method: RestoreResult["method"] } {
  if (isFrameRestored(frame, snapshot)) {
    return { restored: true, method };
  }
  if (snapshot.boundaryPresent && !snapshot.isHomeLike && !snapshot.isOutOfScopeLike && snapshot.title === frame.rootTitle) {
    const targetOverlayCount = frame.semanticIdentity?.overlayCount ?? 0;
    const currentOverlayCount = snapshot.overlayDescriptors.length;
    if (currentOverlayCount > targetOverlayCount) {
      context.log("debug", "Title matched but overlay count is higher than target; reject relaxed restore.", {
        targetOverlayCount,
        currentOverlayCount
      });
      return { restored: false, method: "failed" };
    }

    context.log("info", `Restore accepted via title match (method: ${method}).`, {
      targetTitle: frame.rootTitle,
      oldSignature: frame.rootSignature,
      newSignature: snapshot.signature
    });
    frame.rootSignature = snapshot.signature;
    return { restored: true, method };
  }
  return { restored: false, method: "failed" };
}

function isFrameRestored(frame: NavigationFrame, snapshot: ScreenSnapshot): boolean {
  return snapshot.boundaryPresent && !snapshot.isHomeLike && !snapshot.isOutOfScopeLike && snapshot.signature === frame.rootSignature;
}

async function waitForFrameRestore(frame: NavigationFrame, timeoutMs: number): Promise<ScreenSnapshot> {
  const started = performance.now();
  let snapshot = getCurrentScreenSnapshot();
  while (performance.now() - started < timeoutMs) {
    const targetOverlayCount = frame.semanticIdentity?.overlayCount ?? 0;
    const currentOverlayCount = snapshot.overlayDescriptors.length;
    const isRelaxed = snapshot.boundaryPresent && 
                      !snapshot.isHomeLike && 
                      !snapshot.isOutOfScopeLike && 
                      snapshot.title === frame.rootTitle &&
                      currentOverlayCount <= targetOverlayCount;
    const isLoading = isPageLoadingOrEmpty(snapshot);
    if (!isLoading && (isFrameRestored(frame, snapshot) || isRelaxed || snapshot.isHomeLike || snapshot.isOutOfScopeLike || !snapshot.boundaryPresent)) {
      return snapshot;
    }
    await wait(150);
    snapshot = getCurrentScreenSnapshot();
  }
  return snapshot;
}

async function recordScreenResult(context: TraversalContext, frame: NavigationFrame, snapshot: ScreenSnapshot): Promise<void> {
  const shell = snapshot.shell;
  if (!shell) {
    await recordFailureResult(context, frame.branch, frame.menuPath, snapshot, "missing-shell");
    return;
  }

  const skipped = collectSkippedCandidates(shell);
  context.log("info", `Scanning screen: ${snapshot.title}`, { depth: frame.depth });
  await wait(150);
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

  const container = Array.from(document.querySelectorAll<HTMLElement>("#root_container, #body_container, [id*='container'], [role='main'], main, body > div"))
    .filter((element) => element !== document.body && isVisible(element) && areaOf(element) > 20000)
    .filter((element) => {
      const descriptor = `${element.id} ${String(element.className ?? "")} ${element.getAttribute("data-name") ?? ""}`;
      const textLength = (element.innerText || element.textContent || "").replace(/\s+/g, "").length;
      return !/background|bg|image/i.test(descriptor) || textLength > 20;
    })
    .sort((a, b) => areaOf(b) - areaOf(a))[0];

  if (container) {
    return container;
  }

  const root = document.getElementById("root");
  if (root && isVisible(root)) {
    return root;
  }
  return document.body;
}

function isInternalThinQProductRoute(): boolean {
  try {
    const url = new URL(location.href);
    return url.hostname === THINQ_HOST && /\/[A-Za-z0-9_-]+\/[A-Za-z0-9_=-]+\//.test(url.pathname) && !looksLikeThinQHome();
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
    const tag = element.tagName.toLowerCase();
    if (tag === "body" || tag === "html") {
      continue;
    }
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
  const standardClose = buttonCandidates.find((element) => /close|cancel|dismiss|^x$|닫기|취소|팝업.*닫기|창.*닫기/i.test(getAccessibleName(element).trim()));
  if (standardClose) {
    return standardClose;
  }
  return buttonCandidates.find((element) => /ok|confirm|yes|확인/i.test(getAccessibleName(element).trim()));
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
  const rawName = candidate.name || candidate.role;
  const normalizedName = normalizeStateIndicators(rawName).toLowerCase();
  if (isSameDepthVariantName(normalizedName)) {
    return `${frame.branch}:${frame.depth}:variant:${normalizedName}`;
  }
  const occ = candidate.occurrenceIndex ?? 0;
  return `${frame.branch}:${frame.depth}:${normalizedName}:${candidate.role}:${candidate.tagName}:${occ}`;
}

function makeDocumentSignature(title: string, overlays: string[], candidates: string[]): string {
  return `document:${location.href}:${title}:${overlays.join("|")}:${candidates.join("|")}`;
}

function looksLikeOutOfScope(): boolean {
  if (isUrlInProductRoute(location.href)) {
    return false;
  }
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

function isUrlInProductRoute(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === THINQ_HOST && /\/[A-Za-z0-9_-]+\/[A-Za-z0-9_=-]+\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

function looksLikeThinQHome(): boolean {
  if (isUrlInProductRoute(location.href)) {
    return false;
  }
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
    const rawReport = await runIbmCheck(policy, ruleSet, target);
    return filterExclusions(rawReport);
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

export function filterExclusions(ibmReport: any): any {
  if (!ibmReport || typeof ibmReport !== "object") {
    return ibmReport;
  }

  const report = ibmReport.report ? ibmReport.report : ibmReport;
  if (!Array.isArray(report.results)) {
    return ibmReport;
  }

  const filteredResults = report.results.filter((issue: any) => {
    if (!issue.ruleId || !issue.message) return true;

    // Check if it matches any exclusion in the list
    const isExcluded = exclusions.some((ex) => {
      return (
        issue.ruleId === ex.ruleId &&
        (issue.message || "").trim() === ex.message.trim()
      );
    });

    if (isExcluded) {
      // Decrement the corresponding count in summary.counts
      const severity = (issue.value?.[0] || "").toUpperCase();
      const type = (issue.value?.[1] || "").toUpperCase();

      const counts = report.summary?.counts;
      if (counts) {
        let key: string | null = null;
        if (type === "MANUAL") {
          key = "manual";
        } else if (severity === "VIOLATION") {
          if (type === "FAIL") {
            key = "violation";
          } else if (type === "POTENTIAL") {
            key = "potentialviolation";
          }
        } else if (severity === "RECOMMENDATION") {
          if (type === "RECOMMENDATION") {
            key = "recommendation";
          } else if (type === "POTENTIAL") {
            key = "potentialrecommendation";
          }
        }

        if (key && typeof counts[key] === "number" && counts[key] > 0) {
          counts[key]--;
        }
      }
      return false; // exclude this issue
    }

    return true; // keep this issue
  });

  report.results = filteredResults;
  return ibmReport;
}

async function requestScreenshot(log: (level: LogEntry["level"], message: string, data?: unknown) => void): Promise<string | undefined> {
  const response = await sendRuntimeMessageSafely({ type: "CAPTURE_SCREENSHOT" } satisfies RuntimeMessage);
  if (response && typeof response === "object" && "ok" in response && "screenshot" in response && response.ok && response.screenshot) {
    return response.screenshot as string;
  }
  log("warn", "Screenshot not available.", response);
  return undefined;
}

function triggerSelectOrDateInput(element: HTMLElement): boolean {
  const targets = element.tagName.toLowerCase() === "input" || element.tagName.toLowerCase() === "select"
    ? [element]
    : Array.from(element.querySelectorAll<HTMLElement>("input, select"));

  let triggered = false;
  for (const t of targets) {
    if (t instanceof HTMLSelectElement) {
      if (typeof t.showPicker === "function") {
        try {
          t.showPicker();
          triggered = true;
        } catch (e) {
          // ignore
        }
      }
    } else if (t instanceof HTMLInputElement) {
      const type = t.getAttribute("type") || "text";
      if (["date", "time", "datetime-local", "month", "week"].includes(type)) {
        if (typeof t.showPicker === "function") {
          try {
            t.showPicker();
            triggered = true;
          } catch (e) {
            // ignore
          }
        }
      }
    }
  }
  return triggered;
}

async function clickAndWait(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ block: "center", inline: "center" });
  await wait(120);
  dispatchActivationSequence(element);
  triggerSelectOrDateInput(element);
  await waitForIdle();
}

async function clickRestoreControlAndWait(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ block: "center", inline: "center" });
  await wait(120);
  element.focus({ preventScroll: true });
  element.click();
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
  const reportObj = readObject(ibmReport);
  const report = "report" in reportObj ? readObject(reportObj.report) : reportObj;
  const results = Array.isArray(report.results) ? report.results : [];

  const countsObj = readObject(readObject(report.summary).counts);

  // If results array is empty but we have summary counts in report (like in mock or fallback)
  if (results.length === 0 && Object.keys(countsObj).length > 0) {
    return {
      violation: toNumber(countsObj.violation),
      potentialviolation: toNumber(countsObj.potentialviolation),
      recommendation: toNumber(countsObj.recommendation),
      potentialrecommendation: toNumber(countsObj.potentialrecommendation),
      manual: toNumber(countsObj.manual),
      pass: toNumber(countsObj.pass),
      ignored: toNumber(countsObj.ignored)
    };
  }

  // Calculate from results
  const rawIssues = results.filter((r: any) => r.value && r.value[1] !== "PASS");

  let violation = 0;
  let potentialviolation = 0;
  let recommendation = 0;
  let potentialrecommendation = 0;
  let manual = 0;
  let pass = countsObj.pass !== undefined ? toNumber(countsObj.pass) : results.filter((r: any) => r.value && r.value[1] === "PASS").length;

  rawIssues.forEach((issue: any) => {
    const severity = (issue.value?.[0] || "").toUpperCase();
    const type = (issue.value?.[1] || "").toUpperCase();

    if (type === "MANUAL") {
      manual++;
    } else if (severity === "VIOLATION") {
      if (type === "FAIL") {
        violation++;
      } else if (type === "POTENTIAL") {
        potentialviolation++;
      }
    } else if (severity === "RECOMMENDATION") {
      if (type === "RECOMMENDATION") {
        recommendation++;
      } else if (type === "POTENTIAL") {
        potentialrecommendation++;
      }
    }
  });

  return {
    violation,
    potentialviolation,
    recommendation,
    potentialrecommendation,
    manual,
    pass,
    ignored: toNumber(countsObj.ignored)
  };
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
