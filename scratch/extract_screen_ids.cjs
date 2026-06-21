const fs = require('fs');
const path = require('path');

const LOG_DIR = 'log';
const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.json'));

const segmentsWithUnderscore = new Set();

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(LOG_DIR, f), 'utf8'));
  const logs = data.logs || [];
  logs.forEach(l => {
    if (l.data && l.data.snapshot && l.data.snapshot.url) {
      try {
        const url = new URL(l.data.snapshot.url);
        const pathSegments = url.pathname.split('/');
        pathSegments.forEach(seg => {
          if (seg.includes('_')) {
            segmentsWithUnderscore.add(seg);
          }
        });
      } catch (e) {
        // ignore
      }
    }
  });
});

console.log('Pathname segments containing underscores:');
console.log(Array.from(segmentsWithUnderscore));
