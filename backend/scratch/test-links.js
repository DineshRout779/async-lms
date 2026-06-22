require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const id = '032940cc-dea4-4fc4-80a0-450da333c327';
    const evalRes = await pool.query('SELECT * FROM evaluations WHERE id = $1', [id]);
    console.log('Evaluation:', evalRes.rows[0]);

    const resultsRes = await pool.query(
      `SELECT r.id, r.submission_id, s.submission_link as s_link, cs.submission_link as cs_link, s.id as s_id, cs.id as cs_id
       FROM evaluation_results r
       JOIN evaluations e ON r.evaluation_id = e.id
       LEFT JOIN assignment_submissions s ON r.submission_id = s.id AND e.assignment_id IS NOT NULL
       LEFT JOIN college_assignment_submissions cs ON r.submission_id = cs.id AND e.college_assignment_id IS NOT NULL
       WHERE r.evaluation_id = $1`, [id]
    );
    console.log('Results:', resultsRes.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
