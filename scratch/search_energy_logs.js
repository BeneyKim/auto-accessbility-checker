import fs from 'fs';

const logPath = './log/냉동고-debug-log-20260529-021526.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

const start = 260;
const end = 300;
for (let i = start; i <= end; i++) {
  const log = data.logs[i];
  if (!log) continue;
  console.log(`[${i}] ${log.timestamp.substring(11, 19)} [${log.level.toUpperCase()}] ${log.message}`);
  if (log.data) {
    if (log.message.includes('transition classified')) {
      console.log(`  Trigger: ${log.data.triggerName}`);
      console.log(`  Classification: ${log.data.classification} (Reason: ${log.data.reason})`);
      console.log(`  Before: Title: "${log.data.before?.title}", URL: ${log.data.before?.url?.substring(0, 80)}..., Overlays: ${log.data.before?.overlayCount}`);
      console.log(`  After:  Title: "${log.data.after?.title}", URL: ${log.data.after?.url?.substring(0, 80)}..., Overlays: ${log.data.after?.overlayCount}`);
    } else if (log.message.includes('collected')) {
      console.log(`  Candidates: ${JSON.stringify(log.data.candidates?.map(c => c.name))}`);
    } else if (log.message.includes('click started')) {
      console.log(`  Candidate: ${log.data.candidate?.name} (${log.data.candidate?.tagName}, id: ${log.data.candidate?.id})`);
      console.log(`  Frame Depth: ${log.data.frame?.depth}, Path: ${log.data.frame?.menuPath?.join(' > ')}`);
    } else {
      console.log(`  Data: ${JSON.stringify(log.data).substring(0, 160)}`);
    }
  }
}
