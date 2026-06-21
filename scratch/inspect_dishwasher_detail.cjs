const fs = require('fs');
const filePath = 'log/식기세척기-전원OFF-debug-log-20260620-190757.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

for (let idx = 145; idx <= 158; idx++) {
  if (logs[idx]) {
    const l = logs[idx];
    console.log(`LogIndex ${idx}: [${l.level}] ${l.message}`);
    if (l.data) {
      console.log(`   Data: ${JSON.stringify(l.data, null, 2)}`);
    }
  }
}
