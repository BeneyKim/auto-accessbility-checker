export class ParentRedirection extends Error {
  constructor(public targetDepth: number) {
    super(`Redirection to parent depth ${targetDepth}`);
    Object.setPrototypeOf(this, ParentRedirection.prototype);
  }
}

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

export function normalizeStateIndicators(name: string): string {
  let res = name;

  // Strip prefixes
  res = res.replace(/^(현재 다운로드 코스|선택됨|사용 중|사용|켜짐|꺼짐),\s*/i, "");
  // Strip suffixes
  res = res.replace(/,\s*(다운로드됨|사용 중|사용|선택됨|켜짐|꺼짐|선택 목록)$/i, "");

  // Strip comma-separated dynamic values (e.g. "공간, 마이홈 - 주방" -> "공간")
  if (res.includes(",")) {
    const firstPart = res.split(",")[0].trim();
    if (firstPart.length > 0) {
      res = firstPart;
    }
  }

  // Strip date suffixes (e.g. "보관 시작일 2026. 5. 31." -> "보관 시작일")
  const dateStripped = res
    .replace(/\s*\b\d{4}[./-]\s*\d{1,2}[./-]\s*\d{1,2}\.?/g, "")
    .replace(/\s*\b\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일(?:\s*[가-힣]{1,3}(?:요일)?)?/g, "")
    .trim();

  if (dateStripped.length > 0 && /[a-zA-Z0-9가-힣]/.test(dateStripped)) {
    res = dateStripped;
  }

  return res.replace(/\s+/g, " ").trim();
}

export function isListOrSearchPageUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.includes("list") || urlLower.includes("search") || urlLower.includes("history");
}

export function isDynamicListOrSearchPage(shell: HTMLElement | null, url: string): boolean {
  const urlLower = url.toLowerCase();

  // 1. URL 1차 키워드 매칭
  const hasKeyword = urlLower.includes("list") || urlLower.includes("search") || urlLower.includes("history");
  if (!hasKeyword) {
    return false;
  }

  // 2. 정적 이력 화면 예외 처리 (워시타워 사용이력, 공기청정기 이력 등은 캐시 대상이 되도록 false 반환)
  if (urlLower.includes("cycles_used") || urlLower.includes("gwm_cycles") || urlLower.includes("pog01")) {
    return false;
  }

  if (!shell) {
    return true; // 폴백
  }

  // 3. DOM 구조 실질 판별
  // (A) 검색 Input 요소 감지
  const hasSearchInput = Boolean(
    shell.querySelector('input[type="search"]') ||
    shell.querySelector('input[placeholder*="검색"]') ||
    shell.querySelector('input[placeholder*="search" i]') ||
    shell.querySelector('[role="search"]')
  );

  // (B) 목록 반복 구조 감지 (ul, ol, role=list, role=grid, 또는 item/card 클래스 3개 이상)
  const hasListElements = Boolean(
    shell.querySelector('ul') ||
    shell.querySelector('ol') ||
    shell.querySelector('[role="list"]') ||
    shell.querySelector('[role="grid"]') ||
    shell.querySelectorAll('[class*="item" i]').length >= 3 ||
    shell.querySelectorAll('[class*="card" i]').length >= 3
  );

  return hasSearchInput || hasListElements;
}

