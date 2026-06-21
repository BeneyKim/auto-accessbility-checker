import { describe, expect, it } from "vitest";
import { isDeepProductRouteFrame, isSameDepthVariantName, shouldTraverseFrameCandidates, ParentRedirection, normalizeStateIndicators, isListOrSearchPageUrl, isDynamicListOrSearchPage } from "../src/content/traversal";

describe("ThinQ traversal frame policy", () => {
  it("treats bottom sheet overlays as terminal screens", () => {
    expect(shouldTraverseFrameCandidates({ transitionClassification: "overlay-opened" })).toBe(false);
    expect(shouldTraverseFrameCandidates({ terminalOverlay: true })).toBe(false);
  });

  it("continues collecting candidates on in-product child screens", () => {
    expect(shouldTraverseFrameCandidates({ transitionClassification: "in-product-child" })).toBe(true);
  });

  it("identifies deep in-product route screens for back-button restore", () => {
    expect(isDeepProductRouteFrame({ transitionClassification: "in-product-child", depth: 1 })).toBe(false);
    expect(isDeepProductRouteFrame({ transitionClassification: "in-product-child", depth: 2 })).toBe(true);
    expect(isDeepProductRouteFrame({ transitionClassification: "in-product-child", depth: 3 })).toBe(true);
    expect(isDeepProductRouteFrame({ transitionClassification: "overlay-opened", depth: 3 })).toBe(false);
  });

  it("recognizes period tabs as same-depth variants", () => {
    expect(isSameDepthVariantName("1일")).toBe(true);
    expect(isSameDepthVariantName("1주")).toBe(true);
    expect(isSameDepthVariantName("1개월")).toBe(true);
    expect(isSameDepthVariantName("1년")).toBe(true);
    expect(isSameDepthVariantName("2026년")).toBe(false);
    expect(isSameDepthVariantName("2026년 5월")).toBe(false);
    expect(isSameDepthVariantName("실내 초미세먼지(PM2.5) 이력")).toBe(false);
  });

  it("verifies ParentRedirection exception properties", () => {
    const error = new ParentRedirection(2);
    expect(error).toBeInstanceOf(ParentRedirection);
    expect(error).toBeInstanceOf(Error);
    expect(error.targetDepth).toBe(2);
    expect(error.message).toBe("Redirection to parent depth 2");
  });

  it("normalizes state indicators from candidate names", () => {
    expect(normalizeStateIndicators("현재 다운로드 코스, 기름기 많은 식기 (P6)")).toBe("기름기 많은 식기 (P6)");
    expect(normalizeStateIndicators("기름기 많은 식기 (P6), 다운로드됨")).toBe("기름기 많은 식기 (P6)");
    expect(normalizeStateIndicators("스마트케어+, 사용")).toBe("스마트케어+");
    expect(normalizeStateIndicators("켜짐, 오토모드")).toBe("오토모드");
    expect(normalizeStateIndicators("식기세척기, 선택 목록")).toBe("식기세척기");
    expect(normalizeStateIndicators("고기류 구이 (P5)")).toBe("고기류 구이 (P5)");
    
    // Comma-separated setting names and dynamic values
    expect(normalizeStateIndicators("공간, 마이홈 - 주방")).toBe("공간");
    expect(normalizeStateIndicators("냉동실설정 온도, 섭씨 -18도")).toBe("냉동실설정 온도");
    expect(normalizeStateIndicators("제품 이름, 냉동고")).toBe("제품 이름");

    // Date suffix stripping
    expect(normalizeStateIndicators("보관 시작일 2026. 5. 31.")).toBe("보관 시작일");
    expect(normalizeStateIndicators("보관 시작일 2026. 5. 30.")).toBe("보관 시작일");
    expect(normalizeStateIndicators("등록 시간 2026년 5월 30일 토요일")).toBe("등록 시간");

    // Safe fallbacks for date-only buttons and date ranges
    expect(normalizeStateIndicators("2026년 5월 30일 토")).toBe("2026년 5월 30일 토");
    expect(normalizeStateIndicators("2026. 5. 24.-2026. 5. 30.")).toBe("2026. 5. 24.-2026. 5. 30.");
  });

  it("identifies list, search, and history URLs as list-like pages", () => {
    expect(isListOrSearchPageUrl("http://localhost/thinq/GWM_Cycles_Used_List_Screen")).toBe(true);
    expect(isListOrSearchPageUrl("http://localhost/thinq/GWM_Cycles_Used_Search_Screen")).toBe(true);
    expect(isListOrSearchPageUrl("http://localhost/thinq/GWM_Cycles_Used_History_Screen")).toBe(true);
    expect(isListOrSearchPageUrl("http://localhost/thinq/normal_screen")).toBe(false);
  });

  describe("isDynamicListOrSearchPage", () => {
    it("returns false if url does not contain list/search/history keywords", () => {
      const shell = document.createElement("div");
      expect(isDynamicListOrSearchPage(shell, "http://localhost/thinq/normal_screen")).toBe(false);
    });

    it("returns false for static cycle history exceptions even if URL contains keywords", () => {
      const shell = document.createElement("div");
      // GWM_Cycles_Used_List_Screen 이나 GPM_POG01_Main 같은 정적 이력/탭은 예외적으로 false를 리턴하여 캐시를 타게 만듭니다.
      expect(isDynamicListOrSearchPage(shell, "http://localhost/thinq/GWM_Cycles_Used_List_Screen")).toBe(false);
      expect(isDynamicListOrSearchPage(shell, "http://localhost/thinq/GWM_Cycles_Used_History_Screen")).toBe(false);
      expect(isDynamicListOrSearchPage(shell, "http://localhost/thinq/GPM_POG01_Main_History")).toBe(false);
    });

    it("returns true when URL contains search keyword and DOM contains a search input", () => {
      const shell = document.createElement("div");
      shell.innerHTML = `
        <form role="search">
          <input type="text" placeholder="식품명을 입력하세요" />
        </form>
      `;
      expect(isDynamicListOrSearchPage(shell, "http://localhost/thinq/food_search")).toBe(true);
    });

    it("returns true when URL contains list keyword and DOM contains repeating item classes", () => {
      const shell = document.createElement("div");
      shell.innerHTML = `
        <div>
          <div class="food-card">사과</div>
          <div class="food-card">배</div>
          <div class="food-card">감</div>
        </div>
      `;
      expect(isDynamicListOrSearchPage(shell, "http://localhost/thinq/food_list")).toBe(true);
    });

    it("returns false when URL contains list keyword but DOM has no search input and no repeating list structure", () => {
      const shell = document.createElement("div");
      shell.innerHTML = `
        <div>
          <button>단일 설정 완료</button>
        </div>
      `;
      expect(isDynamicListOrSearchPage(shell, "http://localhost/thinq/some_list")).toBe(false);
    });
  });
});
