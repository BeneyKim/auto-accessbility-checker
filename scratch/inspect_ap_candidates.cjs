const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/공기청정기-debug-log-20260620-173949.json', 'utf8'));
const logs = data.logs || [];
for (let i = 149; i <= 173; i++) {
  console.log(`\n--- Entry ${i}: ${logs[i].message} ---`);
  if (logs[i].data) {
    if (logs[i].data.snapshot) {
      console.log(`Snapshot: Title="${logs[i].data.snapshot.title}", URL="${logs[i].data.snapshot.url}", signature="${logs[i].data.snapshot.signature}"`);
    }
    if (logs[i].data.candidates) {
      console.log(`Candidates:`, logs[i].data.candidates.map(c => `[${c.role}] "${c.name}"`));
    }
    if (logs[i].data.candidate) {
      console.log(`Candidate clicked: [${logs[i].data.candidate.role}] "${logs[i].data.candidate.name}"`);
    }
  }
}
