import fs from 'fs';

const exclusions = JSON.parse(fs.readFileSync('public/exclusions.json', 'utf8'));
const jsonPath = 'log/냉동고-20260531-132057/냉동고-20260531-132057.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function filterExclusions(ibmReport) {
  if (!ibmReport || typeof ibmReport !== "object") {
    return ibmReport;
  }

  const report = ibmReport.report ? ibmReport.report : ibmReport;
  if (!Array.isArray(report.results)) {
    return ibmReport;
  }

  const filteredResults = report.results.filter((issue) => {
    if (!issue.ruleId || !issue.message) return true;

    // Check if it matches any exclusion in the list
    const isExcluded = exclusions.some((ex) => {
      const matchId = issue.ruleId === ex.ruleId;
      const matchMsg = (issue.message || "").trim() === ex.message.trim();
      return matchId && matchMsg;
    });

    if (isExcluded) {
      return false; // Exclude it
    }
    return true; // Keep it
  });

  report.results = filteredResults;
  return ibmReport;
}

// Test with the first screen's report that has aria_role_allowed
for (const screen of data.results) {
  const report = screen.ibmReport.report ? screen.ibmReport.report : screen.ibmReport;
  const originalCount = report.results.length;
  
  // Find if there is any aria_role_allowed
  const beforeAriaCount = report.results.filter(r => r.ruleId === 'aria_role_allowed' && r.value && r.value[1] === 'FAIL').length;
  
  if (beforeAriaCount > 0) {
    console.log(`\nTesting screen: ${screen.title}`);
    console.log(`Before filter: total issues = ${originalCount}, aria_role_allowed (FAIL) = ${beforeAriaCount}`);
    
    // Log the first aria_role_allowed issue before filtering
    const sample = report.results.find(r => r.ruleId === 'aria_role_allowed' && r.value && r.value[1] === 'FAIL');
    console.log("Sample issue message:", JSON.stringify(sample.message));
    
    // Check exclusions matching logic manually for this sample
    exclusions.forEach(ex => {
      console.log(`Comparing with exclusion [${ex.ruleId}]:`);
      console.log(`  RuleId match: ${sample.ruleId === ex.ruleId}`);
      console.log(`  Exclusion message:`, JSON.stringify(ex.message));
      console.log(`  Message match: ${sample.message.trim() === ex.message.trim()}`);
    });

    // Run filter
    const filteredReport = filterExclusions(screen.ibmReport);
    const afterReport = filteredReport.report ? filteredReport.report : filteredReport;
    const afterAriaCount = afterReport.results.filter(r => r.ruleId === 'aria_role_allowed' && r.value && r.value[1] === 'FAIL').length;
    console.log(`After filter: total issues = ${afterReport.results.length}, aria_role_allowed (FAIL) = ${afterAriaCount}`);
  }
}
