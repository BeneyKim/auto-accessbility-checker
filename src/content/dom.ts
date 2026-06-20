import type { Branch, CandidateSnapshot } from "../shared/types";
import { matchForbiddenRule, ruleToSkipReason } from "../shared/forbidden-registry";
import { normalizeStateIndicators } from "./traversal";


declare global {
  interface Window {
    __thinqSeed__?: number;
  }
}

const BLOCKED_TEXT_PATTERNS = [
  /ThinQ\s*Web/i,
  /ThinQ\s*PLAY/i,
  /home.*dashboard.*(move|go|open)/i,
  /dashboard.*(move|go|open)/i,
  /홈.*대시보드.*이동/,
  /대시보드.*이동/,
  /팝업.*닫기/,
  /창.*닫기/,
  /닫기/,
  /새로고침|refresh|reload/i,
  /^X$/,
  /close/i,
  /^닫기$/,
  /^홈$/,
  /^home$/i,
  /^설정$/,
  /^settings$/i,
  /^제품$/,
  /^유용한\s*기능$/
];

const BACK_TEXT_PATTERNS = [/뒤로/, /이전/, /back/i];

const NAVIGABLE_ROLES = new Set(["button", "link", "menuitem", "option", "tab"]);

const STATE_CONTROL_PATTERNS = [
  /^(이전|다음)\s*(일|날짜|주|월|개월|연도|년)$/,
  /(이전|다음)\s*(일|날짜|주|월|개월|연도|년)/,
  /^(previous|next)\s*(day|date|week|month|year)$/i,
  /,\s*(이전|다음)$/,
  /\b(이전|다음)\b.*(세기|모드|단계|레벨)/,
  /(세기|모드|단계|레벨).*\b(이전|다음)\b/
];

const DATE_PICKER_TRIGGER_PATTERNS = [
  /\d{4}\s*년/,
  /\d{1,2}\s*월/,
  /\d{1,2}\s*일/,
  /\b(today|yesterday|tomorrow)\b/i,
  /오늘|어제|내일|이번\s*(주|달|월|년)|지난\s*(주|달|월|년)/
];

const DROPDOWN_MARKER_PATTERN = /[∨⌄⌵˅▾▿▼▽﹀]|chevron|arrow.*down|down.*arrow|dropdown|drop-down|select/i;

const CHART_CONTROL_PATTERN = /그래프|차트|graph|chart/i;
const CHART_STRUCTURE_SELECTOR = [
  ".touchframe",
  "g.graph",
  "g.canvas",
  "[class*='GRAPH']",
  "[class*='graph']",
  "[class*='chart']",
  "[aria-label*='그래프']",
  "[aria-label*='차트']"
].join(",");

const INTERACTIVE_SELECTORS = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='tab']",
  "[tabindex]:not([tabindex='-1'])",
  "[aria-haspopup]",
  "[aria-expanded]",
  "[data-nscreenfocusable]",
  "[data-tux-id]",
  "summary",
  "select",
  "[class*='rippleEffect']"
];

export interface RequiredControls {
  shell: HTMLElement;
  productTab: HTMLElement;
  usefulFeaturesTab: HTMLElement;
  settingsButton: HTMLElement;
}

export interface RequiredControlsDiagnostic {
  productTabFound: boolean;
  usefulFeaturesTabFound: boolean;
  settingsButtonFound: boolean;
  shellTagName: string;
  shellRole: string;
  tabbarFound: boolean;
  tabbarTextSample: string;
  shellTextSample: string;
}

export interface ClickCandidate {
  element: HTMLElement;
  snapshot: CandidateSnapshot;
}

export function getProductBoundary(root: ParentNode = document): HTMLElement | undefined {
  const shell = findProductShell(root);
  return shell === document.body ? undefined : shell;
}

export function getBranchControls(root: ParentNode = document): RequiredControls | undefined {
  return findRequiredControls(root);
}

export function findRequiredControls(root: ParentNode = document): RequiredControls | undefined {
  const shell = findProductShell(root);
  const tabbar = findProductTabbar(root);
  const productTab = findByName(tabbar ?? root, /^제품$/) ?? findByName(shell, /^제품$/);
  const usefulFeaturesTab = findByName(tabbar ?? root, /^유용한\s*기능$/) ?? findByName(shell, /^유용한\s*기능$/);
  const settingsButton = findSettingsButton(shell) ?? findSettingsButton(root);

  if (!productTab || !usefulFeaturesTab || !settingsButton) {
    return undefined;
  }

  return { shell, productTab, usefulFeaturesTab, settingsButton };
}

export function diagnoseRequiredControls(root: ParentNode = document): RequiredControlsDiagnostic {
  const shell = findProductShell(root);
  const tabbar = findProductTabbar(root);
  return {
    productTabFound: Boolean(findByName(tabbar ?? root, /^제품$/) ?? findByName(shell, /^제품$/)),
    usefulFeaturesTabFound: Boolean(findByName(tabbar ?? root, /^유용한\s*기능$/) ?? findByName(shell, /^유용한\s*기능$/)),
    settingsButtonFound: Boolean(findSettingsButton(shell) ?? findSettingsButton(root)),
    shellTagName: shell.tagName.toLowerCase(),
    shellRole: shell.getAttribute("role") ?? "",
    tabbarFound: Boolean(tabbar),
    tabbarTextSample: normalizeText(tabbar?.innerText ?? "").slice(0, 300),
    shellTextSample: normalizeText(shell.innerText).slice(0, 500)
  };
}

