const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/식기세척기-전원OFF-debug-log-20260620-172550.json', 'utf8'));
const logs = data.logs || [];
for (let i = 200; i < logs.length; i++) {
  console.log(`\n--- Entry ${i}: ${logs[i].message} ---`);
  if (logs[i].data) {
    const d = logs[i].data;
    if (d.snapshot) {
      console.log(`Snapshot: Title="${d.snapshot.title}", URL="${d.snapshot.url}", OverlayCount=${d.snapshot.overlayCount}, Signature="${d.snapshot.signature}"`);
      if (d.snapshot.overlayDescriptors) {
        console.log(`   Overlay descriptors:`, d.snapshot.overlayDescriptors);
      }
    } else {
      console.log(JSON.stringify(d, null, 2));
    }
  }
}
