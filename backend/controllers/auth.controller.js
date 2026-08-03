const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/pg');
const { OAuth2Client } = require('google-auth-library');

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_AUTH_CLIENT_ID,
  process.env.GOOGLE_AUTH_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL,
);

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

    // 3. Resolve role_id from the roles table
    const roleKey = (role || 'student').toUpperCase();
    const roleRes = await pool.query(
      'SELECT id FROM roles WHERE role_key = $1',
      [roleKey],
    );

    if (!roleRes.rowCount) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const role_id = roleRes.rows[0].id;
    const resolvedRole = roleKey.toLowerCase();

    // 4. Insert User (Identity)
    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, role_id, onboarding_step, is_verified)
      VALUES ($1, $2, $3, $4, 'college', $5)
      RETURNING id, full_name, email, onboarding_step, is_verified
      `,
      [
        full_name,
        email,
        passwordHash,
        role_id,
        false,
      ],
    );

    const newUser = { ...result.rows[0], role: resolvedRole };

    // 5. If student, create initial profile
    if (newUser.role === 'student') {
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [
        newUser.id,
      ]);
    }

    // 6. Generate JWT (id is a UUID string)
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
      `SELECT u.id, u.full_name, u.email, u.password_hash, LOWER(r.role_key) AS role, u.onboarding_step, u.is_verified,
              sp.college_id, sp.degree, sp.year,
              c.is_verified AS college_is_verified
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN colleges c ON c.id = sp.college_id
       WHERE u.email = $1`,
      [email],
    );

    if (!userRes.rowCount) {
      console.log(`[LOGIN FAILED] User not found for email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = userRes.rows[0];

    if (!user.password_hash) {
      console.log(`[LOGIN FAILED] User uses Google Sign-In: ${email}`);
      return res.status(401).json({ message: 'This account uses Google Sign-In. Please click "Continue with Google".' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    console.log(`[LOGIN DEBUG] Password comparison result for ${email}: valid=${valid}`);
    delete user.password_hash;

    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
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
        college_is_verified: user.college_is_verified,
        degree: user.degree,
        year: user.year,
      },
    });
  } catch (error) {
    console.error(`[${logID}] LOGIN ERROR:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GOOGLE OAUTH STEP 1 — redirect browser to Google consent screen
 */
exports.googleRedirect = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
  res.redirect(url);
};

/**
 * GOOGLE OAUTH STEP 2 — exchange code, upsert user, redirect to frontend with JWT
 */
exports.googleCallback = async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_AUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    // Upsert user
    const existingRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, LOWER(r.role_key) AS role, u.onboarding_step, u.is_verified, u.google_id,
              sp.college_id, sp.degree, sp.year,
              c.is_verified AS college_is_verified
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN colleges c ON c.id = sp.college_id
       WHERE u.email = $1`,
      [email],
    );

    let user;

    if (existingRes.rowCount) {
      user = existingRes.rows[0];
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [
          googleId,
          user.id,
        ]);
      }
    } else {
      const studentRoleRes = await pool.query(
        "SELECT id FROM roles WHERE role_key = 'STUDENT'",
      );
      const insertRes = await pool.query(
        `INSERT INTO users (full_name, email, google_id, role_id, onboarding_step, is_verified)
         VALUES ($1, $2, $3, $4, 'college', false)
         RETURNING id, full_name, email, onboarding_step, is_verified`,
        [name, email, googleId, studentRoleRes.rows[0].id],
      );
      user = insertRes.rows[0];
      user.role = 'student';
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [
        user.id,
      ]);
    }

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

    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('GOOGLE CALLBACK ERROR:', err);
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};

/**
 * GET CURRENT USER (Profile Check)
 */
exports.getMe = async (req, res) => {
  const userID = req.user?.id; // Extracted from JWT by middleware

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, LOWER(r.role_key) AS role, u.onboarding_step, u.is_verified,
              sp.college_id, sp.degree, sp.year,
              c.is_verified AS college_is_verified,
              c.name AS college_name,
              COALESCE(us.current_streak, 0) AS current_streak,
              COALESCE(SUM(pl.points), 0)::integer AS total_points
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN colleges c ON c.id = sp.college_id
       LEFT JOIN user_streaks us ON us.user_id = u.id
       LEFT JOIN points_log pl ON pl.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.full_name, u.email, r.role_key, u.onboarding_step, u.is_verified,
                sp.college_id, sp.degree, sp.year, c.is_verified, c.name, us.current_streak`,
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
