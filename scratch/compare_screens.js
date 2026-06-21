import fs from 'fs';

const pathBefore = 'log/냉동고-20260531-132057/냉동고-20260531-132057.json';
const pathAfter = 'log/냉동고-20260531-134008/냉동고-20260531-134008.json';

const before = JSON.parse(fs.readFileSync(pathBefore, 'utf8'));
const after = JSON.parse(fs.readFileSync(pathAfter, 'utf8'));

console.log("Before screens count:", before.results.length);
console.log("After screens count:", after.results.length);

const beforeKeys = before.results.map(r => r.menuPath.join(" > "));
const afterKeys = after.results.map(r => r.menuPath.join(" > "));

console.log("\nScreens in Before but not in After:");
beforeKeys.forEach(key => {
  if (!afterKeys.includes(key)) {
    console.log(`- ${key}`);
  }
});

console.log("\nScreens in After but not in Before:");
afterKeys.forEach(key => {
  if (!beforeKeys.includes(key)) {
    console.log(`- ${key}`);
  }
});
