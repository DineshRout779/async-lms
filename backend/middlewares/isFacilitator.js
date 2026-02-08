const isFacilitator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user found' });
  }

  if (req.user.role !== 'facilitator' && req.user.role !== 'admin') {
    return res
      .status(403)
      .json({ message: 'Access denied: Facilitators only' });
  }

  next();
};

module.exports = isFacilitator;
