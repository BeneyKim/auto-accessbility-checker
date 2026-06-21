const fs = require('fs');

function dumpFirstEntries(logPath, outPath) {
  const content = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const logs = content.logs;
  const lines = [];

  logs.forEach((log, index) => {
    const time = log.timestamp.split('T')[1].substring(0, 8);
    const dataStr = typeof log.data === 'string' ? log.data : JSON.stringify(log.data);
    lines.push(`[Line ${index + 1}] [${time}] [${log.level}] ${log.message} - ${dataStr}`);
  });

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Dumped ${logs.length} entries of ${logPath} to ${outPath}`);
}

dumpFirstEntries('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260525-163909.json', 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/freezer_dump.txt');
dumpFirstEntries('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉장고-debug-log-20260525-164146.json', 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/refrig_dump.txt');
