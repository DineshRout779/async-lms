const router = require('express').Router();
const isAdmin = require('../middlewares/isAdmin');
const verifyToken = require('../middlewares/verfiyToken');

// Import existing controllers
const {
  getAdminStats,
  getAllStudents,
  getProjectSubmissions,
  createTopic,
  updateTopic,
  deleteTopic,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
  createLessonContent,
  updateLessonContent,
  deleteLessonContent,
  publishLessonContent,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createExercise,
  updateExercise,
  deleteExercise,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/admin.controller');

// Import new controllers (add these to admin.controller.js)
const {
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  getQuizQuestions,
  createQuizQuestionOption,
  updateQuizQuestionOption,
  deleteQuizQuestionOption,
  getStudentProgress,
  getAllStudentsProgressSummary,
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getTopicLeaderboard,
  getCollegeLeaderboard,
  updateLeaderboards,
} = require('../controllers/admin.controller');

// ===== EXISTING ROUTES =====
router.get('/stats', verifyToken, isAdmin, getAdminStats);
router.get('/all-students', verifyToken, isAdmin, getAllStudents);
router.get('/project-submissions', verifyToken, isAdmin, getProjectSubmissions);

// ===== TOPIC MANAGEMENT =====
router.post('/topics', verifyToken, isAdmin, createTopic);
router.put('/topics/:id', verifyToken, isAdmin, updateTopic);
router.delete('/topics/:id', verifyToken, isAdmin, deleteTopic);

// ===== SUBTOPIC MANAGEMENT =====
router.post('/subtopics', verifyToken, isAdmin, createSubtopic);
router.put('/subtopics/:id', verifyToken, isAdmin, updateSubtopic);
router.delete('/subtopics/:id', verifyToken, isAdmin, deleteSubtopic);

// ===== LESSON CONTENT MANAGEMENT =====
router.post('/lesson-content', verifyToken, isAdmin, createLessonContent);
router.put('/lesson-content/:id', verifyToken, isAdmin, updateLessonContent);
router.delete('/lesson-content/:id', verifyToken, isAdmin, deleteLessonContent);
router.put(
  '/lesson-content/:id/publish',
  verifyToken,
  isAdmin,
  publishLessonContent
);

// ===== QUIZ MANAGEMENT =====
router.post('/quizzes', verifyToken, isAdmin, createQuiz);
router.put('/quizzes/:id', verifyToken, isAdmin, updateQuiz);
router.delete('/quizzes/:id', verifyToken, isAdmin, deleteQuiz);

// ===== QUIZ QUESTIONS MANAGEMENT (NEW) =====
router.post('/quiz-questions', verifyToken, isAdmin, createQuizQuestion);
router.put('/quiz-questions/:id', verifyToken, isAdmin, updateQuizQuestion);
router.delete('/quiz-questions/:id', verifyToken, isAdmin, deleteQuizQuestion);
router.get(
  '/quizzes/:quizId/questions',
  verifyToken,
  isAdmin,
  getQuizQuestions
);

// ===== QUIZ QUESTION OPTIONS MANAGEMENT (NEW) =====
router.post(
  '/quiz-question-options',
  verifyToken,
  isAdmin,
  createQuizQuestionOption
);
router.put(
  '/quiz-question-options/:id',
  verifyToken,
  isAdmin,
  updateQuizQuestionOption
);
router.delete(
  '/quiz-question-options/:id',
  verifyToken,
  isAdmin,
  deleteQuizQuestionOption
);

// ===== EXERCISE MANAGEMENT =====
router.post('/exercises', verifyToken, isAdmin, createExercise);
router.put('/exercises/:id', verifyToken, isAdmin, updateExercise);
router.delete('/exercises/:id', verifyToken, isAdmin, deleteExercise);

// ===== PROJECT MANAGEMENT =====
router.post('/projects', verifyToken, isAdmin, createProject);
router.put('/projects/:id', verifyToken, isAdmin, updateProject);
router.delete('/projects/:id', verifyToken, isAdmin, deleteProject);

// ===== STUDENT PROGRESS TRACKING (NEW) =====
router.get(
  '/students/:userId/progress/:subjectId',
  verifyToken,
  isAdmin,
  getStudentProgress
);
router.get(
  '/students/progress-summary',
  verifyToken,
  isAdmin,
  getAllStudentsProgressSummary
);

// ===== LEADERBOARD MANAGEMENT (NEW) =====
router.get('/leaderboard/overall', verifyToken, isAdmin, getOverallLeaderboard);
router.get('/leaderboard/weekly', verifyToken, isAdmin, getWeeklyLeaderboard);
router.get(
  '/leaderboard/topic/:topicId',
  verifyToken,
  isAdmin,
  getTopicLeaderboard
);
router.get(
  '/leaderboard/college/:collegeId',
  verifyToken,
  isAdmin,
  getCollegeLeaderboard
);
router.post('/leaderboard/update', verifyToken, isAdmin, updateLeaderboards);

module.exports = router;
