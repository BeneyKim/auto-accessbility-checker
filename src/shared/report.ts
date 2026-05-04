import type { AccessibilitySummary, RunResult, ScreenResult } from "./types";

const EMPTY_SUMMARY: AccessibilitySummary = {
  violation: 0,
  potentialviolation: 0,
  recommendation: 0,
  potentialrecommendation: 0,
  manual: 0,
  pass: 0,
  ignored: 0
};

export function extractSummary(ibmReport: unknown): AccessibilitySummary {
  const report = readObject(readObject(ibmReport).report);
  const summary = readObject(report.summary);
  const counts = readObject(summary.counts);

  return {
    ...EMPTY_SUMMARY,
    violation: toNumber(counts.violation),
    potentialviolation: toNumber(counts.potentialviolation),
    recommendation: toNumber(counts.recommendation),
    potentialrecommendation: toNumber(counts.potentialrecommendation),
    manual: toNumber(counts.manual),
    pass: toNumber(counts.pass),
    ignored: toNumber(counts.ignored)
  };
}

export function makeFileBase(title: string, date = new Date()): string {
  const safeTitle = (title || "ThinQ Web")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
  return `${safeTitle}-${stamp}`;
}

export function buildJsonReport(result: RunResult): string {
  return JSON.stringify(result, null, 2);
}

export function buildMarkdownReport(result: RunResult): string {
  const lines = [
    `# ${result.metadata.title}`,
    "",
    `- Started: ${result.metadata.startedAt}`,
    `- Completed: ${result.metadata.completedAt ?? "not completed"}`,
    `- URL: ${result.metadata.url}`,
    `- Accessibility standard: ${result.metadata.settings.accessibilityStandard}`,
    `- Rule set: ${result.metadata.settings.ruleSet}`,
    `- Max depth: ${result.metadata.settings.maxDepth}`,
    `- Screens scanned: ${result.results.length}`,
    "",
    "## Summary",
    "",
    "| Screen | Branch | Depth | Violations | Potential | Manual |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...result.results.map(
      (screen) =>
        `| ${escapeMarkdown(screen.menuPath.join(" > ") || screen.title)} | ${screen.branch} | ${screen.depth} | ${screen.summary.violation} | ${screen.summary.potentialviolation} | ${screen.summary.manual} |`
    ),
    ""
  ];

  for (const screen of result.results) {
    lines.push(...buildScreenMarkdown(screen));
  }

  return lines.join("\n");
}

export function buildHtmlReport(result: RunResult): string {
  const rows = result.results
    .map(
      (screen) => `<tr>
        <td>${escapeHtml(screen.menuPath.join(" > ") || screen.title)}</td>
        <td>${screen.branch}</td>
        <td>${screen.depth}</td>
        <td>${screen.summary.violation}</td>
        <td>${screen.summary.potentialviolation}</td>
        <td>${screen.summary.manual}</td>
      </tr>`
    )
    .join("");

  const sections = result.results
    .map(
      (screen, index) => `<section>
        <h2>${index + 1}. ${escapeHtml(screen.menuPath.join(" > ") || screen.title)}</h2>
        <p><strong>Branch:</strong> ${screen.branch} <strong>Depth:</strong> ${screen.depth}</p>
        ${
          screen.screenshot
            ? `<img src="${screen.screenshot}" alt="Screenshot for ${escapeHtml(screen.title)}" />`
            : "<p>No screenshot captured.</p>"
        }
        <pre>${escapeHtml(JSON.stringify(screen.ibmReport, null, 2))}</pre>
      </section>`
    )
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(result.metadata.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; color: #111827; background: #f8fafc; }
    h1, h2 { color: #111827; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #e5e7eb; }
    section { margin-top: 28px; padding-top: 20px; border-top: 2px solid #d1d5db; }
    img { max-width: 100%; border: 1px solid #d1d5db; background: #fff; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #111827; color: #f9fafb; padding: 16px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(result.metadata.title)}</h1>
  <p>Started: ${escapeHtml(result.metadata.startedAt)}<br />
  Completed: ${escapeHtml(result.metadata.completedAt ?? "not completed")}<br />
  URL: ${escapeHtml(result.metadata.url)}<br />
  Screens scanned: ${result.results.length}</p>
  <table>
    <thead><tr><th>Screen</th><th>Branch</th><th>Depth</th><th>Violations</th><th>Potential</th><th>Manual</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${sections}
</body>
</html>`;
}

function buildScreenMarkdown(screen: ScreenResult): string[] {
  return [
    `## ${screen.menuPath.join(" > ") || screen.title}`,
    "",
    `- Branch: ${screen.branch}`,
    `- Depth: ${screen.depth}`,
    `- URL: ${screen.url}`,
    `- Violations: ${screen.summary.violation}`,
    `- Potential violations: ${screen.summary.potentialviolation}`,
    `- Manual checks: ${screen.summary.manual}`,
    "",
    screen.screenshot ? `![Screenshot](${screen.screenshot})` : "No screenshot captured.",
    "",
    "```json",
    JSON.stringify(screen.ibmReport, null, 2),
    "```",
    ""
  ];
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
