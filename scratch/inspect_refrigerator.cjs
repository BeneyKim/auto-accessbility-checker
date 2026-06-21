const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log', '냉장고-debug-log-20260620-154544.json');
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

const clicks = data.logs.filter(l => l.message === 'candidate click started.');
clicks.forEach((c, idx) => {
  const candidate = c.data.candidate;
  const frame = c.data.frame;
  console.log(`${idx}: Name="${candidate.name}", Role="${candidate.role}", Parent="${frame ? frame.rootTitle : 'unknown'}"`);
});