export function findProductShell(root: ParentNode = document): HTMLElement {
  const dialog = Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"], [data-modal="true"]'))
    .filter(isVisible)
    .sort((a, b) => area(b) - area(a))[0];
  if (dialog) {
    return dialog;
  }

  const thinqBodyShell = findThinQBodyShell(root);
  if (thinqBodyShell) {
    return thinqBodyShell;
  }

  const fixedPanels = Array.from(root.querySelectorAll<HTMLElement>("body *"))
    .filter((element) => {
      const style = getComputedStyle(element);
      return (
        isVisible(element) &&
        ["fixed", "absolute"].includes(style.position) &&
        area(element) > 200000 &&
        !isBackgroundOnlyContainer(element)
      );
    })
    .sort((a, b) => area(b) - area(a));

  return fixedPanels[0] ?? document.body;
}

function isBackgroundOnlyContainer(element: HTMLElement): boolean {
  const descriptor = `${element.id} ${String(element.className ?? "")} ${element.getAttribute("data-name") ?? ""}`;
  const text = normalizeText(element.innerText || element.textContent || "");
  return /background|bg|image/i.test(descriptor) && text.length < 20;
}

function findThinQBodyShell(root: ParentNode): HTMLElement | undefined {
  const bodyContainer = Array.from(root.querySelectorAll<HTMLElement>("#body_container, [id='body_container']"))
    .filter(isVisible)
    .find((element) => Boolean(element.querySelector('[data-name="prodAppBar"], [class*="TABPANEL_CONTAINER"]')));
  if (bodyContainer) {
    return bodyContainer;
  }

  const appBar = Array.from(root.querySelectorAll<HTMLElement>('[data-name="prodAppBar"]')).filter(isVisible)[0];
  const appBody = appBar ? nearestUsefulAncestor(appBar) : undefined;
  if (appBody) {
    return appBody;
  }

  const tabPanel = Array.from(root.querySelectorAll<HTMLElement>('[class*="TABPANEL_CONTAINER"], [role="tabpanel"]'))
    .filter(isVisible)
    .sort((a, b) => area(b) - area(a))[0];
  return tabPanel ? nearestUsefulAncestor(tabPanel) : undefined;
}

function nearestUsefulAncestor(element: HTMLElement): HTMLElement {
  let current: HTMLElement = element;
  while (current.parentElement && current.parentElement !== document.body) {
    const parent = current.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const currentRect = current.getBoundingClientRect();
    const hasFooter = Boolean(parent.querySelector('[data-name="prodMainTabbar"], [id*="bottom_navigator"]'));
    if (hasFooter) {
      return current;
    }
    if (parentRect.width >= currentRect.width && parentRect.height >= currentRect.height && area(parent) < area(document.body) * 0.9) {
      current = parent;
      continue;
    }
    break;
  }
  return current;
}

function findProductTabbar(root: ParentNode): HTMLElement | undefined {
  const explicit = Array.from(
    root.querySelectorAll<HTMLElement>('[data-name="prodMainTabbar"], [id*="bottom_navigator"], [id*="tabbar"], [role="tablist"]')
  )
    .filter(isVisible)
    .find((element) => {
      const text = normalizeText(element.innerText);
      return /제품/.test(text) && /유용한\s*기능/.test(text);
    });
  if (explicit) {
    return explicit;
  }

  return Array.from(root.querySelectorAll<HTMLElement>("ul,nav,div"))
    .filter(isVisible)
    .filter((element) => {
      const text = normalizeText(element.innerText);
      const rect = element.getBoundingClientRect();
      return /제품/.test(text) && /유용한\s*기능/.test(text) && rect.height <= 140;
    })
    .sort((a, b) => area(a) - area(b))[0];
}

function isStrongInteractive(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const role = getRole(element);
  return (
    tagName === "button" ||
    tagName === "a" ||
    NAVIGABLE_ROLES.has(role)
  );
}

export function isHorizontallyInShell(element: HTMLElement, shell: HTMLElement): boolean {
  const elementRect = element.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  if (shellRect.width === 0 && shellRect.height === 0) {
    return true;
  }
  return elementRect.right > shellRect.left + 5 && elementRect.left < shellRect.right - 5;
}

export function filterDuplicateNamesScreenWide(candidates: ClickCandidate[]): ClickCandidate[] {
  const nameMap = new Map<string, ClickCandidate[]>();
  for (const c of candidates) {
    const name = (c.snapshot.name || c.snapshot.role || "").trim().toLowerCase();
    if (!name) continue;
    if (!nameMap.has(name)) {
      nameMap.set(name, []);
    }
    nameMap.get(name)!.push(c);
  }

  const toRemove = new Set<ClickCandidate>();
  for (const [name, list] of nameMap.entries()) {
    if (list.length >= 2) {
      const strong = list.find(c => {
        const tag = c.element.tagName.toLowerCase();
        const role = c.snapshot.role;
        return tag === "button" || tag === "a" || role === "button" || role === "link" || role === "tab";
      });
      if (strong) {
        for (const c of list) {
          const tag = c.element.tagName.toLowerCase();
          const role = c.snapshot.role;
          const isStrong = tag === "button" || tag === "a" || role === "button" || role === "link" || role === "tab";
          if (!isStrong) {
            toRemove.add(c);
          }
        }
      }
    }
  }
  return candidates.filter(c => !toRemove.has(c));
}

