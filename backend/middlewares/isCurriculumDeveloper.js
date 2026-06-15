const isCurriculumDeveloper = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user found' });
  }

  if (req.user.role !== 'curriculum_developer' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Curriculum Developers only' });
  }

  next();
};

module.exports = isCurriculumDeveloper;
