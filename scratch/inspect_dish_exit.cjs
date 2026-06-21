const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/식기세척기-전원OFF-debug-log-20260620-172550.json', 'utf8'));
const logs = data.logs || [];
console.log('Total entries:', logs.length);
logs.slice(180).forEach((l, idx) => {
  console.log(`${idx + 180}: [${l.level}] ${l.message}`);
  if (l.data) {
    if (l.data.snapshot) {
      console.log(`   URL: ${l.data.snapshot.url}`);
      console.log(`   Title: ${l.data.snapshot.title}`);
      console.log(`   isOutOfScope: ${l.data.snapshot.isOutOfScopeLike}, boundaryPresent: ${l.data.snapshot.boundaryPresent}`);
    }
  }
});
