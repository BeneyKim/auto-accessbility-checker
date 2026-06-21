const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/워시타워-전원OFF-debug-log-20260620-172109.json', 'utf8'));
const logs = data.logs || [];
logs.forEach(l => {
  if (l.data && l.data.snapshot && l.data.snapshot.url) {
    console.log(l.data.snapshot.url);
  }
});
