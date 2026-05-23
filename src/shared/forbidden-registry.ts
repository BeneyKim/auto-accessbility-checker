/**
 * Forbidden Button Registry
 *
 * 명시적, 관리 가능한 금지 버튼 레지스트리.
 * 새 제품에서 새 금지 버튼 발견 시, 이 파일에 규칙 한 줄을 추가하면 됩니다.
 */

// ─── Categories ──────────────────────────────────────────
export type ForbiddenCategory =
  | "exit-to-home"          // ThinQ Home으로 돌아가는 버튼
  | "exit-to-external"      // 제품 외부 서비스로 이동 (스마트루틴, 소모품 등)
  | "close-product-view"    // 제품 뷰 자체를 닫는 버튼 (X, 닫기)
  | "back-navigation"       // 뒤로 이동 (이전 화면으로 돌아가는 버튼)
  | "branch-tab"            // 브랜치 탭 (제품/유용한기능/설정 — 크롤러가 직접 관리)
  | "switch-toggle"         // ON/OFF 토글 (상태 변경만, 화면 전환 없음)
  | "state-control"         // 이전/다음 날짜 등 상태 제어
  | "media-service"         // ThinQ PLAY 등 미디어 서비스
  | "chart-control"         // 그래프/차트 내부 컨트롤
  | "static-container";     // 대형 정적 컨테이너

// ─── Rule definition ─────────────────────────────────────
export interface ForbiddenRule {
  /** Unique rule ID for debugging/reporting */
  id: string;
  /** Category of the forbidden action */
  category: ForbiddenCategory;
  /** Human-readable description (Korean + English) */
  description: string;
  /** Text/name pattern to match against accessible name */
  textPattern?: RegExp;
  /** Class name pattern */
  classPattern?: RegExp;
  /** href pattern (for link elements) */
  hrefPattern?: RegExp;
  /** data-* attribute pattern (matched against all data attributes) */
  dataPattern?: RegExp;
  /** Match only if element role matches */
  roleFilter?: string;
}

// ─── Registry ────────────────────────────────────────────

export const FORBIDDEN_RULES: readonly ForbiddenRule[] = [
  // ── exit-to-home: ThinQ Home으로 이동 ──
  {
    id: "home-thinq-web",
    category: "exit-to-home",
    description: "ThinQ Web 로고 / 홈 이동",
    textPattern: /ThinQ\s*Web/i,
  },
  {
    id: "home-dashboard-move",
    category: "exit-to-home",
    description: "홈 대시보드로 이동 버튼",
    textPattern: /home.*dashboard.*(move|go|open)|dashboard.*(move|go|open)|홈.*대시보드.*이동|대시보드.*이동/i,
  },
  {
    id: "home-button-text",
    category: "exit-to-home",
    description: "\"홈\" 또는 \"Home\" 텍스트 버튼",
    textPattern: /^홈$|^home$/i,
  },

  // ── close-product-view: 제품 화면 닫기 ──
  {
    id: "close-popup",
    category: "close-product-view",
    description: "팝업/창 닫기 버튼",
    textPattern: /팝업.*닫기|창.*닫기/,
  },
  {
    id: "close-text",
    category: "close-product-view",
    description: "닫기 텍스트 버튼",
    textPattern: /^닫기$|close/i,
  },
  {
    id: "close-x-button",
    category: "close-product-view",
    description: "X 버튼",
    textPattern: /^X$/,
  },
  {
    id: "close-refresh",
    category: "close-product-view",
    description: "새로고침/refresh/reload 버튼",
    textPattern: /새로고침|refresh|reload/i,
  },

  // ── back-navigation: 뒤로 이동 ──
  {
    id: "back-text",
    category: "back-navigation",
    description: "뒤로/이전/Back 버튼",
    textPattern: /^뒤로$|^이전$|^back$/i,
  },

  // ── branch-tab: 브랜치 탭 (탐색 엔진이 직접 관리) ──
  {
    id: "tab-product",
    category: "branch-tab",
    description: "제품 탭",
    textPattern: /^제품$/,
  },
  {
    id: "tab-useful-features",
    category: "branch-tab",
    description: "유용한 기능 탭",
    textPattern: /^유용한\s*기능$/,
  },
  {
    id: "tab-settings",
    category: "branch-tab",
    description: "설정 탭/버튼",
    textPattern: /^설정$|^settings$/i,
  },

  // ── exit-to-external: 제품 외부 서비스 이동 ──
  {
    id: "ext-smart-routine",
    category: "exit-to-external",
    description: "스마트루틴 (스마트 루틴) — 제품 외부 서비스",
    textPattern: /스마트\s*루틴|smart\s*routine/i,
  },
  {
    id: "ext-consumables",
    category: "exit-to-external",
    description: "소모품 정보 — 제품 외부 서비스",
    textPattern: /소모품\s*정보|consumable/i,
  },
  {
    id: "ext-cleaning-service",
    category: "exit-to-external",
    description: "가전세척 서비스 신청하기 — 제품 외부 서비스",
    textPattern: /가전\s*세척.*신청|appliance.*cleaning/i,
  },
  {
    id: "ext-smart-diagnosis",
    category: "exit-to-external",
    description: "스마트 진단 — 제품 외부 서비스",
    textPattern: /스마트\s*진단|smart\s*diagnosis/i,
  },
  {
    id: "ext-shopping-link",
    category: "exit-to-external",
    description: "소모품 쇼핑몰 링크 (새 창 열림)",
    textPattern: /새\s*창\s*열림/,
  },

  // ── media-service: ThinQ PLAY ──
  {
    id: "media-thinq-play",
    category: "media-service",
    description: "ThinQ PLAY 서비스 (제품에 따라 유무)",
    textPattern: /ThinQ\s*PLAY/i,
  },

  // ── state-control: 이전/다음 상태 제어 ──
  {
    id: "state-period-paging",
    category: "state-control",
    description: "이전/다음 일/날/주/달/월/연도 등 기간 페이징",
    textPattern: /^(이전|다음)\s*(일|날짜|날|주|달|월|개월|연도|년)$/,
  },
  {
    id: "state-period-paging-partial",
    category: "state-control",
    description: "이전/다음 기간 페이징 (부분 매칭)",
    textPattern: /(이전|다음)\s*(일|날짜|날|주|달|월|개월|연도|년)/,
  },
  {
    id: "state-period-paging-en",
    category: "state-control",
    description: "Previous/Next day/week/month/year",
    textPattern: /^(previous|next)\s*(day|date|week|month|year)$/i,
  },
  {
    id: "state-carousel-nav",
    category: "state-control",
    description: "캐러셀 이전/다음 (,로 구분된 이전/다음)",
    textPattern: /,\s*(이전|다음)$/,
  },
  {
    id: "state-mode-level",
    category: "state-control",
    description: "세기/모드/단계/레벨 이전/다음",
    textPattern: /\b(이전|다음)\b.*(세기|모드|단계|레벨)|(세기|모드|단계|레벨).*\b(이전|다음)\b/,
  },
] as const;

