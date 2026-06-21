const fs = require('fs');
const filePath = 'log/공기청정기-debug-log-20260620-192243.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const logs = data.logs || [];

logs.forEach((l, idx) => {
  const str = JSON.stringify(l);
  if (str.includes('15h9t4c') || str.includes('18kdas3')) {
    console.log(`LogIndex ${idx}:`);
    console.log(JSON.stringify(l, null, 2));
  }
});
