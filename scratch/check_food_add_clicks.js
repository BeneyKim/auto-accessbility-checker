import fs from 'fs';

const debugPath = 'log/냉동고-debug-log-20260601-103418.json';
const data = JSON.parse(fs.readFileSync(debugPath, 'utf8'));

console.log('=== Log lines related to "식품 추가" in Freezer Run 2 ===');
data.logs.forEach((entry, idx) => {
  const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
  if (text.includes('식품 추가') || text.includes('추가하기')) {
    if (text.includes('click') || text.includes('transition') || text.includes('Skipping') || text.includes('Scanning')) {
      console.log(`[${idx}] ${text.substring(0, 300)}...`);
    }
  }
});
