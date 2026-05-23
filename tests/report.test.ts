import { describe, expect, it } from "vitest";
import { buildHtmlReport, buildJsonReport, buildMarkdownReport, extractSummary, makeFileBase } from "../src/shared/report";
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

  it("creates safe file names and report formats", () => {
    const result = makeRunResult();
    const base = makeFileBase("ThinQ Web: Air/Purifier", new Date("2026-05-05T01:02:03"));

    expect(base).toBe("ThinQ-Web-Air-Purifier-20260505-010203");
    expect(JSON.parse(buildJsonReport(result)).results).toHaveLength(1);
    expect(buildMarkdownReport(result)).toContain("| 제품 > 예약 | product | 1 | 1 | 0 | 0 |");
    expect(buildHtmlReport(result)).toContain("<title>ThinQ Web - Accessibility Report</title>");
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
        ibmReport: { report: { summary: { counts: { violation: 1 } } } },
        summary: {
          violation: 1,
          potentialviolation: 0,
          recommendation: 0,
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
