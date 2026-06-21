const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log\\워시타워-전원OFF-debug-log-20260620-213928.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

console.log("=== Tracking Clicks on '건조' Sub-tab ===");
logs.forEach((l, idx) => {
  const msg = l.message || "";
  if (msg.includes("click started")) {
    const cand = l.data?.candidate || {};
    if (cand.name === "건조" || cand.name === "세탁") {
      console.log(`[Idx ${idx}] click started on "${cand.name}" (tagName=${cand.tagName}, role=${cand.role}, depth=${l.data.frame?.depth})`);
    }
  }
  if (msg.includes("transition classified")) {
    const trans = l.data || {};
    if (trans.triggerName === "건조" || trans.triggerName === "세탁") {
      console.log(`[Idx ${idx}] transition: trigger="${trans.triggerName}", class="${trans.classification}", reason="${trans.reason}"`);
      if (trans.after) {
        console.log(`   After URL: ${trans.after.url}`);
        console.log(`   After Title: ${trans.after.title}`);
      }
    }
  }
});
