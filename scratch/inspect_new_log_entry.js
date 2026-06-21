import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260530-163916.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (let i = 275; i <= 297; i++) {
    if (data.logs[i]) {
      console.log(`#${i} [${data.logs[i].timestamp}] [${data.logs[i].level}] ${data.logs[i].message}`);
      if (data.logs[i].message === 'transition classified.') {
        console.log(JSON.stringify(data.logs[i].data, null, 2));
      }
    }
  }
} else {
  console.log('Log not found');
}
