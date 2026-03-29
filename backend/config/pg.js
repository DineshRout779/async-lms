const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false,
  },
  family: 4,
});

(async () => {
  try {
    const client = await pool.connect();
    // Accessing the host from the pool's own options
    const connectedHost = pool.options.host;
    const connectedDb = pool.options.database;

    console.log(`✅ Database connected to host: ${connectedHost}`);
    console.log(`📁 Target database: ${connectedDb}`);

    // Idempotent schema migrations
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text UNIQUE`,
    );
    await client.query(
      `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
    );
    await client.query(
      `ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS submission_link text`,
    );
    await client.query(
      `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb`,
    );
    await client.query(
      `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb`,
    );
    await client.query(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS instructions text`,
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS college_assignments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        college_id   UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        created_by   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        title        TEXT NOT NULL,
        description  TEXT,
        due_date     TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE college_assignments 
      ADD COLUMN IF NOT EXISTS instruction_file_url TEXT,
      ADD COLUMN IF NOT EXISTS instruction_file_name TEXT,
      ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'General'
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS college_assignment_submissions (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id         UUID NOT NULL REFERENCES college_assignments(id) ON DELETE CASCADE,
        student_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        submission_link       TEXT,
        submission_file_url   TEXT,
        submission_file_name  TEXT,
        submitted_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add unique constraint separately to be safe from existing tables
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'unique_assignment_student'
        ) THEN
          ALTER TABLE college_assignment_submissions
            ADD CONSTRAINT unique_assignment_student UNIQUE (assignment_id, student_id);
        END IF;
      END $$
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_college_assignments_college_id ON college_assignments(college_id)`,
    );

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'project_submissions_project_user_unique'
        ) THEN
          ALTER TABLE project_submissions
            ADD CONSTRAINT project_submissions_project_user_unique UNIQUE (project_id, user_id);
        END IF;
      END $$
    `);

    client.release(); // Always release the client back to the pool
  } catch (error) {
    console.log('❌ Database connection Failed: ', error);
  }
})();

module.exports = pool;
