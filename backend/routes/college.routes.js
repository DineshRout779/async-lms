const {
  getAllColleges,
  createCollege,
  updateCollege,
  deleteCollege,
  assignFacilitator,
  getCollegesBySubject,
  toggleSubjectAccess,
} = require('../controllers/college.controller');

const isAdmin = require('../middlewares/isAdmin');
const isAdminOrFacilitator = require('../middlewares/isAdminOrFacilitator');
const verifyToken = require('../middlewares/verfiyToken');
const router = require('express').Router();

// General CRUD
router.get('/', verifyToken, getAllColleges);
router.post('/', verifyToken, isAdmin, createCollege);
router.put('/:id', verifyToken, isAdmin, updateCollege);
router.delete('/:id', verifyToken, isAdmin, deleteCollege);

// Assignment Logic
router.get(
  '/assignment/:subjectId',
  verifyToken,
  isAdmin,
  getCollegesBySubject,
);
router.post('/toggle-assignment', verifyToken, isAdmin, toggleSubjectAccess);
router.post('/assign-facilitator', verifyToken, isAdmin, assignFacilitator);

module.exports = router;
