import { describe, expect, it } from "vitest";
import { shouldTraverseFrameCandidates } from "../src/content/traversal";

describe("ThinQ traversal frame policy", () => {
  it("treats bottom sheet overlays as terminal screens", () => {
    expect(shouldTraverseFrameCandidates({ transitionClassification: "overlay-opened" })).toBe(false);
    expect(shouldTraverseFrameCandidates({ terminalOverlay: true })).toBe(false);
  });

  it("continues collecting candidates on in-product child screens", () => {
    expect(shouldTraverseFrameCandidates({ transitionClassification: "in-product-child" })).toBe(true);
  });
});
