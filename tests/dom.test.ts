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
  screenSignature,
  isCancelLikeName,
  isSaveLikeName,
  sampleLargeLists,
  filterDuplicateNamesInGroups,
  hasActionSubRoute,
  normalizeUrl,
  isAriaHidden
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

  it("sorts elements with role='tab' or children of role='tablist' at the end of the candidate list", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <button role="tab" id="tab1">냉장실</button>
        <button id="btn1">식품 추가</button>
        <button role="tab" id="tab2">냉동실</button>
        <button id="btn2">검색</button>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);

    // Candidates should have buttons first, then tabs sorted last
    const ids = candidates.map(c => c.element.id);
    expect(ids).toEqual(["btn1", "btn2", "tab1", "tab2"]);
  });

  it("assigns occurrenceIndex to duplicate-named candidates", () => {
    document.body.innerHTML = `
      <section role="dialog" data-width="900" data-height="700">
        <div><div><button id="btn1">6일 남음</button></div></div>
        <div><div><button id="btn2">6일 남음</button></div></div>
        <div><div><button id="btn3">6일 남음</button></div></div>
        <div><div><button id="btn4">다른 버튼</button></div></div>
      </section>
    `;

    const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
    const candidates = collectClickCandidates(shell);

    // Candidates should be in DOM order, btn1/btn2/btn3 should have occurrenceIndex 0, 1, 2
    const btn1 = candidates.find(c => c.element.id === "btn1")!;
    const btn2 = candidates.find(c => c.element.id === "btn2")!;
    const btn3 = candidates.find(c => c.element.id === "btn3")!;
    const btn4 = candidates.find(c => c.element.id === "btn4")!;

    expect(btn1.snapshot.occurrenceIndex).toBe(0);
    expect(btn2.snapshot.occurrenceIndex).toBe(1);
    expect(btn3.snapshot.occurrenceIndex).toBe(2);
    expect(btn4.snapshot.occurrenceIndex).toBe(0);
  });

  describe("Cancel vs Save button prioritization", () => {
    it("identifies cancel-like and save-like button names correctly", () => {
      expect(isCancelLikeName("취소")).toBe(true);
      expect(isCancelLikeName("닫기")).toBe(true);
      expect(isCancelLikeName("뒤로가기")).toBe(true);
      expect(isCancelLikeName("cancel")).toBe(true);
      expect(isCancelLikeName("close")).toBe(true);
      expect(isCancelLikeName("아니오")).toBe(true);

      expect(isSaveLikeName("저장")).toBe(true);
      expect(isSaveLikeName("등록")).toBe(true);
      expect(isSaveLikeName("확인")).toBe(true);
      expect(isSaveLikeName("완료")).toBe(true);
      expect(isSaveLikeName("적용")).toBe(true);
      expect(isSaveLikeName("추가")).toBe(true);
      expect(isSaveLikeName("생성")).toBe(true);
      expect(isSaveLikeName("save")).toBe(true);
      expect(isSaveLikeName("yes")).toBe(true);

      // Should not false-positive match keywords
      expect(isSaveLikeName("예약")).toBe(false);
      expect(isSaveLikeName("식품 정보")).toBe(false);
      expect(isCancelLikeName("소모품 정보")).toBe(false);
    });

    it("filters out Save-like button when BOTH Cancel-like and Save-like buttons are present", () => {
      document.body.innerHTML = `
        <section role="dialog" data-width="900" data-height="700">
          <button id="btnCancel">취소</button>
          <button id="btnSave">저장</button>
          <button id="btnOther">일반 버튼</button>
        </section>
      `;

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);

      const names = candidates.map(c => c.snapshot.name);
      expect(names).toContain("취소");
      expect(names).toContain("일반 버튼");
      expect(names).not.toContain("저장");
    });

    it("does NOT filter out Save-like button when NO Cancel-like button is present", () => {
      document.body.innerHTML = `
        <section role="dialog" data-width="900" data-height="700">
          <button id="btnSave">저장</button>
          <button id="btnOther">일반 버튼</button>
        </section>
      `;

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);

      const names = candidates.map(c => c.snapshot.name);
      expect(names).toContain("저장");
      expect(names).toContain("일반 버튼");
    });

    it("does NOT filter out Cancel-like button when NO Save-like button is present", () => {
      document.body.innerHTML = `
        <section role="dialog" data-width="900" data-height="700">
          <button id="btnCancel">취소</button>
          <button id="btnOther">일반 버튼</button>
        </section>
      `;

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);

      const names = candidates.map(c => c.snapshot.name);
      expect(names).toContain("취소");
      expect(names).toContain("일반 버튼");
    });
  });

  describe("Nested candidate deduplication", () => {
    it("prefers Strong parent button over Weak child div", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <button id="btnParent">
            <div id="divChild" class="rippleEffect">Nested Child</div>
          </button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("btnParent");
      expect(ids).not.toContain("divChild");
    });

    it("prefers Strong child button over Weak parent li", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <li id="liParent" class="rippleEffect">
            <button id="btnChild">Child Button</button>
          </li>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("btnChild");
      expect(ids).not.toContain("liParent");
    });

    it("prefers Weak child div over Weak parent div", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div id="divParent" class="rippleEffect">
            <div id="divChild" class="rippleEffect">Child Div</div>
          </div>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("divChild");
      expect(ids).not.toContain("divParent");
    });
  });

  describe("Repeating list sampling optimization", () => {
    it("samples 10 sibling buttons to exactly 3 buttons (first, middle, last)", () => {
      document.body.innerHTML = `
        <div id="container" role="dialog" data-width="900" data-height="700">
          <div id="list">
            <button id="item0">Item 0</button>
            <button id="item1">Item 1</button>
            <button id="item2">Item 2</button>
            <button id="item3">Item 3</button>
            <button id="item4">Item 4</button>
            <button id="item5">Item 5</button>
            <button id="item6">Item 6</button>
            <button id="item7">Item 7</button>
            <button id="item8">Item 8</button>
            <button id="item9">Item 9</button>
          </div>
          <button id="isolated">Isolated Settings</button>
        </div>
      `;

      const shell = document.getElementById("container")!;
      const candidates = collectClickCandidates(shell);

      // Candidates of the list should be sampled to exactly 3 items:
      // index 0 (item0), index 9 (item9), and exactly one middle item from [item1..item8].
      // The isolated settings button should remain.
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("item0");
      expect(ids).toContain("item9");
      expect(ids).toContain("isolated");
      expect(ids.length).toBe(4);

      const middleItems = ids.filter(id => id.startsWith("item") && id !== "item0" && id !== "item9");
      expect(middleItems.length).toBe(1);
      expect(["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8"]).toContain(middleItems[0]);
    });

    it("does NOT sample lists with fewer than 5 items", () => {
      document.body.innerHTML = `
        <div id="container" role="dialog" data-width="900" data-height="700">
          <div id="list">
            <button id="item0">Item 0</button>
            <button id="item1">Item 1</button>
            <button id="item2">Item 2</button>
            <button id="item3">Item 3</button>
          </div>
        </div>
      `;

      const shell = document.getElementById("container")!;
      const candidates = collectClickCandidates(shell);

      const ids = candidates.map(c => c.element.id);
      expect(ids).toEqual(["item0", "item1", "item2", "item3"]);
    });
  });

  describe("Sibling/cousin duplicate name filtering", () => {
    it("filters out duplicate-named candidates in sibling groups", () => {
      document.body.innerHTML = `
        <div id="container" role="dialog" data-width="900" data-height="700">
          <div id="list">
            <button id="btn1">5일 남음</button>
            <button id="btn2">5일 남음</button>
            <button id="btn3">14일 남음</button>
            <button id="btn4">14일 남음</button>
          </div>
        </div>
      `;

      const shell = document.getElementById("container")!;
      const candidates = collectClickCandidates(shell);

      const ids = candidates.map(c => c.element.id);
      expect(ids).toEqual(["btn1", "btn3"]);
    });
  });

  describe("Stable randomized list sampling", () => {
    it("selects the same middle element on multiple calls with same candidates, but changes with seed", () => {
      document.body.innerHTML = `
        <div id="container" role="dialog" data-width="900" data-height="700">
          <div id="list">
            <button id="item0">Item 0</button>
            <button id="item1">Item 1</button>
            <button id="item2">Item 2</button>
            <button id="item3">Item 3</button>
            <button id="item4">Item 4</button>
            <button id="item5">Item 5</button>
            <button id="item6">Item 6</button>
            <button id="item7">Item 7</button>
            <button id="item8">Item 8</button>
            <button id="item9">Item 9</button>
          </div>
        </div>
      `;

      const shell = document.getElementById("container")!;
      
      // Call 1
      window.__thinqSeed__ = 0.12345;
      const c1 = collectClickCandidates(shell).map(c => c.element.id);

      // Call 2 (with same seed, should be identical)
      const c2 = collectClickCandidates(shell).map(c => c.element.id);
      expect(c2).toEqual(c1);

      // Call 3 (with different seed, may pick a different middle element)
      let differentResultFound = false;
      for (let s = 1; s <= 20; s++) {
        window.__thinqSeed__ = s / 20;
        const c3 = collectClickCandidates(shell).map(c => c.element.id);
        if (c3[1] !== c1[1]) {
          differentResultFound = true;
          break;
        }
      }
      expect(differentResultFound).toBe(true);
    });
  });

  describe("hasActionSubRoute", () => {
    it("returns true for valid base64 actions like ADD or EDIT in segment 3", () => {
      // QURE is base64 for ADD
      const addUrl = "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/QURE/LTE=/Mw==/dW5kZWZpbmVk/GRM_20_FOD01_Main/001/GRM-20";
      expect(hasActionSubRoute(addUrl)).toBe(true);

      // RURJVA== is base64 for EDIT
      const editUrl = "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/RURJVA==/LTE=/Mw==/dW5kZWZpbmVk/GRM_20_FOD01_Main/001/GRM-20";
      expect(hasActionSubRoute(editUrl)).toBe(true);
    });

    it("returns false for undefined action segment or non-action segments", () => {
      const normalUrl = "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/dW5kZWZpbmVk/dW5kZWZpbmVk/dW5kZWZpbmVk/Mg==/dW5kZWZpbmVk/GRM_20_CEN01_Main/001/GRM-20";
      expect(hasActionSubRoute(normalUrl)).toBe(false);

      const emptyUrl = "https://my.lgthinq.com/";
      expect(hasActionSubRoute(emptyUrl)).toBe(false);
    });
  });

  describe("normalizeUrl", () => {
    it("normalizes dynamic base64 URL segments to wildcards", () => {
      const url1 = "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/QURE/LTE=/Mw==/dW5kZWZpbmVk/GRM_20_FOD01_Main/001/GRM-20";
      const url2 = "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/dW5kZWZpbmVk/dW5kZWZpbmVk/Mw==/dW5kZWZpbmVk/GRM_20_FOD01_Main/001/GRM-20";
      
      const n1 = normalizeUrl(url1);
      const n2 = normalizeUrl(url2);
      
      expect(n1).toBe("https://my.lgthinq.com/GRM-20/*/*/*/*/*/GRM_20_FOD01_Main/001/*");
      expect(n2).toBe("https://my.lgthinq.com/GRM-20/*/*/*/*/*/GRM_20_FOD01_Main/001/*");
    });

    it("normalizes base64 segments containing underscores to wildcards but preserves screen IDs", () => {
      const base64Param = "eyJpc0NoZWNrIjpmYWxzZSwiZm9vZElkIjoiS1JfRk9PRF8wMDAwMSIs";
      const screenId = "GRM_20_FOD02_EditFoodInfo";
      const url = `https://my.lgthinq.com/GRM-20/ZDQwNTIz/${base64Param}/${screenId}/001/GRM-20`;
      const normalized = normalizeUrl(url);
      expect(normalized).toBe("https://my.lgthinq.com/GRM-20/*/*/" + screenId + "/001/*");
    });
  });

  describe("New forbidden rules and filters for v0.99.11", () => {
    it("skips values/modes adjustments (올림/내림/좌측/우측)", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div role="button">희망 습도 올림</div>
          <div role="button">희망 습도 내림</div>
          <div role="button">풍량 좌측</div>
          <div role="button">풍량 우측</div>
          <button>정상 버튼</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const skipped = collectSkippedCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["정상 버튼"]);
      expect(skipped.map(s => s.name)).toContain("희망 습도 올림");
      expect(skipped.map(s => s.name)).toContain("풍량 우측");
    });

    it("skips device send/download actions globally", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <button>식기세척기에 다운로드</button>
          <button>오븐에 다운로드</button>
          <button>세탁기에 전송</button>
          <button>일반 다운로드</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const skipped = collectSkippedCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["일반 다운로드"]);
      expect(skipped.map(s => s.name)).toContain("식기세척기에 다운로드");
      expect(skipped.map(s => s.name)).toContain("세탁기에 전송");
    });

    it("filters out external and target _blank links", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <a href="https://my.lgthinq.com/GDM-20/sub">내부 링크</a>
          <a href="https://www.google.com" target="_self">구글 링크</a>
          <a href="https://my.lgthinq.com/GDM-20/sub" target="_blank">새창 내부 링크</a>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const skipped = collectSkippedCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["내부 링크"]);
      expect(skipped.map(s => s.reason)).toContain("blocked-external-service");
    });

    it("skips 켜짐/꺼짐 status texts and their container cards as switch-toggles", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div data-nscreenfocusable="true" class="row">
            <span>자동 문열림 건조</span>
            <span>켜짐</span>
          </div>
          <button>정상 작동 버튼</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["정상 작동 버튼"]);
    });

    it("deduplicates candidates with same name but different roles/tags under same parent", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div class="card">
            <button>취침 예약</button>
            <span>취침 예약</span>
          </div>
          <button>정상 작동 버튼</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["취침 예약", "정상 작동 버튼"]);
    });

    it("deduplicates screen-wide duplicate names favoring strong interactive elements", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div class="card1">
            <button>공통버튼</button>
          </div>
          <div class="card2">
            <span>공통버튼</span>
          </div>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["공통버튼"]);
      expect(candidates[0].snapshot.tagName).toBe("button");
    });

    it("filters out elements that are horizontally outside the active shell bounds", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700" data-left="0">
          <!-- Active tab elements inside the shell horizontal bounds -->
          <button data-left="10" data-width="100">Active Tab Button</button>
          <!-- Off-screen tab elements shifted horizontally -->
          <button data-left="950" data-width="100">Off-Screen Tab Button</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["Active Tab Button"]);
    });

    it("skips list item add/delete toggle buttons", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <button>란제리/울, 삭제</button>
          <button>이불, 추가</button>
          <button>표준코스</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const skipped = collectSkippedCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["표준코스"]);
      expect(skipped.map(s => s.name)).toContain("란제리/울, 삭제");
      expect(skipped.map(s => s.name)).toContain("이불, 추가");
    });

    it("skips status cards ending with states (like 꺼짐/켜짐) but keeps those with navigation hints", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div data-nscreenfocusable="true" aria-label="듀얼존, 꺼짐"></div>
          <div data-nscreenfocusable="true" aria-label="가습기 자동건조, 꺼짐">
            <span class="chevron">></span>
          </div>
          <button>정상 코스</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toContain("가습기 자동건조, 꺼짐");
      expect(candidates.map(c => c.snapshot.name)).toContain("정상 코스");
      expect(candidates.map(c => c.snapshot.name)).not.toContain("듀얼존, 꺼짐");
    });

    it("does not skip elements containing navigation symbols like | or >", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div data-nscreenfocusable="true" aria-label="취침 예약 | 2시간 후 꺼짐"></div>
          <div data-nscreenfocusable="true" aria-label="일반 꺼짐"></div>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toContain("취침 예약 | 2시간 후 꺼짐");
      expect(candidates.map(c => c.snapshot.name)).not.toContain("일반 꺼짐");
    });

    it("excludes label elements from candidates list to prevent native focus side effects", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <label>취침 예약</label>
          <button>취침 예약</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.role)).toEqual(["button"]);
      expect(candidates.length).toBe(1);
    });

    it("deduplicates candidates under same group when one name includes another", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div class="card">
            <button>취침 예약 1시간 58분 후 꺼짐</button>
            <button>취침 예약</button>
          </div>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      expect(candidates.map(c => c.snapshot.name)).toEqual(["취침 예약 1시간 58분 후 꺼짐"]);
      expect(candidates.length).toBe(1);
    });

    it("skips elements under ancestors with aria-hidden='true' to ignore inactive tab views", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <!-- Active Tab Panel -->
          <div id="panelActive">
            <button id="btnActive">Active Button</button>
          </div>
          <!-- Inactive Tab Panel -->
          <div id="panelInactive" aria-hidden="true">
            <button id="btnInactive">Inactive Button</button>
          </div>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const names = candidates.map(c => c.snapshot.name);
      expect(names).toContain("Active Button");
      expect(names).not.toContain("Inactive Button");
    });

    it("skips static text roles and static measurements or state values when no navigation hint", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div role="text" id="t1">388 와트시</div>
          <div data-nscreenfocusable="true" id="t2">3회</div>
          <div data-nscreenfocusable="true" id="t3">40도</div>
          <div data-nscreenfocusable="true" id="t4">강</div>
          <div data-nscreenfocusable="true" id="t5">자동</div>
          <button id="btn1">정상 작동</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("btn1");
      expect(ids).not.toContain("t1");
      expect(ids).not.toContain("t2");
      expect(ids).not.toContain("t3");
      expect(ids).not.toContain("t4");
      expect(ids).not.toContain("t5");
    });

    it("does NOT skip static-looking elements if they contain visual navigation hints", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div data-nscreenfocusable="true" id="t1">온도 40도 ></div>
          <div data-nscreenfocusable="true" id="t2">예약 2시간 | 꺼짐</div>
          <div data-nscreenfocusable="true" id="t3">388 와트시</div>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("t1");
      expect(ids).toContain("t2");
      expect(ids).not.toContain("t3");
    });

    it("skips elements nested inside a Smart Diagnosis container to avoid external diagnostics", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div data-name="smart diagnosis">
            <div>
              <button id="btnSmart">세탁</button>
            </div>
          </div>
          <button id="btnNormal">정상 작동</button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const skipped = collectSkippedCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("btnNormal");
      expect(ids).not.toContain("btnSmart");
      expect(skipped.map(s => s.reason)).toContain("blocked-external-service");
    });

    it("deduplicates multiple strong elements with the exact same accessible name within the same deep group (up to 6 levels)", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div class="card-root">
            <div>
              <div>
                <div>
                  <div>
                    <button id="btnStrong1">감 냉장실 21일 지남</button>
                    <button id="btnStrong2">감 냉장실 21일 지남</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="card-root2">
            <button id="btnOther">감 냉장실 21일 지남</button>
          </div>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("btnStrong1");
      expect(ids).toContain("btnOther");
      expect(ids).not.toContain("btnStrong2");
      expect(candidates.length).toBe(2);
    });

    it("does NOT skip strong interactive buttons even if their descendant span ends with a comma", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <button id="btnCourse" tabindex="0">
            <span aria-label="기름기 많은 식기 (P6), ">기름기 많은 식기 (P6)</span>
          </button>
          <button id="btnSetting" tabindex="0">
            <span aria-label="제품 정보, ">제품 정보</span>
          </button>
        </div>
      `;
      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("btnCourse");
      expect(ids).toContain("btnSetting");
    });

    it("does NOT skip elements containing visual navigation indicators like divider classes, icon tags, or CSS borders", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <!-- Divider Class -->
          <div data-nscreenfocusable="true" id="elDivider" aria-label="일반 꺼짐">
            <div class="separator"></div>
          </div>
          <!-- Icon Tag -->
          <div data-nscreenfocusable="true" id="elIcon" aria-label="일반 꺼짐">
            <i class="chevron-right"></i>
          </div>
          <!-- CSS Border 세로 구분선 -->
          <div data-nscreenfocusable="true" id="elBorder" aria-label="일반 꺼짐"></div>
          <button id="btnNormal">정상 작동</button>
        </div>
      `;
      // Inject vertical border style for JS-DOM
      const elBorder = document.getElementById("elBorder")!;
      elBorder.style.borderLeftStyle = "solid";
      elBorder.style.borderLeftWidth = "1px";

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);
      expect(ids).toContain("elDivider");
      expect(ids).toContain("elIcon");
      expect(ids).toContain("elBorder");
      expect(ids).toContain("btnNormal");
    });
  });

  describe("isAriaHidden & Shadow DOM & Inactive tab filtering", () => {
    it("handles isAriaHidden with normalization and Shadow DOM traversals", () => {
      // 1. Value normalization tests
      const divNormal = document.createElement("div");
      divNormal.setAttribute("aria-hidden", "true");
      expect(isAriaHidden(divNormal)).toBe(true);

      const divWhitespace = document.createElement("div");
      divWhitespace.setAttribute("aria-hidden", "   true  ");
      expect(isAriaHidden(divWhitespace)).toBe(true);

      const divMixedCase = document.createElement("div");
      divMixedCase.setAttribute("aria-hidden", "True");
      expect(isAriaHidden(divMixedCase)).toBe(true);

      const divEmptyVal = document.createElement("div");
      divEmptyVal.setAttribute("aria-hidden", "");
      expect(isAriaHidden(divEmptyVal)).toBe(true);

      const divFalse = document.createElement("div");
      divFalse.setAttribute("aria-hidden", "false");
      expect(isAriaHidden(divFalse)).toBe(false);

      // 2. Shadow DOM traversal test
      const host = document.createElement("div");
      host.setAttribute("aria-hidden", "true");
      const shadowRoot = host.attachShadow({ mode: "open" });
      const innerChild = document.createElement("button");
      shadowRoot.appendChild(innerChild);

      expect(isAriaHidden(innerChild)).toBe(true);
    });

    it("filters out candidates inside inactive tab panels", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <ul role="tablist">
            <button id="tabProduct" role="tab" aria-selected="true" aria-controls="panelProduct">제품</button>
            <button id="tabUseful" role="tab" aria-selected="false" aria-controls="panelUseful">유용한 기능</button>
          </ul>
          
          <div id="panelProduct" role="tabpanel">
            <button id="btnProduct1">제품 탭 버튼 1</button>
          </div>
          
          <div id="panelUseful" role="tabpanel">
            <button id="btnUseful1">유용한 기능 탭 버튼 1</button>
          </div>
        </div>
      `;

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);

      // 활성 탭(제품) 내부의 버튼은 후보에 수집되어야 함
      expect(ids).toContain("btnProduct1");
      // 비활성 탭(유용한 기능) 내부의 버튼은 배제(exclude)되어야 함
      expect(ids).not.toContain("btnUseful1");
    });
  });

  describe("Smart Diagnosis Deep Context Filtering (Issue 3)", () => {
    it("skips candidates that are deeply nested (up to 8 levels) inside a Smart Diagnosis container", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div aria-label="스마트 진단" class="card-root">
            <div class="level-1">
              <div class="level-2">
                <div class="level-3">
                  <div class="level-4">
                    <div class="level-5">
                      <div class="level-6">
                        <button id="btnSmart" role="button">세탁</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button id="btnNormal">일반 버튼</button>
        </div>
      `;

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);

      // 스마트진단 카드 하위에 깊게 중첩된 버튼은 수집 후보에서 제외되어야 함
      expect(ids).not.toContain("btnSmart");
      // 일반 버튼은 정상 수집되어야 함
      expect(ids).toContain("btnNormal");
    });

    it("skips candidates when parent container matches class or id patterns (sds/smart_diagnosis)", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div id="smart_diagnosis_container">
            <div>
              <button id="btnSmartId" role="button">건조</button>
            </div>
          </div>
          <div class="sds-card-wrapper">
            <div>
              <button id="btnSmartClass" role="button">세탁</button>
            </div>
          </div>
        </div>
      `;

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);

      expect(ids).not.toContain("btnSmartId");
      expect(ids).not.toContain("btnSmartClass");
    });
  });

  describe("Nested Element Name Overlap Deduplication (Issue 5)", () => {
    it("deduplicates nesting when parents have name overlap, keeping the parent container", () => {
      document.body.innerHTML = `
        <div role="dialog" data-width="900" data-height="700">
          <div id="parentCard" tabindex="0" aria-label="감" data-tux-id="card-item">
            <span id="childText" aria-label="감">감</span>
          </div>
        </div>
      `;

      const shell = document.querySelector<HTMLElement>("[role='dialog']")!;
      const candidates = collectClickCandidates(shell);
      const ids = candidates.map(c => c.element.id);

      // 부모인 parentCard만 수집되고, 텍스트가 겹치는 자식 childText는 지워져야 함
      expect(ids).toContain("parentCard");
      expect(ids).not.toContain("childText");
    });
  });
});
