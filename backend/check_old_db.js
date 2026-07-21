require('dotenv').config();
const { Pool } = require('pg');

const oldPool = new Pool({
  host: 'ep-damp-waterfall-ajng5j79-pooler.c-3.us-east-2.aws.neon.tech', 
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_pjxAG0yBaOf8', 
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function checkOldDb() {
  try {
    const quizzes = await oldPool.query(`
      SELECT q.id as quiz_id, u.title as unit_title, t.title as topic_title, s.name as subject_name
      FROM quizzes q
      LEFT JOIN units u ON q.unit_id = u.id
      LEFT JOIN topics t ON u.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
    `);
    
    console.log(`Found ${quizzes.rowCount} TOTAL quizzes in the old database.`);
    console.table(quizzes.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await oldPool.end();
  }
}

checkOldDb();