// ─── Lookup helpers ──────────────────────────────────────

/**
 * Check if an accessible name matches any forbidden rule.
 * Returns the matching rule or undefined.
 */
export function matchForbiddenRule(name: string, element?: HTMLElement): ForbiddenRule | undefined {
  const trimmedName = name.replace(/\s+/g, " ").trim();
  if (!trimmedName && !element) return undefined;

  for (const rule of FORBIDDEN_RULES) {
    if (rule.textPattern && rule.textPattern.test(trimmedName)) {
      // Check role filter if specified
      if (rule.roleFilter && element) {
        const role = element.getAttribute("role") ?? element.tagName.toLowerCase();
        if (role !== rule.roleFilter) continue;
      }
      return rule;
    }
    if (element) {
      if (rule.classPattern && rule.classPattern.test(String(element.className ?? ""))) {
        return rule;
      }
      if (rule.hrefPattern) {
        const href = element.getAttribute("href");
        if (href && rule.hrefPattern.test(href)) {
          return rule;
        }
      }
      if (rule.dataPattern) {
        for (const attr of element.attributes) {
          if (attr.name.startsWith("data-") && rule.dataPattern.test(attr.value)) {
            return rule;
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * Get all forbidden rules for a given category.
 */
export function getRulesByCategory(category: ForbiddenCategory): ForbiddenRule[] {
  return FORBIDDEN_RULES.filter(r => r.category === category);
}

/**
 * Map a matched forbidden rule to the skip reason string used by the crawler.
 */
export function ruleToSkipReason(rule: ForbiddenRule): string {
  switch (rule.category) {
    case "exit-to-home": return "blocked-navigation";
    case "exit-to-external": return "blocked-external-service";
    case "close-product-view": return "blocked-navigation";
    case "back-navigation": return "blocked-back-navigation";
    case "branch-tab": return "root-branch-tab";
    case "switch-toggle": return "switch-toggle";
    case "state-control": return "state-control";
    case "media-service": return "blocked-navigation";
    case "chart-control": return "chart-data-control";
    case "static-container": return "static-composite-container";
  }
}
