import fs from 'fs';

const debug1Path = 'log/냉동고-debug-log-20260601-100749.json';
const debug2Path = 'log/냉동고-debug-log-20260601-103418.json';

function printEnergyFlow(path, name) {
  console.log(`\n=========================================`);
  console.log(`=== Flow for ${name} ===`);
  console.log(`=========================================`);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  let printing = false;
  let count = 0;
  
  data.logs.forEach(entry => {
    const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
    
    // Start printing when we click on or ensure or enter "에너지 모니터링"
    if (text.includes('"에너지 모니터링"') || text.includes('에너지 모니터링') || text.includes('energy')) {
      if (!printing) {
        printing = true;
        console.log(`--- [START OF ENERGY SEGMENT] ---`);
      }
    }
    
    if (printing) {
      console.log(text);
      count++;
      // Stop printing after we exit or do something else or after 40 lines
      if (count > 80) {
        printing = false;
        count = 0;
        console.log(`--- [TRUNCATED SEGMENT] ---`);
      }
    }
    
    // Stop printing when we pop back to "냉동고" or "유용한 기능" or pop depth
    if (printing && (text.includes('"toDepth":0') || text.includes('branch activation') || text.includes('Ensuring product root before branch'))) {
      printing = false;
      count = 0;
      console.log(`--- [END OF ENERGY SEGMENT] ---`);
    }
  });
}

printEnergyFlow(debug1Path, 'Run 1 (100749)');
printEnergyFlow(debug2Path, 'Run 2 (103418)');
