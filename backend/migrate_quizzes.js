require('dotenv').config();
const { Pool } = require('pg');

// 1. Connect to OLD database
const oldPool = new Pool({
  host: 'ep-damp-waterfall-ajng5j79-pooler.c-3.us-east-2.aws.neon.tech', // From your commented-out .env
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_pjxAG0yBaOf8', // From your commented-out .env
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// 2. Connect to NEW active database
const newPool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  try {
    console.log('🔄 Connecting to both databases...');
    
    // Check if we can connect
    const oldTest = await oldPool.query('SELECT NOW()');
    const newTest = await newPool.query('SELECT NOW()');
    console.log('✅ Connected successfully to both databases!');

    // --- STEP 1: Fetch from OLD database ---
    console.log('\n📥 Fetching quizzes from old database...');
    // We fetch quizzes attached to Web Development (subject_id = 3c569157-e68b-4573-92d2-15ee19d965cb)
    const oldQuizzes = await oldPool.query(`
      SELECT q.*, u.title as unit_title, t.title as topic_title
      FROM quizzes q
      JOIN units u ON q.unit_id = u.id
      JOIN topics t ON u.topic_id = t.id
      WHERE t.subject_id = '3c569157-e68b-4573-92d2-15ee19d965cb'
    `);
    
    console.log(`Found ${oldQuizzes.rowCount} quizzes in the old database for Web Development.`);

    // --- STEP 2: Insert into NEW database ---
    console.log('\n📤 Migrating quizzes to new database...');
    let successCount = 0;

    for (const quiz of oldQuizzes.rows) {
      // Check if unit exists in new DB
      const unitCheck = await newPool.query('SELECT id FROM units WHERE id = $1', [quiz.unit_id]);
      
      if (unitCheck.rowCount === 0) {
        console.log(`⚠️ Skipping quiz for unit "${quiz.unit_title}" (Unit ID not found in new DB. Was it deleted?)`);
        continue;
      }

      // Check if quiz already exists in new DB
      const quizCheck = await newPool.query('SELECT id FROM quizzes WHERE id = $1', [quiz.id]);
      if (quizCheck.rowCount > 0) {
        console.log(`⏭️ Skipping quiz for unit "${quiz.unit_title}" (Already exists in new DB)`);
        continue;
      }

      // Insert quiz
      await newPool.query(
        'INSERT INTO quizzes (id, unit_id, passing_score, max_score, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [quiz.id, quiz.unit_id, quiz.passing_score, quiz.max_score, quiz.created_at, quiz.updated_at]
      );
      
      console.log(`✅ Migrated quiz for unit "${quiz.unit_title}"`);
      successCount++;
    }

    console.log(`\n🎉 Migration complete! Successfully migrated ${successCount} quizzes.`);

  } catch (error) {
    console.error('❌ Migration Error:', error.message);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

migrateData();
