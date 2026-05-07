import { describe, expect, it } from "vitest";
import { isSameDepthVariantName, shouldTraverseFrameCandidates } from "../src/content/traversal";

describe("ThinQ traversal frame policy", () => {
  it("treats bottom sheet overlays as terminal screens", () => {
    expect(shouldTraverseFrameCandidates({ transitionClassification: "overlay-opened" })).toBe(false);
    expect(shouldTraverseFrameCandidates({ terminalOverlay: true })).toBe(false);
  });

  it("continues collecting candidates on in-product child screens", () => {
    expect(shouldTraverseFrameCandidates({ transitionClassification: "in-product-child" })).toBe(true);
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
});
