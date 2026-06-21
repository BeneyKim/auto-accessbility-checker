import fs from "fs";

const logFile = "c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260531-110206.json";
const content = JSON.parse(fs.readFileSync(logFile, "utf-8"));

const counts = { info: 0, debug: 0, warn: 0, error: 0 };
content.logs.forEach(entry => {
  counts[entry.level] = (counts[entry.level] || 0) + 1;
});

console.log("Log level counts:", counts);

const warns = content.logs.filter(entry => entry.level === "warn");
console.log(`\nFound ${warns.length} warnings. Printing first 10:`);
warns.slice(0, 10).forEach((w, i) => {
  console.log(`[${i+1}] ${w.message}: ${JSON.stringify(w.data)}`);
});
