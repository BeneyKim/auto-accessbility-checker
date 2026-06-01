export type Branch = "product" | "usefulFeatures" | "settings";

export type RunStatus = "idle" | "running" | "stopping" | "completed" | "failed";

export interface CheckerSettings {
  title: string;
  accessibilityStandard: string;
  ruleSet: string;
  maxDepth: number;
  levels?: {
    violation: boolean;
    needsReview: boolean;
    recommendation: boolean;
  };
}

export interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

export interface RunState {
  status: RunStatus;
  logs: LogEntry[];
  screenCount: number;
  currentDepth?: number;
  maxDepth?: number;
  error?: string;
  currentScreenTitle?: string;
}

export interface NavigationTrigger {
  name: string;
  role: string;
  skipReason?: string;
}

export interface NavigationMeta {
  trigger?: NavigationTrigger;
  screenSignature: string;
  skipped?: NavigationTrigger[];
  failed?: string;
}

export interface AccessibilitySummary {
  violation: number;
  potentialviolation: number;
  recommendation: number;
  potentialrecommendation: number;
  manual: number;
  pass: number;
  ignored: number;
}

export interface ScreenResult {
  depth: number;
  menuPath: string[];
  branch: Branch;
  title: string;
  url: string;
  timestamp: string;
  screenshot?: string;
  ibmReport: unknown;
  summary: AccessibilitySummary;
  navigation: NavigationMeta;
}

export interface RunMetadata {
  title: string;
  startedAt: string;
  completedAt?: string;
  url: string;
  userAgent: string;
  settings: CheckerSettings;
  toolVersion?: string;
}

export interface TransitionLog {
  triggerName: string;
  sourceTitle: string;
  targetTitle: string;
  targetPathname: string;
  selector: string;
}

export interface ConsistencyViolation {
  label: string;
  instances: {
    sourceTitle: string;
    targetTitle: string;
    targetPathname: string;
    selector: string;
  }[];
}

export interface RunResult {
  metadata: RunMetadata;
  results: ScreenResult[];
  logs: LogEntry[];
  transitionLogs?: TransitionLog[];
  consistencyViolations?: ConsistencyViolation[];
}

export interface StartRunMessage {
  type: "START_RUN";
  settings: CheckerSettings;
}

export interface StopRunMessage {
  type: "STOP_RUN";
}

export interface GetStatusMessage {
  type: "GET_STATUS";
}

export interface DownloadReportMessage {
  type: "DOWNLOAD_REPORT";
}

export interface DownloadDebugLogMessage {
  type: "DOWNLOAD_DEBUG_LOG";
}

export interface CaptureScreenshotMessage {
  type: "CAPTURE_SCREENSHOT";
}

export interface RunLogMessage {
  type: "RUN_LOG";
  entry: LogEntry;
  currentDepth?: number;
  maxDepth?: number;
  screenCount?: number;
  currentScreenTitle?: string;
}

export interface RunCompleteMessage {
  type: "RUN_COMPLETE";
  result: RunResult;
}

export interface RunFailedMessage {
  type: "RUN_FAILED";
  error: string;
}

export interface ReconScanMessage {
  type: "RECON_SCAN";
}

export interface ReconCompleteMessage {
  type: "RECON_COMPLETE";
  snapshot: ReconSnapshot;
}

export interface DownloadReconMessage {
  type: "DOWNLOAD_RECON";
}

export type RuntimeMessage =
  | StartRunMessage
  | StopRunMessage
  | GetStatusMessage
  | DownloadReportMessage
  | DownloadDebugLogMessage
  | CaptureScreenshotMessage
  | RunLogMessage
  | RunCompleteMessage
  | RunFailedMessage
  | ReconScanMessage
  | ReconCompleteMessage
  | DownloadReconMessage;

export interface CandidateSnapshot {
  id: string;
  name: string;
  role: string;
  tagName: string;
  reason?: string;
  occurrenceIndex?: number;
}

export interface IssuePublisherPayload {
  sourceReport: RunResult;
  issues: unknown[];
}

export interface IssuePublisher {
  publish(payload: IssuePublisherPayload): Promise<void>;
}

// ─── Recon Mode Types ───────────────────────────────

export interface ReconElement {
  /** Stable element ID (hash of role + name + position) */
  id: string;
  /** Element tag name */
  tagName: string;
  /** Accessible name (aria-label, innerText, title, etc.) */
  name: string;
  /** ARIA role or tag name */
  role: string;
  /** CSS class names */
  className: string;
  /** data-* attributes relevant to ThinQ */
  dataAttributes: Record<string, string>;
  /** aria-* attributes */
  ariaAttributes: Record<string, string>;
  /** Bounding rect */
  rect: { top: number; left: number; width: number; height: number };
  /** Whether element is visible */
  visible: boolean;
  /** Skip reason from getSkipReason() — undefined if not skipped */
  skipReason?: string;
  /** Whether this element is an interactive candidate */
  isCandidate: boolean;
  /** href attribute if present */
  href?: string;
  /** innerHTML snippet (first 200 chars) for debugging */
  innerHtmlSnippet: string;
  /** Depth of element in DOM tree from shell */
  domDepth: number;
}

export interface ReconSnapshot {
  /** Timestamp of snapshot */
  timestamp: string;
  /** Current page URL */
  url: string;
  /** Detected product shell description */
  shell: {
    tagName: string;
    id: string;
    className: string;
    role: string;
    dataName: string;
    rect: { top: number; left: number; width: number; height: number };
  };
  /** Screen title */
  title: string;
  /** Screen signature hash */
  signature: string;
  /** All interactive elements found (both candidates and skipped) */
  elements: ReconElement[];
  /** Summary counts */
  summary: {
    totalInteractive: number;
    candidates: number;
    skipped: number;
    skippedByReason: Record<string, number>;
  };
  /** Detected overlays */
  overlays: string[];
  /** Required controls diagnostic */
  requiredControls: {
    productTabFound: boolean;
    usefulFeaturesTabFound: boolean;
    settingsButtonFound: boolean;
  };
  /** Screenshot as data URL */
  screenshot?: string;
}
