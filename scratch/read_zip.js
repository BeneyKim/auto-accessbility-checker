import fs from "fs";
import path from "path";
import JSZip from "jszip";

async function run() {
  const zipPath = "c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\log\\냉장고-20260525-150312.zip";
  const data = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(data);
  
  console.log("Files in ZIP:");
  for (const filename of Object.keys(zip.files)) {
    console.log(`- ${filename} (${zip.files[filename]._data.uncompressedSize} bytes)`);
  }

  // Find the md file
  const mdFile = Object.keys(zip.files).find(f => f.endsWith(".md"));
  if (mdFile) {
    const mdContent = await zip.files[mdFile].async("string");
    console.log("\nFirst 15 lines of Markdown:");
    console.log(mdContent.split("\n").slice(0, 15).join("\n"));

    console.log("\nImage links found in Markdown:");
    const matches = mdContent.match(/!\[Screenshot\]\([^)]+\)/g);
    if (matches) {
      console.log(matches.slice(0, 10));
    } else {
      console.log("No screenshot image links found!");
    }
  }
}

run().catch(console.error);
