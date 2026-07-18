const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false },
  family: 4,
  connectionTimeoutMillis: 30000, // Increased to 30s so sleeping Neon DBs have time to wake up!
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

(async () => {
  let client;
  try {
    client = await pool.connect();
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
      ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS rubric JSONB,
      ADD COLUMN IF NOT EXISTS evaluator_type TEXT,
      ADD COLUMN IF NOT EXISTS assignment_description TEXT
    `);

    await client.query(`
      ALTER TABLE student_profiles
      ADD COLUMN IF NOT EXISTS current_academic_year TEXT,
      ADD COLUMN IF NOT EXISTS expected_graduation_year TEXT
    `);

    // Ensure it's casted to TEXT if it was previously created as INTEGER
    await client.query(`
      ALTER TABLE student_profiles 
      ALTER COLUMN expected_graduation_year TYPE TEXT USING expected_graduation_year::TEXT
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

    // ── Notifications ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type       TEXT NOT NULL,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL,
        link       TEXT,
        is_read    BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false`,
    );

    // ── AI Curriculum Builder ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_courses (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title               TEXT NOT NULL,
        domain              TEXT NOT NULL,
        role_focus          TEXT NOT NULL,
        jd_text             TEXT,
        skills              JSONB NOT NULL DEFAULT '[]',
        audience            TEXT NOT NULL,
        level               TEXT NOT NULL,
        learning_goal       TEXT NOT NULL,
        duration_weeks      INTEGER,
        daily_hours         NUMERIC(4,1),
        content_preference  TEXT,
        status              TEXT NOT NULL DEFAULT 'draft',
        created_by          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
        subject_id          UUID REFERENCES subjects(id) ON DELETE SET NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_courses_created_by ON ai_courses(created_by)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_courses_status ON ai_courses(status)`,
    );
    await client.query(
      `ALTER TABLE ai_courses ADD COLUMN IF NOT EXISTS use_master_video BOOLEAN NOT NULL DEFAULT false`,
    );
    await client.query(
      `ALTER TABLE ai_courses ADD COLUMN IF NOT EXISTS master_video_url TEXT`,
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_course_modules (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id     UUID NOT NULL REFERENCES ai_courses(id) ON DELETE CASCADE,
        title         TEXT NOT NULL,
        description   TEXT,
        order_index   INTEGER NOT NULL DEFAULT 0,
        practice_tasks JSONB NOT NULL DEFAULT '[]',
        case_studies  JSONB NOT NULL DEFAULT '[]',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_modules_course_id ON ai_course_modules(course_id)`,
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_course_topics (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id   UUID NOT NULL REFERENCES ai_course_modules(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_topics_module_id ON ai_course_topics(module_id)`,
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_course_lessons (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id             UUID NOT NULL REFERENCES ai_course_topics(id) ON DELETE CASCADE,
        title                TEXT NOT NULL,
        explanation          TEXT,
        example              TEXT,
        activity             TEXT,
        interview_questions  JSONB NOT NULL DEFAULT '[]',
        order_index          INTEGER NOT NULL DEFAULT 0,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_lessons_topic_id ON ai_course_lessons(topic_id)`,
    );
    await client.query(
      `ALTER TABLE ai_course_lessons ADD COLUMN IF NOT EXISTS lesson_type TEXT NOT NULL DEFAULT 'video'`,
    );
    await client.query(
      `ALTER TABLE ai_course_lessons ADD COLUMN IF NOT EXISTS duration_mins INTEGER NOT NULL DEFAULT 15`,
    );
    await client.query(
      `ALTER TABLE ai_course_lessons ADD COLUMN IF NOT EXISTS video_url TEXT`,
    );
    await client.query(
      `ALTER TABLE ai_course_lessons ADD COLUMN IF NOT EXISTS quiz_questions JSONB NOT NULL DEFAULT '[]'::jsonb`,
    );
    await client.query(
      `ALTER TABLE ai_course_lessons ADD COLUMN IF NOT EXISTS exercise_data JSONB`,
    );
    await client.query(
      `ALTER TABLE ai_course_lessons ADD COLUMN IF NOT EXISTS resource_links JSONB DEFAULT '[]'::jsonb`,
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_course_reviews (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id   UUID NOT NULL REFERENCES ai_courses(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action      TEXT NOT NULL,
        feedback    JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_reviews_course_id ON ai_course_reviews(course_id)`,
    );
    await client.query(
      `ALTER TABLE ai_course_modules ADD COLUMN IF NOT EXISTS capstone_project JSONB`,
    );
    await client.query(
      `ALTER TABLE ai_course_topics ADD COLUMN IF NOT EXISTS assignment JSONB`,
    );
    await client.query(
      `ALTER TABLE ai_courses ADD COLUMN IF NOT EXISTS capstone_project JSONB`,
    );
    await client.query(
      `ALTER TABLE ai_courses ADD COLUMN IF NOT EXISTS audience TEXT[] DEFAULT '{}'`,
    );
    await client.query(
      `ALTER TABLE ai_course_topics ADD COLUMN IF NOT EXISTS quiz_questions JSONB NOT NULL DEFAULT '[]'::jsonb`,
    );

    // Last accessed tracking for "Continue Learning"
    await client.query(
      `ALTER TABLE user_subjects ADD COLUMN IF NOT EXISTS last_accessed_subtopic_slug TEXT`,
    );
    await client.query(
      `ALTER TABLE user_subjects ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ`,
    );

    // ── Video Recommendation Engine ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS channel_whitelist (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id  TEXT NOT NULL UNIQUE,
        channel_name TEXT NOT NULL,
        added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS video_pipeline_logs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id       UUID REFERENCES ai_course_lessons(id) ON DELETE CASCADE,
        query_used      TEXT NOT NULL,
        videos_fetched  INTEGER NOT NULL DEFAULT 0,
        videos_passed   INTEGER NOT NULL DEFAULT 0,
        selected_url    TEXT,
        fallback_stage  INTEGER NOT NULL DEFAULT 0,
        error_message   TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ... rest of the tables
    // Dump lessons for debugging
    const dumpRes = await client.query(
      'SELECT id, title, video_url, exercise_data, quiz_questions FROM ai_course_lessons',
    );
    // require('fs').writeFileSync('db_dump.json', JSON.stringify(dumpRes.rows, null, 2));
  } catch (error) {
    console.log('❌ Database connection Failed: ', error);
  } finally {
    if (client) client.release(); // Always release the client back to the pool
  }
})();

module.exports = pool;
