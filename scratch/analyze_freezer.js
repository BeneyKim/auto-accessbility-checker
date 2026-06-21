import fs from "fs";

function run() {
  const logPath = "c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log\\냉동고-debug-log-20260525-151350.json";
  const fileContent = JSON.parse(fs.readFileSync(logPath, "utf-8"));
  const logData = fileContent.logs || [];
  
  console.log(`Total logs: ${logData.length}`);
  console.log("Timeline of Transitions:");
  
  logData.forEach((entry, idx) => {
    const msg = entry.message || "";
    const time = entry.timestamp ? entry.timestamp.split("T")[1].split(".")[0] : "";
    const details = entry.data ? JSON.stringify(entry.data) : "";
    console.log(`[#${idx}] [${time}] [${entry.level}] ${msg} ${details}`);
  });
}

run();
