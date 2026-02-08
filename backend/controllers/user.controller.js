const pool = require('../config/pg');

// @desc    Get subjects for a specific student
exports.getUserSubjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        s.id, 
        s.name, 
        s.slug, 
        s.description, 
        s.level, -- Requires the ALTER TABLE above
        -- Count total subtopics for this subject
        (SELECT COUNT(st.id) 
         FROM public.subtopics st 
         JOIN public.topics t ON st.topic_id = t.id 
         WHERE t.subject_id = s.id) as total_lessons,
        -- Calculate progress using user_subtopic_progress table 
        COALESCE(
          (SELECT (COUNT(usp.id)::float / NULLIF((
            SELECT COUNT(st2.id) 
            FROM public.subtopics st2 
            JOIN public.topics t2 ON st2.topic_id = t2.id 
            WHERE t2.subject_id = s.id
          ), 0) * 100)
           FROM public.user_subtopic_progress usp
           JOIN public.subtopics st3 ON usp.subtopic_id = st3.id
           JOIN public.topics t3 ON st3.topic_id = t3.id
           WHERE usp.user_id = $1 
             AND t3.subject_id = s.id 
             AND usp.is_completed = true -- Using the boolean from your schema 
          ), 0
        ) as progress_percent
      FROM public.subjects s
      INNER JOIN public.user_subjects us ON s.id = us.subject_id 
      WHERE us.user_id = $1 AND s.is_published = true 
      ORDER BY us.started_at DESC;
    `;

    const { rows } = await pool.query(query, [userId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching student subjects:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all users (Admin only) - Enhanced with College Name
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_verified,
        sp.degree,
        sp.year,
        sp.college_id,
        u.created_at,
        c.name as college_name,
        c.short_code as college_short_name,
        COALESCE(student_meta.enrolled_courses, 0) as enrolled_courses,
        COALESCE(student_meta.completed_subtopics, 0) as completed_subtopics,
        COALESCE(student_meta.total_subtopics, 0) as total_subtopics,
        CASE
          WHEN COALESCE(student_meta.total_subtopics, 0) = 0 THEN 0
          ELSE ROUND(
            (student_meta.completed_subtopics::numeric / student_meta.total_subtopics) * 100
          )::int
        END as progress_percent,
        COALESCE(facilitator_meta.college_ids, '{}'::uuid[]) as facilitator_college_ids,
        COALESCE(facilitator_meta.college_names, '{}'::text[]) as facilitator_college_names
      FROM public.users u
      LEFT JOIN public.student_profiles sp ON u.id = sp.user_id
      LEFT JOIN public.colleges c ON sp.college_id = c.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT us.subject_id)::int as enrolled_courses,
          COUNT(DISTINCT st.id) FILTER (WHERE usp.is_completed = true)::int as completed_subtopics,
          COUNT(DISTINCT st.id)::int as total_subtopics
        FROM public.user_subjects us
        LEFT JOIN public.topics t ON t.subject_id = us.subject_id
        LEFT JOIN public.subtopics st ON st.topic_id = t.id
        LEFT JOIN public.user_subtopic_progress usp
          ON usp.user_id = u.id
          AND usp.subtopic_id = st.id
        WHERE us.user_id = u.id
      ) as student_meta ON u.role = 'student'
      LEFT JOIN LATERAL (
        SELECT
          ARRAY_AGG(fc.college_id ORDER BY c2.name) as college_ids,
          ARRAY_AGG(c2.name ORDER BY c2.name) as college_names
        FROM public.facilitator_colleges fc
        INNER JOIN public.colleges c2 ON c2.id = fc.college_id
        WHERE fc.facilitator_id = u.id
      ) as facilitator_meta ON u.role = 'facilitator'
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Get All Users Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single user by ID (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params; // Must be a valid UUID string
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.is_verified, u.onboarding_step, u.created_at,
              sp.college_id, sp.degree, sp.year,
              c.name as college_name 
       FROM public.users u 
       LEFT JOIN public.student_profiles sp ON u.id = sp.user_id
       LEFT JOIN public.colleges c ON sp.college_id = c.id 
       WHERE u.id = $1`,
      [id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get User Error:', err.message);
    res
      .status(500)
      .json({ message: 'Server error (check if ID is valid UUID)' });
  }
};

// @desc    Update user profile details (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, degree, year, college_id } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update User (Identity)
      const userUpdateQuery = `
        UPDATE public.users 
        SET full_name = $1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 
        RETURNING id, full_name, email, role, updated_at
      `;
      const userResult = await client.query(userUpdateQuery, [full_name, id]);

      if (userResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];

      // 2. Update Student Profile if applicable
      if (user.role === 'student') {
        const profileUpdateQuery = `
          INSERT INTO public.student_profiles (user_id, degree, year, college_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id) DO UPDATE 
          SET degree = EXCLUDED.degree, 
              year = EXCLUDED.year, 
              college_id = EXCLUDED.college_id
        `;
        await client.query(profileUpdateQuery, [
          id,
          degree || null,
          year || null,
          college_id || null,
        ]);
      }

      await client.query('COMMIT');
      res.json(user);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update User Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change user role (Admin only)
exports.changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const result = await pool.query(
      `UPDATE public.users 
       SET role = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, role, updated_at`,
      [role, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Role updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Change Role Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
