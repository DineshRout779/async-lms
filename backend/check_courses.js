const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCourses() {
  try {
    const res = await pool.query('SELECT id, title, role_focus, status FROM ai_courses ORDER BY created_at DESC');
    console.log('\n--- AI Curriculum Courses ---');
    console.table(res.rows);
    await pool.end();
  } catch (err) {
    console.error('Error checking courses:', err.message);
  }
}

checkCourses();
