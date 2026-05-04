export interface WaiverRule {
  id: string;
  pattern: string;
  enabled: boolean;
}

export interface WaiverMatchInput {
  ruleId?: string;
  reasonId?: string;
  message?: string;
  selector?: string;
  accessibleName?: string;
  menuPath?: string[];
}

export interface WaiverMatch {
  waived: boolean;
  waiverRuleId?: string;
}

export function matchWaiver(input: WaiverMatchInput, rules: WaiverRule[]): WaiverMatch {
  const target = [
    input.ruleId,
    input.reasonId,
    input.message,
    input.selector,
    input.accessibleName,
    input.menuPath?.join(" > ")
  ]
    .filter(Boolean)
    .join("\n");

  for (const rule of rules) {
    if (!rule.enabled) {
      continue;
    }
    try {
      if (new RegExp(rule.pattern, "i").test(target)) {
        return { waived: true, waiverRuleId: rule.id };
      }
    } catch {
      continue;
    }
  }

  return { waived: false };
}
