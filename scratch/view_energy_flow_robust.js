import fs from 'fs';

const debug1Path = 'log/냉동고-debug-log-20260601-100749.json';
const debug2Path = 'log/냉동고-debug-log-20260601-103418.json';

let out = '';
function log(msg) {
  out += msg + '\n';
}

function printEnergyFlow(path, name) {
  log(`\n=========================================`);
  log(`=== Flow for ${name} ===`);
  log(`=========================================`);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  const len = data.logs.length;
  for (let i = 0; i < len; i++) {
    const entry = data.logs[i];
    const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
    
    // Look for where we click "에너지 모니터링"
    if (text.includes('candidate click started') && text.includes('에너지 모니터링')) {
      log(`\n>>> Found Click on "에너지 모니터링" at index ${i}`);
      // print 2 lines before and 60 lines after
      const start = Math.max(0, i - 2);
      const end = Math.min(len - 1, i + 80);
      for (let j = start; j <= end; j++) {
        const line = data.logs[j];
        const lineText = typeof line === 'string' ? line : JSON.stringify(line);
        log(`[${j}] ${lineText}`);
      }
    }
  }
}

printEnergyFlow(debug1Path, 'Run 1 (100749)');
printEnergyFlow(debug2Path, 'Run 2 (103418)');

fs.writeFileSync('scratch/flow_robust_out.txt', out, 'utf8');
console.log('Saved flow to scratch/flow_robust_out.txt');
