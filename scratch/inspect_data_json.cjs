const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log\\워시타워-전원OFF-20260620-213927\\워시타워-전원OFF-20260620-213927.json';
if (!fs.existsSync(filePath)) {
  console.log("File not found");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const results = data.results || [];
if (results.length > 0) {
  const r = results[0];
  if (r.ibmReport._thinqA11y) {
    console.log("=== ibmReport._thinqA11y keys ===");
    console.log(Object.keys(r.ibmReport._thinqA11y));
    console.log(JSON.stringify(r.ibmReport._thinqA11y).slice(0, 1500));
  } else {
    console.log("No _thinqA11y field");
  }
}
