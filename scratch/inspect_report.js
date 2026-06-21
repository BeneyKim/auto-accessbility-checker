import fs from 'fs';

const reportPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-20260601-103416/냉동고-20260601-103416.json';

if (fs.existsSync(reportPath)) {
  const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  console.log('Total results in report:', data.results.length);
  
  data.results.forEach((res, idx) => {
    if (res.menuPath.join(' > ').includes('식품') || res.title.includes('식품')) {
      console.log(`[${idx}] Path: ${res.menuPath.join(' > ')} | Title: "${res.title}" | Depth: ${res.depth} | Screenshot: ${res.screenshot}`);
    }
  });
} else {
  console.log('Report file not found');
}
