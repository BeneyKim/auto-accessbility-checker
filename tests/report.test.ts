import { describe, expect, it } from "vitest";
import { buildHtmlReport, buildJsonReport, buildMarkdownReport, extractSummary, makeFileBase, analyzeConsistency, normalizeLabelForConsistency } from "../src/shared/report";
import type { RunResult } from "../src/shared/types";

describe("report helpers", () => {
  it("extracts IBM summary counts", () => {
    const summary = extractSummary({
      report: {
        summary: {
          counts: {
            violation: 2,
            potentialviolation: 1,
            recommendation: 3,
            manual: 4,
            pass: 120
          }
        }
      }
    });

    expect(summary.violation).toBe(2);
    expect(summary.potentialviolation).toBe(1);
    expect(summary.manual).toBe(4);
    expect(summary.pass).toBe(120);
  });

  it("extracts summary counts directly from results when report summary counts are missing", () => {
    const summary = extractSummary({
      results: [
        {
          value: ["VIOLATION", "FAIL"],
          ruleId: "rule-1",
          message: "Violation message"
        },
        {
          value: ["VIOLATION", "POTENTIAL"],
          ruleId: "rule-2",
          message: "Potential violation message"
        },
        {
          value: ["RECOMMENDATION", "RECOMMENDATION"],
          ruleId: "rule-3",
          message: "Recommendation message"
        },
        {
          value: ["VIOLATION", "MANUAL"],
          ruleId: "rule-4",
          message: "Manual check"
        },
        {
          value: ["RECOMMENDATION", "PASS"],
          ruleId: "rule-5",
          message: "Pass"
        }
      ]
    });

    expect(summary.violation).toBe(1);
    expect(summary.potentialviolation).toBe(1);
    expect(summary.recommendation).toBe(1);
    expect(summary.manual).toBe(1);
    expect(summary.pass).toBe(1);
  });


  it("creates safe file names and report formats with default levels", () => {
    const result = makeRunResult();
    const base = makeFileBase("ThinQ Web: Air/Purifier", new Date("2026-05-05T01:02:03"));

    expect(base).toBe("ThinQ-Web-Air-Purifier-20260505-010203");
    
    // Default levels (undefined in settings, so defaults to all true)
    const json = JSON.parse(buildJsonReport(result));
    expect(json.results).toHaveLength(1);
    expect(json.results[0].ibmReport.report.results).toHaveLength(3); // Should have 3 issues

    const md = buildMarkdownReport(result);
    expect(md).toContain("| 제품 > 예약 | product | 1 | 1 | 1 | 1 |");
    expect(md).toContain("- Included levels: 🔴 Violation, 🟡 Needs review, 🔵 Recommendation");

    const html = buildHtmlReport(result);
    expect(html).toContain("<title>ThinQ Web - Accessibility Report</title>");
    expect(html).toContain("<strong>Included Levels:</strong> 🔴 Violation, 🟡 Needs review, 🔵 Recommendation");
    expect(html).toContain("<span class=\"summary-val\" style=\"color: var(--color-violation);\">1</span>");
    expect(html).toContain("<span class=\"summary-val\" style=\"color: var(--color-needs-review);\">1</span>");
    expect(html).toContain("<span class=\"summary-val\" style=\"color: var(--color-recommendation);\">1</span>");
  });

  it("filters reports when only Violation level is selected", () => {
    const result = makeRunResult();
    result.metadata.settings.levels = {
      violation: true,
      needsReview: false,
      recommendation: false
    };

    // JSON report should only have 1 issue (the violation)
    const json = JSON.parse(buildJsonReport(result));
    expect(json.results[0].ibmReport.report.results).toHaveLength(1);
    expect(json.results[0].ibmReport.report.results[0].value[0]).toBe("VIOLATION");
    expect(json.results[0].ibmReport.report.results[0].value[1]).toBe("FAIL");

    // Markdown report should show N/A for filtered columns
    const md = buildMarkdownReport(result);
    expect(md).toContain("| 제품 > 예약 | product | 1 | 1 | N/A | N/A |");
    expect(md).toContain("- Included levels: 🔴 Violation");

    // HTML report should show N/A for filtered counts
    const html = buildHtmlReport(result);
    expect(html).toContain("<strong>Included Levels:</strong> 🔴 Violation");
    expect(html).toContain("<span class=\"summary-val\" style=\"color: var(--color-violation);\">1</span>");
    expect(html).toContain("<span class=\"summary-val\" style=\"color: var(--color-needs-review);\">N/A</span>");
    expect(html).toContain("<span class=\"summary-val\" style=\"color: var(--color-recommendation);\">N/A</span>");
  });
});

