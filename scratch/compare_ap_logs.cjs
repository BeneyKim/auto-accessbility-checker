const fs = require('fs');

function checkLog(filePath, label) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  console.log(`\n=== Log: ${filePath} ===`);
  const clicks = logs.filter(l => l.message && l.message.includes('candidate click started'));
  console.log(`Total clicks: ${clicks.length}`);
  
  clicks.forEach((c, idx) => {
    const cand = c.data && c.data.candidate;
    if (cand && cand.name && cand.name.includes('취침')) {
      console.log(`Click ${idx}: [${cand.role}] "${cand.name}" (id: ${cand.id}, tagName: ${cand.tagName})`);
    }
  });
}

checkLog('log/0.99.10/공기청정기-debug-log-20260620-151818.json');
checkLog('log/공기청정기-debug-log-20260620-173949.json');
