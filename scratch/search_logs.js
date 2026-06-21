import fs from 'fs';
import path from 'path';

const logDir = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log';
const query = '에너지 모니터링';

const files = fs.readdirSync(logDir);
for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(logDir, file);
    console.log(`\n=================== FILE: ${file} ===================`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.logs.forEach((log, index) => {
      if (log.message === 'candidate click started.' && log.data && log.data.candidate && log.data.candidate.name === query) {
        console.log(`[Index ${index}] click started:`, JSON.stringify(log.data.candidate));
      }
      if (log.message === 'transition classified.' && log.data && log.data.triggerName === query) {
        console.log(`[Index ${index}] transition classified:`);
        console.log(`  Classification: ${log.data.classification}`);
        console.log(`  Reason: ${log.data.reason}`);
        console.log(`  Before signature/url: ${log.data.before.signature} / ${log.data.before.url}`);
        console.log(`  After signature/url/overlay: ${log.data.after.signature} / ${log.data.after.url} / overlayCount: ${log.data.after.overlayCount}`);
        if (log.data.after.overlayDescriptors) {
          console.log(`  After overlays:`, log.data.after.overlayDescriptors);
        }
      }
      if (log.message === 'Branch root snapshot is not a safe product screen.' && JSON.stringify(log.data).includes(query)) {
        console.log(`[Index ${index}] Branch root snapshot not safe!`, JSON.stringify(log.data));
      }
    });
  }
}
