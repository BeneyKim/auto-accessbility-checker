import fs from 'fs';

const fileContent = fs.readFileSync('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/history_matches.txt', 'utf8');
const blocks = fileContent.split("================================================================================");

console.log("Searching history for details on how the Energy Monitoring popup was fixed...");
blocks.forEach((block, idx) => {
  if (block.includes("에너지 모니터링") && (block.includes("overlay-count-decreased") || block.includes("overlayCount") || block.includes("rescan") || block.includes("다이얼로그"))) {
    const lines = block.trim().split("\n");
    console.log(`[Block ${idx}] ${lines[0]}`);
    console.log(lines.slice(1).join("\n").substring(0, 500) + "...\n");
    console.log("-----------------------------------------");
  }
});
