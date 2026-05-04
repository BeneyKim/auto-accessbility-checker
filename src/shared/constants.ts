import type { CheckerSettings } from "./types";

export const LOG_PREFIX = "[ThinQ-A11y]";

export const THINQ_HOST = "my.lgthinq.com";

export const DEFAULT_SETTINGS: CheckerSettings = {
  title: "ThinQ Web",
  accessibilityStandard: "IBM_Accessibility",
  ruleSet: "latest",
  maxDepth: 5
};

export const DEPTH_OPTIONS = [3, 4, 5, 6, 7] as const;

export const MESSAGE_SOURCE = "THINQ_A11Y_EXTENSION";

export const IBM_RUNNER_READY = "THINQ_A11Y_IBM_RUNNER_READY";
export const IBM_CHECK_REQUEST = "THINQ_A11Y_CHECK_REQUEST";
export const IBM_CHECK_RESPONSE = "THINQ_A11Y_CHECK_RESPONSE";

export const STORAGE_KEYS = {
  settings: "settings",
  status: "status",
  result: "result",
  debugLog: "debugLog"
} as const;
