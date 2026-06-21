import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/워시타워-전원ON-debug-log-20260620-160235.json';
const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
const logs = logData.logs;

console.log(`Total logs: ${logs.length}`);
logs.forEach(log => {
  console.log(`[${log.timestamp}] [${log.level}] ${log.message}`);
  if (log.data) {
    console.log(JSON.stringify(log.data, null, 2));
  }
});
