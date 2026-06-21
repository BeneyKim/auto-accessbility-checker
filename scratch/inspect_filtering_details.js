import fs from 'fs';

const logPath = 'log/냉동고-debug-log-20260531-134021.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

let rawAriaRoleAllowedTextCount = 0;
let rawSkipMainExistsCount = 0;
let rawLabelNameVisibleCount = 0;

console.log("Analyzing log entries...");

data.logs.forEach(entry => {
  // Check if it is a log of "Screen scanned." which contains the report
  if (entry.message === 'Screen scanned.' && entry.data && entry.data.ibmReport) {
    const rawReport = entry.data.ibmReport;
    const report = rawReport.report ? rawReport.report : rawReport;
    
    // Note: The log contains the report AFTER filtering because runIbmCheckSafely returns filterExclusions(rawReport).
    // Let's see if there are any traces of excluded items or check raw logs
  }
});

// Since the logs store the return value of runIbmCheckSafely (which is already filtered),
// we can compare the result of the previous run (unfiltered) with the new run (filtered).
console.log("Done checking logs.");
