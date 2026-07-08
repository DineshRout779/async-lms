const pool = require('./backend/config/pg');

async function test() {
  try {
    const res = await pool.query(`SELECT id, use_master_video, master_video_url FROM ai_courses LIMIT 1`);
    console.log("DB check success:", res.rows);
  } catch (err) {
    console.error("DB check failed:", err.message);
  } finally {
    process.exit(0);
  }
}
test();
