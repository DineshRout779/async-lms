const { Pool } = require('pg');
const tables = require('./createTables');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

(async () => {
  try {
    await pool.connect();
    console.log('Database connected!');
  } catch (error) {
    console.log('Database connection Failed: ', error);
  }
})();

// (async () => {
//   try {
//     for (const [tableName, tableQuery] of Object.entries(tables)) {
//       console.log(`Creating table: ${tableName}`);
//       await pool.query(tableQuery);
//     }

//     console.log('All tables created successfully.');
//     process.exit(0);
//   } catch (error) {
//     console.error('Error while creating tables:', error);
//     process.exit(1);
//   }
// })();

module.exports = pool;
