require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const id = '982ab110-76c3-4535-be71-aaf7f9b2bab7';
    const evalRes = await pool.query('SELECT * FROM evaluations WHERE id = $1', [id]);
    console.log('Evaluation:', evalRes.rows[0]);

    if (evalRes.rows[0]) {
      const assignmentId = evalRes.rows[0].assignment_id || evalRes.rows[0].college_assignment_id;
      const a = await pool.query('SELECT id, title FROM assignments WHERE id = $1', [assignmentId]);
      const ca = await pool.query('SELECT id, title FROM college_assignments WHERE id = $1', [assignmentId]);
      console.log('Assignment:', a.rows[0] || ca.rows[0]);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
