const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/식기세척기-전원OFF-debug-log-20260620-172550.json', 'utf8'));
const logs = data.logs || [];
const idx = logs.findIndex(l => l.message && l.message.includes('Entering branch: 설정'));
if (idx !== -1) {
  for (let i = idx; i < idx + 10 && i < logs.length; i++) {
    console.log(`\nEntry ${i}: ${logs[i].message}`);
    if (logs[i].data) {
      console.log(JSON.stringify(logs[i].data, null, 2));
    }
  }
} else {
  console.log('Entering branch: 설정 not found');
}
