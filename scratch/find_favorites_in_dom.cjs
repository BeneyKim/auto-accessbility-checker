const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'wt_unzip/워시타워_전원OFF-20260621-015239.html');
if (!fs.existsSync(htmlPath)) {
  console.error("HTML file does not exist:", htmlPath);
  process.exit(1);
}

const content = fs.readFileSync(htmlPath, 'utf8');
console.log("HTML file size:", content.length);

// Check if the HTML contains references to "즐겨찾기 코스 관리" or "auto_main_tab_feature_favorite"
let pos = 0;
let count = 0;
while (true) {
  pos = content.indexOf("auto_main_tab_feature_favorite", pos);
  if (pos === -1) break;
  count++;
  console.log(`\nHTML Match ${count} at pos ${pos}:`);
  const start = Math.max(0, pos - 150);
  const end = Math.min(content.length, pos + 150);
  console.log(content.slice(start, end).replace(/\n/g, ' '));
  pos += "auto_main_tab_feature_favorite".length;
  if (count >= 5) break;
}
