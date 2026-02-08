const router = require('express').Router();
const facilitatorController = require('../controllers/facilitator.controller');
const verifyToken = require('../middlewares/verfiyToken');
const isFacilitator = require('../middlewares/isFacilitator');

// All facilitator routes are protected
router.use(verifyToken, isFacilitator);

router.get('/stats', facilitatorController.getFacilitatorStats);
router.get('/students', facilitatorController.getFacilitatorStudents);

module.exports = router;
