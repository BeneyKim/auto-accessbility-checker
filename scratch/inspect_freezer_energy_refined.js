import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  
  let targetIdx = -1;
  data.logs.forEach((log, idx) => {
    if (log.message === 'candidate click started.' && log.data?.candidate?.name === '에너지 모니터링') {
      targetIdx = idx;
    }
  });

  if (targetIdx !== -1) {
    console.log(`Found '에너지 모니터링' click started at log index: ${targetIdx}`);
    for (let i = targetIdx - 1; i <= targetIdx + 12; i++) {
      if (data.logs[i]) {
        console.log(`\n--- Log #${i} [${data.logs[i].timestamp}] [${data.logs[i].level}]: ${data.logs[i].message} ---`);
        console.log(JSON.stringify(data.logs[i].data, null, 2));
      }
    }
  } else {
    console.log('No click on "에너지 모니터링" found in this log.');
  }
} else {
  console.log('Log not found');
}
