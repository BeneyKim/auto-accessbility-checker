import fs from 'fs';
import readline from 'readline';

const transcriptPath = 'C:/Users/bhkim/.gemini/antigravity/brain/e293287e-c591-4f9f-8b04-b57165701eec/.system_generated/logs/transcript.jsonl';
const fileStream = fs.createReadStream(transcriptPath);

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

const out = fs.createWriteStream('c:/Users/bhkim/projects-codex/ibm-assessbility-checker/scratch/history_matches.txt');

rl.on('line', (line) => {
  if (line.includes("에너지") || line.includes("energy") || line.includes("popup") || line.includes("팝업")) {
    try {
      const obj = JSON.parse(line);
      if (obj.content) {
        out.write(`[Source: ${obj.source} | Type: ${obj.type}]\n`);
        out.write(obj.content + "\n");
        out.write("================================================================================\n");
      }
    } catch {
      out.write(`[RAW] ${line}\n`);
      out.write("================================================================================\n");
    }
  }
});

rl.on('close', () => {
  console.log("Done writing matches to scratch/history_matches.txt");
});
