const fs = require('fs');
const filePath = 'log/워시타워-전원OFF-debug-log-20260620-191247.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

console.log("=== WashTower Log Analysis ===");

// 1. Check first screen scanning and collected candidates
console.log("\n--- First Screen Candidates and Clicks ---");
for (let idx = 0; idx < 100; idx++) {
  if (logs[idx]) {
    const l = logs[idx];
    if (l.message && (l.message.includes('Scanning screen:') || l.message.includes('candidate collected') || l.message.includes('click started') || l.message.includes('skip') || l.message.includes('warn'))) {
      console.log(`LogIndex ${idx}: [${l.level}] ${l.message}`);
      if (l.message.includes('candidate collected')) {
        console.log(`   Candidates: ${l.data.candidates ? l.data.candidates.map(c => c.name).join(', ') : 'none'}`);
      }
      if (l.data && l.data.candidate) {
        console.log(`   Candidate: ${l.data.candidate.name}`);
      }
    }
  }
}

// 2. Check Favorite Course +/- clicks
console.log("\n--- Favorite Course +/- Clicks ---");
logs.forEach((l, idx) => {
  if (l.message && (l.message.includes('즐겨찾기') || l.message.includes('+') || l.message.includes('-') || l.message.includes('추가') || l.message.includes('삭제'))) {
    if (l.message.includes('click') || l.message.includes('transition') || l.message.includes('variant')) {
      console.log(`LogIndex ${idx}: [${l.level}] ${l.message}`);
      if (l.data && l.data.candidate) {
        console.log(`   Candidate: ${l.data.candidate.name}`);
      }
    }
  }
});
