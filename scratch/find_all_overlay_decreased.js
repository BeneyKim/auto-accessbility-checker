import fs from 'fs';

const debug2Path = 'log/냉동고-debug-log-20260601-103418.json';
const data = JSON.parse(fs.readFileSync(debug2Path, 'utf8'));

console.log('=== All "overlay-count-decreased" transitions in Run 2 ===');
data.logs.forEach((entry, idx) => {
  const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
  if (text.includes('overlay-count-decreased')) {
    console.log(`[${idx}] ${text.substring(0, 300)}...`);
  }
});
