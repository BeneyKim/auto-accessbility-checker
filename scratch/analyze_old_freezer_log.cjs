const fs = require('fs');

const path = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260525-151350.json';
if (!fs.existsSync(path)) {
  console.log("File not found");
  process.exit(1);
}
const content = JSON.parse(fs.readFileSync(path, 'utf8'));
const logs = content.logs;

logs.forEach((log, index) => {
  const msg = log.message;
  const data = log.data;
  if (msg === 'candidate click started' || msg === 'depth pushed' || msg === 'depth popped' || msg.includes('Clicking') || msg === 'restore started') {
    console.log(`[Line ${index + 1}] ${msg} - ${JSON.stringify(data)}`);
  }
});
