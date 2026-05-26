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
  const { degree, current_academic_year, expected_graduation_year } = req.body;

  if (!degree || !current_academic_year || !expected_graduation_year) {
    return res.status(400).json({ message: 'degree, current_academic_year, and expected_graduation_year are required' });
  }

  try {
    await pool.query(
      `UPDATE student_profiles 
             SET degree = $1, current_academic_year = $2, expected_graduation_year = $3 
             WHERE user_id = $4`,
      [degree, current_academic_year, expected_graduation_year, userId],
    );

    await pool.query(
      `UPDATE users
             SET onboarding_step = 'program', updated_at = CURRENT_TIMESTAMP
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
    //  - Unit 1 subtopics are always unlocked
    //  - Other subtopics inherit admin-applied lock decisions from cohort_admin_locks
    //    (not peer progression state, which would lock content that peers haven't reached yet)
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
      admin_locks AS (
        SELECT cal.subtopic_id, cal.is_locked
        FROM cohort_admin_locks cal
        CROSS JOIN new_student_profile nsp
        WHERE cal.college_id = nsp.college_id
          AND cal.year = nsp.year
      )
      INSERT INTO user_subtopic_progress (user_id, subtopic_id, is_unlocked)
      SELECT $1, ss.subtopic_id,
        CASE
          WHEN ss.unit_rn = 1       THEN true   -- first unit: always open
          WHEN al.is_locked = false THEN true    -- admin explicitly unlocked
          ELSE false                             -- default locked; progression unlocks
        END
      FROM subject_subtopics ss
      LEFT JOIN admin_locks al ON al.subtopic_id = ss.subtopic_id
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
