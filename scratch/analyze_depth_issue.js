const fs = require('fs');
const path = require('path');

function analyzeLog(logPath) {
  console.log(`=========================================`);
  console.log(`Analyzing: ${path.basename(logPath)}`);
  console.log(`=========================================`);
  const content = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const logs = content.logs;

  let currentDepth = 0;
  logs.forEach((log, index) => {
    const msg = log.message;
    const data = log.data;
    
    if (msg === 'depth pushed' || msg === 'depth popped') {
      console.log(`[Line ${index + 1}] ${log.timestamp} - ${msg.toUpperCase()}:`);
      console.log(`  Trigger: "${data.triggerName}"`);
      console.log(`  Depth change: ${data.fromDepth} -> ${data.toDepth}`);
      if (data.menuPath) {
        console.log(`  Path: ${JSON.stringify(data.menuPath)}`);
      }
      if (data.classification) {
        console.log(`  Classification: ${data.classification}`);
      }
      if (data.restored) {
        console.log(`  Restored via: ${data.method}`);
      }
    } else if (msg === 'restore started' || msg === 'Executing restore via: overlay-close' || msg === 'Executing restore via: back-button') {
      console.log(`[Line ${index + 1}] ${log.timestamp} - ${msg}`);
      if (data && data.targetFrame) {
        console.log(`  Target depth: ${data.targetFrame.depth}, target path: ${JSON.stringify(data.targetFrame.menuPath)}`);
      }
      if (data && data.childFrame) {
        console.log(`  Child depth: ${data.childFrame.depth}, child path: ${JSON.stringify(data.childFrame.menuPath)}`);
      }
      if (data && data.targetTitle) {
        console.log(`  Restore detail: ${data.currentTitle} -> ${data.targetTitle}`);
      }
    } else if (msg === 'transition classified') {
      // Just print if depth/page change or back
      if (data.classification === 'overlay-closed' || data.classification === 'back-to-parent' || data.classification === 'overlay-opened' || data.classification === 'in-product-child') {
        // console.log(`[Line ${index + 1}] Transition: ${data.triggerName} -> ${data.classification} (${data.reason})`);
      }
    } else if (msg === 'Clicking overlay close button: 취소' || msg === 'Clicking back button' || msg.includes('Clicking')) {
      console.log(`[Line ${index + 1}] Action: ${msg} (Data: ${JSON.stringify(data)})`);
    } else if (msg.includes('restore failed') || msg.includes('failed') || msg.includes('warn') || msg.includes('error')) {
      console.log(`[Line ${index + 1}] ALERT: ${msg} - ${JSON.stringify(data)}`);
    }
  });
}

const refrigLog = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉장고-debug-log-20260525-164146.json';
const freezerLog = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260525-163909.json';

if (fs.existsSync(refrigLog)) analyzeLog(refrigLog);
if (fs.existsSync(freezerLog)) analyzeLog(freezerLog);
