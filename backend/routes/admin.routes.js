const {
  // Existing controllers
  getAdminStats,
  getAllStudents,
  getProjectSubmissions,
  // New content management controllers
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

const isAdmin = require('../middlewares/isAdmin');
const verifyToken = require('../middlewares/verfiyToken');
const router = require('express').Router();

// ===== EXISTING ROUTES =====
// GET admin dashboard stats
router.get('/stats', verifyToken, isAdmin, getAdminStats);
router.get('/all-students', verifyToken, isAdmin, getAllStudents);
router.get('/project-submissions', verifyToken, isAdmin, getProjectSubmissions);

// ===== NEW CONTENT MANAGEMENT ROUTES =====

// Topic Management
router.post('/topics', verifyToken, isAdmin, createTopic);
router.put('/topics/:id', verifyToken, isAdmin, updateTopic);
router.delete('/topics/:id', verifyToken, isAdmin, deleteTopic);

// Subtopic Management
router.post('/subtopics', verifyToken, isAdmin, createSubtopic);
router.put('/subtopics/:id', verifyToken, isAdmin, updateSubtopic);
router.delete('/subtopics/:id', verifyToken, isAdmin, deleteSubtopic);

// Lesson Content Management
router.post('/lesson-content', verifyToken, isAdmin, createLessonContent);
router.put('/lesson-content/:id', verifyToken, isAdmin, updateLessonContent);
router.delete('/lesson-content/:id', verifyToken, isAdmin, deleteLessonContent);
router.put(
  '/lesson-content/:id/publish',
  verifyToken,
  isAdmin,
  publishLessonContent
);

// Quiz Management
router.post('/quizzes', verifyToken, isAdmin, createQuiz);
router.put('/quizzes/:id', verifyToken, isAdmin, updateQuiz);
router.delete('/quizzes/:id', verifyToken, isAdmin, deleteQuiz);

// Exercise Management
router.post('/exercises', verifyToken, isAdmin, createExercise);
router.put('/exercises/:id', verifyToken, isAdmin, updateExercise);
router.delete('/exercises/:id', verifyToken, isAdmin, deleteExercise);

// Project Management
router.post('/projects', verifyToken, isAdmin, createProject);
router.put('/projects/:id', verifyToken, isAdmin, updateProject);
router.delete('/projects/:id', verifyToken, isAdmin, deleteProject);

module.exports = router;
