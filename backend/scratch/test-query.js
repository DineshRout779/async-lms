require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const id = '8c8d4033-9e1f-49e1-a141-3b43c782657b'; // the UUID from the screenshot URL
    const res = await pool.query(`SELECT r.*, 
              COALESCE(s.submission_link, cs.submission_link) as submission_link,
              COALESCE(s.submission_file_url, cs.submission_file_url) as submission_file_url,
              u.college_id,
              u.batch_id
       FROM evaluation_results r
       JOIN evaluations e ON r.evaluation_id = e.id
       LEFT JOIN assignment_submissions s ON r.submission_id = s.id AND e.assignment_id IS NOT NULL
       LEFT JOIN college_assignment_submissions cs ON r.submission_id = cs.id AND e.college_assignment_id IS NOT NULL
       LEFT JOIN users u ON r.student_id = u.id
       WHERE r.evaluation_id = $1`, [id]);
    console.log(res.rows.length + ' rows returned');
    console.log(res.rows[0]);
  } catch(e) {
    console.error('SQL Error:', e.message);
  } finally {
    process.exit(0);
  }
}
run();
