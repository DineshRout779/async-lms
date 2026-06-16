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
  const userRes = await pool.query("SELECT id FROM users WHERE email = 'saniyya@gmail.com'");
  const userId = userRes.rows[0]?.id;
  console.log('Saniyya user ID:', userId);

  if (!userId) {
    console.log('User not found.');
    await pool.end();
    return;
  }

  const delRes = await pool.query(
    "DELETE FROM college_assignment_submissions WHERE student_id = $1 AND assignment_id = $2 RETURNING id",
    [userId, ASSIGNMENT_ID]
  );
  console.log('Deleted:', delRes.rows.length ? delRes.rows : 'No submission found');
  await pool.end();
}

run().catch(console.error);
