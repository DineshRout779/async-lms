const isStudent = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        message: 'User is not stduent',
      });
    }
    next();
  } catch (error) {
    console.log('Error: ', error);

    res
      .status(403)
      .json({ message: 'User is not stduent', error: error.message });
  }
};

module.exports = isStudent;
