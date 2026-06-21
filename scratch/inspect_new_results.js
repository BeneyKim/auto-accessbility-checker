import fs from 'fs';

const jsonPath = 'log/냉동고-20260531-134008/냉동고-20260531-134008.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("Loaded report. Results count:", data.results.length);

let totalAriaRoleAllowed = 0;
let totalSkipMainExists = 0;
let totalLabelNameVisible = 0;
let otherAriaRoleAllowed = [];

data.results.forEach((screen, screenIndex) => {
  const ibmReport = screen.ibmReport;
  const report = ibmReport.report ? ibmReport.report : ibmReport;
  if (report && Array.isArray(report.results)) {
    report.results.forEach(issue => {
      const isFail = issue.value && issue.value[1] === 'FAIL';
      if (isFail) {
        if (issue.ruleId === 'aria_role_allowed') {
          if (issue.message.includes("'text'")) {
            totalAriaRoleAllowed++;
          } else {
            otherAriaRoleAllowed.push({ screen: screen.title, message: issue.message });
          }
        }
        if (issue.ruleId === 'skip_main_exists') {
          totalSkipMainExists++;
        }
        if (issue.ruleId === 'label_name_visible') {
          totalLabelNameVisible++;
        }
      }
    });
  }
});

console.log("\nCounts of EXCLUDED rules in the final report (should be 0):");
console.log("- aria_role_allowed with role 'text':", totalAriaRoleAllowed);
console.log("- skip_main_exists:", totalSkipMainExists);
console.log("- label_name_visible:", totalLabelNameVisible);

console.log("\nOther aria_role_allowed (not 'text') violations reported:", otherAriaRoleAllowed.length);
otherAriaRoleAllowed.forEach(item => {
  console.log(`- Screen [${item.screen}]: message="${item.message}"`);
});
