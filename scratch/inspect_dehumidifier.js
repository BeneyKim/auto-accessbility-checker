const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log', '제습기-debug-log-20260620-152133.json');
const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));

console.log("Steps in dehumidifier log:", log.steps ? log.steps.length : 'no steps');

// Let's inspect some clicked candidates and see their name/role
if (log.steps) {
  log.steps.forEach((step, idx) => {
    if (step.action && step.action.type === 'click') {
      const target = step.action.target;
      console.log(`Step ${idx}: Clicked on "${target.name}" (role: ${target.role}, id: ${target.id})`);
    }
  });
}
