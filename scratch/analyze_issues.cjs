const fs = require('fs');
const path = require('path');

const LOG_DIR = 'log';
let output = '';

function log(msg) {
  output += msg + '\n';
}

function analyzeRefrigerator() {
  log('=== 냉장고 (Refrigerator) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '냉장고-debug-log-20260620-173641.json');
  if (!fs.existsSync(filePath)) {
    log('Refrigerator log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  log(`Loaded ${logs.length} log entries.`);

  const clicks = logs.filter(e => e.message && e.message.includes('candidate click started.'));
  log(`Total clicks in Refrigerator run: ${clicks.length}`);
  
  log('\n--- Clicks list (Issue A / B checking) ---');
  clicks.forEach((c, idx) => {
    const cand = c.data && c.data.candidate;
    const url = c.data && c.data.snapshot && c.data.snapshot.url;
    if (cand) {
      log(`${idx + 1}. [${cand.role}] "${cand.name}" on URL: ${url}`);
    }
  });

  log('\n--- Let\'s check dynamic selection of foods (Issue A) ---');
  clicks.forEach((c, idx) => {
    const cand = c.data && c.data.candidate;
    if (cand && (cand.name.includes('치즈') || cand.name.includes('생크림') || cand.name.includes('우유') || cand.name.includes('달걀') || cand.name.includes('식품') || cand.name.includes('식재료') || cand.name.includes('가지') || cand.name.includes('버섯') || cand.name.includes('당근'))) {
      log(`Step ${idx + 1}: Clicked "${cand.name}"`);
    }
  });

  log('\n--- Unique screen titles and URLs visited ---');
  const visited = new Set();
  logs.forEach(e => {
    if (e.message && e.message.includes('Scanning screen:')) {
      visited.add(e.message);
    }
  });
  Array.from(visited).forEach(v => log(v));
}

function analyzeWashTower() {
  log('\n=== 워시타워 (WashTower) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '워시타워-전원OFF-debug-log-20260620-172109.json');
  if (!fs.existsSync(filePath)) {
    log('WashTower log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  log(`Loaded ${logs.length} log entries.`);
  
  logs.forEach(e => {
    if (e.message && (e.message.includes('Scanning screen:') || e.message.includes('click') || e.message.includes('collect') || e.message.includes('error') || e.message.includes('warn'))) {
      log(`[${e.level}] ${e.message}`);
      if (e.data && e.data.candidate) {
        log(`   Candidate: ${JSON.stringify(e.data.candidate)}`);
      }
    }
  });
}

function analyzeDishwasher() {
  log('\n=== 식기세척기 (Dishwasher) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '식기세척기-전원OFF-debug-log-20260620-172550.json');
  if (!fs.existsSync(filePath)) {
    log('Dishwasher log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  log(`Loaded ${logs.length} log entries.`);

  log('\n--- Clicks and Out-of-scope/Settings checks ---');
  logs.forEach(e => {
    if (e.message && (e.message.includes('candidate click started') || e.message.includes('out-of-scope') || e.message.includes('bounce') || e.message.includes('Navigated') || e.message.includes('Scanning screen:') || e.message.includes('exit') || e.message.includes('outOfScope') || e.message.includes('Out of scope') || e.message.includes('settings') || e.message.includes('설정') || e.message.includes('Redirected') || e.message.includes('fallback') || e.message.includes('Unwinding'))) {
      log(`[${e.level}] ${e.message}`);
      if (e.data && e.data.candidate) {
        log(`   Candidate: "${e.data.candidate.name}"`);
      }
    }
  });

  log('\n--- Consumables/highlight logs ---');
  logs.forEach(e => {
    if (e.message && (e.message.includes('소모품') || e.message.includes('highlight') || e.message.includes('sample') || e.message.includes('list') || e.message.includes('large list') || e.message.includes('consumable') || e.message.includes('dup') || e.message.includes('duplicate'))) {
      log(`[${e.level}] ${e.message}`);
    }
  });
}

function analyzeAirPurifier() {
  log('\n=== 공기청정기 (Air Purifier) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '공기청정기-debug-log-20260620-173949.json');
  if (!fs.existsSync(filePath)) {
    log('Air Purifier log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  log(`Loaded ${logs.length} log entries.`);

  log('\n--- Sleep mode schedule (취침 예약) clicks & navigation ---');
  logs.forEach(e => {
    if (e.message && (e.message.includes('취침') || e.message.includes('예약') || e.message.includes('sleep') || e.message.includes('candidate click started') || e.message.includes('Scanning screen:') || e.message.includes('Redirected') || e.message.includes('Unwinding'))) {
      log(`[${e.level}] ${e.message}`);
      if (e.data && e.data.candidate) {
        log(`   Candidate: "${e.data.candidate.name}"`);
      }
    }
  });
}

analyzeRefrigerator();
analyzeWashTower();
analyzeDishwasher();
analyzeAirPurifier();

fs.writeFileSync('scratch/analysis_result.txt', output, 'utf8');
console.log('Analysis written to scratch/analysis_result.txt');
