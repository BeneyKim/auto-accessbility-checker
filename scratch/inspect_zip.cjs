const fs = require('fs');
const JSZip = require('jszip');

async function inspectZip() {
  const zipPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉장고-20260525-150312.zip';
  if (!fs.existsSync(zipPath)) {
    console.log("Zip file not found");
    return;
  }
  const data = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(data);
  console.log("Files in ZIP:");
  for (const filename of Object.keys(zip.files)) {
    console.log(`- ${filename}`);
  }
}

inspectZip().catch(console.error);
