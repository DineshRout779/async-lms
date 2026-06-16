require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
    console.log('users columns:', res.rows.map(r => r.column_name));
  } catch(e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}
run();
