import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-051100.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Printing logs from Entry 345 to 355 with timestamps...");

for (let idx = 345; idx <= 355; idx++) {
  const entry = data.logs[idx];
  if (!entry) continue;
  console.log(`[Entry ${idx}] Timestamp: ${entry.timestamp} | Level: ${entry.level} | Message: ${entry.message}`);
}
