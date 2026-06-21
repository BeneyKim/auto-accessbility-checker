import fs from 'fs';
import readline from 'readline';
import path from 'path';

const logPath = 'C:\\Users\\bhkim\\.gemini\\antigravity\\brain\\e293287e-c591-4f9f-8b04-b57165701eec\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let stepCount = 0;
  const userRequests = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      stepCount++;
      if (data.type === 'USER_INPUT') {
        userRequests.push({
          step: data.step_index,
          content: data.content,
          date: data.created_at
        });
      }
    } catch (e) {
      // ignore parse error
    }
  }

  console.log(`Total steps: ${stepCount}`);
  console.log(`User requests count: ${userRequests.length}`);

  // Write summary of all user requests for reference
  let out = '';
  userRequests.forEach((req, idx) => {
    out += `\n=========================================\n`;
    out += `[User Request #${idx + 1}] Step: ${req.step} Date: ${req.date}\n`;
    out += `${req.content}\n`;
  });

  fs.writeFileSync('c:\\Users\\bhkim\\projects-codex\\ibm-assessbility-checker\\scratch\\user_requests_summary.txt', out);
  console.log('Saved user requests summary to scratch/user_requests_summary.txt');
}

run();
