const fs = require('fs');
const path = require('path');

const LOG_DIR = 'log';

function analyzeRefrigerator() {
  console.log('=== 냉장고 (Refrigerator) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '냉장고-debug-log-20260620-173641.json');
  if (!fs.existsSync(filePath)) {
    console.log('Refrigerator log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Loaded ${data.length} log entries.`);

  // Let's filter entries where a click occurred or navigation happened
  const clicks = data.filter(e => e.message && e.message.includes('Clicked'));
  console.log(`Total clicks in Refrigerator run: ${clicks.length}`);
  
  // Find dynamic selection related to random selection
  // e.g. "Random selection" or similar messages or items clicked
  console.log('\n--- Random selection check (Issue A) ---');
  clicks.forEach((c, idx) => {
    if (c.message.includes('food') || c.message.includes('식품') || c.message.includes('치즈') || c.message.includes('생크림') || c.message.includes('우유') || c.message.includes('달걀')) {
      console.log(`Step ${c.timestamp || ''}: ${c.message}`);
    }
  });

  // Let's print out all unique pages or screen transitions
  console.log('\n--- Normalized URLs and Screen Transitions (Issue B) ---');
  const transitions = data.filter(e => e.message && (e.message.includes('Navigated') || e.message.includes('state change') || e.message.includes('screenSignature')));
  transitions.slice(0, 50).forEach(t => {
    console.log(`Step ${t.timestamp || ''}: ${t.message}`);
  });

  // Let's specifically see the detail traversal of food items
  console.log('\n--- Food item additions/edits ---');
  clicks.forEach((c) => {
    if (c.message.includes('EditFoodInfo') || c.message.includes('FOD') || c.message.includes('보관 위치') || c.message.includes('날짜')) {
      console.log(`Step: ${c.message}`);
    }
  });
}

function analyzeWashTower() {
  console.log('\n=== 워시타워 (WashTower) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '워시타워-전원OFF-debug-log-20260620-172109.json');
  if (!fs.existsSync(filePath)) {
    console.log('WashTower log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Loaded ${data.length} log entries.`);
  data.forEach(e => {
    console.log(`[${e.level}] ${e.message}`);
  });
}

function analyzeDishwasher() {
  console.log('\n=== 식기세척기 (Dishwasher) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '식기세척기-전원OFF-debug-log-20260620-172550.json');
  if (!fs.existsSync(filePath)) {
    console.log('Dishwasher log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Loaded ${data.length} log entries.`);

  console.log('\n--- Clicks and Out-of-scope signals ---');
  data.forEach(e => {
    if (e.message && (e.message.includes('Clicked') || e.message.includes('out-of-scope') || e.message.includes('bounce') || e.message.includes('Navigated') || e.message.includes('exit') || e.message.includes('outOfScope') || e.message.includes('Out of scope') || e.message.includes('settings') || e.message.includes('설정'))) {
      console.log(`[${e.level}] ${e.message}`);
    }
  });

  console.log('\n--- Consumables/highlight logs ---');
  data.forEach(e => {
    if (e.message && (e.message.includes('소모품') || e.message.includes('highlight') || e.message.includes('sample') || e.message.includes('list') || e.message.includes('large list') || e.message.includes('consumable'))) {
      console.log(`[${e.level}] ${e.message}`);
    }
  });
}

function analyzeAirPurifier() {
  console.log('\n=== 공기청정기 (Air Purifier) Log Analysis ===');
  const filePath = path.join(LOG_DIR, '공기청정기-debug-log-20260620-173949.json');
  if (!fs.existsSync(filePath)) {
    console.log('Air Purifier log not found.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Loaded ${data.length} log entries.`);

  console.log('\n--- Sleep mode schedule (취침 예약) clicks & navigation ---');
  data.forEach(e => {
    if (e.message && (e.message.includes('취침') || e.message.includes('예약') || e.message.includes('sleep') || e.message.includes('Clicked') || e.message.includes('Navigated'))) {
      if (e.message.includes('취침') || e.message.includes('예약') || e.message.includes('sleep') || e.message.includes('schedule')) {
        console.log(`[${e.level}] ${e.message}`);
      }
    }
  });
}

analyzeRefrigerator();
analyzeWashTower();
analyzeDishwasher();
analyzeAirPurifier();
