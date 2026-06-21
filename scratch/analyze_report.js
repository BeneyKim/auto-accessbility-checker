import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-051100.json';
const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
const logs = logData.logs;

const startSec = new Date("2026-06-01T20:10:15.000Z").getTime();
const endSec = new Date("2026-06-01T20:10:25.000Z").getTime();

const targetLogs = logs.filter(log => {
  const t = new Date(log.timestamp).getTime();
  return t >= startSec && t <= endSec;
});

let out = "";
targetLogs.forEach(log => {
  out += `[${log.timestamp}] [${log.level}] ${log.message}\n`;
  if (log.data) {
    out += JSON.stringify(log.data, null, 2) + '\n';
  }
});

fs.writeFileSync('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/analyze_add_click.txt', out, 'utf8');
console.log("Done writing analyze_add_click.txt");
