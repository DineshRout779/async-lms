const router = require('express').Router();
const verifyToken = require('../middlewares/verfiyToken');
const {
  selectCollege,
  updateBatchDetails,
  selectSubjects,
} = require('../controllers/onboarding.controller');

// All onboarding steps require a verified token
router.post('/college', verifyToken, selectCollege);
router.post('/batch', verifyToken, updateBatchDetails);
router.post('/subjects', verifyToken, selectSubjects);
router.post(
  '/facilitator-colleges',
  verifyToken,
  require('../controllers/onboarding.controller').selectFacilitatorColleges,
);

module.exports = router;
