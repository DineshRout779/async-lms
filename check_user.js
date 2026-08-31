const pool = require('./backend/config/pg');

async function run() {
  try {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', ['rohith.barabari@gmail.com']);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
