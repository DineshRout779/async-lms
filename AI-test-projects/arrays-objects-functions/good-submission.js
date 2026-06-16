// =============================================
// GOOD SUBMISSION - Arrays, Objects & Functions
// =============================================

// Initialize Data
const students = [
  { name: "Alice", age: 20, grade: 88, subjects: ["Math", "Physics", "Computer Science"] },
  { name: "Bob", age: 21, grade: 72, subjects: ["Math", "Chemistry", "Biology"] },
  { name: "Charlie", age: 19, grade: 95, subjects: ["Computer Science", "Math", "English"] },
  { name: "Diana", age: 22, grade: 60, subjects: ["History", "Chemistry", "English"] },
  { name: "Ethan", age: 20, grade: 81, subjects: ["Physics", "Math", "Computer Science"] },
];

// Filter Function
function filterByGrade(arr, minGrade) {
  return arr.filter(student => student.grade >= minGrade);
}

// Stats Function
function getAverageGrade(arr) {
  const total = arr.reduce((sum, student) => sum + student.grade, 0);
  return total / arr.length;
}

// Search Function
function findStudentsBySubject(arr, subject) {
  return arr
    .filter(student => student.subjects.includes(subject))
    .map(student => student.name);
}

// Bonus Function
function promoteStudent(arr, name) {
  const student = arr.find(s => s.name === name);
  if (student) {
    student.grade += 5;
  }
  return arr;
}

// --- Test Runs ---
console.log("Students with grade >= 75:", filterByGrade(students, 75));
console.log("Students with grade >= 100:", filterByGrade(students, 100));
console.log("Average grade:", getAverageGrade(students));
console.log("Students taking Math:", findStudentsBySubject(students, "Math"));
console.log("Students taking Chemistry:", findStudentsBySubject(students, "Chemistry"));
promoteStudent(students, "Bob");
console.log("After promoting Bob:", students.find(s => s.name === "Bob"));
