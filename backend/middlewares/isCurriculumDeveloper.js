const isCurriculumDeveloper = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user found' });
  }

  if (!['curriculum_developer', 'admin', 'facilitator'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Curriculum Developers only' });
  }

  next();
};

module.exports = isCurriculumDeveloper;
