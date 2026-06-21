import fs from "fs";

function run() {
  const content = fs.readFileSync("c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\scratch\\transitions_utf8.txt", "utf-8");
  const lines = content.split("\n");
  console.log(`Total lines: ${lines.length}`);
  console.log("Last 150 lines of transitions:");
  lines.slice(Math.max(0, lines.length - 150)).forEach((l, i) => {
    console.log(`${lines.length - 150 + i}: ${l}`);
  });
}

run();
