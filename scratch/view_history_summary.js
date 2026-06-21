import fs from 'fs';

const fileContent = fs.readFileSync('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/history_matches.txt', 'utf8');
const blocks = fileContent.split("================================================================================");

console.log("Analyzing conversation blocks for Energy Monitoring popup...");
blocks.forEach((block, idx) => {
  if (block.includes("에너지 모니터링") || block.includes("에너지모니터링")) {
    // Print the block header and first few lines of content
    const lines = block.trim().split("\n");
    const header = lines[0];
    const body = lines.slice(1).join("\n");
    if (body.includes("팝업") || body.includes("popup")) {
      console.log(`[Block ${idx}] ${header}`);
      console.log(body.substring(0, 400) + "...\n");
      console.log("-----------------------------------------");
    }
  }
});
