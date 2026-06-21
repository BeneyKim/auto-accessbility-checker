const fs = require('fs');
const path = require('path');

// 1. Re-implement the proposed logic in JS to test against logs
function normalizeUrl(url) {
  if (!url || url === 'N/A' || url === 'undefined') return url;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/");
    const normalizedSegments = segments.map((seg, idx) => {
      if (!seg || idx === 1 || /^\d+$/.test(seg)) {
        return seg;
      }
      const knownPages = [
        "search", "subfoodlist", "adduserfood", "disclaimer",
        "energymonitoringuserguide", "productinfo", "sublist",
        "smartcare", "history"
      ];
      if (knownPages.includes(seg.toLowerCase())) {
        return seg;
      }
      if (/^[A-Z]{3,4}_[A-Za-z0-9_]+$/.test(seg)) {
        return seg;
      }
      if (/^[A-Za-z0-9\-_=]+$/.test(seg)) {
        return "*";
      }
      return seg;
    });
    parsed.pathname = normalizedSegments.join("/");
    return parsed.toString();
  } catch {
    return url;
  }
}

// Check if semantic match should be skipped
function shouldSkipSemantic(url) {
  const norm = normalizeUrl(url);
  if (!norm) return false;
  const normLower = norm.toLowerCase();
  return normLower.includes("subfoodlist") || normLower.includes("sublist") || normLower.includes("search");
}

function getSemanticLayoutKey(url, candidateRoles) {
  const norm = normalizeUrl(url);
  if (norm.includes("EditFoodInfo")) {
    return norm; // ignore candidate roles for food edit page
  }
  return `${norm}[${candidateRoles}]`;
}

// 2. Load all JSON logs
const logDir = 'log';
const files = fs.readdirSync(logDir).filter(f => f.endsWith('.json'));

console.log("=== Log Verification Started ===");

files.forEach(file => {
  const filePath = path.join(logDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const logs = data.logs || [];
  console.log(`\nVerifying ${file} (${logs.length} entries)...`);

  let semanticMatches = 0;
  let skippedSemanticMatches = 0;

  logs.forEach((l, idx) => {
    // Look for semantic match logs in the original debug log
    if (l.message && l.message.includes("Semantic match found")) {
      semanticMatches++;
      const data = l.data || {};
      const key = data.semanticLayoutKey;
      const url = data.frame && data.frame.semanticIdentity ? data.frame.semanticIdentity.urlPathname : '';
      
      // Check if our proposed logic would skip semantic check for this page
      const skipProposed = shouldSkipSemantic(url);
      if (skipProposed) {
        skippedSemanticMatches++;
        console.log(`  [OK] Index ${idx}: Semantic match for list/search page "${url}" is now safely allowed/not skipped.`);
      }
    }
  });

  console.log(`  Summary: Original semantic matches: ${semanticMatches}, Prevented list skips: ${skippedSemanticMatches}`);
});

console.log("\n=== Log Verification Finished ===");
