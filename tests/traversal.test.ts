import { describe, expect, it } from "vitest";
import { isDeepProductRouteFrame, isSameDepthVariantName, shouldTraverseFrameCandidates, ParentRedirection } from "../src/content/traversal";

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
});
