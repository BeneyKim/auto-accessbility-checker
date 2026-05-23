import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectClickCandidates,
  collectSkippedCandidates,
  extractScreenTitle,
  findProductShell,
  findRequiredControls,
  getProductBoundary,
  isBlockedNavigationName,
  isDatePickerTriggerName,
  screenSignature
} from "../src/content/dom";

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

  it("detects product tabs from the ThinQ footer while settings stays in the product body", () => {
    document.body.innerHTML = `
      <div id="root_container">
        <div id="body_container" data-width="900" data-height="700">
          <div data-name="prodAppBar">
            <button tabindex="0" role="button" aria-label="설정" data-top="170" data-left="840" data-width="48" data-height="48"></button>
          </div>
          <h2 aria-label="공기청정기">공기청정기</h2>
        </div>
        <div id="$$root_footer">
          <div id="bottom_navigator_bar">
            <div data-name="prodMainTabbar">
              <ul role="tablist">
                <li role="tab" tabindex="0" aria-selected="true"><span>제품</span></li>
                <li role="tab" tabindex="0" aria-selected="false"><span>유용한 기능</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    const controls = findRequiredControls();

    expect(controls).toBeDefined();
    expect(controls?.productTab.getAttribute("role")).toBe("tab");
    expect(controls?.usefulFeaturesTab.getAttribute("role")).toBe("tab");
    expect(controls?.settingsButton.getAttribute("aria-label")).toBe("설정");
  });

  it("uses body_container as the ThinQ product shell when footer tabbar is outside it", () => {
    document.body.innerHTML = `
      <div id="body_container" data-width="900" data-height="700">
        <div data-name="prodAppBar">
          <button tabindex="0" role="button" aria-label="설정" data-top="170" data-left="840" data-width="48" data-height="48"></button>
        </div>
        <div data-nscreenfocusable="nscreenFocusable" tabindex="0" data-width="600" data-height="90">
          <span>예약</span>
        </div>
      </div>
      <div id="$$root_footer">
        <div data-name="prodMainTabbar">
          <ul role="tablist">
            <li role="tab" tabindex="0" aria-selected="true"><span>제품</span></li>
            <li role="tab" tabindex="0" aria-selected="false"><span>유용한 기능</span></li>
          </ul>
        </div>
      </div>
    `;

    const shell = findProductShell();
    const controls = findRequiredControls();
    const candidates = collectClickCandidates(shell);

    expect(shell.id).toBe("body_container");
    expect(controls).toBeDefined();
    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["예약"]);
  });

  it("does not select a background-only image container as the product shell", () => {
    document.body.innerHTML = `
      <div id="background_img_container" style="position: absolute" data-width="1200" data-height="900"></div>
      <div id="real_product_panel" style="position: absolute" data-width="900" data-height="700">
        <button>예약</button>
      </div>
    `;

    const shell = findProductShell();

    expect(shell.id).toBe("real_product_panel");
  });

  it("does not expose document.body as the product boundary", () => {
    document.body.innerHTML = `
      <main data-width="900" data-height="700">
        <button>홈 화면 버튼</button>
      </main>
    `;

    expect(getProductBoundary()).toBeUndefined();
  });

  it("skips ThinQ PLAY, close, branch tabs, and switch-like controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button>뒤로</button>
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
    expect(skipped.map((candidate) => candidate.reason)).toContain("blocked-back-navigation");
    expect(skipped.map((candidate) => candidate.reason)).toContain("switch-toggle");
    expect(skipped.map((candidate) => candidate.reason)).toContain("root-branch-tab");
  });

  it("blocks home dashboard, popup close, and refresh navigation controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button>ThinQ Web 홈 대시보드로 이동</button>
        <button>팝업 창 닫기</button>
        <button>새로고침</button>
        <button>실내 초미세먼지(PM2.5) 이력</button>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["실내 초미세먼지(PM2.5) 이력"]);
    expect(skipped.map((candidate) => candidate.reason)).toEqual(["blocked-navigation", "blocked-navigation", "blocked-navigation"]);
    expect(isBlockedNavigationName("ThinQ Web 홈 대시보드로 이동")).toBe(true);
  });

  it("skips period paging controls as state controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button>이전 연도</button>
        <button>다음 연도</button>
        <button>이전 월</button>
        <button>다음 주</button>
        <button>공기질 측정 기준</button>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["공기질 측정 기준"]);
    expect(skipped.map((candidate) => candidate.reason)).toEqual(["state-control", "state-control", "state-control", "state-control"]);
  });

  it("keeps date picker dropdown triggers while skipping period paging controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button>이전 날짜</button>
        <div data-width="240" data-height="48">
          <span>2026년 5월 7일 목</span>
          <span aria-hidden="true">⌄</span>
        </div>
        <button>다음 날짜</button>
        <div data-width="180" data-height="48">
          <span>2025년</span>
          <span class="chevron-down"></span>
        </div>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["2026년 5월 7일 목 ⌄", "2025년"]);
    expect(skipped.map((candidate) => candidate.reason)).toEqual(["state-control", "state-control"]);
    expect(isDatePickerTriggerName("2026년 5월 7일 목")).toBe(true);
    expect(isDatePickerTriggerName("2025년")).toBe(true);
  });

  it("skips chart x-axis and touchframe controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <div tabindex="0" role="img" aria-label="실내 초미세먼지 이력 그래프" class="X_GRAPH_SVG" data-width="700" data-height="200">
          <div class="canvas">
            <div class="touchframe" tabindex="0" aria-label="12시" data-width="600" data-height="120"></div>
          </div>
          <div class="graph"></div>
        </div>
        <button>공기질 측정 기준</button>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["공기질 측정 기준"]);
    expect(skipped.map((candidate) => candidate.reason)).toContain("chart-data-control");
  });

  it("skips large static composite containers around chart and date controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <div tabindex="0" data-width="850" data-height="200">
          <span>1일</span><span>1주</span><span>1개월</span><span>1년</span>
          <span>2026년 5월 7일 목</span><span>⌄</span>
          <div>0 15 35 75 100 1 5 9 13 17 21 25 29 (㎍/㎥)</div>
          <div>초미세먼지(PM2.5) 측정 기준 단위: ㎍/㎥ 좋음 0-15 보통 16-35 나쁨 36-75 매우 나쁨 76- 측정된 수치는 실제와 차이가 있을 수 있습니다.</div>
        </div>
        <div data-width="240" data-height="48">
          <span>2026년 5월 7일 목</span><span>⌄</span>
        </div>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["2026년 5월 7일 목⌄"]);
    expect(skipped.map((candidate) => candidate.reason)).toContain("static-composite-container");
  });

  it("does not use blocked navigation headings as screen titles", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <div role="heading" aria-level="1" aria-label="ThinQ Web 홈 대시보드로 이동"></div>
        <div role="heading" aria-level="1">실내 공기질</div>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;

    expect(extractScreenTitle(shell, "제품")).toBe("실내 공기질");
  });

  it("collects ThinQ custom focusable rows as navigation candidates", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <div data-nscreenfocusable="nscreenFocusable" tabindex="0" data-width="600" data-height="90">
          <span>예약</span>
          <span class="sc-papXJ rippleEffect"></span>
        </div>
        <div data-nscreenfocusable="nscreenFocusable" role="switch" data-width="180" data-height="80">
          <span>청정 표시등</span>
        </div>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["예약"]);
    expect(skipped.map((candidate) => candidate.reason)).toContain("switch-toggle");
  });

  it("keeps parent rows that contain switch-like controls when the row itself is actionable", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <div data-nscreenfocusable="nscreenFocusable" tabindex="0" data-width="600" data-height="90">
          <span>취침 예약</span>
          <span role="switch" aria-checked="false"></span>
        </div>
        <div data-nscreenfocusable="nscreenFocusable" tabindex="0" data-width="600" data-height="90">
          <span>예약</span>
        </div>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["취침 예약", "예약"]);
    expect(skipped.map((candidate) => candidate.reason)).not.toContain("switch-toggle");
  });

  it("keeps fan speed controls but skips carousel previous and next controls", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button>청정 세기 약</button>
        <button>청정 세기, 이전</button>
        <button>청정 세기, 다음</button>
        <button>예약</button>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((candidate) => candidate.snapshot.name)).toEqual(["청정 세기 약", "예약"]);
    expect(skipped.map((candidate) => candidate.reason)).toContain("state-control");
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

  it("blocks external service buttons: 소모품 정보, 가전세척, 스마트 진단, ThinQ PLAY", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button>소모품 정보</button>
        <button>가전세척 서비스 신청하기</button>
        <button>스마트 진단</button>
        <button>ThinQ PLAY</button>
        <button>스마트 루틴</button>
        <button>예약</button>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);
    const skipped = collectSkippedCandidates(shell);

    expect(candidates.map((c) => c.snapshot.name)).toEqual(["예약"]);
    expect(skipped.map((c) => c.name)).toContain("소모품 정보");
    expect(skipped.map((c) => c.name)).toContain("가전세척 서비스 신청하기");
    expect(skipped.map((c) => c.name)).toContain("스마트 진단");
    expect(skipped.map((c) => c.name)).toContain("ThinQ PLAY");
    expect(skipped.map((c) => c.name)).toContain("스마트 루틴");
    expect(skipped.map((c) => c.reason)).toContain("blocked-external-service");
    expect(skipped.map((c) => c.reason)).toContain("blocked-navigation");
  });

  it("blocks external service buttons with partial text matching", () => {
    expect(isBlockedNavigationName("소모품 정보")).toBe(true);
    expect(isBlockedNavigationName("가전세척 서비스 신청하기")).toBe(true);
    expect(isBlockedNavigationName("스마트 진단")).toBe(true);
    expect(isBlockedNavigationName("ThinQ PLAY")).toBe(true);
    expect(isBlockedNavigationName("스마트 루틴")).toBe(true);
    // Recon 발견: 쇼핑링크 차단
    expect(isBlockedNavigationName("LG 360° 공기청정기 퓨리청정 H 필터 할인가 58,900원 새 창 열림")).toBe(true);
    // Recon 발견: 이전 날/달 차단
    expect(isBlockedNavigationName("이전 날")).toBe(true);
    expect(isBlockedNavigationName("이전 달")).toBe(true);
    // 날짜 표시는 차단하지 않음
    expect(isBlockedNavigationName("2026년 5월 10일 일요일")).toBe(false);
    expect(isBlockedNavigationName("예약")).toBe(false);
    expect(isBlockedNavigationName("실내 공기질")).toBe(false);
  });
});
