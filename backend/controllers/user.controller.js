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
      SELECT u.id, u.full_name, u.email, u.role, u.degree, u.year, u.created_at,
             c.name as college_name
      FROM public.users u
      LEFT JOIN public.colleges c ON u.college_id = c.id
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
      `SELECT u.*, c.name as college_name 
       FROM public.users u 
       LEFT JOIN public.colleges c ON u.college_id = c.id 
       WHERE u.id = $1`,
      [id]
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

    // Explicitly update updated_at
    const query = `
      UPDATE public.users 
      SET full_name = $1, 
          degree = $2, 
          year = $3, 
          college_id = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 
      RETURNING id, full_name, email, role, updated_at
    `;

    const result = await pool.query(query, [
      full_name,
      degree,
      year,
      college_id, // Ensure frontend sends null or a UUID string
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
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
      [role, id]
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
