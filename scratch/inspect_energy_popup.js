import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-044443.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Analyzing Energy Monitoring logs from Entry 265...");

for (let idx = 265; idx <= 290; idx++) {
  const entry = data.logs[idx];
  if (!entry) continue;
  console.log(`[Entry ${idx}] Level: ${entry.level} | Message: ${entry.message}`);
  if (entry.data && entry.data !== "undefined") {
    console.log(JSON.stringify(entry.data, null, 2));
  }
  console.log("-----------------------------------------");
}
