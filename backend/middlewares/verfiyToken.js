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

    // 3. Quick DB check to revoke access immediately if the user is soft-deleted
    const pool = require('../config/pg');
    const dbCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NOT NULL', [verified.id]);
    if (dbCheck.rowCount > 0) {
      return res.status(401).json({ message: 'Access Denied: Account is disabled or deleted' });
    }

    // 4. Attach the user payload to the request object
    req.user = verified;

    const { markUserActive } = require('../services/presenceService');
    markUserActive(req.user.id);

    console.log('Logged in user role:', req.user.role);

    // 4. Move to the next middleware or controller
    next();
  } catch (error) {
    console.log('Error: ', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