export function collectClickCandidates(shell: HTMLElement): ClickCandidate[] {
  const seen = new Set<HTMLElement>();
  const candidates: ClickCandidate[] = [];

  for (const rawElement of shell.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTORS.join(","))) {
    if (!isVisible(rawElement)) {
      continue;
    }
    const element = findActionableCandidate(rawElement, shell);
    if (seen.has(element) || !isVisible(element) || isDisabled(element) || isOversizedContainer(element, shell) || element.tagName.toLowerCase() === "label") {
      continue;
    }
    if (!isHorizontallyInShell(element, shell)) {
      continue;
    }
    seen.add(element);
    const snapshot = toCandidateSnapshot(element);
    const skipReason = getSkipReason(element, snapshot.name);
    if (skipReason) {
      snapshot.reason = skipReason;
      continue;
    }
    candidates.push({ element, snapshot });
  }

  collectDatePickerDropdownCandidates(shell, seen, candidates);

  candidates.sort((a, b) => {
    const aIsTab = Boolean(a.element.closest("[role='tab']") || a.element.closest("[role='tablist'] > *"));
    const bIsTab = Boolean(b.element.closest("[role='tab']") || b.element.closest("[role='tablist'] > *"));
    if (aIsTab !== bIsTab) {
      return aIsTab ? 1 : -1;
    }
    const ar = a.element.getBoundingClientRect();
    const br = b.element.getBoundingClientRect();
    return ar.top - br.top || ar.left - br.left;
  });

  // Deduplicate nested elements: if candidate A's element contains candidate B's element,
  // we filter out candidate B (the nested child) to prioritize clicking the parent semantic container.
  const deduplicatedCandidates = candidates.filter((c1) => {
    const isFilteredOut = candidates.some((c2) => {
      if (c2 === c1) return false;

      const c2ContainsC1 = c2.element.contains(c1.element);
      if (c2ContainsC1) {
        // c2 is parent, c1 is child
        return isStrongInteractive(c2.element);
      }

      const c1ContainsC2 = c1.element.contains(c2.element);
      if (c1ContainsC2) {
        // c1 is parent, c2 is child
        return !isStrongInteractive(c1.element);
      }

      return false;
    });
    return !isFilteredOut;
  });

  // Common Policy: If BOTH Cancel-like and Save-like candidates exist on the same screen,
  // we filter out the Save-like candidates. This prevents state mutation loops while still scanning the screen.
  const hasCancel = deduplicatedCandidates.some((c) => isCancelLikeName(c.snapshot.name));
  const finalCandidates = hasCancel
    ? deduplicatedCandidates.filter((c) => !isSaveLikeName(c.snapshot.name))
    : deduplicatedCandidates;

  // Filter out duplicate-named candidates in the same group (sibling/cousin list items)
  const dedupedNameCandidates = filterDuplicateNamesInGroups(finalCandidates, shell);

  // Sample large repeating lists to prevent timeouts and redundant clicks
  const sampledCandidates = sampleLargeLists(dedupedNameCandidates);

  // Screen-wide deduplication for elements with identical names (e.g. button and label inside the same card)
  const screenWideDeduped = filterDuplicateNamesScreenWide(sampledCandidates);

  const occurrenceCounts = new Map<string, number>();
  for (const c of screenWideDeduped) {
    const normalizedName = (c.snapshot.name || c.snapshot.role).replace(/\s+/g, " ").trim().toLowerCase();
    const signature = `${normalizedName}:${c.snapshot.role}:${c.snapshot.tagName}`;
    const count = occurrenceCounts.get(signature) || 0;
    c.snapshot.occurrenceIndex = count;
    occurrenceCounts.set(signature, count + 1);
  }

  return screenWideDeduped;
}

export function collectSkippedCandidates(shell: HTMLElement): CandidateSnapshot[] {
  const seen = new Set<HTMLElement>();
  return Array.from(shell.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTORS.join(",")))
    .filter((element) => isVisible(element))
    .map((element) => findActionableCandidate(element, shell))
    .filter((element) => {
      if (seen.has(element) || !isVisible(element) || isDisabled(element) || isOversizedContainer(element, shell)) {
        return false;
      }
      if (!isHorizontallyInShell(element, shell)) {
        return false;
      }
      seen.add(element);
      return true;
    })
    .map((element) => {
      const snapshot = toCandidateSnapshot(element);
      snapshot.reason = getSkipReason(element, snapshot.name);
      return snapshot;
    })
    .filter((snapshot) => Boolean(snapshot.reason));
}

function collectDatePickerDropdownCandidates(shell: HTMLElement, seen: Set<HTMLElement>, candidates: ClickCandidate[]): void {
  for (const rawElement of shell.querySelectorAll<HTMLElement>("*")) {
    if (!isVisible(rawElement) || !hasDatePickerDropdownSignal(rawElement)) {
      continue;
    }
    if (!isDatePickerCandidateSized(rawElement, shell)) {
      continue;
    }
    const element = findActionableCandidate(rawElement, shell);
    if (seen.has(element) || !isVisible(element) || isDisabled(element) || isOversizedContainer(element, shell)) {
      continue;
    }
    const snapshot = toCandidateSnapshot(element);
    const skipReason = getSkipReason(element, snapshot.name);
    if (skipReason) {
      continue;
    }
    seen.add(element);
    candidates.push({ element, snapshot });
  }
}

