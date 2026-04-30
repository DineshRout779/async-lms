const router = require('express').Router();
const facilitatorController = require('../controllers/facilitator.controller');
const verifyToken = require('../middlewares/verfiyToken');
const isFacilitator = require('../middlewares/isFacilitator');

// All facilitator routes are protected
router.use(verifyToken, isFacilitator);

router.get('/stats', facilitatorController.getFacilitatorStats);
router.get('/batches', facilitatorController.getBatches);
router.get('/students', facilitatorController.getFacilitatorStudents);
router.get('/students/:id', facilitatorController.getFacilitatorStudentProfile);

module.exports = router;
