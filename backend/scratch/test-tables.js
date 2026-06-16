require('dotenv').config({ path: '.env.development' });
const pool = require('../config/pg');

async function run() {
  try {
    const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('tables:', res.rows.map(r => r.table_name));
  } catch(e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}
run();
