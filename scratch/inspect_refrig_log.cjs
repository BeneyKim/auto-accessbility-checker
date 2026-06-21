const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/냉장고-debug-log-20260620-173641.json', 'utf8'));
const logs = data.logs || [];
for (let i = 0; i < logs.length; i++) {
  const l = logs[i];
  if (l.message && l.message.includes('candidate click started')) {
    console.log(JSON.stringify(l, null, 2));
    break;
  }
}
