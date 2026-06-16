require('dotenv').config({ path: '.env.development' });
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

const ASSIGNMENT_ID = '2e6506ab-1085-4e8b-a253-ab63090cef6f';

async function run() {
  // Get user IDs for Naresh and Venkatesh
  const usersRes = await pool.query(
    "SELECT id, full_name, email FROM users WHERE email IN ('naresh@gmail.com', 'venkatesh@gmail.com')"
  );
  console.log('Found users:', usersRes.rows.map(r => r.email));

  for (const user of usersRes.rows) {
    const res = await pool.query(
      `INSERT INTO college_assignment_submissions (assignment_id, student_id, submitted_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [ASSIGNMENT_ID, user.id]
    );
    console.log(`Restored submission for ${user.full_name}: ${res.rows[0]?.id || 'already exists'}`);
  }

  await pool.end();
}

run().catch(console.error);
