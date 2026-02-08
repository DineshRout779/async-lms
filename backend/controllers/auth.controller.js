const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/pg');

/**
 * SIGNUP (STUDENT ONLY)
 */
exports.signup = async (req, res) => {
  const logID = Date.now();
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // 1. Check if user exists
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);

    if (exists.rowCount) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 2. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Insert User (Identity)
    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, role, onboarding_step, is_verified)
      VALUES ($1, $2, $3, $4, 'college', $5)
      RETURNING id, full_name, email, role, onboarding_step, is_verified
      `,
      [
        full_name,
        email,
        passwordHash,
        role || 'student',
        role === 'student' ? true : false,
      ],
    );

    const newUser = result.rows[0];

    // 4. If student, create initial profile
    if (newUser.role === 'student') {
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [
        newUser.id,
      ]);
    }

    // 4. Generate JWT (id is a UUID string)
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({ token, user: newUser });
  } catch (err) {
    console.error(`[${logID}] SIGNUP ERROR:`, err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * LOGIN
 */
exports.login = async (req, res) => {
  const logID = Date.now();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.onboarding_step, u.is_verified,
              sp.college_id, sp.degree, sp.year
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       WHERE u.email = $1`,
      [email],
    );

    if (!userRes.rowCount) {
      return res.status(401).json({ message: 'User doesnt exists' });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Fetch facilitator college scope if applicable
    let collegeIds = [];
    if (user.role === 'facilitator') {
      const colRes = await pool.query(
        'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
        [user.id],
      );
      collegeIds = colRes.rows.map((r) => r.college_id);
    }

    const token = jwt.sign(
      {
        id: user.id, // UUID string
        role: user.role,
        college_id: user.role === 'student' ? user.college_id : undefined,
        college_ids: user.role === 'facilitator' ? collegeIds : undefined,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        onboarding_step: user.onboarding_step,
        is_verified: user.is_verified,
        college_id: user.college_id,
        college_ids: collegeIds,
        degree: user.degree,
        year: user.year,
      },
    });
  } catch (error) {
    console.error(`[${logID}] LOGIN ERROR:`, error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

/**
 * GET CURRENT USER (Profile Check)
 */
exports.getMe = async (req, res) => {
  const userID = req.user?.id; // Extracted from JWT by middleware

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.onboarding_step, u.is_verified,
              sp.college_id, sp.degree, sp.year
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       WHERE u.id = $1`,
      [userID],
    );

    if (!userRes.rowCount) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];
    let collegeIds = [];

    if (user.role === 'facilitator') {
      const colRes = await pool.query(
        'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
        [userID],
      );
      collegeIds = colRes.rows.map((r) => r.college_id);
    }

    res.json({ ...user, college_ids: collegeIds });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
