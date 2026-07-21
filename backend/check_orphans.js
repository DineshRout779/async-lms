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

async function checkData() {
  try {
    const quizzesRes = await pool.query('SELECT COUNT(*) FROM quizzes');
    console.log(`Total Quizzes in DB: ${quizzesRes.rows[0].count}`);

    const orphanedQuizzes = await pool.query(`
      SELECT q.id as quiz_id, q.unit_id 
      FROM quizzes q 
      LEFT JOIN units u ON q.unit_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned Quizzes (Unit was deleted/changed): ${orphanedQuizzes.rowCount}`);

    const assignmentsRes = await pool.query('SELECT COUNT(*) FROM assignments');
    console.log(`Total Assignments in DB: ${assignmentsRes.rows[0].count}`);

    const orphanedAssignments = await pool.query(`
      SELECT a.id as assignment_id, a.unit_id 
      FROM assignments a 
      LEFT JOIN units u ON a.unit_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned Assignments: ${orphanedAssignments.rowCount}`);

    const allQuizzes = await pool.query(`
      SELECT q.id as quiz_id, q.unit_id, u.title as unit_title
      FROM quizzes q
      LEFT JOIN units u ON q.unit_id = u.id
    `);
    console.log('\nAll Quizzes mapping:');
    console.table(allQuizzes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkData();
