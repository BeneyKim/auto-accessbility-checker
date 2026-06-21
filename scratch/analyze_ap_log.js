import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/공기청정기-취침예약중-debug-log-20260620-234229.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

const targets = [22, 34, 38];
targets.forEach((idx) => {
  const log = data.logs[idx];
  if (log) {
    console.log(`=== Log #${idx} (collected candidates) ===`);
    console.log(JSON.stringify(log.data.candidates, null, 2));
  }
});
