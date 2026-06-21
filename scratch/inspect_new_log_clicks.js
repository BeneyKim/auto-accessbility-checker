import fs from 'fs';

const logPath = 'c:/Users/bhkim/projects-codex/ibm-assessbility-checker/log/냉동고-debug-log-20260530-163916.json';
if (fs.existsSync(logPath)) {
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const clickEvents = [];
  
  data.logs.forEach(log => {
    if (log.message === 'candidate click started.') {
      clickEvents.push({
        timestamp: log.timestamp.slice(11, 19),
        name: log.data.candidate.name,
        role: log.data.candidate.role,
        tagName: log.data.candidate.tagName
      });
    } else if (log.message === 'transition classified.') {
      if (clickEvents.length > 0) {
        clickEvents[clickEvents.length - 1].classification = log.data.classification;
        clickEvents[clickEvents.length - 1].reason = log.data.reason;
      }
    }
  });

  clickEvents.forEach((c, idx) => {
    console.log(`${idx}: ${c.timestamp} | Name: "${c.name}" | Role: ${c.role} | Classify: ${c.classification} | Reason: ${c.reason}`);
  });
} else {
  console.log('Log not found');
}
