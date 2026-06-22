const pool = require('./backend/config/pg');

async function checkLogs() {
  try {
    const res = await pool.query('SELECT l.query_used, a.title FROM video_pipeline_logs l JOIN ai_course_lessons a ON l.lesson_id = a.id ORDER BY l.created_at DESC LIMIT 10');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkLogs();
