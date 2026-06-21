const fs = require('fs');
const path = require('path');

const logDir = 'c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log';
const logFiles = [
  '냉장고-debug-log-20260620-211952.json',
  '냉동고-debug-log-20260620-212732.json',
  '식기세척기-전원OFF-debug-log-20260620-212946.json',
  '식기세척기-전원ON-debug-log-20260620-213126.json',
  '워시타워-전원OFF-debug-log-20260620-213928.json'
];

console.log("=== Checking URL Pathnames containing 'list' or 'history' ===");

const uniqueUrls = new Set();

logFiles.forEach(fileName => {
  const filePath = path.join(logDir, fileName);
  if (!fs.existsSync(filePath)) return;
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  
  logs.forEach(l => {
    // Look for urlPathname or url fields inside log data
    const dataStr = JSON.stringify(l.data || {});
    const urlMatches = dataStr.match(/https?:\/\/[^\s"']+/g) || [];
    urlMatches.forEach(url => {
      try {
        const parsed = new URL(url);
        const lowerPath = parsed.pathname.toLowerCase();
        if (lowerPath.includes("list") || lowerPath.includes("history")) {
          uniqueUrls.add(parsed.pathname);
        }
      } catch {
        // ignore
      }
    });
  });
});

console.log(`Found ${uniqueUrls.size} unique URL pathnames:`);
uniqueUrls.forEach(url => {
  console.log(`- ${url}`);
});
