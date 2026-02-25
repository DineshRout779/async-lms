const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/pg');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT_ID);

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
 * GOOGLE OAUTH — verify Google ID token, upsert user, return our JWT
 */
exports.googleAuth = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential required' });
  }

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_AUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google account has no email' });
    }

    // Check if user exists by email
    const existingRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.onboarding_step, u.is_verified, u.google_id,
              sp.college_id, sp.degree, sp.year
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       WHERE u.email = $1`,
      [email],
    );

    let user;

    if (existingRes.rowCount) {
      user = existingRes.rows[0];
      // Link google_id if not already set
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [
          googleId,
          user.id,
        ]);
      }
    } else {
      // Create new student account
      const insertRes = await pool.query(
        `INSERT INTO users (full_name, email, google_id, role, onboarding_step, is_verified)
         VALUES ($1, $2, $3, 'student', 'college', true)
         RETURNING id, full_name, email, role, onboarding_step, is_verified`,
        [name, email, googleId],
      );
      user = insertRes.rows[0];

      // Create student profile
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [
        user.id,
      ]);
    }

    // Build token payload (same shape as regular login)
    const tokenPayload = {
      id: user.id,
      role: user.role,
      college_id: user.role === 'student' ? user.college_id : undefined,
    };

    if (user.role === 'facilitator') {
      const colRes = await pool.query(
        'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
        [user.id],
      );
      tokenPayload.college_ids = colRes.rows.map((r) => r.college_id);
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        onboarding_step: user.onboarding_step,
        is_verified: user.is_verified,
        college_id: user.college_id ?? null,
        college_ids: tokenPayload.college_ids ?? [],
        degree: user.degree ?? null,
        year: user.year ?? null,
      },
    });
  } catch (err) {
    console.error('GOOGLE AUTH ERROR:', err);
    res.status(401).json({ message: 'Invalid Google credential' });
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
