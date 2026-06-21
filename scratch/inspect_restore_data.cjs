const fs = require('fs');

const freezerLog = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260525-163909.json';
const content = JSON.parse(fs.readFileSync(freezerLog, 'utf8'));
const logs = content.logs;

for (let i = 87; i <= 96; i++) {
  console.log(`\n--- ENTRY ${i + 1} ---`);
  console.log(`Message: ${logs[i].message}`);
  console.log(`Level: ${logs[i].level}`);
  console.log(`Data:`, JSON.stringify(logs[i].data, null, 2));
}
