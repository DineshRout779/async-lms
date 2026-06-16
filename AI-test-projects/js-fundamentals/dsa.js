// =============================================
// GOOD SUBMISSION - JS Fundamentals
// =============================================

// 1. String Reversal (without .reverse())
function reverseString(str) {
  let reversed = '';
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}

// 2. Palindrome Checker (case insensitive)
function isPalindrome(str) {
  const lower = str.toLowerCase();
  const reversed = reverseString(lower);
  return lower === reversed;
}

// 3. Prime Number Finder (with edge cases)
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

// 4. Array Unique Values (using Set)
function getUniqueValues(arr) {
  return [...new Set(arr)];
}

// 5. Character Frequency Counter
function countCharacters(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}

// --- Test Runs ---
console.log(reverseString("hello"));           // "olleh"
console.log(reverseString("abcde"));           // "edcba"
console.log(isPalindrome("Racecar"));          // true
console.log(isPalindrome("hello"));            // false
console.log(isPrime(7));                       // true
console.log(isPrime(1));                       // false
console.log(isPrime(0));                       // false
console.log(getUniqueValues([1,2,2,3,4,4,5]));// [1,2,3,4,5]
console.log(countCharacters("hello"));         // {h:1, e:1, l:2, o:1}
