const fs = require('fs');
const filePath = 'log/공기청정기-debug-log-20260620-192243.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

for (let idx = 140; idx <= 166; idx++) {
  if (logs[idx]) {
    const l = logs[idx];
    console.log(`LogIndex ${idx}: [${l.level}] ${l.message}`);
    if (l.data) {
      console.log(`   Data: ${JSON.stringify(l.data, null, 2)}`);
    }
  }
}