function makeRunResult(): RunResult {
  return {
    metadata: {
      title: "ThinQ Web",
      startedAt: "2026-05-05T01:00:00.000Z",
      completedAt: "2026-05-05T01:01:00.000Z",
      url: "https://my.lgthinq.com/",
      userAgent: "test",
      settings: {
        title: "ThinQ Web",
        accessibilityStandard: "IBM_Accessibility",
        ruleSet: "latest",
        maxDepth: 5
      }
    },
    logs: [],
    results: [
      {
        depth: 1,
        menuPath: ["제품", "예약"],
        branch: "product",
        title: "예약",
        url: "https://my.lgthinq.com/",
        timestamp: "2026-05-05T01:00:30.000Z",
        ibmReport: {
          report: {
            summary: { counts: { violation: 1, potentialviolation: 1, recommendation: 1 } },
            results: [
              {
                value: ["VIOLATION", "FAIL"],
                ruleId: "some-rule-1",
                message: "Violation message",
                path: { dom: "div" }
              },
              {
                value: ["VIOLATION", "POTENTIAL"],
                ruleId: "some-rule-2",
                message: "Potential message",
                path: { dom: "span" }
              },
              {
                value: ["RECOMMENDATION", "RECOMMENDATION"],
                ruleId: "some-rule-3",
                message: "Recommendation message",
                path: { dom: "a" }
              }
            ]
          }
        },
        summary: {
          violation: 1,
          potentialviolation: 1,
          recommendation: 1,
          potentialrecommendation: 0,
          manual: 0,
          pass: 0,
          ignored: 0
        },
        navigation: {
          screenSignature: "abc"
        }
      }
    ]
  };
}

describe("Cognitive Navigation Consistency Check", () => {
  it("normalizes state indicators and dates for comparison", () => {
    expect(normalizeLabelForConsistency("켜짐, 오토모드")).toBe("오토모드");
    expect(normalizeLabelForConsistency("식기세척기, 선택 목록")).toBe("식기세척기");
    expect(normalizeLabelForConsistency("보관 시작일 2026. 5. 31.")).toBe("보관 시작일");
    expect(normalizeLabelForConsistency("공간, 마이홈 - 주방")).toBe("공간");
  });

  it("detects no violations when same label leads to same destination", () => {
    const logs = [
      {
        triggerName: "식품 추가",
        sourceTitle: "식품 관리",
        targetTitle: "식품 추가 메인",
        targetPathname: "/food/add",
        selector: "button#add"
      },
      {
        triggerName: "식품 추가",
        sourceTitle: "기타 카테고리",
        targetTitle: "식품 추가 메인",
        targetPathname: "/food/add",
        selector: "button#add-other"
      }
    ];

    const violations = analyzeConsistency(logs);
    expect(violations).toHaveLength(0);
  });

  it("detects violations when same label leads to different destination titles", () => {
    const logs = [
      {
        triggerName: "식품 추가",
        sourceTitle: "식품 관리",
        targetTitle: "식품 추가 기본",
        targetPathname: "/food/add/basic",
        selector: "button#add-basic"
      },
      {
        triggerName: "식품 추가",
        sourceTitle: "기타 카테고리",
        targetTitle: "식품 추가 기타",
        targetPathname: "/food/add/other",
        selector: "button#add-other"
      }
    ];

    const violations = analyzeConsistency(logs);
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe("식품 추가");
    expect(violations[0].instances).toHaveLength(2);
    expect(violations[0].instances[0].targetTitle).toBe("식품 추가 기본");
    expect(violations[0].instances[1].targetTitle).toBe("식품 추가 기타");
  });

  it("ignores generic navigation labels like 닫기/뒤로/확인", () => {
    const logs = [
      {
        triggerName: "닫기",
        sourceTitle: "식품 관리",
        targetTitle: "홈",
        targetPathname: "/home",
        selector: "button#close1"
      },
      {
        triggerName: "닫기",
        sourceTitle: "예약 설정",
        targetTitle: "설정",
        targetPathname: "/settings",
        selector: "button#close2"
      }
    ];

    const violations = analyzeConsistency(logs);
    expect(violations).toHaveLength(0);
  });
});
