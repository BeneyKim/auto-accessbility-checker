import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  
  // Print logs 220 to 245
  for (let i = 220; i <= 245; i++) {
    if (data.logs[i]) {
      console.log(`\n--- Log #${i} [${data.logs[i].timestamp}] [${data.logs[i].level}]: ${data.logs[i].message} ---`);
      console.log(JSON.stringify(data.logs[i].data, null, 2));
    }
  }
} else {
  console.log('Log not found');
}
