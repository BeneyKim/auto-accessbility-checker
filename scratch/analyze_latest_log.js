import fs from 'fs';

const logPath = './log/냉동고-debug-log-20260529-022626.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log(`Loaded log containing ${data.logs.length} entries.`);

data.logs.forEach((log, index) => {
  const { timestamp, level, message, data: logData } = log;
  const timeStr = timestamp.substring(11, 19);

  if (
    message.includes('click started') ||
    message.includes('transition classified') ||
    message.includes('depth pushed') ||
    message.includes('depth popped') ||
    message.includes('restore') ||
    message.includes('error') ||
    message.includes('failed') ||
    message.includes('scanned')
  ) {
    console.log(`[${index}] ${timeStr} [${level.toUpperCase()}] ${message}`);
    if (logData) {
      if (message.includes('transition classified')) {
        console.log(`  Trigger: ${logData.triggerName}`);
        console.log(`  Classification: ${logData.classification} (Reason: ${logData.reason})`);
        console.log(`  Before: Title: "${logData.before?.title}", URL: ${logData.before?.url?.substring(0, 80)}..., Overlays: ${logData.before?.overlayCount}`);
        console.log(`  After:  Title: "${logData.after?.title}", URL: ${logData.after?.url?.substring(0, 80)}..., Overlays: ${logData.after?.overlayCount}`);
      } else if (message.includes('click started')) {
        console.log(`  Candidate: ${logData.candidate?.name} (${logData.candidate?.tagName}, id: ${logData.candidate?.id})`);
        console.log(`  Frame Depth: ${logData.frame?.depth}, Path: ${logData.frame?.menuPath?.join(' > ')}`);
      } else if (message.includes('depth pushed') || message.includes('depth popped')) {
        console.log(`  Data: ${JSON.stringify(logData)}`);
      } else if (message.includes('scanned')) {
        console.log(`  Title: "${logData.title}", Depth: ${logData.depth}, Branch: ${logData.branch}`);
      } else if (message.includes('restore')) {
        console.log(`  Data: ${JSON.stringify(logData)}`);
      } else {
        console.log(`  Data: ${JSON.stringify(logData).substring(0, 200)}`);
      }
    }
  }
});
