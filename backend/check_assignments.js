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

async function checkDatabase() {
  try {
    console.log('\n🔍 Checking the Database for Assignments...\n');
    
    // 1. Check assignments
    const assignmentsRes = await pool.query('SELECT id, title, max_score FROM assignments ORDER BY created_at DESC LIMIT 5;');
    console.log('=== LATEST 5 ASSIGNMENTS (Teacher Side) ===');
    if (assignmentsRes.rows.length === 0) {
      console.log('No assignments found in the database yet.\n');
    } else {
      console.table(assignmentsRes.rows);
      console.log('');
    }

    // 2. Check assignment submissions
    const submissionsRes = await pool.query('SELECT assignment_id, user_id, submission_link, score FROM assignment_submissions LIMIT 5;');
    console.log('=== LATEST 5 SUBMISSIONS (Student Side) ===');
    if (submissionsRes.rows.length === 0) {
      console.log('No student submissions found yet.\n');
    } else {
      console.table(submissionsRes.rows);
      console.log('');
    }

    // 3. Check quizzes schema
    const schemaRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quizzes';");
    console.log('=== QUIZZES TABLE COLUMNS ===');
    console.table(schemaRes.rows);

    // 4. Check quiz_questions
    const questionsRes = await pool.query("SELECT id, quiz_id, question_text FROM quiz_questions LIMIT 5;");
    console.log('\n=== QUIZ QUESTIONS ===');
    console.table(questionsRes.rows);

  } catch (error) {
    console.error('Error connecting to the database:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();