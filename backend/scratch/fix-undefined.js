require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const res = await pool.query(`SELECT r.id, r.evaluation_id, r.feedback, COALESCE(a.title, c.title) as title FROM evaluation_results r JOIN evaluations e ON r.evaluation_id = e.id LEFT JOIN assignments a ON e.assignment_id = a.id LEFT JOIN college_assignments c ON e.college_assignment_id = c.id WHERE r.feedback LIKE '%undefined%'`);
    
    let updated = 0;
    for (const row of res.rows) {
      if (row.title) {
        const newFeedback = row.feedback.replace('"undefined"', '"' + row.title + '"');
        await pool.query('UPDATE evaluation_results SET feedback = $1 WHERE id = $2', [newFeedback, row.id]);
        updated++;
      }
    }
    console.log('Fixed ' + updated + ' records with undefined title in feedback');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
