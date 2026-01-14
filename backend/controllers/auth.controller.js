const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/pg');

/**
 * ---------------------------------------
 * SIGNUP (STUDENT ONLY)
 * ---------------------------------------
 */
exports.signup = async (req, res) => {
  const logID = Date.now();
  const { full_name, email, password } = req.body;

  console.log(`[${logID}] Signup started for ${email}`);

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // 🔧 MODIFIED QUERY (explicit + future-safe)
    const exists = await pool.query(
      `
      SELECT id, role
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (exists.rowCount) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, role, onboarding_step)
      VALUES ($1, $2, $3, 'student', 'college')
      RETURNING id, full_name, email, role, onboarding_step
      `,
      [full_name, email, passwordHash]
    );

    const token = jwt.sign(
      {
        id: result.rows[0].id,
        role: 'student',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[${logID}] Signup successful`);

    res.json({
      token,
      user: result.rows[0],
    });
  } catch (err) {
    console.error(`[${logID}] ERROR`, err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ---------------------------------------
 * LOGIN (ROLE + SCOPE READY)
 * ---------------------------------------
 */
exports.login = async (req, res) => {
  const logID = Date.now();
  const { email, password } = req.body;

  console.log(`[${logID}] Login attempt for ${email}`);

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const userRes = await pool.query(
      `
      SELECT id,
             full_name,
             email,
             password_hash,
             role,
             onboarding_step,
             college_id
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (!userRes.rowCount) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userRes.rows[0];
    console.log(`Found user with email: ${user.email} and role: ${user.role}`);
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Fetch facilitator college scope (if applicable)
    let collegeIds = [];

    if (user.role === 'facilitator') {
      const colRes = await pool.query(
        `
        SELECT college_id
        FROM facilitator_colleges
        WHERE facilitator_id = $1
        `,
        [user.id]
      );
      collegeIds = colRes.rows.map((r) => r.college_id);
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        college_id: user.role === 'student' ? user.college_id : undefined,
        college_ids: user.role === 'facilitator' ? collegeIds : undefined,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[${logID}] Login successful for user ${user.id}`);

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        onboarding_step: user.onboarding_step,
        college_id: user.college_id,
        college_ids: collegeIds,
      },
    });
  } catch (error) {
    console.error(`[${logID}] ERROR`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ---------------------------------------
 * GET CURRENT USER
 * ---------------------------------------
 */
exports.getMe = async (req, res) => {
  const logID = Date.now();
  const userID = req.user?.id;

  console.log(`[${logID}] Fetching profile for user ${userID}`);

  try {
    const userRes = await pool.query(
      `
      SELECT id,
             full_name,
             email,
             role,
             onboarding_step,
             college_id
      FROM users
      WHERE id = $1
      `,
      [userID]
    );

    if (!userRes.rowCount) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];
    let collegeIds = [];

    if (user.role === 'facilitator') {
      const colRes = await pool.query(
        `
        SELECT college_id
        FROM facilitator_colleges
        WHERE facilitator_id = $1
        `,
        [userID]
      );
      collegeIds = colRes.rows.map((r) => r.college_id);
    }

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      onboarding_step: user.onboarding_step,
      college_id: user.college_id,
      college_ids: collegeIds,
    });
  } catch (error) {
    console.error(`[${logID}] ERROR`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
