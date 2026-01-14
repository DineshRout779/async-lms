const router = require('express').Router();
const pool = require('../config/pg');
const verifyToken = require('../middlewares/verfiyToken');

router.post('/college', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { college_id } = req.body;

  if (!college_id) {
    return res.status(400).json({ message: 'college_id is required' });
  }

  try {
    // validate college
    const college = await pool.query('SELECT id FROM colleges WHERE id = $1', [
      college_id,
    ]);

    if (!college.rowCount) {
      return res.status(400).json({ message: 'Invalid college' });
    }

    await pool.query(
      `
        UPDATE users
        SET college_id = $1,
            onboarding_step = 'batch'
        WHERE id = $2
        `,
      [college_id, userId]
    );

    res.json({
      message: 'College added successfully',
      next_step: 'batch',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/batch', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { degree, year } = req.body;

  if (!degree || !year) {
    return res.status(400).json({ message: 'degree and year are required' });
  }

  try {
    await pool.query(
      `
      UPDATE users
      SET degree = $1,
          year = $2,
          onboarding_step = 'subject'
      WHERE id = $3
      `,
      [degree, year, userId]
    );

    res.json({
      message: 'Batch details added',
      next_step: 'subject',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/subjects', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { subjectIds } = req.body; // Array of IDs: [1, 2, 5]

  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    return res
      .status(400)
      .json({ message: 'Please select at least one subject' });
  }

  const client = await pool.connect(); // Get a client for the transaction

  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Insert each subject into user_subjects
    // We use a loop or generate a dynamic multi-row insert query
    const insertQuery = `
      INSERT INTO user_subjects (user_id, subject_id, started_at)
      SELECT $1, unnest($2::int[]), CURRENT_TIMESTAMP
      ON CONFLICT (user_id, subject_id) DO NOTHING
    `;
    await client.query(insertQuery, [userId, subjectIds]);

    // 2. Update the user's onboarding status
    await client.query(
      "UPDATE users SET onboarding_step = 'completed' WHERE id = $1",
      [userId]
    );

    await client.query('COMMIT'); // Commit changes

    res.json({
      success: true,
      message: 'Learning path created!',
      next_step: 'dashboard',
    });
  } catch (err) {
    await client.query('ROLLBACK'); // Undo changes on error
    console.error('Transaction Error:', err);
    res.status(500).json({ message: 'Failed to save subjects' });
  } finally {
    client.release(); // Return client to pool
  }
});

module.exports = router;
