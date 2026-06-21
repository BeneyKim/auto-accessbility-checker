import fs from 'fs';

const resultsPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-20260602-051043/냉동고-20260602-051043.json';
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

console.log("Searching results for '유용한 기능' at depth 0...");
data.results.forEach((screen) => {
  if (screen.menuPath.length === 1 && screen.menuPath[0] === "유용한 기능") {
    console.log(`Path: ${screen.menuPath.join(" > ")}`);
    console.log(`Title: ${screen.title}`);
    console.log(`Screenshot: ${screen.screenshot}`);
    console.log(`URL: ${screen.url}`);
    console.log("-----------------------------------------");
  }
});
