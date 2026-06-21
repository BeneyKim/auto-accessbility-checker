const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log\\냉장고-debug-log-20260620-211952.json';
if (!fs.existsSync(filePath)) {
  console.log("File not found");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

console.log("=== Refrigerator Food Log Analysis ===");
logs.forEach((l, idx) => {
  const msg = l.message || "";
  const dataStr = JSON.stringify(l.data || {});
  
  // Look for food list screen: GRM_20_FOD03_FoodManagement or similar
  if (dataStr.includes("FOD03") || dataStr.includes("FOD04") || dataStr.includes("Food") || dataStr.includes("편집") || dataStr.includes("감") || dataStr.includes("가지") || dataStr.includes("지남")) {
    console.log(`[Idx ${idx}] [${l.level}] ${l.message}`);
    if (l.data && l.data.candidate) {
      console.log(`   Candidate: ${l.data.candidate.name} (${l.data.candidate.tagName}, role=${l.data.candidate.role})`);
    }
    if (l.data && l.data.candidates) {
      console.log(`   Candidates: ${l.data.candidates.map(c => `${c.name} (${c.tagName}, role=${c.role})`).join(', ')}`);
    }
  }
});
