const router = require('express').Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const verifyToken = require('../middlewares/verfiyToken');
const isStudent = require('../middlewares/isStudent');
const isFacilitator = require('../middlewares/isFacilitator');

const {
  uploadInstructionDoc,
  getMyCollegeAssignments,
  getCollegeAssignmentById,
  manageAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitCollegeAssignment,
  getFilteredAssignments,
} = require('../controllers/collegeAssignment.controller');

// Admin / Facilitator: manage assignments (MUST COME BEFORE /:id)
router.get('/manage', verifyToken, isFacilitator, manageAssignments);
router.get('/evaluation-filters', verifyToken, isFacilitator, getFilteredAssignments);

// Admin / Facilitator: upload instruction document to S3
router.post(
  '/upload-instruction',
  verifyToken,
  isFacilitator,
  upload.single('file'),
  uploadInstructionDoc,
);

// Student: fetch and submit assignments
router.get('/', verifyToken, isStudent, getMyCollegeAssignments);
router.get('/:id', verifyToken, isStudent, getCollegeAssignmentById);
router.post(
  '/:id/submit',
  verifyToken,
  isStudent,
  upload.single('submission_file'),
  submitCollegeAssignment,
);

// Admin / Facilitator: create, update, delete
router.post('/', verifyToken, isFacilitator, createAssignment);
router.put('/:id', verifyToken, isFacilitator, updateAssignment);
router.delete('/:id', verifyToken, isFacilitator, deleteAssignment);

module.exports = router;
