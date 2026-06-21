const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log', '식기세척기-전원ON-debug-log-20260620-161519.json');
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

data.logs.forEach((l, idx) => {
  const str = JSON.stringify(l);
  if (str.includes('소모품') || str.includes('린스') || str.includes('세제')) {
    console.log(`[Log ${idx}] ${l.message}`);
    if (l.data) {
      console.log(JSON.stringify(l.data, null, 2));
    }
  }
});
