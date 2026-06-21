const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../log/워시타워_전원OFF-debug-log-20260621-015238.json');
if (!fs.existsSync(logPath)) {
  console.error("Log file does not exist:", logPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
const logs = data.logs || [];

console.log("Total logs count:", logs.length);

// 1. Filter critical transitions, clicks, candidate scans, warnings, errors, and skips
const filtered = logs.filter(l => {
  const msg = l.message.toLowerCase();
  return l.level === 'error' || l.level === 'warn' || 
         msg.includes('click') || msg.includes('navigate') || 
         msg.includes('skip') || msg.includes('tab') || 
         msg.includes('diagnosis') || msg.includes('진단') ||
         msg.includes('이력') || msg.includes('코스');
});

console.log("Filtered logs count:", filtered.length);

// Write to text file for reading
const outPath = path.join(__dirname, 'wt_log_filtered.txt');
fs.writeFileSync(outPath, filtered.map((l, i) => {
  let str = `[${l.level.toUpperCase()}] ${l.message}`;
  if (l.data) {
    str += `\n   Data: ${JSON.stringify(l.data)}`;
  }
  return `${i}: ${str}`;
}).join('\n'), 'utf8');

console.log("Saved filtered logs to:", outPath);
