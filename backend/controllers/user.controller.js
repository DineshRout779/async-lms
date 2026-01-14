const pool = require('../config/pg');

// @desc    Get subjects for a specific student
exports.getUserSubjects = async (req, res) => {
  try {
    const userId = req.user.id;
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
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT id, full_name, email, role, degree, college_id, year, created_at 
      FROM public.users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single user by ID (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM public.users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile details (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, degree, year, college_id } = req.body;
    const query = `
      UPDATE public.users 
      SET full_name = $1, degree = $2, year = $3, college_id = $4 
      WHERE id = $5 RETURNING *
    `;
    const result = await pool.query(query, [
      full_name,
      degree,
      year,
      college_id,
      id,
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change user role (Admin only)
exports.changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const result = await pool.query(
      'UPDATE public.users SET role = $1 WHERE id = $2 RETURNING id, role',
      [role, id]
    );
    res.json({ message: 'Role updated', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
