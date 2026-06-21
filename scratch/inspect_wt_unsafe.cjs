const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/워시타워-전원OFF-debug-log-20260620-172109.json', 'utf8'));
const logs = data.logs || [];
const unsafeEntry = logs.find(l => l.message && l.message.includes('Frame became unsafe'));
if (unsafeEntry) {
  console.log(JSON.stringify(unsafeEntry, null, 2));
} else {
  console.log('Unsafe entry not found in WashTower log');
}
