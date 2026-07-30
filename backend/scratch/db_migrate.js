const { Pool } = require('pg');

async function migrate() {
  const pool1 = new Pool({
    host: 'ep-damp-waterfall-ajng5j79-pooler.c-3.us-east-2.aws.neon.tech',
    database: 'neondb',
    user: 'neondb_owner',
    password: 'npg_pjxAG0yBaOf8',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  const pool2 = new Pool({
    host: 'ep-still-snow-ah8hirh2-pooler.c-3.us-east-1.aws.neon.tech',
    database: 'neondb',
    user: 'neondb_owner',
    password: 'npg_y84LGOVghnzJ',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Migrating users table on DB 1...");
    await pool1.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log("Migration complete on DB 1.");
  } catch (err) {
    console.error("Error on DB 1:", err);
  }

  try {
    console.log("Migrating users table on DB 2...");
    await pool2.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log("Migration complete on DB 2.");
  } catch (err) {
    console.error("Error on DB 2:", err);
  }

  process.exit(0);
}

migrate();
