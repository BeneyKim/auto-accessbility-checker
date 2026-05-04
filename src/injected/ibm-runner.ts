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

  try {
    if (!window.ace?.Checker) {
      await loadAce();
    }
    const ace = window.ace;
    if (!ace?.Checker) {
      throw new Error("IBM Equal Access checker is unavailable.");
    }
    const checker = new ace.Checker();
    const report = await checker.check(document, [policy]);
    window.postMessage({ type: IBM_CHECK_RESPONSE, requestId, ok: true, report }, "*");
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