export function toCandidateSnapshot(element: HTMLElement): CandidateSnapshot {
  const name = getAccessibleName(element);
  return {
    id: stableElementId(element),
    name,
    role: getRole(element),
    tagName: element.tagName.toLowerCase()
  };
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url, location.href);
    const segments = parsed.pathname.split("/");
    const normalizedSegments = segments.map((seg, idx) => {
      if (!seg || idx === 1 || /^\d+$/.test(seg)) {
        return seg;
      }
      const knownPages = [
        "search", "subfoodlist", "adduserfood", "disclaimer",
        "energymonitoringuserguide", "productinfo", "sublist",
        "smartcare", "history"
      ];
      if (knownPages.includes(seg.toLowerCase())) {
        return seg;
      }
      if (/^[A-Z]{3,4}_[A-Za-z0-9_]+$/.test(seg)) {
        return seg;
      }
      if (/^[A-Za-z0-9\-_=]+$/.test(seg)) {
        return "*";
      }
      return seg;
    });
    parsed.pathname = normalizedSegments.join("/");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function hasActionSubRoute(url: string): boolean {
  try {
    const parsed = new URL(url, location.origin);
    const segments = parsed.pathname.split("/");
    if (segments.length > 3) {
      const seg3 = segments[3];
      if (seg3 && seg3 !== "undefined" && seg3 !== "dW5kZWZpbmVk") {
        try {
          const decoded = atob(seg3).toUpperCase();
          return ["ADD", "EDIT", "CREATE", "DELETE"].includes(decoded);
        } catch {
          return false;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function screenSignature(shell: HTMLElement): string {
  const selectedTab = Array.from(shell.querySelectorAll<HTMLElement>('[aria-selected="true"], [aria-current="page"]'))
    .map(getAccessibleName)
    .filter(Boolean)
    .join("|");
  const headings = Array.from(shell.querySelectorAll<HTMLElement>("h1,h2,h3,[role='heading']"))
    .filter(isVisible)
    .map(getAccessibleName)
    .map((name) => normalizeStateIndicators(name))
    .filter(Boolean)
    .slice(0, 5)
    .join("|");
  const overlays = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"], [aria-modal="true"], [class*="Bottom"], [class*="bottom"], [class*="Sheet"], [class*="sheet"], [class*="Popup"], [class*="popup"], [class*="Modal"], [class*="modal"], [class*="calendar" i], [class*="picker" i], [class*="date" i], [class*="time" i], [class*="select" i]'
    )
  )
    .filter(isVisible)
    .map((element) => `${element.tagName}:${element.getAttribute("role") ?? ""}:${getAccessibleName(element).slice(0, 80)}:${Math.round(area(element))}`)
    .slice(0, 10)
    .join("|");
  const landmarkShape = Array.from(shell.querySelectorAll<HTMLElement>('[role], [data-name], [aria-modal], [aria-expanded="true"]'))
    .filter(isVisible)
    .map((element) => `${element.tagName}:${element.getAttribute("role") ?? ""}:${element.getAttribute("data-name") ?? ""}:${element.getAttribute("aria-expanded") ?? ""}`)
    .slice(0, 80)
    .join("|");
  return hash(`${normalizeUrl(location.href)}\n${selectedTab}\n${headings}\n${overlays}\n${landmarkShape}`);
}

export function extractScreenTitle(shell: HTMLElement, fallback: string): string {
  const heading = Array.from(shell.querySelectorAll<HTMLElement>("h1,h2,h3,[role='heading']"))
    .filter(isVisible)
    .map(getAccessibleName)
    .filter((name) => !isBlockedNavigationName(name))
    .find(Boolean);
  return heading ? normalizeStateIndicators(heading) : fallback;
}

export function isBlockedNavigationName(name: string): boolean {
  return BLOCKED_TEXT_PATTERNS.some((pattern) => pattern.test(name)) || Boolean(matchForbiddenRule(name));
}

export function findBackButton(shell: HTMLElement): HTMLElement | undefined {
  const queryFrom = (root: HTMLElement): HTMLElement | undefined => {
    const candidates = Array.from(root.querySelectorAll<HTMLElement>("button,[role='button'],a[href]")).filter(
      (element) => isVisible(element) && !isDisabled(element)
    );
    const namedBack = candidates.find((element) => BACK_TEXT_PATTERNS.some((pattern) => pattern.test(getAccessibleName(element))));
    if (namedBack) {
      return namedBack;
    }

    const shellRect = shell.getBoundingClientRect();
    return candidates.find((element) => {
      const rect = element.getBoundingClientRect();
      const name = getAccessibleName(element);
      return (
        rect.top < shellRect.top + 120 &&
        rect.left < shellRect.left + 120 &&
        !isBlockedNavigationName(name) &&
        rect.width <= 80 &&
        rect.height <= 80
      );
    });
  };

  const localBack = queryFrom(shell);
  if (localBack) {
    return localBack;
  }

  if (shell !== document.body) {
    return queryFrom(document.body);
  }

  return undefined;
}

export function branchLabel(branch: Branch): string {
  if (branch === "product") {
    return "제품";
  }
  if (branch === "usefulFeatures") {
    return "유용한 기능";
  }
  return "설정";
}

export function getAccessibleName(element: HTMLElement): string {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const value = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.innerText)
      .filter(Boolean)
      .join(" ");
    if (value.trim()) {
      return normalizeText(value);
    }
  }
  return normalizeText(
    element.getAttribute("aria-label") ??
      element.getAttribute("title") ??
      element.getAttribute("alt") ??
      element.innerText ??
      element.textContent ??
      ""
  );
}

export function isAriaHidden(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    if (current.getAttribute("aria-hidden") === "true") {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    Number(style.opacity || 1) > 0 &&
    !isAriaHidden(element)
  );
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function findByName(root: ParentNode, pattern: RegExp): HTMLElement | undefined {
  const semanticTarget = Array.from(root.querySelectorAll<HTMLElement>("button,[role='tab'],[role='button'],a[href],[tabindex]"))
    .filter(isVisible)
    .find((element) => pattern.test(getAccessibleName(element)));
  if (semanticTarget) {
    return semanticTarget;
  }

  const textTarget = Array.from(root.querySelectorAll<HTMLElement>("*"))
    .filter((element) => isVisible(element) && pattern.test(getDirectElementText(element)))
    .sort((a, b) => area(a) - area(b))[0];

  return textTarget ? findClickableAncestor(textTarget, root) : undefined;
}

function findSettingsButton(root: ParentNode): HTMLElement | undefined {
  const named = Array.from(root.querySelectorAll<HTMLElement>("button,[role='button'],a[href],[tabindex],*"))
    .filter(isVisible)
    .find((element) => /설정|settings/i.test(getAccessibleName(element)));
  if (named) {
    return findClickableAncestor(named, root);
  }

  const shell = root instanceof HTMLElement ? root : document.body;
  const shellRect = shell.getBoundingClientRect();
  const rightTopCandidates = Array.from(shell.querySelectorAll<HTMLElement>("button,[role='button'],a[href],[tabindex],svg,img,*"))
    .filter((element) => isVisible(element) && !isDisabled(element))
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const name = getAccessibleName(element);
      const isRightTop = rect.top > shellRect.top + 45 && rect.top < shellRect.top + 180 && rect.right > shellRect.right - 120;
      const isSmallControl = rect.width <= 96 && rect.height <= 96;
      return isRightTop && isSmallControl && !/play|닫기|close|x/i.test(name);
    })
    .sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return bRect.right - aRect.right || aRect.top - bRect.top || area(a) - area(b);
    });

  const candidate = rightTopCandidates[0];
  return candidate ? findClickableAncestor(candidate, root) : undefined;
}

