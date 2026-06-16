// ===============================================
// AVERAGE SUBMISSION - Variables, Types & Operators
// ===============================================

// 1. Profile - missing isStudent boolean, uses wrong type for age
var name = "Bob";
var age = "22";           // bug: age stored as string, not number
var favoriteNumber = 9;
// isStudent is missing

console.log(name, age, favoriteNumber);

// 2. Operator Playground
var num1 = 15;
var num2 = 4;

console.log(num1 + num2);  // sum only
console.log(num1 - num2);  // difference
// product and quotient are missing
console.log(num1 % num2);  // remainder - correct
// comparison operator missing

// 3. Type Transformer
var score = "85";
var scoreAsNumber = parseInt(score) + 10;
console.log(scoreAsNumber); // 95 - correct

var year = 2026;
// forgot to convert to string, just logs the number
console.log(year);
console.log(typeof year); // logs "number" not "string"

// 4. Implicit Conversion
var result = 5 + "5";
console.log(result); // logs "55" but no comment explaining why
