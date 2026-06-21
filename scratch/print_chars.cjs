const fs = require('fs');
const lines = fs.readFileSync('src/content/dom.ts', 'utf8').split('\n');
for (let i = 380; i <= 415; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