function getSkipReason(element: HTMLElement, name: string): string | undefined {
  if (element.tagName.toLowerCase() === "a") {
    const target = element.getAttribute("target");
    if (target === "_blank") {
      return "blocked-external-service";
    }
    const href = element.getAttribute("href");
    if (href) {
      try {
        const url = new URL(href, location.href);
        const currentHost = location.hostname || "my.lgthinq.com";
        if (url.hostname !== currentHost && url.hostname !== "my.lgthinq.com" && !url.protocol.startsWith("javascript")) {
          return "blocked-external-service";
        }
      } catch {
        // ignore
      }
    }
  }

  if (isSwitchLike(element)) {
    return "switch-toggle";
  }

  // Registry-based check (covers all categories including new ones)
  const forbiddenMatch = matchForbiddenRule(name, element);
  if (forbiddenMatch) {
    return ruleToSkipReason(forbiddenMatch);
  }

  if (isChartDataControl(element, name)) {
    return "chart-data-control";
  }
  if (isStaticCompositeContainer(element, name)) {
    return "static-composite-container";
  }
  const role = getRole(element);
  if (role === "text" || role === "statictext") {
    return "static-composite-container";
  }

  // Skip static measurement data labels and setting values (e.g. 388 와트시, 3회, 40도, 강, 자동)
  // when there is no navigation hint (like >, |, separator class etc.)
  const isStaticVal = /^(강|중|약|자동|표준|절약|스피드|섬세|울|란제리|소량|알뜰|이불|타월|셔츠|위생|살균)$/.test(name) ||
                      /(?:^|\s)(?:[0-9.]+)?\s*(와트시|Wh|kWh|회|분|시간|도|℃)$/i.test(name);
  if (isStaticVal && !hasNavigationHint(element)) {
    return "static-composite-container";
  }

  if (hasDatePickerDropdownSignal(element)) {
    if (isLargeCompositeDatePickerCandidate(element)) {
      return "static-composite-container";
    }
    return undefined;
  }
  if (
    !NAVIGABLE_ROLES.has(role) &&
    element.tagName.toLowerCase() !== "summary" &&
    element.tagName.toLowerCase() !== "select" &&
    !hasThinQInteractionHint(element)
  ) {
    return "not-navigable-role";
  }
  return undefined;
}

