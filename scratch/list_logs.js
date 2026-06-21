import fs from 'fs';
import path from 'path';

const logDir = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log';
if (fs.existsSync(logDir)) {
  const files = fs.readdirSync(logDir);
  console.log('Files in log/ directory:');
  files.forEach(file => {
    const stats = fs.statSync(path.join(logDir, file));
    console.log(`- ${file} (${stats.size} bytes, isDir: ${stats.isDirectory()})`);
  });
} else {
  console.log('Log directory does not exist!');
}
