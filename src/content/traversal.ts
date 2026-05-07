export interface TraversalFrameFlags {
  transitionClassification?: string;
  terminalOverlay?: boolean;
}

export function shouldTraverseFrameCandidates(frame: TraversalFrameFlags): boolean {
  return !(frame.terminalOverlay || frame.transitionClassification === "overlay-opened");
}

const SAME_DEPTH_VARIANT_PATTERNS = [
  /^\d+\s*(일|주|개월|월|년)$/,
  /^(day|week|month|year)$/i,
  /^\d+\s*(day|days|week|weeks|month|months|year|years)$/i
];

export function isSameDepthVariantName(name: string): boolean {
  const normalizedName = name.replace(/\s+/g, " ").trim();
  return SAME_DEPTH_VARIANT_PATTERNS.some((pattern) => pattern.test(normalizedName));
}
