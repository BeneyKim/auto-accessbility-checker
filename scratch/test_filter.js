import fs from 'fs';
import path from 'path';

const jsonPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-20260531-132057/냉동고-20260531-132057.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("Loaded report. Results count:", data.results.length);

let totalAriaRoleAllowed = 0;
let totalSkipMainExists = 0;
let totalLabelNameVisible = 0;

data.results.forEach((screen, screenIndex) => {
  const ibmReport = screen.ibmReport;
  const report = ibmReport.report ? ibmReport.report : ibmReport;
  if (report && Array.isArray(report.results)) {
    report.results.forEach(issue => {
      const isFail = issue.value && issue.value[1] === 'FAIL';
      if (isFail) {
        if (issue.ruleId === 'aria_role_allowed') {
          totalAriaRoleAllowed++;
          console.log(`Screen [${screen.title}] has aria_role_allowed: message="${issue.message}"`);
        }
        if (issue.ruleId === 'skip_main_exists') {
          totalSkipMainExists++;
          console.log(`Screen [${screen.title}] has skip_main_exists: message="${issue.message}"`);
        }
        if (issue.ruleId === 'label_name_visible') {
          totalLabelNameVisible++;
          console.log(`Screen [${screen.title}] has label_name_visible: message="${issue.message}"`);
        }
      }
    });
  }
});

console.log("Totals:", {
  totalAriaRoleAllowed,
  totalSkipMainExists,
  totalLabelNameVisible
});
