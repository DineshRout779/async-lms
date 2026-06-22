// =============================================
// GOOD SUBMISSION - Variables, Types & Operators
// =============================================

// 1. The "Profile" Object
const name = "Alice";
const age = 21;
const isStudent = true;
const favoriteNumber = 7;

console.log("Name:", name);           // string
console.log("Age:", age);             // number
console.log("Is Student:", isStudent); // boolean
console.log("Favorite Number:", favoriteNumber); // number

// 2. Operator Playground
const num1 = 20;
const num2 = 6;

console.log("Sum:", num1 + num2);           // 26
console.log("Difference:", num1 - num2);    // 14
console.log("Product:", num1 * num2);       // 120
console.log("Quotient:", num1 / num2);      // 3.333...
console.log("Remainder:", num1 % num2);     // 2
console.log("num1 > num2:", num1 > num2);   // true

// 3. The "Type" Transformer
const score = "85";
const scoreAsNumber = Number(score) + 10;
console.log("Score + 10:", scoreAsNumber);  // 95
console.log("Type of scoreAsNumber:", typeof scoreAsNumber); // "number"

const year = 2026;
const yearAsString = String(year);
console.log("Year as string:", yearAsString);
console.log("Type:", typeof yearAsString);  // "string"

// 4. Implicit Conversion Challenge
const result = 5 + "5";
console.log("5 + '5' =", result); // "55"

// JavaScript converts the number 5 to a string because when the + operator
// is used with a string operand, it performs string concatenation rather than
// arithmetic addition. This is called implicit type coercion.
