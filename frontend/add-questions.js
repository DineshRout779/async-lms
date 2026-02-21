import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
    Authorization:
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ5MDA2NDY4LTA0ZGItNDQ0Zi1iN2MwLWUxYTI2YWZlZmE0MSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3MTQzOTA4NywiZXhwIjoxNzcyMDQzODg3fQ.WwvCvgHiSO4g9oaGiYe_YZY1x7hLo1nFmJRbHEn3bHE', // keep yours
  },
});

const quizId = '408ead3f-75bd-4ab4-953e-043fa59d7a3b';

const questions = [
  {
    text: `What is an object in JavaScript ?`,
    options: [
      'A collection of variables',
      'A collection of functions only',
      'A collection of key–value pairs',
      'A collection of arrays',
    ],
    correctIndex: 2,
  },

  {
    text: `Which syntax is used to create an object ?`,
    options: ['let obj = []', 'let obj = {}', 'let obj = ()', 'let obj = ""'],
    correctIndex: 1,
  },

  {
    text: `How do you access the value of name in the object below?
\`\`\`js
let person = { name: "Rohit", age: 21 };
\`\`\``,
    options: [
      'person[name]',
      'person.name',
      'person->name',
      'person.get(name)',
    ],
    correctIndex: 1,
  },

  {
    text: `Which of the following is a valid object key?`,
    options: ['"name"', '123', '_id', 'All of the above'],
    correctIndex: 3,
  },

  {
    text: `What will typeof {} return?`,
    options: ['object', 'array', 'function', 'undefined'],
    correctIndex: 0,
  },

  {
    text: `How do you add a new property city to an object user?`,
    options: [
      'user.city = "Hyderabad"',
      'user.add(city)',
      'user -> city = "Hyderabad"',
      'add user.city',
    ],
    correctIndex: 0,
  },

  {
    text: `What will be the output?
\`\`\`js
let obj = { a: 1, b: 2 };
console.log(obj.c);
\`\`\``,
    options: ['0', 'null', 'undefined', 'Error'],
    correctIndex: 2,
  },

  {
    text: `Which loop is commonly used to iterate over object properties ?`,
    options: ['for', 'while', 'forEach', 'for...in'],
    correctIndex: 3,
  },

  {
    text: `What does Object.keys(obj) return?`,
    options: [
      'Values of the object',
      'Keys of the object in an array',
      'Both keys and values',
      'Number of properties',
    ],
    correctIndex: 1,
  },

  {
    text: `What will be the output?
\`\`\`js
let car = { brand: "BMW" };
car.brand = "Audi";
console.log(car.brand);
\`\`\``,
    options: ['BMW', 'Audi', 'Error', 'undefined'],
    correctIndex: 1,
  },

  {
    text: `What will be the output ?
\`\`\`js
let obj = { x: 10 };
let ref = obj;
ref.x = 20;
console.log(obj.x);
\`\`\``,
    options: ['10', '20', 'undefined', 'Error'],
    correctIndex: 1,
  },

  {
    text: `What is the output ?
\`\`\`js
let obj = {
  name: "JS",
  details: { level: "easy" }
};
console.log(obj.details.level);
\`\`\``,
    options: ['JS', 'details', 'easy', 'undefined'],
    correctIndex: 2,
  },

  {
    text: `Which method converts an object into a JSON string ?`,
    options: [
      'JSON.parse()',
      'JSON.stringify()',
      'Object.toJSON()',
      'convert.JSON()',
    ],
    correctIndex: 1,
  },

  {
    text: `What will be the output ?
\`\`\`js
let obj = { a: 1 };
delete obj.a;
console.log(obj.a);
\`\`\``,
    options: ['1', 'null', 'undefined', 'Error'],
    correctIndex: 2,
  },

  {
    text: `What will be the output?
\`\`\`js
let obj1 = { a: 1 };
let obj2 = { a: 1 };
console.log(obj1 === obj2);
\`\`\``,
    options: ['true', 'false', 'undefined', 'Error'],
    correctIndex: 1,
  },
];

async function createQuestions() {
  try {
    let i = 1;
    for (const q of questions) {
      // ✅ create question
      const qRes = await api.post('/api/v1/admin/quiz-questions', {
        quiz_id: quizId,
        question_text: q.text,
        question_type: 'multiple_choice',
        points: 1,
        explanation: '',
      });

      const questionId = qRes.data.data.id;

      // ✅ create options
      await Promise.all(
        q.options.map((opt, index) =>
          api.post('/api/v1/admin/quiz-question-options', {
            question_id: questionId,
            option_text: opt,
            is_correct: index === q.correctIndex,
            order_index: index,
          }),
        ),
      );

      console.log('✅ Added question', i);
      i++;
    }

    console.log('🎉 All questions inserted');
  } catch (err) {
    console.error(
      '❌ Error inserting questions:',
      err?.response?.data || err.message,
    );
  }
}

createQuestions();
