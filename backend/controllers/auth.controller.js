const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/pg');
const { OAuth2Client } = require('google-auth-library');
const { logAction } = require('../utils/auditLogger');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_AUTH_CLIENT_ID,
  process.env.GOOGLE_AUTH_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL,
);

/**
 * Generates a random 6-digit numeric OTP and its SHA-256 hash.
 */
function generateOtp() {
  const otpVal = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = crypto.createHash('sha256').update(otpVal).digest('hex');
  return { otp: otpVal, hash };
}

/**
 * SIGNUP (STUDENT & FACILITATOR)
 */
exports.signup = async (req, res) => {
  const logID = Date.now();
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // 1. Check if user exists (only active accounts block new registration)
    const exists = await pool.query('SELECT id, is_email_verified FROM users WHERE email = $1 AND deleted_at IS NULL', [
      email,
    ]);

    if (exists.rowCount) {
      const existingUser = exists.rows[0];
      if (existingUser.is_email_verified) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // User registered but hasn't verified email yet. Send a new OTP and redirect them to verify!
      const { otp, hash } = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60000);

      await pool.query(
        `DELETE FROM otp_codes WHERE email = $1 AND purpose = 'signup_verification'`,
        [email]
      );

      await pool.query(
        `INSERT INTO otp_codes (email, otp_hash, purpose, expires_at)
         VALUES ($1, $2, 'signup_verification', $3)`,
        [email, hash, expiresAt]
      );

      await sendMail({
        to: email,
        subject: 'Verify your CodeGuru Account',
        text: `Your CodeGuru email verification code is: ${otp}. It expires in 15 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Verify your CodeGuru Account</h2>
            <p>Please use the following verification code to complete your registration:</p>
            <div style="font-size: 24px; font-weight: bold; padding: 15px; background-color: #f3f4f6; border-radius: 8px; display: inline-block; letter-spacing: 2px; color: #4f46e5; margin: 10px 0;">
              ${otp}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code is valid for 15 minutes.</p>
          </div>
        `
      });

      return res.json({
        success: true,
        email,
        message: 'A new verification code has been sent to your email.'
      });
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

    // 4. Insert User (Identity) with is_email_verified = false
    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, role_id, onboarding_step, is_verified, is_email_verified)
      VALUES ($1, $2, $3, $4, 'college', false, false)
      RETURNING id, full_name, email, onboarding_step, is_verified, is_email_verified
      `,
      [
        full_name,
        email,
        passwordHash,
        role_id,
      ],
    );

    const newUser = { ...result.rows[0], role: resolvedRole };

    // 5. If student, create initial profile
    if (newUser.role === 'student') {
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [
        newUser.id,
      ]);
    }

    logAction({ req, action: 'CREATE', entityType: 'user', entityId: newUser.id, details: { email, role: newUser.role } });

    // 6. Generate and send signup verification OTP
    const { otp, hash } = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes from now

    // Invalidate any older signup OTPs for this email
    await pool.query(
      `DELETE FROM otp_codes WHERE email = $1 AND purpose = 'signup_verification'`,
      [email]
    );

    // Store OTP hash
    await pool.query(
      `INSERT INTO otp_codes (email, otp_hash, purpose, expires_at)
       VALUES ($1, $2, 'signup_verification', $3)`,
      [email, hash, expiresAt]
    );

    // Send verification email
    await sendMail({
      to: email,
      subject: 'Verify your CodeGuru Account',
      text: `Your CodeGuru email verification code is: ${otp}. It expires in 15 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Welcome to CodeGuru!</h2>
          <p>Please use the following verification code to complete your registration:</p>
          <div style="font-size: 24px; font-weight: bold; padding: 15px; background-color: #f3f4f6; border-radius: 8px; display: inline-block; letter-spacing: 2px; color: #4f46e5; margin: 10px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code is valid for 15 minutes. If you did not sign up for this account, please ignore this email.</p>
        </div>
      `
    });

    res.json({
      success: true,
      email: newUser.email,
      message: 'Signup successful. A verification code has been sent to your email.'
    });

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
              u.is_email_verified, u.token_version,
              sp.college_id, sp.degree, sp.year,
              c.is_verified AS college_is_verified
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN colleges c ON c.id = sp.college_id
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email],
    );

    if (!userRes.rowCount) {
      console.log(`[LOGIN FAILED] User not found or deleted for email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password, or account is disabled' });
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

    // Enforce email verification check
    if (!user.is_email_verified) {
      return res.status(400).json({
        message: 'Please verify your email address before logging in.',
        needsVerification: true,
        email: user.email
      });
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
        token_version: user.token_version,
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
        is_email_verified: user.is_email_verified,
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
    const { sub: googleId, email, name, email_verified } = payload;

    if (!email || !email_verified) {
      return res.redirect(`${frontendUrl}/login?error=email_not_verified`);
    }

    // Upsert user
    const existingRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, LOWER(r.role_key) AS role, u.onboarding_step, u.is_verified, u.google_id, u.token_version,
              sp.college_id, sp.degree, sp.year,
              c.is_verified AS college_is_verified
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN colleges c ON c.id = sp.college_id
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
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
      // New Google sign-in with no existing account: don't guess a role.
      // Send the user to a role-selection screen with a short-lived signed
      // token carrying their verified Google identity; the account is only
      // created once they pick student/facilitator in completeGoogleSignup.
      const roleSelectToken = jwt.sign(
        { purpose: 'google_role_select', googleId, email, name },
        process.env.JWT_SECRET,
        { expiresIn: '10m' },
      );
      return res.redirect(
        `${frontendUrl}/auth/select-role?token=${roleSelectToken}`,
      );
    }

    const tokenPayload = {
      id: user.id,
      role: user.role,
      token_version: user.token_version,
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
 * GOOGLE OAUTH STEP 3 — new user picked a role on /auth/select-role; create the account
 */
exports.completeGoogleSignup = async (req, res) => {
  const { token, role } = req.body;

  if (!token || !['student', 'facilitator'].includes(role)) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  let selection;
  try {
    selection = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ message: 'This sign-in link has expired. Please try again.' });
  }
  if (selection.purpose !== 'google_role_select') {
    return res.status(400).json({ message: 'Invalid request' });
  }
  const { googleId, email, name } = selection;

  try {
    // Someone may have signed up (password or another Google attempt) with this
    // email while the role-selection screen was open — don't create a duplicate.
    const exists = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (exists.rowCount) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const roleRes = await pool.query(
      'SELECT id FROM roles WHERE role_key = $1',
      [role.toUpperCase()],
    );
    if (!roleRes.rowCount) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const insertRes = await pool.query(
      `INSERT INTO users (full_name, email, google_id, role_id, onboarding_step, is_verified, is_email_verified)
       VALUES ($1, $2, $3, $4, 'college', false, true)
       RETURNING id, full_name, email, onboarding_step, is_verified, token_version`,
      [name, email, googleId, roleRes.rows[0].id],
    );
    const user = { ...insertRes.rows[0], role };

    if (role === 'student') {
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [user.id]);
    }
    logAction({ req, action: 'CREATE', entityType: 'user', entityId: user.id, details: { email, role } });

    const tokenPayload = {
      id: user.id,
      role: user.role,
      token_version: user.token_version,
      college_id: undefined,
      college_ids: role === 'facilitator' ? [] : undefined,
    };
    const jwtToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token: jwtToken, user });
  } catch (err) {
    console.error('COMPLETE GOOGLE SIGNUP ERROR:', err);
    res.status(500).json({ message: 'Something went wrong' });
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

/**
 * VERIFY EMAIL (OTP Validation after Signup)
 */
exports.verifyEmail = async (req, res) => {
  const { email, otp_code } = req.body;
  if (!email || !otp_code) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }

  try {
    const purpose = 'signup_verification';
    const submittedHash = crypto.createHash('sha256').update(otp_code).digest('hex');

    // Retrieve active OTPs
    const otpRes = await pool.query(
      `SELECT id, otp_hash, attempts, expires_at FROM otp_codes 
       WHERE email = $1 AND purpose = $2 AND expires_at > NOW()`,
      [email, purpose]
    );

    if (otpRes.rowCount === 0) {
      return res.status(400).json({ message: 'Verification code is invalid or has expired.' });
    }

    const otpRecord = otpRes.rows[0];

    // Verify hash match
    if (otpRecord.otp_hash !== submittedHash) {
      const newAttempts = otpRecord.attempts + 1;
      if (newAttempts >= 5) {
        await pool.query('DELETE FROM otp_codes WHERE id = $1', [otpRecord.id]);
        return res.status(400).json({ message: 'Too many incorrect attempts. This verification code is now invalid. Please request a new code.' });
      } else {
        await pool.query('UPDATE otp_codes SET attempts = $1 WHERE id = $2', [newAttempts, otpRecord.id]);
        return res.status(400).json({ message: `Incorrect verification code. Attempts remaining: ${5 - newAttempts}` });
      }
    }

    // Email is verified! Update users table
    await pool.query('UPDATE users SET is_email_verified = true WHERE email = $1 AND deleted_at IS NULL', [email]);
    await pool.query('DELETE FROM otp_codes WHERE email = $1 AND purpose = $2', [email, purpose]);

    // Fetch user details to generate JWT
    const userRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, LOWER(r.role_key) AS role, u.onboarding_step, u.is_verified, u.is_email_verified, u.token_version,
              sp.college_id, sp.degree, sp.year,
              c.is_verified AS college_is_verified
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN colleges c ON c.id = sp.college_id
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email]
    );

    const user = userRes.rows[0];

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
        id: user.id,
        role: user.role,
        token_version: user.token_version,
        college_id: user.role === 'student' ? user.college_id : undefined,
        college_ids: user.role === 'facilitator' ? collegeIds : undefined,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        onboarding_step: user.onboarding_step,
        is_verified: user.is_verified,
        is_email_verified: user.is_email_verified,
        college_id: user.college_id,
        college_ids: collegeIds,
        college_is_verified: user.college_is_verified,
        degree: user.degree,
        year: user.year,
      }
    });

  } catch (error) {
    console.error('Verify Email Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * FORGOT PASSWORD (Generate OTP)
 */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // Define generic message response to avoid user enumeration
  const genericResponse = {
    success: true,
    message: 'If an account exists for this email, a verification code has been sent.'
  };

  try {
    const purpose = 'password_reset';

    // Check if active user exists
    const userRes = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (userRes.rowCount === 0) {
      // User not found: fail silently to prevent account discovery
      return res.json(genericResponse);
    }

    // Check 60 seconds cooldown limit
    const cooldownCheck = await pool.query(
      `SELECT created_at FROM otp_codes 
       WHERE email = $1 AND purpose = $2 AND created_at > NOW() - INTERVAL '60 seconds' 
       LIMIT 1`,
      [email, purpose]
    );
    if (cooldownCheck.rowCount > 0) {
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting another code.' });
    }

    // Check 5 requests per hour rate-limit
    const hourlyCheck = await pool.query(
      `SELECT COUNT(*)::int as count FROM otp_codes 
       WHERE email = $1 AND purpose = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
      [email, purpose]
    );
    if (hourlyCheck.rows[0].count >= 5) {
      return res.status(429).json({ message: 'Maximum verification requests exceeded. Please try again in an hour.' });
    }

    // Invalidate existing active OTPs for password reset
    await pool.query(
      `DELETE FROM otp_codes WHERE email = $1 AND purpose = $2`,
      [email, purpose]
    );

    // Generate new OTP
    const { otp, hash } = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes

    await pool.query(
      `INSERT INTO otp_codes (email, otp_hash, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, hash, purpose, expiresAt]
    );

    // Dispatch email
    await sendMail({
      to: email,
      subject: 'Reset your CodeGuru Password',
      text: `Your CodeGuru password reset code is: ${otp}. It is valid for 15 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>CodeGuru Password Reset</h2>
          <p>We received a request to reset your password. Use the verification code below to proceed:</p>
          <div style="font-size: 24px; font-weight: bold; padding: 15px; background-color: #f3f4f6; border-radius: 8px; display: inline-block; letter-spacing: 2px; color: #4f46e5; margin: 10px 0;">
            ${otp}
          </div>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 14px;">This code is valid for 15 minutes.</p>
        </div>
      `
    });

    return res.json(genericResponse);

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * VERIFY RESET OTP (Validates OTP and issues a short-lived reset token)
 */
exports.verifyResetOtp = async (req, res) => {
  const { email, otp_code } = req.body;
  if (!email || !otp_code) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }

  try {
    const purpose = 'password_reset';
    const submittedHash = crypto.createHash('sha256').update(otp_code).digest('hex');

    const otpRes = await pool.query(
      `SELECT id, otp_hash, attempts, expires_at FROM otp_codes 
       WHERE email = $1 AND purpose = $2 AND expires_at > NOW()`,
      [email, purpose]
    );

    if (otpRes.rowCount === 0) {
      return res.status(400).json({ message: 'Verification code is invalid or has expired.' });
    }

    const otpRecord = otpRes.rows[0];

    // Verify hash match
    if (otpRecord.otp_hash !== submittedHash) {
      const newAttempts = otpRecord.attempts + 1;
      if (newAttempts >= 5) {
        await pool.query('DELETE FROM otp_codes WHERE id = $1', [otpRecord.id]);
        return res.status(400).json({ message: 'Too many incorrect attempts. This code is now invalid. Please request a new one.' });
      } else {
        await pool.query('UPDATE otp_codes SET attempts = $1 WHERE id = $2', [newAttempts, otpRecord.id]);
        return res.status(400).json({ message: `Incorrect verification code. Attempts remaining: ${5 - newAttempts}` });
      }
    }

    // OTP is valid! Delete it and generate a short-lived reset token
    await pool.query('DELETE FROM otp_codes WHERE id = $1', [otpRecord.id]);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenExpiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes validity

    // Invalidate existing reset tokens
    await pool.query(
      `DELETE FROM otp_codes WHERE email = $1 AND purpose = 'password_reset_token'`,
      [email]
    );

    // Save token hash
    await pool.query(
      `INSERT INTO otp_codes (email, otp_hash, purpose, expires_at)
       VALUES ($1, $2, 'password_reset_token', $3)`,
      [email, tokenHash, tokenExpiresAt]
    );

    res.json({
      success: true,
      resetToken
    });

  } catch (error) {
    console.error('Verify Reset OTP Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * RESET PASSWORD (Applies new password using resetToken)
 */
exports.resetPassword = async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ message: 'Email, reset token, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    const purpose = 'password_reset_token';
    const submittedHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Retrieve active reset tokens
    const tokenRes = await pool.query(
      `SELECT id FROM otp_codes 
       WHERE email = $1 AND otp_hash = $2 AND purpose = $3 AND expires_at > NOW()`,
      [email, submittedHash, purpose]
    );

    if (tokenRes.rowCount === 0) {
      return res.status(400).json({ message: 'Reset token is invalid or has expired. Please restart the forgot password process.' });
    }

    // Encrypt the new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password & increment token_version to invalidate active sessions
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, token_version = token_version + 1, is_email_verified = true 
       WHERE email = $2 AND deleted_at IS NULL`,
      [hashed, email]
    );

    // Clean up reset token
    await pool.query('DELETE FROM otp_codes WHERE id = $1', [tokenRes.rows[0].id]);

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
