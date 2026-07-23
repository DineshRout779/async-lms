const router = require('express').Router();
const facilitatorController = require('../controllers/facilitator.controller');
const { verifyStudent, editStudent } = facilitatorController;
const verifyToken = require('../middlewares/verfiyToken');
const isFacilitator = require('../middlewares/isFacilitator');

// All facilitator routes are protected
router.use(verifyToken, isFacilitator);

router.get('/stats', facilitatorController.getFacilitatorStats);
router.get('/colleges', facilitatorController.getFacilitatorColleges);
router.get('/batches', facilitatorController.getBatches);
router.get('/students', facilitatorController.getFacilitatorStudents);
router.get('/students/:id', facilitatorController.getFacilitatorStudentProfile);
router.patch('/students/:id/verify', verifyStudent);
router.patch('/students/:id', editStudent);

// Analytics
router.get('/analytics/subjects', facilitatorController.getAnalyticsSubjects);
router.get('/analytics/topics', facilitatorController.getAnalyticsTopics);
router.get('/analytics/quizzes', facilitatorController.getAnalyticsQuizzes);
router.get('/analytics/quiz', facilitatorController.getQuizAnalytics);
router.get('/analytics/assignments', facilitatorController.getAssignmentAnalytics);
router.get('/analytics/projects', facilitatorController.getProjectAnalytics);
router.get('/analytics/batch', facilitatorController.getBatchDashboard);
router.get('/analytics/students', facilitatorController.getStudentAnalytics);

module.exports = router;
