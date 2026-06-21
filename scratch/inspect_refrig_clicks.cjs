const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/냉장고-debug-log-20260620-173641.json', 'utf8'));
const logs = data.logs || [];
console.log('Total refrig entries:', logs.length);
logs.forEach((l, idx) => {
  if (l.message && (l.message.toLowerCase().includes('click') || l.message.toLowerCase().includes('navigat') || l.message.toLowerCase().includes('transition') || l.message.toLowerCase().includes('screen'))) {
    console.log(`${idx}: [${l.level}] ${l.message}`);
    if (l.data && l.data.candidate) {
      console.log(`   Candidate: "${l.data.candidate.name}" (role: ${l.data.candidate.role})`);
    }
  }
});
