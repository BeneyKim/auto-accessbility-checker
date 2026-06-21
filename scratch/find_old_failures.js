import fs from 'fs';

const filePath = 'C:/Users/bhkim/.gemini/antigravity/brain/e293287e-c591-4f9f-8b04-b57165701eec/scratch/refrig_analysis.txt';
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`Searching refrig_analysis.txt for "에너지" and failure context...`);
  lines.forEach((line, idx) => {
    if (line.includes('에너지 모니터링')) {
      console.log(`[Line ${idx}] ${line}`);
      // Print surrounding lines
      const start = Math.max(0, idx - 5);
      const end = Math.min(lines.length - 1, idx + 10);
      for (let i = start; i <= end; i++) {
        console.log(`  L${i}: ${lines[i]}`);
      }
      console.log('----------------------------------------------------');
    }
  });
} else {
  console.log('File does not exist!');
}
