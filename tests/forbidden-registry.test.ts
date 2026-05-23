import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_RULES,
  matchForbiddenRule,
  getRulesByCategory,
  ruleToSkipReason,
} from "../src/shared/forbidden-registry";

describe("Forbidden Button Registry", () => {
  it("has unique IDs for all rules", () => {
    const ids = FORBIDDEN_RULES.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("matches ThinQ Home navigation buttons", () => {
    expect(matchForbiddenRule("ThinQ Web 홈 대시보드로 이동")).toBeDefined();
    expect(matchForbiddenRule("ThinQ Web 홈 대시보드로 이동")?.category).toBe("exit-to-home");
    expect(matchForbiddenRule("홈")).toBeDefined();
    expect(matchForbiddenRule("Home")).toBeDefined();
  });

  it("matches close/refresh buttons", () => {
    expect(matchForbiddenRule("닫기")?.category).toBe("close-product-view");
    expect(matchForbiddenRule("close")?.category).toBe("close-product-view");
    expect(matchForbiddenRule("X")?.category).toBe("close-product-view");
    expect(matchForbiddenRule("새로고침")?.category).toBe("close-product-view");
    expect(matchForbiddenRule("refresh")?.category).toBe("close-product-view");
  });

  it("matches back navigation buttons", () => {
    expect(matchForbiddenRule("뒤로")?.category).toBe("back-navigation");
    expect(matchForbiddenRule("이전")?.category).toBe("back-navigation");
    expect(matchForbiddenRule("Back")?.category).toBe("back-navigation");
  });

  it("matches branch tabs", () => {
    expect(matchForbiddenRule("제품")?.category).toBe("branch-tab");
    expect(matchForbiddenRule("유용한 기능")?.category).toBe("branch-tab");
    expect(matchForbiddenRule("설정")?.category).toBe("branch-tab");
    expect(matchForbiddenRule("Settings")?.category).toBe("branch-tab");
  });

  it("matches external service buttons", () => {
    expect(matchForbiddenRule("스마트 루틴")?.category).toBe("exit-to-external");
    expect(matchForbiddenRule("소모품 정보")?.category).toBe("exit-to-external");
    expect(matchForbiddenRule("가전세척 서비스 신청하기")?.category).toBe("exit-to-external");
    expect(matchForbiddenRule("스마트 진단")?.category).toBe("exit-to-external");
  });

  it("matches ThinQ PLAY", () => {
    expect(matchForbiddenRule("ThinQ PLAY")?.category).toBe("media-service");
    expect(matchForbiddenRule("ThinQ Play")?.category).toBe("media-service");
  });

  it("matches state control buttons including 날/달", () => {
    expect(matchForbiddenRule("이전 연도")?.category).toBe("state-control");
    expect(matchForbiddenRule("다음 월")?.category).toBe("state-control");
    expect(matchForbiddenRule("이전 주")?.category).toBe("state-control");
    expect(matchForbiddenRule("previous year")?.category).toBe("state-control");
    expect(matchForbiddenRule("next month")?.category).toBe("state-control");
    // Recon 발견: "이전 날" / "이전 달" 차단 확인
    expect(matchForbiddenRule("이전 날")?.category).toBe("state-control");
    expect(matchForbiddenRule("이전 달")?.category).toBe("state-control");
    expect(matchForbiddenRule("다음 날")?.category).toBe("state-control");
    expect(matchForbiddenRule("다음 달")?.category).toBe("state-control");
  });

  it("does not match legitimate navigation candidates", () => {
    expect(matchForbiddenRule("예약")).toBeUndefined();
    expect(matchForbiddenRule("실내 공기질")).toBeUndefined();
    expect(matchForbiddenRule("실내 초미세먼지(PM2.5) 이력")).toBeUndefined();
    expect(matchForbiddenRule("청정 세기 약")).toBeUndefined();
    expect(matchForbiddenRule("공기질 측정 기준")).toBeUndefined();
    expect(matchForbiddenRule("취침 예약")).toBeUndefined();
    // 날짜 표시는 DatePicker 트리거이므로 차단하지 않음
    expect(matchForbiddenRule("2026년 5월 10일 일요일")).toBeUndefined();
    expect(matchForbiddenRule("2026년 5월")).toBeUndefined();
  });

  it("maps rules to correct skip reasons", () => {
    const homeRule = matchForbiddenRule("ThinQ Web 홈 대시보드로 이동");
    expect(homeRule).toBeDefined();
    expect(ruleToSkipReason(homeRule!)).toBe("blocked-navigation");

    const extRule = matchForbiddenRule("소모품 정보");
    expect(extRule).toBeDefined();
    expect(ruleToSkipReason(extRule!)).toBe("blocked-external-service");

    const backRule = matchForbiddenRule("뒤로");
    expect(backRule).toBeDefined();
    expect(ruleToSkipReason(backRule!)).toBe("blocked-back-navigation");

    const stateRule = matchForbiddenRule("이전 연도");
    expect(stateRule).toBeDefined();
    expect(ruleToSkipReason(stateRule!)).toBe("state-control");
  });

  it("returns rules by category", () => {
    const externalRules = getRulesByCategory("exit-to-external");
    expect(externalRules.length).toBeGreaterThanOrEqual(5);
    expect(externalRules.map((r) => r.id)).toContain("ext-smart-routine");
    expect(externalRules.map((r) => r.id)).toContain("ext-consumables");
    expect(externalRules.map((r) => r.id)).toContain("ext-cleaning-service");
    expect(externalRules.map((r) => r.id)).toContain("ext-smart-diagnosis");
    expect(externalRules.map((r) => r.id)).toContain("ext-shopping-link");
  });

  it("blocks shopping links with '새 창 열림' text", () => {
    const longName = "LG 360° 공기청정기 퓨리청정 H 필터 (PFSAHC01) ADQ30041412 할인율 14% 할인가 58,900원 정가 69,000원 11개 중에서 1번째 새 창 열림";
    expect(matchForbiddenRule(longName)?.category).toBe("exit-to-external");
    expect(matchForbiddenRule(longName)?.id).toBe("ext-shopping-link");
    expect(ruleToSkipReason(matchForbiddenRule(longName)!)).toBe("blocked-external-service");
  });
});
