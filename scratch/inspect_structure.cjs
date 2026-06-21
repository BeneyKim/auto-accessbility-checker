const fs = require('fs');
const path = require('path');

const files = [
  '냉장고-debug-log-20260620-173641.json',
  '워시타워-전원OFF-debug-log-20260620-172109.json',
  '식기세척기-전원OFF-debug-log-20260620-172550.json',
  '공기청정기-debug-log-20260620-173949.json'
];

files.forEach(f => {
  const filePath = path.join('log', f);
  if (!fs.existsSync(filePath)) {
    console.log(`${f} does not exist`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\nFile: ${f}, size: ${content.length}`);
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      console.log(`Is Array: true, length: ${data.length}`);
      console.log(`First item:`, JSON.stringify(data[0]).slice(0, 150));
    } else {
      console.log(`Is Array: false, keys:`, Object.keys(data));
      if (data.logs) {
        console.log(`Has logs array: ${Array.isArray(data.logs)}, length: ${data.logs.length}`);
      }
    }
  } catch (err) {
    console.log(`Parse error: ${err.message}`);
    console.log(`First 200 chars: ${content.slice(0, 200)}`);
  }
});
