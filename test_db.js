require('dotenv').config({path: './backend/.env'});
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false },
  webSocketConstructor: ws,
  connectionTimeoutMillis: 10000
});

async function test() {
  try {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`);
    console.log("=== USERS TABLE SCHEMA ===");
    console.table(res.rows);
  } catch (err) {
    console.error("DB check failed:", err.message);
  } finally {
    process.exit(0);
  }
}
test();
