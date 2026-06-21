import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (let i = 250; i <= 297; i++) {
    const log = data.logs[i];
    if (!log) continue;
    console.log(`\n[${i}] [${log.timestamp}] [${log.level}] - ${log.message}`);
    if (log.data) {
      if (log.data.before || log.data.after) {
        console.log(`before URL: ${log.data.before?.url}, overlayCount: ${log.data.before?.overlayCount}`);
        console.log(`after URL: ${log.data.after?.url}, overlayCount: ${log.data.after?.overlayCount}, candidateCount: ${log.data.after?.candidateCount}, title: ${log.data.after?.title}`);
      } else if (log.data.snapshot) {
        console.log(`snapshot URL: ${log.data.snapshot.url}, overlayCount: ${log.data.snapshot.overlayCount}, candidateCount: ${log.data.snapshot.candidateCount}, title: ${log.data.snapshot.title}`);
      } else {
        console.log(JSON.stringify(log.data, null, 2));
      }
    }
  }
} else {
  console.log('Log file not found');
}
