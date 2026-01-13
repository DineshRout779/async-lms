const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/pg');
const { validationResult } = require('express-validator');

exports.signup = async (req, res) => {
  const logID = Date.now();
  const { full_name, email, password, college_id, degree, year } = req.body;

  console.log(`[${logID}] INFO: Starting signup process for email: ${email}`);

  try {
    // Check if college exists
    const college = await pool.query('SELECT id FROM colleges WHERE id = $1', [
      college_id,
    ]);
    if (!college.rowCount) {
      console.warn(
        `[${logID}] WARN: Signup failed - College ID ${college_id} not found`
      );
      return res.status(400).json({ message: 'Invalid college' });
    }

    // Hash Password
    console.log(`[${logID}] DEBUG: Hashing password...`);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert User
    const result = await pool.query(
      `INSERT INTO users
       (full_name, email, password_hash, role, college_id, degree, year)
       VALUES ($1,$2,$3,'student',$4,$5,$6)
       RETURNING id, full_name, email, role, college_id`,
      [full_name, email, hashedPassword, college_id, degree, year]
    );
    console.log(
      `[${logID}] INFO: User created successfully in DB with ID: ${result.rows[0].id}`
    );

    // Generate Token
    const token = jwt.sign(
      { id: result.rows[0].id, role: result.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[${logID}] INFO: Signup completed, token generated.`);
    res.json({ token, user: result.rows[0] });
  } catch (error) {
    console.error(`[${logID}] ERROR: Signup process crashed =>`, error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  const logID = Date.now();
  const { email, password } = req.body;

  console.log(`[${logID}] INFO: Login attempt for email: ${email}`);

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);

    if (!user.rowCount) {
      console.warn(`[${logID}] WARN: Login failed - User not found: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) {
      console.warn(
        `[${logID}] WARN: Login failed - Incorrect password for: ${email}`
      );
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(
      `[${logID}] INFO: Login successful for user: ${user.rows[0].id}`
    );
    res.json({
      token,
      user: {
        id: user.rows[0].id,
        full_name: user.rows[0].full_name,
        role: user.rows[0].role,
      },
    });
  } catch (error) {
    console.error(`[${logID}] ERROR: Login process crashed =>`, error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMe = async (req, res) => {
  const logID = Date.now();
  const userID = req.user?.id;

  console.log(`[${logID}] INFO: Fetching profile for User ID: ${userID}`);

  try {
    const user = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role,
              c.id AS college_id, c.name AS college_name
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.id = $1`,
      [userID]
    );

    if (!user.rowCount) {
      console.warn(
        `[${logID}] WARN: getMe failed - User ${userID} not found in DB`
      );
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(
      `[${logID}] INFO: Profile data retrieved for: ${user.rows[0].email}`
    );
    res.json({
      id: user.rows[0].id,
      full_name: user.rows[0].full_name,
      email: user.rows[0].email,
      role: user.rows[0].role,
      college: {
        id: user.rows[0].college_id,
        name: user.rows[0].college_name,
      },
    });
  } catch (error) {
    console.error(`[${logID}] ERROR: getMe failed =>`, error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
