// ===============================================
// AVERAGE SUBMISSION - JS Fundamentals
// ===============================================

// 1. String Reversal - uses .split().reverse().join() (uses .reverse() - violates challenge)
function reverseString(str) {
  return str.split('').reverse().join('');
}

// 2. Palindrome - works but doesn't handle case insensitivity
function isPalindrome(str) {
  const reversed = str.split('').reverse().join('');
  return str === reversed;  // "Racecar" would return false incorrectly
}

// 3. isPrime - works but no edge case handling for n < 2
function isPrime(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true; // incorrectly returns true for 0 and 1
}

// 4. Unique Values - uses filter instead of Set (works but not efficient)
function getUniqueValues(arr) {
  return arr.filter((val, index) => arr.indexOf(val) === index);
}

// 5. countCharacters - Missing, not implemented
// function countCharacters(str) { }

// --- Test Runs ---
console.log(reverseString("hello"));
console.log(isPalindrome("racecar"));   // true (lowercase works)
console.log(isPalindrome("Racecar"));   // false (case bug)
console.log(isPrime(7));
console.log(isPrime(1));                // incorrectly true
console.log(getUniqueValues([1,2,2,3,4,4,5]));
