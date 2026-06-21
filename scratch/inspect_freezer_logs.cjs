const fs = require('fs');
const filePath = 'log/냉동고-debug-log-20260620-184949.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

for (let idx = 150; idx <= 185; idx++) {
  if (logs[idx]) {
    const l = logs[idx];
    let dataSummary = '';
    if (l.data) {
      const d = l.data;
      dataSummary = JSON.stringify({
        candidate: d.candidate ? d.candidate.name : undefined,
        url: d.snapshot ? d.snapshot.url : (d.url ? d.url : undefined),
        targetTitle: d.targetTitle,
        currentTitle: d.currentTitle,
        targetTitle2: d.targetFrame && d.targetFrame.rootTitle,
        childTitle: d.childFrame && d.childFrame.rootTitle,
        semanticLayoutKey: d.semanticLayoutKey,
        visitKey: d.visitKey,
        triggerName: d.triggerName
      });
    }
    console.log(`LogIndex ${idx}: [${l.level}] ${l.message} -- Data: ${dataSummary}`);
  }
}
