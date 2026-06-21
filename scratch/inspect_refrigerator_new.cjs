const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log', '냉장고-debug-log-20260620-173641.json');
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

data.logs.forEach((l, idx) => {
  if (idx >= 150 && idx <= 250) {
    if (l.message === 'candidate click started.' || l.message === 'candidate collected.' || l.message === 'restore started.' || l.message === 'transition classified.' || l.message.includes('Semantic match')) {
      console.log(`[Log ${idx}] ${l.message}`);
      if (l.data) {
        console.log(JSON.stringify(l.data, null, 2));
      }
    }
  }
});
