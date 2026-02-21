const router = require('express').Router();
const verifyToken = require('../middlewares/verfiyToken');
const isStudent = require('../middlewares/isStudent');

const {
  getMyProgress,
  startSubtopic,
  completeLesson,
  submitQuizAttempt,
  submitExercise,
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getCollegeLeaderboard,
  getStudentProjects,
  createStudentProject,
  deleteStudentProject,
  initExerciseWorkspace,
  runExercise,
  getStudentAssignments,
  getAssignmentById,
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
router.post('/exercise/:exerciseId/submit', verifyToken, isStudent, submitExercise);

// ===== EXERCISE WORKSPACE =====
router.post('/exercise/:exerciseId/workspace/init', verifyToken, isStudent, initExerciseWorkspace);
router.post('/exercise/:exerciseId/run', verifyToken, isStudent, runExercise);

// ===== ASSIGNMENTS =====
router.get('/assignments', verifyToken, isStudent, getStudentAssignments);
router.get('/assignments/:id', verifyToken, isStudent, getAssignmentById);

// ===== PERSONAL PROJECTS =====
router.get('/projects', verifyToken, isStudent, getStudentProjects);
router.post('/projects', verifyToken, isStudent, createStudentProject);
router.delete('/projects/:id', verifyToken, isStudent, deleteStudentProject);

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
