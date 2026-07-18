require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false },
  webSocketConstructor: ws
});

pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`)
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
