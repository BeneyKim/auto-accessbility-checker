import fs from "fs";

function run() {
  const logPath = "c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log\\냉장고-debug-log-20260525-150330.json";
  const fileContent = JSON.parse(fs.readFileSync(logPath, "utf-8"));
  const logData = fileContent.logs || [];
  
  const lines = [];
  lines.push(`Total logs: ${logData.length}`);
  lines.push("Timeline of Transitions:\n");
  
  logData.forEach(entry => {
    const msg = entry.message || "";
    if (
      msg.includes("depth pushed") || 
      msg.includes("depth popped") || 
      msg.includes("Clicking candidate") || 
      msg.includes("restore started") || 
      msg.includes("restore finished") ||
      msg.includes("restore success") ||
      msg.includes("Skipping already visited") ||
      msg.includes("redirection") ||
      msg.includes("candidate collected")
    ) {
      const time = entry.timestamp ? entry.timestamp.split("T")[1].split(".")[0] : "";
      const details = entry.data ? JSON.stringify(entry.data) : "";
      lines.push(`[${time}] [${entry.level}] ${msg} ${details}`);
    }
  });

  fs.writeFileSync("c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\scratch\\transitions_utf8.txt", lines.join("\n"), "utf-8");
  console.log("Successfully wrote transitions_utf8.txt");
}

run();
