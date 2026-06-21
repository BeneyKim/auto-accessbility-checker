import fs from 'fs';
import path from 'path';

function findFile(dir, pattern) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      findFile(filePath, pattern);
    } else if (file.includes(pattern)) {
      console.log(`Found match: ${filePath} (${stats.size} bytes)`);
    }
  }
}

console.log('Searching in workspace...');
findFile('c:/Users/bhkim/projects-codex/ibm-assessbility-checker', '010833');
console.log('Searching in appData...');
findFile('C:/Users/bhkim/.gemini/antigravity/brain/e293287e-c591-4f9f-8b04-b57165701eec', '010833');
