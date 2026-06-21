const fs = require('fs');
const filePath = 'log/공기청정기-debug-log-20260620-192243.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

logs.forEach((l, idx) => {
  if (l.message && l.message.includes('candidate collected')) {
    const cands = l.data.candidates || [];
    const sleepCands = cands.filter(c => c.name === '취침 예약');
    if (sleepCands.length > 0) {
      console.log(`LogIndex ${idx}: Found ${sleepCands.length} sleep candidates:`);
      console.log(JSON.stringify(sleepCands, null, 2));
    }
  }
});
