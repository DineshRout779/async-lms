const isAdminOrFacilitator = (req, res, next) => {
  // verifyToken must be called before this to populate req.user
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user found' });
  }

  // Check if the role is 'admin' (adjust 'admin' string to match your DB value)
  if (req.user.role !== 'admin' && req.user.role !== 'facilitator') {
    return res
      .status(403)
      .json({ message: 'Access denied: Admins and Facilitators only' });
  }

  next();
};

module.exports = isAdminOrFacilitator;
