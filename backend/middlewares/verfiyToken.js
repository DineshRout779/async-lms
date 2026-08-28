const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
  try {
    // 1. Get the token from the Authorization header (Format: Bearer <token>)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ message: 'Access Denied: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Quick DB check to revoke access immediately if user is soft-deleted or token version changed
    const pool = require('../config/pg');
    const dbCheck = await pool.query('SELECT deleted_at, token_version FROM users WHERE id = $1', [verified.id]);
    if (dbCheck.rowCount === 0 || dbCheck.rows[0].deleted_at !== null) {
      return res.status(401).json({ message: 'Access Denied: Account is disabled, deleted, or not found' });
    }

    // Invalidate session if password was reset and token version has changed
    const userDb = dbCheck.rows[0];
    if (verified.token_version !== undefined && userDb.token_version !== verified.token_version) {
      return res.status(401).json({ message: 'Access Denied: Session expired due to password change' });
    }

    // 4. Attach the user payload to the request object
    req.user = verified;

    const { markUserActive } = require('../services/presenceService');
    markUserActive(req.user.id);

    // 4. Move to the next middleware or controller
    next();
  } catch (error) {
    console.log('Error: ', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
