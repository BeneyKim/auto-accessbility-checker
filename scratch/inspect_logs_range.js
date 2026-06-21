import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (let i = 235; i <= 250; i++) {
    if (data.logs[i]) {
      console.log(`#${i} [${data.logs[i].timestamp}] [${data.logs[i].level}] ${data.logs[i].message}`);
    }
  }
} else {
  console.log('Log not found');
}
