const fs = require('fs');
const path = require('path');

let output = '';
function log(msg) {
  output += msg + '\n';
}

function analyzeRefrigerator() {
  log('=== NEW 냉장고 (Refrigerator) Log Analysis ===');
  const filePath = 'log/냉장고-debug-log-20260620-184605.json';
  if (!fs.existsSync(filePath)) {
    log('File not found: ' + filePath);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  log(`Loaded ${logs.length} entries.`);

  const clicks = [];
  logs.forEach((l, idx) => {
    if (l.message && l.message.includes('candidate click started')) {
      clicks.push({ idx, l });
    }
  });
  log(`Total clicks: ${clicks.length}`);

  clicks.forEach((c, i) => {
    const cand = c.l.data && c.l.data.candidate;
    const url = c.l.data && c.l.data.snapshot && c.l.data.snapshot.url;
    if (cand) {
      log(`Click ${i + 1} (LogIndex ${c.idx}): [${cand.role}] "${cand.name}" on URL: ${url}`);
    }
  });

  log('\n--- 식품 편집 screens and semantic match logs ---');
  logs.forEach((l, idx) => {
    if (l.message && (l.message.includes('Scanning screen: 식품 편집') || l.message.includes('Semantic match found') || l.message.includes('Skipping already visited frame') || l.message.includes('normalizeUrl') || l.message.includes('normalize'))) {
      log(`LogIndex ${idx}: [${l.level}] ${l.message}`);
      if (l.data) {
        log(`   Data: ${JSON.stringify(l.data)}`);
      }
    }
  });
}

function analyzeFreezer() {
  log('\n=== NEW 냉동고 (Freezer) Log Analysis ===');
  const filePath = 'log/냉동고-debug-log-20260620-184949.json';
  if (!fs.existsSync(filePath)) {
    log('File not found: ' + filePath);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  log(`Loaded ${logs.length} entries.`);

  logs.forEach((l, idx) => {
    if (l.message && (l.message.includes('Scanning screen:') || l.message.includes('candidate click started') || l.message.includes('skipped') || l.message.includes('error') || l.message.includes('warn') || l.message.includes('skip') || l.message.includes('match') || l.message.includes('restored') || l.message.includes('pop') || l.message.includes('push')) ) {
      const isRelevant = l.message.includes('Scanning screen:') || l.message.includes('click') || l.message.includes('수산물');
      if (isRelevant) {
        log(`LogIndex ${idx}: [${l.level}] ${l.message}`);
        if (l.data && l.data.candidate) {
          log(`   Candidate: "${l.data.candidate.name}"`);
        }
        if (l.message.includes('Scanning screen:')) {
          log(`   URL: ${l.data && l.data.snapshot ? l.data.snapshot.url : 'N/A'}`);
        }
      }
    }
  });
}

analyzeRefrigerator();
analyzeFreezer();

fs.writeFileSync('scratch/new_refrig_result.txt', output, 'utf8');
console.log('Done');
