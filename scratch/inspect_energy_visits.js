import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  
  const visits = [];
  data.logs.forEach((log, idx) => {
    if (log.message === 'transition classified.' && log.data && log.data.after && log.data.after.url.includes('ENM01')) {
      visits.push({
        index: idx,
        timestamp: log.timestamp,
        triggerName: log.data.triggerName,
        classification: log.data.classification,
        afterUrl: log.data.after.url,
        afterOverlayCount: log.data.after.overlayCount
      });
    }
  });

  console.log(`Found ${visits.length} transitions into '에너지 모니터링':`);
  visits.forEach((v, i) => {
    console.log(`\nVisit #${i + 1} at log index ${v.index}:`);
    console.log(JSON.stringify(v, null, 2));
  });
} else {
  console.log('Log file not found');
}
