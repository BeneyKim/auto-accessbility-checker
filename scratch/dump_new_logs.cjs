const fs = require('fs');

function dumpEntries(logPath, outPath) {
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

dumpEntries('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260525-205035.json', 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/new_freezer_dump.txt');
