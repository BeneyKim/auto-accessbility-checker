export interface TraversalFrameFlags {
  transitionClassification?: string;
  terminalOverlay?: boolean;
  depth?: number;
}

export function shouldTraverseFrameCandidates(frame: TraversalFrameFlags): boolean {
  return !(frame.terminalOverlay || frame.transitionClassification === "overlay-opened");
}

export function isDeepProductRouteFrame(frame: TraversalFrameFlags): boolean {
  return frame.transitionClassification === "in-product-child" && (frame.depth ?? 0) >= 2;
}

const SAME_DEPTH_VARIANT_PATTERNS = [
  /^1\s*(일|주|개월|년)$/,
  /^(day|week|month|year)$/i,
  /^1\s*(day|days|week|weeks|month|months|year|years)$/i
];

export function isSameDepthVariantName(name: string): boolean {
  const normalizedName = name.replace(/\s+/g, " ").trim();
  return SAME_DEPTH_VARIANT_PATTERNS.some((pattern) => pattern.test(normalizedName));
}
