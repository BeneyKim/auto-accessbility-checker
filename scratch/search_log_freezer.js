import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-044443.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Analyzing Freezer logs...");

data.logs.forEach((entry, idx) => {
  const msg = entry.message || "";
  const str = JSON.stringify(entry);
  
  if (str.includes("추가하기") || str.includes("식품") || str.includes("식품관리") || str.includes("식품 관리") || str.includes("visited") || str.includes("skip")) {
    console.log(`[Entry ${idx}] Level: ${entry.level} | Message: ${msg}`);
    if (entry.data && entry.data !== "undefined") {
      const dataKeys = Object.keys(entry.data);
      console.log("  Data Keys:", dataKeys);
      if (entry.data.branch) console.log("  branch:", entry.data.branch);
      if (entry.data.depth !== undefined) console.log("  depth:", entry.data.depth);
      if (entry.data.title) console.log("  title:", entry.data.title);
      if (entry.data.frame) {
        console.log("  frame.branch:", entry.data.frame.branch);
        console.log("  frame.depth:", entry.data.frame.depth);
        console.log("  frame.menuPath:", entry.data.frame.menuPath);
        if (entry.data.frame.semanticIdentity) {
          console.log("  frame.semanticIdentity:", entry.data.frame.semanticIdentity);
        }
      }
      if (entry.data.candidate) {
        console.log("  candidate:", entry.data.candidate.name || entry.data.candidate.role);
      }
      if (entry.data.triggerName) {
        console.log("  triggerName:", entry.data.triggerName);
      }
    }
    console.log("-----------------------------------------");
  }
});
