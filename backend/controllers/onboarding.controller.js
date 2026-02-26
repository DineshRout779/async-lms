const pool = require('../config/pg');

// 1. College Selection Step
exports.selectCollege = async (req, res) => {
  const userId = req.user.id;
  const { college_id } = req.body;

  if (!college_id) {
    return res.status(400).json({ message: 'college_id is required' });
  }

  try {
    const college = await pool.query('SELECT id FROM colleges WHERE id = $1', [
      college_id,
    ]);

    if (!college.rowCount) {
      return res.status(400).json({ message: 'Invalid college' });
    }

    await pool.query(
      `UPDATE student_profiles 
             SET college_id = $1 
             WHERE user_id = $2`,
      [college_id, userId],
    );

    await pool.query(
      `UPDATE users 
             SET onboarding_step = 'batch', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
      [userId],
    );

    res.json({ message: 'College added successfully', next_step: 'batch' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 2. Batch Details Step
exports.updateBatchDetails = async (req, res) => {
  const userId = req.user.id;
  const { degree, year } = req.body;

  if (!degree || !year) {
    return res.status(400).json({ message: 'degree and year are required' });
  }

  try {
    await pool.query(
      `UPDATE student_profiles 
             SET degree = $1, year = $2 
             WHERE user_id = $3`,
      [degree, year, userId],
    );

    await pool.query(
      `UPDATE users 
             SET onboarding_step = 'subject', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
      [userId],
    );

    res.json({ message: 'Batch details added', next_step: 'subject' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 3. Subject Selection Step
exports.selectSubjects = async (req, res) => {
  const userId = req.user.id;
  const { subjectIds } = req.body;

  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    return res
      .status(400)
      .json({ message: 'Please select at least one subject' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
            INSERT INTO user_subjects (user_id, subject_id, started_at)
            SELECT $1, unnest($2::uuid[]), CURRENT_TIMESTAMP
            ON CONFLICT (user_id, subject_id) DO NOTHING
        `;
    await client.query(insertQuery, [userId, subjectIds]);

    // Seed progress for all subtopics:
    //  - All subtopics in the first unit of each subject are always unlocked
    //  - Remaining subtopics inherit the cohort's current admin-applied lock state
    //    (bool_and = true means EVERY existing peer in same college+year has it unlocked,
    //     i.e. an admin did a broad unlock for this cohort)
    //  - ON CONFLICT: never re-lock a row that is already unlocked
    const seedProgressQuery = `
      WITH new_student_profile AS (
        SELECT college_id, year FROM student_profiles WHERE user_id = $1
      ),
      subject_subtopics AS (
        SELECT
          st.id AS subtopic_id,
          DENSE_RANK() OVER (
            PARTITION BY t.subject_id
            ORDER BY t.order_index, u.order_index
          ) AS unit_rn
        FROM topics t
        INNER JOIN units u ON u.topic_id = t.id
        INNER JOIN subtopics st ON st.unit_id = u.id
        WHERE t.subject_id = ANY($2::uuid[])
      ),
      cohort_unlock AS (
        SELECT usp.subtopic_id, bool_and(usp.is_unlocked) AS is_unlocked
        FROM user_subtopic_progress usp
        INNER JOIN student_profiles sp ON sp.user_id = usp.user_id
        CROSS JOIN new_student_profile nsp
        WHERE sp.college_id = nsp.college_id
          AND sp.year = nsp.year
          AND usp.user_id <> $1
        GROUP BY usp.subtopic_id
        HAVING COUNT(*) > 0
      )
      INSERT INTO user_subtopic_progress (user_id, subtopic_id, is_unlocked)
      SELECT $1, ss.subtopic_id,
        CASE WHEN ss.unit_rn = 1 THEN true
             ELSE COALESCE(cu.is_unlocked, true)
        END
      FROM subject_subtopics ss
      LEFT JOIN cohort_unlock cu ON cu.subtopic_id = ss.subtopic_id
      ON CONFLICT (user_id, subtopic_id) DO UPDATE
        SET is_unlocked = (user_subtopic_progress.is_unlocked OR EXCLUDED.is_unlocked);
    `;
    await client.query(seedProgressQuery, [userId, subjectIds]);

    await client.query(
      "UPDATE users SET onboarding_step = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [userId],
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Learning path created!',
      next_step: 'dashboard',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction Error:', err);
    res
      .status(500)
      .json({ message: 'Failed to save subjects', error: err.message });
  } finally {
    client.release();
  }
};

// 4. Facilitator College Selection Step
exports.selectFacilitatorColleges = async (req, res) => {
  const userId = req.user.id;
  const { college_ids } = req.body;

  if (!Array.isArray(college_ids) || college_ids.length === 0) {
    return res
      .status(400)
      .json({ message: 'At least one college must be selected' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'DELETE FROM facilitator_colleges WHERE facilitator_id = $1',
      [userId],
    );

    const insertQuery = `
      INSERT INTO facilitator_colleges (facilitator_id, college_id)
      SELECT $1, unnest($2::uuid[])
    `;
    await client.query(insertQuery, [userId, college_ids]);

    await client.query(
      "UPDATE users SET onboarding_step = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [userId],
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Colleges assigned! Awaiting admin verification.',
      next_step: 'dashboard',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Facilitator Onboarding Error:', err);
    res
      .status(500)
      .json({ message: 'Failed to save colleges', error: err.message });
  } finally {
    client.release();
  }
};
