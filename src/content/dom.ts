import type { Branch, CandidateSnapshot } from "../shared/types";

const BLOCKED_TEXT_PATTERNS = [
  /ThinQ\s*Web/i,
  /ThinQ\s*PLAY/i,
  /^X$/,
  /^Close$/i,
  /^닫기$/,
  /^홈$/,
  /^home$/i,
  /^제품$/,
  /^유용한\s*기능$/
];

const BACK_TEXT_PATTERNS = [/^뒤로$/, /^이전$/, /^back$/i];

const NAVIGABLE_ROLES = new Set(["button", "link", "menuitem", "option", "tab"]);

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
  shellTextSample: string;
}

export interface ClickCandidate {
  element: HTMLElement;
  snapshot: CandidateSnapshot;
}

export function findRequiredControls(root: ParentNode = document): RequiredControls | undefined {
  const shell = findProductShell(root);
  const productTab = findByName(shell, /^제품$/);
  const usefulFeaturesTab = findByName(shell, /^유용한\s*기능$/);
  const settingsButton = findSettingsButton(shell);

  if (!productTab || !usefulFeaturesTab || !settingsButton) {
    return undefined;
  }

  return { shell, productTab, usefulFeaturesTab, settingsButton };
}

export function diagnoseRequiredControls(root: ParentNode = document): RequiredControlsDiagnostic {
  const shell = findProductShell(root);
  return {
    productTabFound: Boolean(findByName(shell, /^제품$/)),
    usefulFeaturesTabFound: Boolean(findByName(shell, /^유용한\s*기능$/)),
    settingsButtonFound: Boolean(findSettingsButton(shell)),
    shellTagName: shell.tagName.toLowerCase(),
    shellRole: shell.getAttribute("role") ?? "",
    shellTextSample: normalizeText(shell.innerText).slice(0, 500)
  };
}

export function findProductShell(root: ParentNode = document): HTMLElement {
  const dialog = Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]'))
    .filter(isVisible)
    .sort((a, b) => area(b) - area(a))[0];
  if (dialog) {
    return dialog;
  }

  const fixedPanels = Array.from(root.querySelectorAll<HTMLElement>("body *"))
    .filter((element) => {
      const style = getComputedStyle(element);
      return isVisible(element) && ["fixed", "absolute"].includes(style.position) && area(element) > 200000;
    })
    .sort((a, b) => area(b) - area(a));

  return fixedPanels[0] ?? document.body;
}

export function collectClickCandidates(shell: HTMLElement): ClickCandidate[] {
  const selectors = [
    "button",
    "a[href]",
    "[role='button']",
    "[role='link']",
    "[role='menuitem']",
    "[role='option']",
    "[role='tab']",
    "summary",
    "select"
  ];
  const seen = new Set<HTMLElement>();
  const candidates: ClickCandidate[] = [];

  for (const element of shell.querySelectorAll<HTMLElement>(selectors.join(","))) {
    if (seen.has(element) || !isVisible(element) || isDisabled(element)) {
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

  return candidates.sort((a, b) => {
    const ar = a.element.getBoundingClientRect();
    const br = b.element.getBoundingClientRect();
    return ar.top - br.top || ar.left - br.left;
  });
}

export function collectSkippedCandidates(shell: HTMLElement): CandidateSnapshot[] {
  return Array.from(shell.querySelectorAll<HTMLElement>("button,a[href],[role],summary,select"))
    .filter((element) => isVisible(element) && !isDisabled(element))
    .map((element) => {
      const snapshot = toCandidateSnapshot(element);
      snapshot.reason = getSkipReason(element, snapshot.name);
      return snapshot;
    })
    .filter((snapshot) => Boolean(snapshot.reason));
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

export function screenSignature(shell: HTMLElement): string {
  const visibleText = normalizeText(shell.innerText).slice(0, 1200);
  const selectedTab = Array.from(shell.querySelectorAll<HTMLElement>('[aria-selected="true"], [aria-current="page"]'))
    .map(getAccessibleName)
    .filter(Boolean)
    .join("|");
  const headings = Array.from(shell.querySelectorAll<HTMLElement>("h1,h2,h3,[role='heading']"))
    .filter(isVisible)
    .map(getAccessibleName)
    .filter(Boolean)
    .slice(0, 5)
    .join("|");
  const modalCount = document.querySelectorAll('[role="dialog"], [aria-modal="true"]').length;
  return hash(`${location.href}\n${selectedTab}\n${headings}\n${modalCount}\n${visibleText}`);
}

export function extractScreenTitle(shell: HTMLElement, fallback: string): string {
  const heading = Array.from(shell.querySelectorAll<HTMLElement>("h1,h2,h3,[role='heading']"))
    .filter(isVisible)
    .map(getAccessibleName)
    .find(Boolean);
  return heading || fallback;
}

export function findBackButton(shell: HTMLElement): HTMLElement | undefined {
  const candidates = Array.from(shell.querySelectorAll<HTMLElement>("button,[role='button'],a[href]")).filter(
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
      !BLOCKED_TEXT_PATTERNS.some((pattern) => pattern.test(name)) &&
      rect.width <= 80 &&
      rect.height <= 80
    );
  });
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

export function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    Number(style.opacity || 1) > 0
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
  if (isSwitchLike(element)) {
    return "switch-toggle";
  }
  const role = getRole(element);
  if (role === "tab") {
    return "root-branch-tab";
  }
  if (BLOCKED_TEXT_PATTERNS.some((pattern) => pattern.test(name))) {
    return "blocked-navigation";
  }
  if (!NAVIGABLE_ROLES.has(role) && element.tagName.toLowerCase() !== "summary" && element.tagName.toLowerCase() !== "select") {
    return "not-navigable-role";
  }
  return undefined;
}

function isSwitchLike(element: HTMLElement): boolean {
  const role = getRole(element);
  const tag = element.tagName.toLowerCase();
  const type = element.getAttribute("type");
  const className = String(element.className ?? "");
  return (
    role === "switch" ||
    role === "checkbox" ||
    (tag === "input" && ["checkbox", "radio"].includes(type ?? "")) ||
    /switch|toggle/i.test(className) ||
    (element.hasAttribute("aria-pressed") && !hasNavigationHint(element))
  );
}

function hasNavigationHint(element: HTMLElement): boolean {
  const name = getAccessibleName(element);
  return /상세|보기|예약|설정|관리|이동|next|open|detail|more/i.test(name);
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
    style.cursor === "pointer"
  );
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
  return element.getAttribute("role") ?? element.tagName.toLowerCase();
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
