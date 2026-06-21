import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  
  // Find Log #243 and Log #244
  console.log('Log #243:', JSON.stringify(data.logs[243], null, 2));
  console.log('Log #244:', JSON.stringify(data.logs[244], null, 2));
} else {
  console.log('Log not found');
}
