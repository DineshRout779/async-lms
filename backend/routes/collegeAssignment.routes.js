const router = require('express').Router();
const verifyToken = require('../middlewares/verfiyToken');
const isStudent = require('../middlewares/isStudent');
const isFacilitator = require('../middlewares/isFacilitator');

const {
  getMyCollegeAssignments,
  manageAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getFilteredAssignments
} = require('../controllers/collegeAssignment.controller');

// Student: fetch assignments for their college
router.get('/', verifyToken, isStudent, getMyCollegeAssignments);

// Admin / Facilitator: manage view (list all or scoped)
router.get('/manage', verifyToken, isFacilitator, manageAssignments);

router.get(
  '/evaluation-filters',
  verifyToken,
  isFacilitator,
  getFilteredAssignments
);

// Admin / Facilitator: create, update, delete
router.post('/', verifyToken, isFacilitator, createAssignment);
router.put('/:id', verifyToken, isFacilitator, updateAssignment);
router.delete('/:id', verifyToken, isFacilitator, deleteAssignment);

module.exports = router;
