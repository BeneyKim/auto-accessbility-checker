const fs = require('fs');
const data = JSON.parse(fs.readFileSync('log/식기세척기-전원OFF-debug-log-20260620-172550.json', 'utf8'));
const logs = data.logs || [];
logs.forEach((l, idx) => {
  if (l.message && (l.message.includes('restore') || l.message.includes('restore rejected') || l.message.includes('restore accepted') || l.message.includes('overlay') || l.message.includes('Overlay') || l.message.includes('Title matched'))) {
    console.log(`${idx}: [${l.level}] ${l.message}`);
    if (l.data) {
      console.log(`   OverlayCount: ${l.data.snapshot ? l.data.snapshot.overlayCount : 'N/A'}`);
      if (l.data.frame) {
        console.log(`   Frame overlays: ${l.data.frame.semanticIdentity ? l.data.frame.semanticIdentity.overlayCount : 'N/A'}`);
      }
    }
  }
});
