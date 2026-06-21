import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-051100.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Inspecting logs from 38 to 55...");
for (let idx = 38; idx <= 55; idx++) {
  const entry = data.logs[idx];
  if (!entry) continue;
  console.log(`[Entry ${idx}] Level: ${entry.level} | Message: ${entry.message}`);
  if (entry.data && entry.data !== "undefined") {
    console.log(JSON.stringify(entry.data, null, 2));
  }
  console.log("-----------------------------------------");
}
