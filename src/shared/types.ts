export type Branch = "product" | "usefulFeatures" | "settings";

export type RunStatus = "idle" | "running" | "stopping" | "completed" | "failed";

export interface CheckerSettings {
  title: string;
  accessibilityStandard: string;
  ruleSet: string;
  maxDepth: number;
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
  error?: string;
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
}

export interface RunResult {
  metadata: RunMetadata;
  results: ScreenResult[];
  logs: LogEntry[];
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
}

export interface RunCompleteMessage {
  type: "RUN_COMPLETE";
  result: RunResult;
}

export interface RunFailedMessage {
  type: "RUN_FAILED";
  error: string;
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
  | RunFailedMessage;

export interface CandidateSnapshot {
  id: string;
  name: string;
  role: string;
  tagName: string;
  reason?: string;
}

export interface IssuePublisherPayload {
  sourceReport: RunResult;
  issues: unknown[];
}

export interface IssuePublisher {
  publish(payload: IssuePublisherPayload): Promise<void>;
}
