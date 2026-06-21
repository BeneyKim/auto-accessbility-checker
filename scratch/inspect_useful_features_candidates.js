import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260530-163916.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  console.log('Log #289 (candidates on useful features root):');
  console.log(JSON.stringify(data.logs[289], null, 2));
} else {
  console.log('Log not found');
}
