import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260601-103418.json';

if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const filtered = data.logs.filter(l => {
    const ts = new Date(l.timestamp);
    const start = new Date('2026-06-01T01:33:10.000Z');
    const end = new Date('2026-06-01T01:33:14.000Z');
    return ts >= start && ts <= end;
  });
  console.log(`Logs in interval: ${filtered.length}`);
  filtered.forEach(l => {
    console.log(`[${l.timestamp}] [${l.level}] ${l.message} - ${JSON.stringify(l.data || {})}`);
  });
} else {
  console.log('Log file not found');
}
