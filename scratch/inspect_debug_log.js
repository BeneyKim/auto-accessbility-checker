import fs from 'fs';

const logPath = 'log/냉동고-debug-log-20260531-132058.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Total log entries:", data.logs.length);

const nonInfo = data.logs.filter(l => l.level !== 'info' && l.level !== 'debug');
console.log(`Non-info/debug logs count: ${nonInfo.length}`);
nonInfo.forEach(l => {
  console.log(`[${l.level.toUpperCase()}] ${l.message}`, l.data || '');
});
