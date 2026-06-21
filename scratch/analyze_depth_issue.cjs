const fs = require('fs');

function traceSteps(logPath) {
  console.log(`\n=========================================`);
  console.log(`Step Trace for: ${logPath}`);
  console.log(`=========================================`);
  const content = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const logs = content.logs;

  let currentDepth = 0;
  logs.forEach((log, index) => {
    const msg = log.message;
    const data = log.data;
    if (msg === 'candidate click started') {
      console.log(`[Line ${index + 1}] Clicked: "${data.candidate.name}"`);
    } else if (msg === 'depth pushed') {
      console.log(`[Line ${index + 1}] Depth pushed: ${data.fromDepth} -> ${data.toDepth} (path: ${JSON.stringify(data.menuPath)})`);
    } else if (msg === 'depth popped') {
      console.log(`[Line ${index + 1}] Depth popped: ${data.fromDepth} -> ${data.toDepth} (method: ${data.method})`);
    } else if (msg === 'transition classified') {
      console.log(`[Line ${index + 1}] Transition: ${data.classification} (reason: ${data.reason}, after_title: "${data.after?.title}", after_overlays: ${data.after?.overlayCount}, after_url: ${data.after?.url?.substring(data.after?.url?.lastIndexOf('/'))})`);
    } else if (msg.includes('Clicking overlay close button') || msg.includes('Clicking back button')) {
      console.log(`[Line ${index + 1}] Action: ${msg}`);
    } else if (msg === 'restore started') {
      console.log(`[Line ${index + 1}] Restore started: from ${JSON.stringify(data.childFrame.menuPath)} to ${JSON.stringify(data.targetFrame.menuPath)}`);
    } else if (msg.includes('Title matched but overlay count is higher')) {
      console.log(`[Line ${index + 1}] WARNING: ${msg}`);
    } else if (msg.includes('Cannot re-navigate') || msg.includes('Attempting self-healing')) {
      console.log(`[Line ${index + 1}] WARNING: ${msg}`);
    }
  });
}

traceSteps('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260525-163909.json');
traceSteps('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉장고-debug-log-20260525-164146.json');
