const { pool } = require('./config/pg');

async function test() {
  try {
    const id = 'ff824dd6-c2ff-4e68-92be-3a8c43e4f0c0';
    console.log('Testing getCourse for id:', id);

    const courseRes = await pool.query(
      `SELECT c.*, u.full_name AS creator_name,
              r.full_name AS reviewer_name
       FROM ai_courses c
       JOIN users u ON c.created_by = u.id
       LEFT JOIN users r ON c.reviewed_by = r.id
       WHERE c.id = $1`,
      [id],
    );
    console.log('Course result:', courseRes.rows.length ? 'Found' : 'Not found');

    const modulesRes = await pool.query(
      `SELECT * FROM ai_course_modules WHERE course_id = $1 ORDER BY order_index`,
      [id],
    );
    console.log('Modules result:', modulesRes.rows.length);

    const reviewsRes = await pool.query(
      `SELECT r.*, u.full_name AS reviewer_name
       FROM ai_course_reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.course_id = $1 ORDER BY r.created_at DESC`,
      [id],
    );
    console.log('Reviews result:', reviewsRes.rows.length);

    console.log('Success!');
  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    process.exit();
  }
}

test();
