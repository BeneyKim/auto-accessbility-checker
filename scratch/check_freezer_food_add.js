import fs from 'fs';

const debugPath = 'log/냉동고-debug-log-20260601-103418.json';
const data = JSON.parse(fs.readFileSync(debugPath, 'utf8'));

console.log('=== Visits to "식품 추가" or similar in Freezer Run 2 ===');
data.logs.forEach((entry, idx) => {
  const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
  if (text.includes('Scanning screen') && text.includes('식품 추가')) {
    console.log(`[${idx}] ${text}`);
  }
});
