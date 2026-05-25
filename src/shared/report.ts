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
  let totalViolations = 0;
  let totalPotential = 0;
  let totalManual = 0;

  result.results.forEach((screen) => {
    const report = screen.ibmReport;
    const results = (report && typeof report === "object" && "results" in report && Array.isArray(report.results)) ? report.results : [];
    const issues = results.filter((r: any) => r.value && r.value[1] !== "PASS");
    totalViolations += issues.filter((i: any) => i.value[1] === "FAIL").length;
    totalPotential += issues.filter((i: any) => i.value[1] === "POTENTIAL").length;
    totalManual += issues.filter((i: any) => i.value[1] === "MANUAL").length;
  });

  const sidebarItems = result.results
    .map((screen, index) => {
      const report = screen.ibmReport;
      const results = (report && typeof report === "object" && "results" in report && Array.isArray(report.results)) ? report.results : [];
      const issues = results.filter((r: any) => r.value && r.value[1] !== "PASS");
      
      const violations = issues.filter((i: any) => i.value[1] === "FAIL").length;
      const potential = issues.filter((i: any) => i.value[1] === "POTENTIAL").length;
      const manual = issues.filter((i: any) => i.value[1] === "MANUAL").length;

      const badgeHtml = issues.length > 0
        ? `
            ${violations > 0 ? `<span class="mini-badge violation">${violations}</span>` : ""}
            ${potential > 0 ? `<span class="mini-badge potential">${potential}</span>` : ""}
            ${manual > 0 ? `<span class="mini-badge manual">${manual}</span>` : ""}
          `
        : `<span class="mini-badge success">✓</span>`;

      const title = screen.menuPath.join(" > ") || screen.title;
      
      return `
        <div class="menu-item" onclick="scrollToScreen(${index}, this)">
          <div class="menu-item-title-row">
            <span class="menu-item-title" title="${escapeHtml(title)}">${escapeHtml(screen.title)}</span>
            <div class="menu-item-counts">${badgeHtml}</div>
          </div>
          <span class="menu-item-path" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
        </div>
      `;
    })
    .join("");

  const sections = result.results
    .map((screen, index) => {
      const report = screen.ibmReport;
      const results = (report && typeof report === "object" && "results" in report && Array.isArray(report.results)) ? report.results : [];
      const issues = results.filter((r: any) => r.value && r.value[1] !== "PASS");
      
      const screenIssuesHtml = issues.length > 0
        ? issues.map((issue: any) => {
            const type = issue.value[1]; // FAIL, POTENTIAL, MANUAL
            const severity = issue.value[0]; // VIOLATION, RECOMMENDATION, etc.
            let badgeColor = "";
            let badgeText = "";
            let borderColor = "";

            if (type === "FAIL") {
              badgeColor = "rgba(239, 68, 68, 0.15)";
              borderColor = "#ef4444";
              badgeText = `Violation (${severity})`;
            } else if (type === "POTENTIAL") {
              badgeColor = "rgba(245, 158, 11, 0.15)";
              borderColor = "#f59e0b";
              badgeText = `Potential (${severity})`;
            } else {
              badgeColor = "rgba(59, 130, 246, 0.15)";
              borderColor = "#3b82f6";
              badgeText = `Manual Check`;
            }

            const selector = issue.path?.dom || "unknown selector";
            const ruleId = issue.ruleId || "unknown-rule";
            const message = issue.message || "No description provided.";
            const snippet = issue.snippet || "";

            return `
              <div class="issue-card" style="border-left: 4px solid ${borderColor};">
                <div class="issue-header">
                  <span class="issue-badge" style="background-color: ${badgeColor}; color: ${borderColor};">${escapeHtml(badgeText)}</span>
                  <span class="issue-rule-id">${escapeHtml(ruleId)}</span>
                </div>
                <div class="issue-message">${escapeHtml(message)}</div>
                <div class="issue-selector">Selector: <code>${escapeHtml(selector)}</code></div>
                ${snippet ? `<div class="issue-snippet"><pre><code>${escapeHtml(snippet)}</code></pre></div>` : ""}
              </div>
            `;
          }).join("")
        : `
          <div class="success-card">
            <div class="success-icon">🎉</div>
            <div class="success-title">All Accessibility Checks Passed</div>
            <div class="success-message">No violations, potential violations, or manual checks were flagged for this screen.</div>
          </div>
        `;

      const title = screen.menuPath.join(" > ") || screen.title;

      return `
        <div class="screen-card" id="screen-${index}">
          <div class="screen-header">
            <div class="screen-title-area">
              <span class="screen-index">#${index + 1}</span>
              <h2 class="screen-title">${escapeHtml(title)}</h2>
            </div>
            <div class="screen-meta">
              <span class="meta-tag">Branch: ${escapeHtml(screen.branch)}</span>
              <span class="meta-tag">Depth: ${screen.depth}</span>
              <span class="meta-tag">Issues: ${issues.length}</span>
            </div>
          </div>
          
          <div class="screen-body">
            <div class="screen-screenshot-column">
              ${
                screen.screenshot
                  ? `<div class="screenshot-container">
                       <img src="${screen.screenshot}" alt="Screenshot of ${escapeHtml(screen.title)}" onclick="openModal('${screen.screenshot}')"/>
                       <div class="screenshot-zoom-hint">🔍 Click to enlarge</div>
                     </div>`
                  : `<div class="no-screenshot">No screenshot captured</div>`
              }
            </div>
            <div class="screen-issues-column">
              ${screenIssuesHtml}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(result.metadata.title)} - Accessibility Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-secondary: #111827;
      --bg-card: rgba(22, 29, 49, 0.75);
      --border-color: rgba(255, 255, 255, 0.08);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --color-violation: #ef4444;
      --color-potential: #f59e0b;
      --color-manual: #3b82f6;
      --color-success: #10b981;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar styling */
    .sidebar {
      width: 350px;
      background-color: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .sidebar-header {
      padding: 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .sidebar-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #60a5fa, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sidebar-meta {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .sidebar-filter {
      padding: 12px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .filter-input {
      width: 100%;
      padding: 8px 12px;
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .filter-input:focus {
      border-color: #3b82f6;
    }

    .sidebar-menu {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .menu-item {
      display: flex;
      flex-direction: column;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 8px;
      transition: background-color 0.2s, border-color 0.2s;
      border: 1px solid transparent;
    }

    .menu-item:hover {
      background-color: rgba(255, 255, 255, 0.03);
      border-color: var(--border-color);
    }

    .menu-item.active {
      background-color: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .menu-item-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .menu-item-title {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    .menu-item-counts {
      display: flex;
      gap: 4px;
    }

    .mini-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    .mini-badge.violation { background-color: rgba(239, 68, 68, 0.15); color: var(--color-violation); }
    .mini-badge.potential { background-color: rgba(245, 158, 11, 0.15); color: var(--color-potential); }
    .mini-badge.manual { background-color: rgba(59, 130, 246, 0.15); color: var(--color-manual); }
    .mini-badge.success { background-color: rgba(16, 185, 129, 0.15); color: var(--color-success); }

    .menu-item-path {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Main content styling */
    .main-content {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      padding: 40px;
      scroll-behavior: smooth;
    }

    /* Summary section */
    .summary-container {
      display: flex;
      gap: 24px;
      margin-bottom: 40px;
    }

    .summary-card {
      flex: 1;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .summary-icon {
      font-size: 28px;
      width: 54px;
      height: 54px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .summary-icon.violation { background-color: rgba(239, 68, 68, 0.1); color: var(--color-violation); }
    .summary-icon.potential { background-color: rgba(245, 158, 11, 0.1); color: var(--color-potential); }
    .summary-icon.manual { background-color: rgba(59, 130, 246, 0.1); color: var(--color-manual); }
    .summary-icon.screens { background-color: rgba(255, 255, 255, 0.05); color: var(--text-primary); }

    .summary-details {
      display: flex;
      flex-direction: column;
    }

    .summary-val {
      font-size: 24px;
      font-weight: 800;
    }

    .summary-lbl {
      font-size: 12px;
      color: var(--text-secondary);
    }

    /* Screen result cards */
    .screen-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .screen-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .screen-title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .screen-index {
      background-color: rgba(255, 255, 255, 0.05);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .screen-title {
      font-size: 18px;
      font-weight: 700;
    }

    .screen-meta {
      display: flex;
      gap: 12px;
    }

    .meta-tag {
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .screen-body {
      display: flex;
      gap: 32px;
    }

    .screen-screenshot-column {
      width: 320px;
      flex-shrink: 0;
    }

    .screenshot-container {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      background-color: #000;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .screenshot-container:hover {
      transform: scale(1.02);
    }

    .screenshot-container img {
      width: 100%;
      height: auto;
      max-height: 480px;
      object-fit: contain;
      display: block;
    }

    .screenshot-zoom-hint {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 11px;
      text-align: center;
      padding: 6px;
      backdrop-filter: blur(4px);
    }

    .no-screenshot {
      height: 200px;
      border: 1px dashed var(--border-color);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 14px;
    }

    .screen-issues-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 500px;
      overflow-y: auto;
      padding-right: 8px;
    }

    /* Issue cards */
    .issue-card {
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px;
    }

    .issue-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .issue-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .issue-rule-id {
      font-size: 12px;
      color: var(--text-muted);
      font-family: monospace;
    }

    .issue-message {
      font-size: 14px;
      font-weight: 500;
      line-height: 1.5;
      margin-bottom: 8px;
    }

    .issue-selector {
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .issue-selector code {
      font-family: monospace;
      background-color: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    .issue-snippet pre {
      background-color: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }

    .issue-snippet code {
      font-family: monospace;
      font-size: 11px;
      color: #c084fc;
    }

    /* Success Card */
    .success-card {
      background-color: rgba(16, 185, 129, 0.03);
      border: 1px dashed var(--color-success);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .success-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    .success-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-success);
      margin-bottom: 6px;
    }

    .success-message {
      font-size: 13px;
      color: var(--text-secondary);
      max-width: 320px;
      line-height: 1.5;
    }

    /* Modal styling */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(11, 15, 25, 0.95);
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    }

    .modal-content {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border: 1px solid var(--border-color);
      border-radius: 12px;
    }

    .modal-close {
      position: absolute;
      top: 24px;
      right: 32px;
      color: var(--text-primary);
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
    }

    .modal-close:hover {
      color: var(--color-violation);
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">ThinQ Web A11y</div>
      <div class="sidebar-meta">
        <strong>Standard:</strong> ${escapeHtml(result.metadata.settings.accessibilityStandard)}<br />
        <strong>Rule Set:</strong> ${escapeHtml(result.metadata.settings.ruleSet)}
      </div>
    </div>
    <div class="sidebar-filter">
      <input type="text" class="filter-input" placeholder="Search screens..." oninput="filterScreens(this.value)" />
    </div>
    <div class="sidebar-menu">
      ${sidebarItems}
    </div>
  </div>

  <div class="main-content">
    <div class="summary-container">
      <div class="summary-card">
        <div class="summary-icon screens">🖥️</div>
        <div class="summary-details">
          <span class="summary-val">${result.results.length}</span>
          <span class="summary-lbl">Scanned Screens</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon violation">🔴</div>
        <div class="summary-details">
          <span class="summary-val" style="color: var(--color-violation);">${totalViolations}</span>
          <span class="summary-lbl">Violations</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon potential">🟡</div>
        <div class="summary-details">
          <span class="summary-val" style="color: var(--color-potential);">${totalPotential}</span>
          <span class="summary-lbl">Potential Violations</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon manual">🔵</div>
        <div class="summary-details">
          <span class="summary-val" style="color: var(--color-manual);">${totalManual}</span>
          <span class="summary-lbl">Manual Checks</span>
        </div>
      </div>
    </div>

    <div class="screens-container">
      ${sections}
    </div>
  </div>

  <div id="screenshot-modal" class="modal" onclick="closeModal()">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <img class="modal-content" id="modal-img">
  </div>

  <script>
    function scrollToScreen(index, element) {
      const card = document.getElementById('screen-' + index);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
      element.classList.add('active');
    }

    function filterScreens(text) {
      const query = text.toLowerCase().trim();
      document.querySelectorAll('.menu-item').forEach((item, index) => {
        const title = item.querySelector('.menu-item-title').textContent.toLowerCase();
        const path = item.querySelector('.menu-item-path').textContent.toLowerCase();
        const card = document.getElementById('screen-' + index);
        
        if (title.includes(query) || path.includes(query)) {
          item.style.display = 'flex';
          if (card) card.style.display = 'block';
        } else {
          item.style.display = 'none';
          if (card) card.style.display = 'none';
        }
      });
    }

    function openModal(src) {
      const modal = document.getElementById("screenshot-modal");
      const modalImg = document.getElementById("modal-img");
      modal.style.display = "flex";
      modalImg.src = src;
    }

    function closeModal() {
      const modal = document.getElementById("screenshot-modal");
      modal.style.display = "none";
    }

    // Set first menu item active by default
    const firstMenu = document.querySelector('.menu-item');
    if (firstMenu) firstMenu.classList.add('active');
  </script>
</body>
</html>`;
}

function buildScreenMarkdown(screen: ScreenResult): string[] {
  const report = screen.ibmReport;
  const results = (report && typeof report === "object" && "results" in report && Array.isArray(report.results)) ? report.results : [];
  const issues = results.filter((r: any) => r.value && r.value[1] !== "PASS");

  const issueLines: string[] = [];
  if (issues.length > 0) {
    issueLines.push("### Issues", "");
    issueLines.push("| Level | Rule ID | Message | Selector |");
    issueLines.push("| --- | --- | --- | --- |");
    for (const issue of issues) {
      const type = issue.value ? issue.value[1] : "unknown"; // FAIL, POTENTIAL, MANUAL
      const severity = issue.value ? issue.value[0] : "unknown"; // VIOLATION, RECOMMENDATION, etc.
      let badge = "";
      if (type === "FAIL") {
        badge = `❌ Violation (${severity})`;
      } else if (type === "POTENTIAL") {
        badge = `⚠️ Potential (${severity})`;
      } else if (type === "MANUAL") {
        badge = `ℹ️ Manual`;
      } else {
        badge = `❓ ${type} (${severity})`;
      }
      const ruleId = issue.ruleId || "unknown-rule";
      const message = (issue.message || "No description.").replace(/\r?\n/g, " ");
      const selector = (issue.path?.dom || "unknown").replace(/\|/g, "\\|");
      issueLines.push(`| ${badge} | ${ruleId} | ${escapeMarkdown(message)} | \`${selector}\` |`);
    }
  } else {
    issueLines.push("🎉 **All Accessibility Checks Passed**", "");
  }

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
    ...issueLines,
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
