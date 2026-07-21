require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false }
});

async function checkCourseQuizzes() {
  try {
    // 1. Get Web Development subject ID
    const subjectRes = await pool.query("SELECT id FROM subjects WHERE name = 'Web Development' LIMIT 1;");
    if (subjectRes.rows.length === 0) {
      console.log('No Web Development course found.');
      return;
    }
    const subjectId = subjectRes.rows[0].id;
    console.log(`Web Development ID: ${subjectId}`);

    // 2. Get units for this course
    const unitsRes = await pool.query(`
      SELECT t.id as topic_id, u.id as unit_id, u.title, q.id as quiz_id
      FROM topics t
      JOIN units u ON t.id = u.topic_id
      LEFT JOIN quizzes q ON u.id = q.unit_id
      WHERE t.subject_id = $1
    `, [subjectId]);

    console.log('\n=== UNITS AND QUIZZES FOR WEB DEVELOPMENT ===');
    console.table(unitsRes.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCourseQuizzes();
