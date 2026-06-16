require('dotenv').config({ path: '.env.development' });
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

const EVALUATION_ID = '7a866959-dd06-4150-8ad2-f5eab5a7c392';

async function run() {
  // See current results
  const res = await pool.query(
    'SELECT id, student_name, marks, feedback FROM evaluation_results WHERE evaluation_id = $1',
    [EVALUATION_ID]
  );
  console.log('Current results:');
  res.rows.forEach(r => console.log(`  ${r.student_name}: ${r.marks}`));

  // Update Naresh to have a low score (~50)
  const nareshRow = res.rows.find(r => r.student_name.toLowerCase().includes('naresh'));
  if (nareshRow) {
    await pool.query(
      `UPDATE evaluation_results SET marks = 52, feedback = 'Submission for "JavaScript Foundations: Variables, Data types & Operators" needs significant improvement. Most of the required functions are missing or not implemented correctly. The code does not meet the assignment requirements. Please revisit the problem statement and resubmit. (Automated Simulation)' WHERE id = $1`,
      [nareshRow.id]
    );
    console.log(`\nUpdated Naresh score to 52`);
  }

  // Verify
  const updated = await pool.query(
    'SELECT student_name, marks FROM evaluation_results WHERE evaluation_id = $1',
    [EVALUATION_ID]
  );
  console.log('\nUpdated results:');
  updated.rows.forEach(r => console.log(`  ${r.student_name}: ${r.marks}`));

  await pool.end();
}

run().catch(console.error);
