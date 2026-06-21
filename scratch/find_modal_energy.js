import fs from 'fs';

const filePath = 'C:/Users/bhkim/.gemini/antigravity/brain/e293287e-c591-4f9f-8b04-b57165701eec/scratch/refrig_analysis.txt';
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Let's parse the entries. Entries start with [#idx]
  const regex = /\[#(\d+)\]\s+\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(?=\n\[#|$)/gs;
  let match;
  let matchesFound = 0;
  while ((match = regex.exec(content)) !== null) {
    const idx = match[1];
    const timestamp = match[2];
    const level = match[3];
    const body = match[4];
    
    const combined = body.toLowerCase();
    if (combined.includes('에너지') || combined.includes('energy') || combined.includes('enm01')) {
      if (combined.includes('dialog') || combined.includes('overlay') || combined.includes('modal') || combined.includes('popup') || combined.includes('transition')) {
        console.log(`[Entry #${idx}] [${level}] ${body.substring(0, 500)}`);
        console.log('=====================================================');
        matchesFound++;
      }
    }
  }
  console.log(`Search complete. Matches found: ${matchesFound}`);
} else {
  console.log('refrig_analysis.txt does not exist!');
}
