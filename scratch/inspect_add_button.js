import fs from 'fs';

function inspectLog(filePath) {
  console.log(`\n======================================================`);
  console.log(`INSPECTING: ${filePath}`);
  console.log(`======================================================`);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Find all clicks on "추가하기"
  data.logs.forEach((log, idx) => {
    if (log.message === 'candidate click started.' && log.data?.candidate?.name === '추가하기') {
      console.log(`\n--- Found click on "추가하기" at log index ${idx} [${log.timestamp}] ---`);
      // Print the next 15 logs
      for (let i = idx; i <= idx + 15; i++) {
        if (data.logs[i]) {
          console.log(`Log #${i} [${data.logs[i].timestamp.slice(11, 19)}] [${data.logs[i].level}] ${data.logs[i].message}`);
          if (data.logs[i].message === 'transition classified.' || data.logs[i].message === 'depth popped.' || data.logs[i].message === 'restore started.') {
            console.log(JSON.stringify(data.logs[i].data, null, 2));
          }
        }
      }
    }
  });
}

inspectLog('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260530-163916.json');
inspectLog('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260531-024638.json');
