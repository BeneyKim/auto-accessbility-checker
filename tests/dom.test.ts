import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectClickCandidates, collectSkippedCandidates, findRequiredControls, screenSignature } from "../src/content/dom";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const width = Number(this.dataset.width ?? 100);
    const height = Number(this.dataset.height ?? 40);
    const top = Number(this.dataset.top ?? 10);
    const left = Number(this.dataset.left ?? 10);
    return {
      x: left,
      y: top,
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({})
    } as DOMRect;
  });
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    configurable: true,
    get() {
      return this.textContent ?? "";
    }
  });
});

describe("ThinQ DOM helpers", () => {
  it("detects product, useful features, and settings controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button role="tab">제품</button>
        <button role="tab">유용한 기능</button>
        <button aria-label="설정"></button>
      </section>
    `;

    const controls = findRequiredControls();

    expect(controls).toBeDefined();
    expect(controls?.productTab.textContent).toBe("제품");
    expect(controls?.usefulFeaturesTab.textContent).toBe("유용한 기능");
  });

  it("detects custom div tabs and an unnamed top-right settings icon", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700" data-top="90" data-left="20">
        <header>
          <button aria-label="뒤로" data-top="110" data-left="40"></button>
          <div class="gear" tabindex="0" data-top="170" data-left="840" data-width="48" data-height="48">
            <svg aria-hidden="true"></svg>
          </div>
        </header>
        <nav class="bottom-tabs" data-top="780" data-left="200" data-width="500" data-height="60">
          <div class="tab" style="cursor: pointer"><span>제품</span></div>
          <div class="tab" style="cursor: pointer"><span>유용한 기능</span></div>
        </nav>
      </section>
    `;

    const controls = findRequiredControls();

    expect(controls).toBeDefined();
    expect(controls?.productTab.className).toBe("tab");
    expect(controls?.usefulFeaturesTab.className).toBe("tab");
    expect(controls?.settingsButton.className).toBe("gear");
  });

  it("skips ThinQ PLAY, close, branch tabs, and switch-like controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button role="tab">제품</button>
        <button role="tab">유용한 기능</button>
        <button>ThinQ PLAY</button>
        <button aria-label="닫기"></button>
        <button role="switch">취침 예약</button>
        <button>예약</button>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["예약"]);
    expect(skipped.map((candidate) => candidate.reason)).toContain("blocked-navigation");
    expect(skipped.map((candidate) => candidate.reason)).toContain("switch-toggle");
    expect(skipped.map((candidate) => candidate.reason)).toContain("root-branch-tab");
  });

  it("changes screen signature when visible content changes", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <h1>공기청정기</h1>
        <button>예약</button>
      </section>
    `;
    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const first = screenSignature(shell);
    shell.querySelector("h1")!.textContent = "예약";

    expect(screenSignature(shell)).not.toBe(first);
  });
});
