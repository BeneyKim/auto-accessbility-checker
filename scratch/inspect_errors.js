import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  
  const errors = data.logs.filter(l => l.level === 'error');
  console.log(`Found ${errors.length} error level logs:`);
  errors.forEach((err, idx) => {
    console.log(`\nError #${idx} [${err.timestamp}] [${err.message}]:`, JSON.stringify(err.data));
  });
} else {
  console.log('Log not found');
}
