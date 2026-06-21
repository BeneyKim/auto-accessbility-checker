import fs from 'fs';
import path from 'path';

const logDir = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log';
const files = fs.readdirSync(logDir);
for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(logDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\nChecking file: ${file}`);
    let inEnergyMonitoring = false;
    data.logs.forEach((log, index) => {
      if (log.message.includes('Screen scanned') && log.data && log.data.title === '에너지 모니터링') {
        inEnergyMonitoring = true;
        console.log(`[Index ${index}] Entered Energy Monitoring`);
      }
      if (inEnergyMonitoring) {
        if (log.message.includes('popped') || log.message.includes('Branch traversal finished')) {
          inEnergyMonitoring = false;
          console.log(`[Index ${index}] Exited Energy Monitoring`);
        } else {
          // Print clicks or dialog logs
          if (log.message.includes('click') || log.message.includes('dialog') || log.message.includes('shell') || log.message.includes('candidate')) {
            console.log(`  [Index ${index}] ${log.message}:`, log.data ? JSON.stringify(log.data) : '');
          }
        }
      }
    });
  }
}
