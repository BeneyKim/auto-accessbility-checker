function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/");
    const normalizedSegments = segments.map((seg, idx) => {
      // Keep empty, first segment (e.g. GRM-20), or purely numeric (like version 001)
      if (!seg || idx === 1 || /^\d+$/.test(seg)) {
        return seg;
      }
      
      // Known static views/actions in ThinQ URLs
      const knownPages = [
        "search", "subfoodlist", "adduserfood", "disclaimer", 
        "energymonitoringuserguide", "productinfo", "sublist",
        "smartcare", "history"
      ];
      if (knownPages.includes(seg.toLowerCase())) {
        return seg;
      }

      // If it contains underscores like GRM_20_FOD01_Main, it's the module code, keep it
      if (seg.includes("_")) {
        return seg;
      }

      // Check if it looks like a base64 or URL-safe base64 token
      // e.g. dW5kZWZpbmVk, QURE, Mw==, etc.
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

const urls = [
  "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/dW5kZWZpbmVk/dW5kZWZpbmVk/dW5kZWZpbmVk/Mg==/dW5kZWZpbmVk/GRM_20_CEN01_Main/001/GRM-20",
  "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/QURE/LTE=/Mw==/dW5kZWZpbmVk/GRM_20_FOD01_Main/001/GRM-20",
  "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/dW5kZWZpbmVk/dW5kZWZpbmVk/Mw==/dW5kZWZpbmVk/GRM_20_FOD01_Main/001/GRM-20",
  "https://my.lgthinq.com/GRM-20/MzcxZWQxNGMtZDU0My0xYzcxLWJmODUtNGNiY2U5ODlmNjYx/NA==/dW5kZWZpbmVk/GRM_20_FOD04_AddFood/001/GRM-20",
  // Air Purifier URLs
  "https://my.lgthinq.com/AS20-20/some-device-id/dW5kZWZpbmVk/dW5kZWZpbmVk/Mw==/dW5kZWZpbmVk/AS20_20_HIS01_Main/001/history/AS20-20",
  "https://my.lgthinq.com/AS20-20/some-device-id/dW5kZWZpbmVk/dW5kZWZpbmVk/NA==/dW5kZWZpbmVk/AS20_20_HIS01_Main/001/history/AS20-20"
];

urls.forEach(u => {
  console.log(`Original:  ${u}`);
  console.log(`Normalized: ${normalizeUrl(u)}`);
  console.log('---');
});
