import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-044443.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Listing all scanned screens in Freezer logs...");
data.logs.forEach((entry, idx) => {
  if (entry.message && entry.message.includes("Screen scanned")) {
    console.log(`[Entry ${idx}] Screen scanned: ${entry.data.title} | depth: ${entry.data.depth} | branch: ${entry.data.branch}`);
  }
});
