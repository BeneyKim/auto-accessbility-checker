import fs from "fs";

const jsonFile = "c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-20260531-110202/냉동고-20260531-110202.json";
const report = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));

console.log("Screens in JSON report:");
report.results.forEach((screen, idx) => {
  console.log(`\nScreen #${idx + 1}: ${screen.title}`);
  console.log(`- Path: ${screen.menuPath.join(" > ")}`);
  console.log(`- Screenshot: ${screen.screenshot ? "Present (" + screen.screenshot + ")" : "MISSING"}`);
});
