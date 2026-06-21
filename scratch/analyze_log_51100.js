import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260602-051100.json';
const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
const logs = logData.logs;

let output = `Total log entries: ${logs.length}\n`;

const relevantLogs = logs.filter(log => {
  const msg = log.message || '';
  return msg.includes('Semantic') || msg.includes('transition') || msg.includes('visited') || msg.includes('skipping') || msg.includes('식품') || msg.includes('추가') || msg.includes('에너지') || msg.includes('FOD') || msg.includes('ENM');
});

output += `Relevant log entries: ${relevantLogs.length}\n\n`;

relevantLogs.forEach(log => {
  output += `[${log.timestamp}] [${log.level}] ${log.message}\n`;
  if (log.data) {
    output += JSON.stringify(log.data, null, 2) + '\n';
  }
});

fs.writeFileSync('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/analyze_log_output.txt', output, 'utf8');
console.log("Done writing to analyze_log_output.txt");
