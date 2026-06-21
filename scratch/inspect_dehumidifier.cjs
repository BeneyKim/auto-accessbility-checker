const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log', '제습기-debug-log-20260620-152133.json');
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

const clicks = data.logs.filter(l => l.message === 'candidate click started.');
console.log(`Total candidate click logs: ${clicks.length}`);

clicks.forEach((c, idx) => {
  const candidate = c.data.candidate;
  const frame = c.data.frame;
  console.log(`${idx}: Name="${candidate.name}", Role="${candidate.role}", Tag="${candidate.tagName}", Occurrence=${candidate.occurrenceIndex}, ParentScreen="${frame ? frame.rootTitle : 'unknown'}"`);
});