function isSwitchLike(element: HTMLElement): boolean {
  const role = getRole(element);
  const tag = element.tagName.toLowerCase();
  const type = element.getAttribute("type");
  const className = String(element.className ?? "");
  const name = getAccessibleName(element);

  // 1. Direct interactive switches are always skipped
  const isDirectSwitch = role === "switch" ||
                         role === "checkbox" ||
                         (tag === "input" && ["checkbox", "radio"].includes(type ?? "")) ||
                         /switch|toggle/i.test(className) ||
                         (element.hasAttribute("aria-pressed") && !hasNavigationHint(element));
  if (isDirectSwitch) {
    return true;
  }

  // 2. Elements with navigation hints are never considered as simple switch toggles (never skipped)
  if (hasNavigationHint(element)) {
    return false;
  }

  const checkSelf = (el: HTMLElement): boolean => {
    const r = getRole(el);
    const t = el.tagName.toLowerCase();
    const n = getAccessibleName(el);
    return (
      (r === "text" || t === "div" || t === "span" || t === "p") && 
      (/^(켜짐|꺼짐|on|off)$/i.test(n) ||
       /,\s*(켜짐|꺼짐|on|off)$/i.test(n) ||
       /,\s*$/i.test(n) ||
       /(?:^|\s)(켜짐|꺼짐|on|off)$/i.test(n))
    );
  };

  if (checkSelf(element)) {
    return true;
  }

  // Also check if any descendant is a switch (e.g. wrapper rows wrapping switch buttons)
  const descendants = Array.from(element.querySelectorAll<HTMLElement>("*"));
  const hasDescendantSwitch = descendants.some(checkSelf);
  if (hasDescendantSwitch && !hasNavigationHint(element)) {
    return true;
  }

  return false;
}

function hasNavigationHint(element: HTMLElement): boolean {
  const name = getAccessibleName(element);
  const text = element.innerText ?? "";
  
  if (/상세|보기|예약|설정|관리|이동|next|open|detail|more/i.test(name)) {
    return true;
  }
  if (/>|→|\|/.test(name) || />|→|\|/.test(text)) {
    return true;
  }
  const hasVisualIndicator = element.querySelector(
    ".divider, .separator, .line, .arrow, .chevron, [class*='arrow'], [class*='chevron']"
  );
  if (hasVisualIndicator) {
    return true;
  }
  return false;
}

function isChartDataControl(element: HTMLElement, name: string): boolean {
  const tagName = element.tagName.toLowerCase();
  const descriptor = `${name} ${element.getAttribute("aria-label") ?? ""} ${String(element.className ?? "")} ${element.id}`;
  const closestSvg = (tagName === "svg" ? element : element.closest("svg")) as HTMLElement | null;
  const closestChart = element.closest(CHART_STRUCTURE_SELECTOR) as HTMLElement | null;

  if (tagName === "svg" && CHART_CONTROL_PATTERN.test(descriptor)) {
    return true;
  }

  if (CHART_CONTROL_PATTERN.test(descriptor) && (closestSvg || element.querySelector(CHART_STRUCTURE_SELECTOR))) {
    return true;
  }

  if (!closestSvg && !closestChart) {
    return false;
  }

  const chartRoot = (closestSvg ?? closestChart)!;
  const chartDescriptor = `${getAccessibleName(chartRoot)} ${chartRoot.getAttribute("aria-label") ?? ""} ${String(chartRoot.className ?? "")}`;
  return CHART_CONTROL_PATTERN.test(chartDescriptor);
}

function isStaticCompositeContainer(element: HTMLElement, name: string): boolean {
  const tagName = element.tagName.toLowerCase();
  if (tagName !== "div" && tagName !== "section" && tagName !== "main") {
    return false;
  }
  if (name.length < 160) {
    return false;
  }
  const childButtons = element.querySelectorAll("button,[role='button'],[role='tab'],[tabindex]").length;
  return childButtons >= 3 || /측정 기준|그래프|차트|graph|chart/i.test(name);
}

