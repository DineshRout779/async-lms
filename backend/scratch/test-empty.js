require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const id = '3d84c914-01fb-4643-8d0d-180d8083b8f8';
    const res = await pool.query(`SELECT r.*, 
              COALESCE(s.submission_link, cs.submission_link) as submission_link,
              u.college_id,
              u.batch_id
       FROM evaluation_results r
       JOIN evaluations e ON r.evaluation_id = e.id
       LEFT JOIN assignment_submissions s ON r.submission_id = s.id AND e.assignment_id IS NOT NULL
       LEFT JOIN college_assignment_submissions cs ON r.submission_id = cs.id AND e.college_assignment_id IS NOT NULL
       LEFT JOIN users u ON r.student_id = u.id
       WHERE r.evaluation_id = $1`, [id]);
    console.log(res.rows.length + ' rows returned');
  } catch(e) {
    console.error('SQL Error:', e.message);
  } finally {
    process.exit(0);
  }
}
run();
