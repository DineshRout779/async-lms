const pool = require('./backend/config/pg');

async function run() {
  const { rows: ca } = await pool.query('SELECT DISTINCT course FROM college_assignments');
  console.log('college_assignments courses:', ca);
  const { rows: a } = await pool.query('SELECT DISTINCT s.name FROM assignments a JOIN units u ON a.unit_id=u.id JOIN topics t ON u.topic_id=t.id JOIN subjects s ON t.subject_id=s.id');
  console.log('unit assignments subjects:', a);
  process.exit(0);
}
run();
