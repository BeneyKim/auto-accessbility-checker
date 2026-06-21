import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-044443.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  console.log("Analyzing logs from 20260602-044443...");
  data.logs.forEach((entry, idx) => {
    const str = JSON.stringify(entry);
    if (str.includes("추가하기") || (entry.message && entry.message.includes("Screen scanned") && entry.data.title.includes("식품"))) {
      console.log(`[Entry ${idx}] Level: ${entry.level} | Message: ${entry.message}`);
      if (entry.data && entry.data !== "undefined") {
        console.log(JSON.stringify(entry.data, null, 2));
      }
      console.log("-----------------------------------------");
    }
  });
} else {
  console.log("File not found:", logPath);
}
