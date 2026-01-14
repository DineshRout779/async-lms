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

    // 3. Attach the user payload to the request object
    req.user = verified;

    console.log('Logged in user role:', req.user.role);

    // 4. Move to the next middleware or controller
    next();
  } catch (error) {
    console.log('Error: ', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
