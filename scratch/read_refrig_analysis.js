import fs from 'fs';

const filePath = 'C:/Users/bhkim/.gemini/antigravity/brain/e293287e-c591-4f9f-8b04-b57165701eec/scratch/refrig_analysis.txt';
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  let matchCount = 0;
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('에너지') || line.toLowerCase().includes('monitoring')) {
      console.log(`[Line ${index}] ${line}`);
      // Print next 5 lines if it contains data
      for (let i = 1; i <= 5; i++) {
        if (lines[index + i] && lines[index + i].startsWith('  ')) {
          console.log(lines[index + i]);
        } else {
          break;
        }
      }
      console.log('---');
      matchCount++;
      if (matchCount > 30) {
        console.log('Truncating matches...');
        process.exit(0);
      }
    }
  });
} else {
  console.log('refrig_analysis.txt does not exist!');
}
