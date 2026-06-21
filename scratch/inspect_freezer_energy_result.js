import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260529-023411.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  
  // Find the result where title is "에너지 모니터링"
  const result = data.results.find(r => r.title === '에너지 모니터링');
  if (result) {
    console.log('Found result for 에너지 모니터링:');
    console.log('Timestamp:', result.timestamp);
    console.log('Depth:', result.depth);
    console.log('URL:', result.url);
    console.log('IBM Report Summary Counts:', result.ibmReport?.report?.summary?.counts || result.summary);
    if (result.ibmReport?.report?.error) {
      console.log('IBM Scan Error:', result.ibmReport.report.error);
    }
  } else {
    console.log('No result for "에너지 모니터링" found in data.results');
  }
} else {
  console.log('Log not found');
}
