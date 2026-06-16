require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'student_profiles'`);
    console.log('student_profiles columns:', res.rows.map(r => r.column_name));
  } catch(e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}
run();
