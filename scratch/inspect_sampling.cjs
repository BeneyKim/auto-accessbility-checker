const fs = require('fs');
const path = require('path');

function hash(value) {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 33) ^ value.charCodeAt(index);
  }
  return (result >>> 0).toString(36);
}

// Let's run a simulation of the sampling logic for a list of 5 items:
// ["검색", "자주 보관하는 식품", "야채", "유제품", "기타"]
const list1 = ["검색", "자주 보관하는 식품", "야채", "유제품", "기타"];
const list2 = ["식품 추가", "검색", "두유", "생크림", "치즈"];

const groupSignature1 = list1.join("|");
const groupSignature2 = list2.join("|");

console.log("Simulating with different random seed values:");
for (let s = 0; s < 10; s++) {
  const seedVal = Math.random();
  
  // List 1
  const hashStr1 = `${groupSignature1}:${seedVal}`;
  const hashInt1 = parseInt(hash(hashStr1), 36);
  const randVal1 = (hashInt1 % 10000) / 10000;
  const midIndex1 = 1 + Math.floor(randVal1 * 3);
  
  // List 2
  const hashStr2 = `${groupSignature2}:${seedVal}`;
  const hashInt2 = parseInt(hash(hashStr2), 36);
  const randVal2 = (hashInt2 % 10000) / 10000;
  const midIndex2 = 1 + Math.floor(randVal2 * 3);
  
  console.log(`Seed=${seedVal.toFixed(4)} => List1 mid="${list1[midIndex1]}" (idx ${midIndex1}), List2 mid="${list2[midIndex2]}" (idx ${midIndex2})`);
}
