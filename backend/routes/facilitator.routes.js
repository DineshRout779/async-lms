const router = require('express').Router();
const facilitatorController = require('../controllers/facilitator.controller');
const { verifyStudent, editStudent } = facilitatorController;
const verifyToken = require('../middlewares/verfiyToken');
const isFacilitator = require('../middlewares/isFacilitator');

// All facilitator routes are protected
router.use(verifyToken, isFacilitator);

router.get('/stats', facilitatorController.getFacilitatorStats);
router.get('/batches', facilitatorController.getBatches);
router.get('/students', facilitatorController.getFacilitatorStudents);
router.get('/students/:id', facilitatorController.getFacilitatorStudentProfile);
router.patch('/students/:id/verify', verifyStudent);
router.patch('/students/:id', editStudent);

module.exports = router;
