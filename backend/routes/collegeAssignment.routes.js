const router = require('express').Router();
const multer = require('multer');
const verifyToken = require('../middlewares/verfiyToken');
const isStudent = require('../middlewares/isStudent');
const isFacilitator = require('../middlewares/isFacilitator');

const upload = multer({ storage: multer.memoryStorage() });

const {
  uploadInstructionDoc,
  getMyCollegeAssignments,
  manageAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} = require('../controllers/collegeAssignment.controller');

// Student: fetch assignments for their college
router.get('/', verifyToken, isStudent, getMyCollegeAssignments);

// Admin / Facilitator: manage view (list all or scoped)
router.get('/manage', verifyToken, isFacilitator, manageAssignments);

// Admin / Facilitator: upload instruction document to S3
router.post('/upload-instruction', verifyToken, isFacilitator, upload.single('file'), uploadInstructionDoc);

// Admin / Facilitator: create, update, delete
router.post('/', verifyToken, isFacilitator, createAssignment);
router.put('/:id', verifyToken, isFacilitator, updateAssignment);
router.delete('/:id', verifyToken, isFacilitator, deleteAssignment);

module.exports = router;
