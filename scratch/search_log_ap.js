import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/공기청정기-debug-log-20260602-043310.json';
const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Analyzing branch flow and skips in " + logPath + "...");

data.logs.forEach((entry, idx) => {
  const msg = entry.message || "";
  const level = entry.level || "";
  const isBranchMsg = msg.includes("branch") || msg.includes("Branch");
  const isSkipMsg = msg.includes("skip") || msg.includes("visited") || msg.includes("Semantic") || msg.includes("scanned") || msg.includes("already visited");
  
  if (isBranchMsg || isSkipMsg || msg.includes("Entering") || msg.includes("Entering branch")) {
    console.log(`[Entry ${idx}] Level: ${level} | Message: ${msg}`);
    if (entry.data && entry.data !== "undefined") {
      // Just print essential keys of data to prevent huge output
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
    }
    console.log("-----------------------------------------");
  }
});
