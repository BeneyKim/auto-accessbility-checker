const fs = require('fs');
const filePath = 'log/공기청정기-debug-log-20260620-192243.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

console.log("=== Air Purifier New Log Analysis ===");

logs.forEach((l, idx) => {
  if (l.message && (l.message.includes('Scanning screen:') || l.message.includes('click') || l.message.includes('취침') || l.message.includes('예약'))) {
    let summary = l.message;
    if (l.data) {
      summary += ` -- Data: ${JSON.stringify({
        candidate: l.data.candidate ? l.data.candidate.name : undefined,
        url: l.data.snapshot ? l.data.snapshot.url : (l.data.url ? l.data.url : undefined),
        menuPath: l.data.frame ? l.data.frame.menuPath : undefined,
        title: l.data.frame ? l.data.frame.rootTitle : undefined,
        transitionClassification: l.data.frame ? l.data.frame.transitionClassification : undefined,
        targetTitle: l.data.targetTitle,
        currentTitle: l.data.currentTitle,
        restoreMethod: l.data.frame ? l.data.frame.restoreMethod : undefined
      })}`;
    }
    console.log(`LogIndex ${idx}: [${l.level}] ${summary}`);
  }
});
