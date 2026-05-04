const IBM_CHECK_REQUEST = "THINQ_A11Y_CHECK_REQUEST";
const IBM_CHECK_RESPONSE = "THINQ_A11Y_CHECK_RESPONSE";
const IBM_RUNNER_READY = "THINQ_A11Y_IBM_RUNNER_READY";
const MESSAGE_SOURCE = "THINQ_A11Y_EXTENSION";

export {};

declare global {
  interface Window {
    ace?: {
      Checker: new () => {
        check: (doc: Document, policies: string[]) => Promise<unknown>;
      };
    };
    __THINQ_A11Y_IBM_RUNNER__?: boolean;
  }
}

const currentScript = document.currentScript as HTMLScriptElement | null;
const aceUrl = currentScript?.dataset.aceUrl;

if (!window.__THINQ_A11Y_IBM_RUNNER__) {
  window.__THINQ_A11Y_IBM_RUNNER__ = true;
  void initialize();
}

async function initialize(): Promise<void> {
  try {
    await loadAce();
    window.addEventListener("message", handleCheckRequest);
    window.postMessage({ type: IBM_RUNNER_READY }, "*");
  } catch (error) {
    window.postMessage({ type: IBM_RUNNER_READY, error: error instanceof Error ? error.message : String(error) }, "*");
  }
}

async function loadAce(): Promise<void> {
  if (window.ace?.Checker) {
    return;
  }
  if (!aceUrl) {
    throw new Error("Missing IBM Equal Access engine URL.");
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = aceUrl;
    script.onload = () => {
      if (window.ace?.Checker) {
        resolve();
      } else {
        reject(new Error("IBM Equal Access engine loaded but ace.Checker is unavailable."));
      }
    };
    script.onerror = () => reject(new Error("Failed to load IBM Equal Access engine."));
    (document.head || document.documentElement).appendChild(script);
  });
}

async function handleCheckRequest(event: MessageEvent): Promise<void> {
  if (event.source !== window || event.data?.source !== MESSAGE_SOURCE || event.data.type !== IBM_CHECK_REQUEST) {
    return;
  }

  const requestId = String(event.data.requestId ?? "");
  const policy = String(event.data.policy ?? "IBM_Accessibility");
  const targetSelector = typeof event.data.targetSelector === "string" ? event.data.targetSelector : "";

  try {
    if (!window.ace?.Checker) {
      await loadAce();
    }
    const ace = window.ace;
    if (!ace?.Checker) {
      throw new Error("IBM Equal Access checker is unavailable.");
    }
    const checker = new ace.Checker();
    const target = targetSelector ? document.querySelector(targetSelector) : document;
    const ruleExceptions: string[] = [];
    const effectiveTarget = target ?? document;
    const report = await withRuleExceptionCapture(ruleExceptions, () => checker.check(effectiveTarget, [policy]));
    window.postMessage({
      type: IBM_CHECK_RESPONSE,
      requestId,
      ok: true,
      report: addThinQMetadata(toCloneSafeJson(report), { targetSelector, targetFound: Boolean(target), ruleExceptions })
    }, "*");
  } catch (error) {
    window.postMessage(
      {
        type: IBM_CHECK_RESPONSE,
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      "*"
    );
  }
}

async function withRuleExceptionCapture<T>(ruleExceptions: string[], action: () => Promise<T>): Promise<T> {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  const capture = (level: "error" | "warn", args: unknown[]): boolean => {
    const message = args.map(String).join(" ");
    if (message.includes("RULE EXCEPTION:")) {
      ruleExceptions.push(message.slice(0, 2000));
      return true;
    }
    return false;
  };

  console.error = (...args: unknown[]) => {
    if (!capture("error", args)) {
      originalError.apply(console, args);
    }
  };
  console.warn = (...args: unknown[]) => {
    if (!capture("warn", args)) {
      originalWarn.apply(console, args);
    }
  };
  console.log = (...args: unknown[]) => {
    if (!capture("warn", args)) {
      originalLog.apply(console, args);
    }
  };

  try {
    return await action();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  }
}

function addThinQMetadata(report: unknown, metadata: Record<string, unknown>): unknown {
  if (report && typeof report === "object" && !Array.isArray(report)) {
    return { ...(report as Record<string, unknown>), _thinqA11y: metadata };
  }
  return { report, _thinqA11y: metadata };
}

function toCloneSafeJson(value: unknown): unknown {
  const seen = new WeakSet<object>();
  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue: unknown) => {
      if (nestedValue instanceof Node) {
        return describeNode(nestedValue);
      }
      if (typeof nestedValue === "function" || typeof nestedValue === "symbol" || typeof nestedValue === "undefined") {
        return undefined;
      }
      if (nestedValue && typeof nestedValue === "object") {
        if (seen.has(nestedValue)) {
          return "[Circular]";
        }
        seen.add(nestedValue);
      }
      return nestedValue;
    })
  );
}

function describeNode(node: Node): Record<string, unknown> {
  if (node instanceof Element) {
    return {
      nodeType: node.nodeType,
      nodeName: node.nodeName,
      id: node.id || undefined,
      className: typeof node.className === "string" ? node.className || undefined : undefined,
      role: node.getAttribute("role") || undefined,
      ariaLabel: node.getAttribute("aria-label") || undefined,
      text: normalizeNodeText(node.textContent)
    };
  }
  return {
    nodeType: node.nodeType,
    nodeName: node.nodeName,
    text: normalizeNodeText(node.textContent)
  };
}

function normalizeNodeText(value: string | null): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim().slice(0, 160);
  return text || undefined;
}