function findClickableAncestor(element: HTMLElement, boundary: ParentNode): HTMLElement {
  let current: HTMLElement | null = element;
  while (current && current !== boundary) {
    if (isClickableLike(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return element;
}

function findActionableCandidate(element: HTMLElement, boundary: HTMLElement): HTMLElement {
  if (isClickableLike(element) && hasUsefulCandidateSignal(element)) {
    return element;
  }

  let current: HTMLElement | null = element.parentElement;
  while (current && current !== boundary) {
    if (isClickableLike(current) && hasUsefulCandidateSignal(current)) {
      return current;
    }
    if (hasThinQInteractionHint(current) && hasUsefulCandidateSignal(current)) {
      return current;
    }
    current = current.parentElement;
  }

  current = element.parentElement;
  while (current && current !== boundary) {
    if (hasMeaningfulText(current) && !isOversizedContainer(current, boundary)) {
      return current;
    }
    current = current.parentElement;
  }

  return element;
}

function isClickableLike(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const role = getRole(element);
  const style = getComputedStyle(element);
  return (
    tagName === "button" ||
    tagName === "a" ||
    NAVIGABLE_ROLES.has(role) ||
    element.hasAttribute("tabindex") ||
    element.hasAttribute("onclick") ||
    hasThinQInteractionHint(element) ||
    hasDatePickerDropdownSignal(element) ||
    style.cursor === "pointer"
  );
}

function hasThinQInteractionHint(element: HTMLElement): boolean {
  const className = String(element.className ?? "");
  return (
    element.hasAttribute("data-nscreenfocusable") ||
    element.hasAttribute("data-tux-id") ||
    /rippleEffect/i.test(className)
  );
}

function hasUsefulCandidateSignal(element: HTMLElement): boolean {
  return hasMeaningfulText(element) || Boolean(getAccessibleName(element)) || hasIconOnlyNavigationSignal(element) || hasDatePickerDropdownSignal(element);
}

function hasMeaningfulText(element: HTMLElement): boolean {
  return normalizeText(element.innerText || element.textContent || "").length > 0;
}

function hasIconOnlyNavigationSignal(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const className = String(element.className ?? "");
  return rect.width <= 120 && rect.height <= 120 && /arrow|next|more|chevron/i.test(className);
}

function hasDatePickerDropdownSignal(element: HTMLElement): boolean {
  const name = getAccessibleName(element);
  if (!isDatePickerTriggerName(name) || STATE_CONTROL_PATTERNS.some((pattern) => pattern.test(name))) {
    return false;
  }
  if (
    element.hasAttribute("aria-haspopup") ||
    element.getAttribute("aria-expanded") === "false" ||
    element.getAttribute("aria-expanded") === "true" ||
    isClickableLikeWithoutDatePicker(element) ||
    hasThinQInteractionHint(element)
  ) {
    return true;
  }
  const descriptor = `${element.innerText ?? ""} ${element.textContent ?? ""} ${String(element.className ?? "")}`;
  if (DROPDOWN_MARKER_PATTERN.test(descriptor)) {
    return true;
  }
  return Array.from(element.querySelectorAll<HTMLElement>("svg,i,span,div"))
    .filter(isVisible)
    .some((child) => {
      const childDescriptor = `${child.innerText ?? ""} ${child.textContent ?? ""} ${String(child.className ?? "")} ${child.getAttribute("aria-label") ?? ""}`;
      const rect = child.getBoundingClientRect();
      return rect.width <= 120 && rect.height <= 80 && (DROPDOWN_MARKER_PATTERN.test(childDescriptor) || isCompactIconLikeChild(element, child));
    });
}

function isDatePickerCandidateSized(element: HTMLElement, shell: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  return rect.height <= 140 && rect.width <= Math.min(shellRect.width * 0.85, 900);
}

export function isDatePickerTriggerName(name: string): boolean {
  const normalizedName = normalizeText(name);
  return Boolean(normalizedName) && DATE_PICKER_TRIGGER_PATTERNS.some((pattern) => pattern.test(normalizedName));
}

function isClickableLikeWithoutDatePicker(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const role = getRole(element);
  const style = getComputedStyle(element);
  return (
    tagName === "button" ||
    tagName === "a" ||
    NAVIGABLE_ROLES.has(role) ||
    element.hasAttribute("tabindex") ||
    element.hasAttribute("onclick") ||
    hasThinQInteractionHint(element) ||
    style.cursor === "pointer"
  );
}

function isCompactIconLikeChild(parent: HTMLElement, child: HTMLElement): boolean {
  const childText = normalizeText(child.innerText || child.textContent || "");
  if (childText.length > 2) {
    return false;
  }
  const siblings = Array.from(parent.children).filter((sibling) => isVisible(sibling as HTMLElement));
  return siblings.length >= 2 && siblings.some((sibling) => sibling !== child && isDatePickerTriggerName((sibling as HTMLElement).innerText || sibling.textContent || ""));
}

function isLargeCompositeDatePickerCandidate(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.height > 140 || rect.width > Math.min(window.innerWidth * 0.85, 900);
}

function isOversizedContainer(element: HTMLElement, shell: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  return rect.width > shellRect.width * 0.92 && rect.height > shellRect.height * 0.35;
}

function getDirectElementText(element: HTMLElement): string {
  const childText = Array.from(element.children)
    .map((child) => child.textContent ?? "")
    .join(" ");
  return normalizeText((element.textContent ?? "").replace(childText, ""));
}

function isDisabled(element: HTMLElement): boolean {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

function getRole(element: HTMLElement): string {
  const role = element.getAttribute("role") ?? element.tagName.toLowerCase();
  return role === "a" ? "link" : role;
}

function stableElementId(element: HTMLElement): string {
  const name = getAccessibleName(element);
  const rect = element.getBoundingClientRect();
  return hash(`${getRole(element)}:${name}:${Math.round(rect.top)}:${Math.round(rect.left)}:${Math.round(rect.width)}:${Math.round(rect.height)}`);
}

function area(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
}

function hash(value: string): string {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 33) ^ value.charCodeAt(index);
  }
  return (result >>> 0).toString(36);
}

export function isCancelLikeName(name: string): boolean {
  const norm = name.replace(/\s+/g, "").toLowerCase();
  if (norm === "no" || norm === "아니오") {
    return true;
  }
  return /취소|닫기|이전|뒤로|cancel|close|back|dismiss/i.test(norm);
}

export function isSaveLikeName(name: string): boolean {
  const norm = name.replace(/\s+/g, "").toLowerCase();
  if (norm === "yes" || norm === "ok" || norm === "예" || norm === "네") {
    return true;
  }
  return /저장|등록|확인|완료|적용|추가|생성|save|confirm|apply|submit|done|add|create|register/i.test(norm);
}

export function filterDuplicateNamesInGroups(candidates: ClickCandidate[], shell?: HTMLElement): ClickCandidate[] {
  const groupMap = new Map<HTMLElement, Map<string, ClickCandidate[]>>();

  for (const c of candidates) {
    let curr = c.element.parentElement;
    for (let level = 1; level <= 4; level++) {
      if (!curr || curr === document.body || (shell && curr === shell)) break;
      
      const typeKey = `${level}`;
      if (!groupMap.has(curr)) {
        groupMap.set(curr, new Map());
      }
      const typeMap = groupMap.get(curr)!;
      if (!typeMap.has(typeKey)) {
        typeMap.set(typeKey, []);
      }
      typeMap.get(typeKey)!.push(c);
      
      curr = curr.parentElement;
    }
  }

  const candidateToGroup = new Map<ClickCandidate, ClickCandidate[]>();
  for (const c of candidates) {
    let curr = c.element.parentElement;
    for (let level = 1; level <= 4; level++) {
      if (!curr || curr === document.body || (shell && curr === shell)) break;
      
      const typeKey = `${level}`;
      const group = groupMap.get(curr)?.get(typeKey) || [];
      if (group.length >= 2) {
        candidateToGroup.set(c, group);
        break;
      }
      curr = curr.parentElement;
    }
  }

  const uniqueGroups = new Set<ClickCandidate[]>(candidateToGroup.values());
  const candidatesToRemove = new Set<ClickCandidate>();

  for (const group of uniqueGroups) {
    const processed = new Set<ClickCandidate>();
    for (let i = 0; i < group.length; i++) {
      const c1 = group[i];
      if (processed.has(c1)) continue;
      const n1 = (c1.snapshot.name || c1.snapshot.role || "").trim().toLowerCase();
      if (!n1) continue;

      const cluster = [c1];
      for (let j = i + 1; j < group.length; j++) {
        const c2 = group[j];
        if (processed.has(c2)) continue;
        const n2 = (c2.snapshot.name || c2.snapshot.role || "").trim().toLowerCase();
        if (!n2) continue;

        if (n1.includes(n2) || n2.includes(n1)) {
          cluster.push(c2);
        }
      }

      if (cluster.length >= 2) {
        let best = cluster.find(c => {
          const tag = c.element.tagName.toLowerCase();
          const role = c.snapshot.role;
          return tag === "button" || tag === "a" || role === "button" || role === "link" || role === "tab";
        });
        if (!best) {
          best = cluster[0];
        }
        for (const c of cluster) {
          processed.add(c);
          if (c !== best) {
            candidatesToRemove.add(c);
          }
        }
      }
    }
  }

  return candidates.filter(c => !candidatesToRemove.has(c));
}

export function sampleLargeLists(candidates: ClickCandidate[]): ClickCandidate[] {
  if (typeof window !== "undefined" && !window.__thinqSeed__) {
    try {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      window.__thinqSeed__ = arr[0] / 0xffffffff;
    } catch {
      window.__thinqSeed__ = (Math.random() + (Date.now() % 1000) / 1000) % 1;
    }
  }

  const groupMap = new Map<HTMLElement, Map<string, ClickCandidate[]>>();

  // Populate counts
  for (const c of candidates) {
    let curr = c.element.parentElement;
    for (let level = 1; level <= 3; level++) {
      if (!curr || curr === document.body) break;
      
      const typeKey = `${c.snapshot.tagName}:${c.snapshot.role}:${level}`;
      if (!groupMap.has(curr)) {
        groupMap.set(curr, new Map());
      }
      const typeMap = groupMap.get(curr)!;
      if (!typeMap.has(typeKey)) {
        typeMap.set(typeKey, []);
      }
      typeMap.get(typeKey)!.push(c);
      
      curr = curr.parentElement;
    }
  }

  // Map each candidate to its closest group of size >= 5 (starting from level 1 to 3)
  const candidateToGroup = new Map<ClickCandidate, ClickCandidate[]>();

  for (const c of candidates) {
    let curr = c.element.parentElement;
    for (let level = 1; level <= 3; level++) {
      if (!curr || curr === document.body) break;
      
      const typeKey = `${c.snapshot.tagName}:${c.snapshot.role}:${level}`;
      const group = groupMap.get(curr)?.get(typeKey) || [];
      if (group.length >= 5) {
        candidateToGroup.set(c, group);
        break; // Stop at the closest ancestor meeting the criteria
      }
      curr = curr.parentElement;
    }
  }

  // Deduplicate and collect the unique groups to sample
  const uniqueGroups = new Set<ClickCandidate[]>(candidateToGroup.values());

  const candidatesToKeep = new Set<ClickCandidate>(candidates);
  for (const group of uniqueGroups) {
    if (group.length >= 5) {
      const first = group[0];
      const last = group[group.length - 1];

      // Compute a stable hash of the group signatures to determine the index deterministically during the run
      const groupSignature = group.map(c => c.snapshot.name || c.snapshot.role).join("|");
      const seedVal = typeof window !== "undefined" ? (window.__thinqSeed__ || 0.5) : 0.5;
      const hashStr = `${groupSignature}:${seedVal}`;
      const hashInt = parseInt(hash(hashStr), 36);
      const randVal = (hashInt % 10000) / 10000;

      const midIndex = 1 + Math.floor(randVal * (group.length - 2));
      const mid = group[midIndex];

      for (const c of group) {
        if (c !== first && c !== mid && c !== last) {
          candidatesToKeep.delete(c);
        }
      }
    }
  }

  return candidates.filter(c => candidatesToKeep.has(c));
}

export function getElementSelector(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${current.id}`;
      parts.unshift(part);
      break;
    }
    let sibling = current.previousElementSibling;
    let nth = 1;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        nth++;
      }
      sibling = sibling.previousElementSibling;
    }
    part += `:nth-of-type(${nth})`;
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

