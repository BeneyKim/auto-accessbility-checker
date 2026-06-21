const fs = require('fs');
const path = require('path');

const onLogPath = path.join(__dirname, '..', 'log', '식기세척기-전원ON-debug-log-20260620-161519.json');
const offLogPath = path.join(__dirname, '..', 'log', '식기세척기-전원OFF-debug-log-20260620-161223.json');

function inspectDishwasher(logPath, label) {
  if (!fs.existsSync(logPath)) {
    console.log(`${label} log file does not exist.`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  console.log(`\n--- ${label} (${data.logs.length} logs) ---`);
  
  data.logs.forEach((l, idx) => {
    if (l.message === 'candidate click started.') {
      const candidate = l.data.candidate;
      console.log(`[Log ${idx}] Clicked: "${candidate.name}" (role: ${candidate.role})`);
    }
    if (l.message === 'candidate collected.') {
      const title = l.data.snapshot.title;
      if (title.includes('다운로드') || title.includes('코스')) {
        console.log(`[Log ${idx}] Screen: "${title}" candidates:`);
        l.data.candidates.forEach(c => {
          console.log(`  Name="${c.name}", Role="${c.role}"`);
        });
      }
    }
    if (l.message && l.message.includes('unsafe')) {
      console.log(`[Log ${idx}] UNSAFE: ${l.message}`, l.data);
    }
  });
}

inspectDishwasher(onLogPath, "Dishwasher ON");
inspectDishwasher(offLogPath, "Dishwasher OFF");
