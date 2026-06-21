import fs from 'fs';
import path from 'path';

const logDir = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log';
const files = fs.readdirSync(logDir);
for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(logDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n=================== FILE: ${file} ===================`);
    data.logs.forEach((log, index) => {
      const logStr = JSON.stringify(log);
      if (logStr.includes('click') && (logStr.includes('확인') || logStr.includes('닫기') || logStr.includes('취소') || logStr.includes('dialog'))) {
        console.log(`[Index ${index}] ${log.message}:`, log.data ? JSON.stringify(log.data) : '');
      }
    });
  }
}
