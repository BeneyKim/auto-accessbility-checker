const fs = require('fs');
const filePath = 'log/워시타워-전원OFF-debug-log-20260620-191247.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

for (let idx = 0; idx <= 15; idx++) {
  if (logs[idx]) {
    const l = logs[idx];
    console.log(`LogIndex ${idx}: [${l.level}] ${l.message}`);
    if (l.data) {
      console.log(`   Data: ${JSON.stringify(l.data, null, 2)}`);
    }
  }
}
