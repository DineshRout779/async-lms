require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'assignment_submissions'`);
    console.log('assignment_submissions cols:', res.rows.map(r => r.column_name));
    
    const res2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'college_assignment_submissions'`);
    console.log('college_assignment_submissions cols:', res2.rows.map(r => r.column_name));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
