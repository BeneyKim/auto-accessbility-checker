const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log', '냉장고-debug-log-20260620-173641.json');
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

let currentLog = 0;
data.logs.forEach((l, idx) => {
  const str = JSON.stringify(l);
  if (str.includes('가지 냉장실 12일 지남')) {
    console.log(`[Log ${idx}] contains '가지 냉장실 12일 지남':`);
    // Print logs around this log
    for (let i = Math.max(0, idx - 2); i <= Math.min(data.logs.length - 1, idx + 10); i++) {
      const logItem = data.logs[i];
      if (logItem.message === 'candidate click started.' || logItem.message === 'candidate collected.' || logItem.message.includes('Semantic match') || logItem.message.includes('unsafe') || logItem.message.includes('transition classified.')) {
        console.log(`  [Log ${i}] ${logItem.message}`);
        if (logItem.message.includes('Semantic match')) {
          console.log(`    Key: ${logItem.data.semanticLayoutKey}`);
        }
        if (logItem.message === 'transition classified.') {
          console.log(`    Classification: ${logItem.data.classification}, URL: ${logItem.data.after.url}`);
        }
      }
    }
  }
});
