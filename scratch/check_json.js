import fs from "fs";
import JSZip from "jszip";

async function run() {
  const zipPath = "c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log\\냉장고-20260525-150312.zip";
  const data = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(data);
  
  const jsonFile = Object.keys(zip.files).find(f => f.endsWith(".json"));
  if (jsonFile) {
    const jsonContent = await zip.files[jsonFile].async("string");
    const parsed = JSON.parse(jsonContent);
    
    console.log("JSON structure keys:");
    console.log(Object.keys(parsed));
    
    // Check results
    if (parsed.results && parsed.results.length > 0) {
      const firstScreen = parsed.results[0];
      console.log("\nFirst screen result keys:");
      console.log(Object.keys(firstScreen));
      
      // Let's search for large string values in firstScreen
      for (const [key, val] of Object.entries(firstScreen)) {
        const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (valStr.length > 1000) {
          console.log(`- Field "${key}" has length ${valStr.length}`);
          if (typeof val === "object") {
            console.log(`  Subkeys: ${Object.keys(val || {})}`);
          }
        }
      }
    }
  }
}

run().catch(console.error);
