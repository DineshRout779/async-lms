const {
  getAdminStats,
  getAllStudents,
  getProjectSubmissions,
} = require('../controllers/admin.controller');
const isAdmin = require('../middlewares/isAdmin');
const verifyToken = require('../middlewares/verfiyToken');
const router = require('express').Router();

// GET admin dashboard stats
router.get('/stats', verifyToken, isAdmin, getAdminStats);
router.get('/all-students', verifyToken, isAdmin, getAllStudents);
router.get('/project-submissions', verifyToken, isAdmin, getProjectSubmissions);

module.exports = router;
