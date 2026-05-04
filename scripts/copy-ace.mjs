import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const candidates = [
  "accessibility-checker-engine/ace.js",
  "accessibility-checker-engine/dist/ace.js"
];

let source;
for (const candidate of candidates) {
  try {
    const resolved = require.resolve(candidate);
    if (existsSync(resolved)) {
      source = resolved;
      break;
    }
  } catch {
    // Try the next known package path.
  }
}

if (!source) {
  throw new Error("Unable to locate accessibility-checker-engine ace.js.");
}

const destination = join("dist", "vendor", "ace.js");
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`Copied IBM Equal Access engine: ${source} -> ${destination}`);
