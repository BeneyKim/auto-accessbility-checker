const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/냉장고-debug-log-20260620-173641.json', 'utf8'));
const logs = data.logs || [];
logs.forEach((l, idx) => {
  if (l.message && l.message.includes('candidate collected.')) {
    const listCand = l.data && l.data.candidates && l.data.candidates.some(c => c.name === '가지' || c.name === '모짜렐라치즈' || c.name === '두유');
    if (listCand) {
      console.log(`\nEntry ${idx}: candidate collected on URL: ${l.data.snapshot.url}`);
      console.log(`Candidates count: ${l.data.candidates.length}`);
      console.log(`Candidates:`, l.data.candidates.map(c => `[${c.role}] "${c.name}"`));
    }
  }
});
