export interface TraversalFrameFlags {
  transitionClassification?: string;
  terminalOverlay?: boolean;
}

export function shouldTraverseFrameCandidates(frame: TraversalFrameFlags): boolean {
  return !(frame.terminalOverlay || frame.transitionClassification === "overlay-opened");
}
