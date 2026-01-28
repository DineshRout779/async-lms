const pool = require('../config/pg');

// @desc    Get subjects for a specific student
exports.getUserSubjects = async (req, res) => {
  try {
    const userId = req.user.id; // Now a UUID
    const query = `
        SELECT s.id, s.name, s.slug, s.description, 
               true as "isEnrolled", us.started_at, us.completed_at
        FROM public.subjects s
        INNER JOIN public.user_subjects us ON s.id = us.subject_id
        WHERE us.user_id = $1 AND s.is_published = true
        ORDER BY us.started_at DESC;
      `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Subjects Error:', err.message);
    res.status(500).json({ message: 'Server error' });
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
