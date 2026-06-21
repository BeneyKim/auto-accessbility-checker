const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/공기청정기-debug-log-20260620-173949.json', 'utf8'));
const logs = data.logs || [];
logs.forEach((l, idx) => {
  if (l.message && (l.message.includes('Scanning screen:') || l.message.includes('candidate click started'))) {
    const isSleep = l.message.includes('취침') || l.message.includes('예약') || (l.data && l.data.candidate && (l.data.candidate.name.includes('취침') || l.data.candidate.name.includes('예약')));
    if (isSleep) {
      console.log(`${idx}: [${l.level}] ${l.message}`);
      if (l.data) {
        if (l.data.candidate) {
          console.log(`   Candidate: "${l.data.candidate.name}"`);
        }
        if (l.data.snapshot) {
          console.log(`   URL: ${l.data.snapshot.url}`);
          console.log(`   Signature: ${l.data.snapshot.signature}`);
        }
      }
    }
  }
});
