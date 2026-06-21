const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/냉장고-debug-log-20260620-173641.json', 'utf8'));
const logs = data.logs || [];
logs.slice(450, 490).forEach((l, idx) => {
  console.log(`${idx + 450}: [${l.level}] ${l.message}`);
  if (l.data && l.data.candidate) {
    console.log(`   Candidate: "${l.data.candidate.name}" (role: ${l.data.candidate.role})`);
  }
});
