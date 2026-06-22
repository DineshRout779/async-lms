const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.development' });
const crypto = require('crypto');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const goodCode = `
// E-commerce Product Catalog
const products = [
  { id: 1, name: 'Laptop', price: 999, category: 'Electronics' },
  { id: 2, name: 'Shoes', price: 89, category: 'Apparel' },
  { id: 3, name: 'Phone', price: 699, category: 'Electronics' }
];

function fetchProducts() {
  return new Promise(resolve => setTimeout(() => resolve(products), 500));
}

// Map, filter, reduce
const getElectronics = (items) => items.filter(i => i.category === 'Electronics');
const getTotalPrice = (items) => items.reduce((sum, i) => sum + i.price, 0);

// Debouncing
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
`;

const avgCode = `
// E-commerce Product Catalog
const products = [
  { id: 1, name: 'Laptop', price: 999 },
  { id: 2, name: 'Shoes', price: 89 }
];

function fetchProducts() {
  return products;
}

// Missing reduce and debounce logic
const getItems = () => {
  return products.map(p => p.name);
};
`;

const badCode = `
function foo() {
  console.log("Hello world");
}
foo();
`;

async function uploadToS3(codeStr, filename) {
  const bucket = process.env.AWS_S3_BUCKET;
  const key = "college-submissions/" + Date.now() + "-" + filename;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: codeStr,
    ContentType: 'text/javascript'
  }));
  return "https://" + bucket + ".s3." + process.env.AWS_REGION + ".amazonaws.com/" + key;
}

async function run() {
  try {
    console.log("Starting DB transaction...");
    // Get a college
    const collegeRes = await pool.query('SELECT id FROM colleges LIMIT 1');
    const collegeId = collegeRes.rows[0].id;

    // Get an admin user
    const adminRes = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    const adminId = adminRes.rows[0].id;

    // Get 3 students in this college
    const studentsRes = await pool.query("SELECT user_id FROM student_profiles WHERE college_id=$1 LIMIT 3", [collegeId]);
    if (studentsRes.rows.length < 3) throw new Error("Not enough students in college");
    const studentIds = studentsRes.rows.map(r => r.user_id);

    // Create Assignment
    const rubric = [
      { name: 'API & Data Fetching', score: 25 },
      { name: 'Advanced Array Methods (map/filter/reduce)', score: 30 },
      { name: 'Debouncing & Performance Logic', score: 15 },
      { name: 'DOM Manipulation & Responsive CSS Grid', score: 20 },
      { name: 'Code Modularity & Cleanliness', score: 10 }
    ];

    const testCases = [
      { input: 'Verify application fetches product data asynchronously', output: 'Use of Promises or async/await', score: 25 },
      { input: 'Verify use of .map(), .filter(), and .reduce()', output: 'All array methods used correctly', score: 30 },
      { input: 'Verify debouncing on search input', output: 'Debounce function implemented and used', score: 15 }
    ];

    const assignRes = await pool.query(
      "INSERT INTO college_assignments (college_id, created_by, title, description, course, due_date, rubric, test_cases, evaluator_type) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id", 
      [
      collegeId, adminId, 'AI Evaluator Test: E-commerce Catalog', 
      'Build a simple e-commerce catalog simulator to test the AI Evaluator.',
      'react', new Date(Date.now() + 86400000), JSON.stringify(rubric), JSON.stringify(testCases), 'AI'
    ]);
    
    const assignmentId = assignRes.rows[0].id;
    console.log('Created assignment:', assignmentId);

    // Upload code to S3
    console.log("Uploading files to S3...");
    const urlGood = await uploadToS3(goodCode, 'good.js');
    const urlAvg = await uploadToS3(avgCode, 'avg.js');
    const urlBad = await uploadToS3(badCode, 'bad.js');

    // Insert submissions
    const insertSub = 
      "INSERT INTO college_assignment_submissions " +
      "(assignment_id, student_id, submission_link, submission_file_name) " +
      "VALUES ($1, $2, $3, $4)";
    await pool.query(insertSub, [assignmentId, studentIds[0], urlGood, 'good.js']);
    await pool.query(insertSub, [assignmentId, studentIds[1], urlAvg, 'avg.js']);
    await pool.query(insertSub, [assignmentId, studentIds[2], urlBad, 'bad.js']);
    
    console.log("Inserted submissions!");
    console.log("Done.");

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
