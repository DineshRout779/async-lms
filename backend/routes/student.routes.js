const router = require('express').Router();
const verifyToken = require('../middlewares/verfiyToken');
const isStudent = require('../middlewares/isStudent');
const isAdmin = require('../middlewares/isAdmin');

const {
  getMyProgress,
  startSubtopic,
  completeLesson,
  submitQuizAttempt,
  submitExercise,
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getCollegeLeaderboard,
} = require('../controllers/student.controller');

// ===== PROGRESS TRACKING =====
router.get('/progress/:subjectId', verifyToken, isStudent, getMyProgress);
router.post(
  '/progress/subtopic/:subtopicId/start',
  verifyToken,
  isStudent,
  startSubtopic,
);
router.post(
  '/progress/lesson/:lessonId/complete',
  verifyToken,
  isStudent,
  completeLesson,
);

// ===== QUIZ & EXERCISE SUBMISSION =====
router.post('/quiz/:quizId/submit', verifyToken, isStudent, submitQuizAttempt);
router.post(
  '/exercise/:exerciseId/submit',
  verifyToken,
  isStudent,
  submitExercise,
);

// ===== LEADERBOARDS =====
router.get(
  '/leaderboard/overall',
  verifyToken,
  isStudent,
  getOverallLeaderboard,
);
router.get('/leaderboard/weekly', verifyToken, isStudent, getWeeklyLeaderboard);
router.get(
  '/leaderboard/college',
  verifyToken,
  isStudent,
  getCollegeLeaderboard,
);

module.exports = router;
