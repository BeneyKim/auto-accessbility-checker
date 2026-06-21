const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { JSDOM } = require('jsdom');

async function analyzeZip(zipFileName) {
  const zipPath = path.join(__dirname, '..', 'log', zipFileName);
  if (!fs.existsSync(zipPath)) {
    console.log(`Zip file not found: ${zipFileName}`);
    return;
  }

  console.log(`\n=========================================`);
  console.log(`Analyzing Zip: ${zipFileName}`);
  console.log(`=========================================`);

  const zipData = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipData);
  
  const files = Object.keys(zip.files);
  console.log(`Total files in ZIP: ${files.length}`);
  
  // count extensions
  const extensions = {};
  files.forEach(f => {
    const ext = path.extname(f) || 'no-extension';
    extensions[ext] = (extensions[ext] || 0) + 1;
  });
  console.log("File extensions:", extensions);

  let htmlFileCount = 0;
  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.endsWith('.html')) {
      htmlFileCount++;
      const htmlContent = await file.async('text');
      const dom = new JSDOM(htmlContent);
      const doc = dom.window.document;

      // Find all elements with aria-hidden="true"
      const ariaHiddenElements = doc.querySelectorAll('[aria-hidden="true"]');
      if (ariaHiddenElements.length > 0) {
        console.log(`File: ${filename} (Has ${ariaHiddenElements.length} aria-hidden="true" elements)`);
        
        ariaHiddenElements.forEach((el, idx) => {
          const id = el.id || '';
          const className = el.className || '';
          const tag = el.tagName.toLowerCase();
          
          // Check if this aria-hidden element contains any active interactive candidates
          const interactiveInside = el.querySelectorAll("button, a[href], [role='button'], [role='link'], [role='tab'], [role='option'], [tabindex]:not([tabindex='-1']), [aria-haspopup], [aria-expanded], [data-nscreenfocusable]");
          
          if (interactiveInside.length > 0) {
            console.log(`  [aria-hidden #${idx}] <${tag} id="${id}" class="${className}"> contains ${interactiveInside.length} interactive items:`);
            const sample = Array.from(interactiveInside).slice(0, 3).map(item => {
              const name = item.getAttribute('aria-label') || item.innerText || item.textContent || '';
              return `<${item.tagName.toLowerCase()} role="${item.getAttribute('role') || ''}">${name.trim().slice(0, 40)}</>`;
            });
            console.log(`     Sample: ${sample.join(', ')}`);
          }
        });
      }
    }
  }
  console.log(`Total HTML files scanned: ${htmlFileCount}`);
}

async function run() {
  try {
    await analyzeZip('식기세척기-전원OFF-20260620-212934.zip');
    await analyzeZip('냉장고-20260620-211951.zip');
    await analyzeZip('워시타워-전원OFF-20260620-213927.zip');
  } catch (err) {
    console.error("Error running analysis:", err);
  }
}

run();
