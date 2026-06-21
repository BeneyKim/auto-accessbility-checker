import fs from 'fs';

const result1Path = 'log/냉동고-20260601-100748/냉동고-20260601-100748.json';
const result2Path = 'log/냉동고-20260601-103416/냉동고-20260601-103416.json';

const debug1Path = 'log/냉동고-debug-log-20260601-100749.json';
const debug2Path = 'log/냉동고-debug-log-20260601-103418.json';

let out = '';
function log(msg) {
  out += msg + '\n';
  console.log(msg);
}

function analyzeResults(path, name) {
  log(`\n=== Analyzing Result JSON: ${name} ===`);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  log('Keys: ' + Object.keys(data).join(', '));
  if (data.results) {
    log(`Total results: ${data.results.length}`);
    const energyScreens = data.results.filter(r => 
      (r.title && r.title.includes('에너지')) || 
      (r.triggerName && r.triggerName.includes('에너지')) ||
      (r.pathname && r.pathname.includes('energy'))
    );
    log(`Energy related screens: ${energyScreens.length}`);
    energyScreens.forEach((s, idx) => {
      const sHash = s.hash ? s.hash.substring(0, 8) : 'undefined';
      const sParentHash = s.parentHash ? s.parentHash.substring(0, 8) : 'undefined';
      log(`  [${idx}] Title: "${s.title}", Pathname: "${s.pathname}", Depth: ${s.depth}, Hash: ${sHash}`);
      log(`      ParentHash: ${sParentHash}`);
      log(`      TriggerName: "${s.triggerName}"`);
      if (s.overlayCount !== undefined) {
        log(`      OverlayCount: ${s.overlayCount}`);
      }
    });
  }
  
  if (data.transitionLogs) {
    log(`Total transition logs: ${data.transitionLogs.length}`);
    const energyTransitions = data.transitionLogs.filter(t => 
      t.sourceTitle.includes('에너지') || t.targetTitle.includes('에너지') ||
      t.triggerName.includes('에너지')
    );
    log(`Energy related transitions: ${energyTransitions.length}`);
    energyTransitions.forEach((t, idx) => {
      log(`  [${idx}] "${t.sourceTitle}" -> "${t.targetTitle}" via "${t.triggerName}" (${t.selector})`);
    });
  }
}

function analyzeDebugLogs(path, name) {
  log(`\n=== Analyzing Debug Log: ${name} ===`);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  log(`Total log entries: ${data.logs.length}`);
  
  // Find logs mentioning "에너지", "energy", or overlay events
  const relevant = data.logs.filter(entry => {
    const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
    return text.includes('에너지') || text.includes('energy') || text.includes('overlay') || text.includes('dialog') || text.includes('확인') || text.includes('popup');
  });
  
  log(`Relevant log entries (contains 에너지, energy, overlay, dialog, 확인, popup): ${relevant.length}`);
  relevant.forEach(entry => {
    const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
    log(`  ${text}`);
  });
}

analyzeResults(result1Path, 'Run 1 (100748)');
analyzeResults(result2Path, 'Run 2 (103416)');

analyzeDebugLogs(debug1Path, 'Run 1 Debug (100749)');
analyzeDebugLogs(debug2Path, 'Run 2 Debug (103418)');

fs.writeFileSync('scratch/energy_analysis_summary.txt', out, 'utf8');
