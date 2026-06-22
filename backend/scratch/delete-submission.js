require('dotenv').config({ path: '.env.development' });
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  // Find all submissions for this assignment
  const res = await pool.query(
    `SELECT u.email, u.full_name, cs.id, cs.submitted_at 
     FROM college_assignment_submissions cs 
     JOIN users u ON u.id = cs.student_id 
     WHERE cs.assignment_id = '2e6506ab-1085-4e8b-a253-ab63090cef6f'`
  );
  console.log('All submissions:', JSON.stringify(res.rows, null, 2));

  if (res.rows.length > 0) {
    // Delete all of them
    const del = await pool.query(
      "DELETE FROM college_assignment_submissions WHERE assignment_id = '2e6506ab-1085-4e8b-a253-ab63090cef6f' RETURNING id"
    );
    console.log('Deleted count:', del.rows.length);
  }

  await pool.end();
}

run().catch(console.error);
