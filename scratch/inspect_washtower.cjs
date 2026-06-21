const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log', '워시타워-전원ON-debug-log-20260620-160235.json');
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

// Print log entries near the error
data.logs.forEach((l, idx) => {
  if (idx >= 10 && idx <= 17) {
    console.log(`\n--- Log ${idx}: ${l.message} ---`);
    console.log(JSON.stringify(l.data, null, 2));
  }
});
