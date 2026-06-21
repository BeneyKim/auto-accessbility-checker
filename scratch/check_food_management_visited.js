import fs from 'fs';

const debugPath = 'log/냉동고-debug-log-20260601-103418.json';
const data = JSON.parse(fs.readFileSync(debugPath, 'utf8'));

console.log('=== Step 384 to 395 ===');
for (let i = 380; i < 396; i++) {
  console.log(`[${i}] ${JSON.stringify(data.logs[i])}`);
}
