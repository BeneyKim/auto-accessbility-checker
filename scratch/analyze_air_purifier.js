import fs from 'fs';

const logPath = 'log/공기청정기-debug-log-20260601-111443.json';
const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));

let out = '';
function log(msg) {
  out += msg + '\n';
}

log(`Total log entries: ${logData.logs.length}`);

log('=== Key logs matching Traversal & visited changes ===');
logData.logs.forEach((entry, idx) => {
  const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
  
  if (
    text.includes('Scanning screen') || 
    text.includes('candidate click started') || 
    text.includes('depth pushed') || 
    text.includes('depth popped') || 
    text.includes('Skipping already visited') || 
    text.includes('visited.add') ||
    text.includes('branch activation') ||
    text.includes('Branch activation') ||
    text.includes('visited.has') ||
    text.includes('visited frame')
  ) {
    log(`[${idx}] ${text}`);
  }
});

fs.writeFileSync('scratch/purifier_analysis.txt', out, 'utf8');
console.log('Saved log analysis to scratch/purifier_analysis.txt');
