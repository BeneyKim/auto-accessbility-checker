import { beforeAll, describe, expect, it } from "vitest";

describe("exclusions filtering", () => {
  let filterExclusions: any;

  beforeAll(async () => {
    (global as any).chrome = {
      runtime: {
        onMessage: {
          addListener: () => {}
        }
      }
    };
    const mod = await import("../src/content/content");
    filterExclusions = mod.filterExclusions;
  });

  it("should not filter out normal rules", () => {
    const report = {
      report: {
        summary: {
          counts: { violation: 1 }
        },
        results: [
          {
            ruleId: "some_other_rule",
            message: "Some description here",
            value: ["VIOLATION", "FAIL"]
          }
        ]
      }
    };
    const result = filterExclusions(report);
    expect(result.report.results).toHaveLength(1);
    expect(result.report.summary.counts.violation).toBe(1);
  });

  it("should filter out exactly matching skip_main_exists exception and decrement counts", () => {
    const report = {
      report: {
        summary: {
          counts: { violation: 2 }
        },
        results: [
          {
            ruleId: "skip_main_exists",
            message: "The page does not provide a way to quickly navigate to the main content (ARIA \"main\" landmark or a skip link)",
            value: ["VIOLATION", "FAIL"]
          },
          {
            ruleId: "some_other_rule",
            message: "Some description here",
            value: ["VIOLATION", "FAIL"]
          }
        ]
      }
    };
    const result = filterExclusions(report);
    expect(result.report.results).toHaveLength(1);
    expect(result.report.results[0].ruleId).toBe("some_other_rule");
    expect(result.report.summary.counts.violation).toBe(1);
  });

  it("should filter out aria_role_allowed ONLY when role is 'text'", () => {
    const report = {
      report: {
        summary: {
          counts: { violation: 2 }
        },
        results: [
          {
            ruleId: "aria_role_allowed",
            message: "The role 'text' defined on the element is not valid per ARIA specification",
            value: ["VIOLATION", "FAIL"]
          },
          {
            ruleId: "aria_role_allowed",
            message: "The role 'heading' defined on the element is not valid per ARIA specification",
            value: ["VIOLATION", "FAIL"]
          }
        ]
      }
    };
    const result = filterExclusions(report);
    // Only the role 'text' one should be filtered. The role 'heading' one must remain.
    expect(result.report.results).toHaveLength(1);
    expect(result.report.results[0].message).toContain("role 'heading'");
    expect(result.report.summary.counts.violation).toBe(1);
  });

  it("should filter out label_name_visible and decrement counts", () => {
    const report = {
      report: {
        summary: {
          counts: { violation: 1 }
        },
        results: [
          {
            ruleId: "label_name_visible",
            message: "Accessible name does not match or contain the visible label text",
            value: ["VIOLATION", "FAIL"]
          }
        ]
      }
    };
    const result = filterExclusions(report);
    expect(result.report.results).toHaveLength(0);
    expect(result.report.summary.counts.violation).toBe(0);
  });
});
