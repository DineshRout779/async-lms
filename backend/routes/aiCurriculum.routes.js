const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verfiyToken');
const isAdmin = require('../middlewares/isAdmin');
const isCurriculumDeveloper = require('../middlewares/isCurriculumDeveloper');
const ctrl = require('../controllers/aiCurriculum.controller');
const multer = require('multer');

// Setup multer for in-memory uploads with 10MB limit
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// All routes require auth
router.use(verifyToken);

// AI generation helpers (specific paths first, before /:id param routes)
router.post('/extract-skills', isCurriculumDeveloper, ctrl.extractSkills);
router.post('/generate', isCurriculumDeveloper, ctrl.generate);
router.post('/generate-topics', isCurriculumDeveloper, ctrl.generateTopics);
router.post('/generate-units', isCurriculumDeveloper, ctrl.generateAndSaveUnits);
router.post('/generate-subtopics', isCurriculumDeveloper, ctrl.generateAndSaveSubtopics);
router.post('/exercises/generate-tests', isCurriculumDeveloper, ctrl.generateTaskTests);

// Resources
router.post('/upload-resource', isCurriculumDeveloper, upload.single('file'), ctrl.uploadResource);
router.delete('/delete-resource', isCurriculumDeveloper, ctrl.deleteResource);

// Create sub-resources
router.post('/modules', isCurriculumDeveloper, ctrl.addModule);
router.post('/topics', isCurriculumDeveloper, ctrl.addTopic);
router.post('/lessons', isCurriculumDeveloper, ctrl.addLesson);

// Inline edits (must come before /:id to avoid param capture)
router.patch('/modules/:id', isCurriculumDeveloper, ctrl.updateModule);
router.delete('/modules/:id', isCurriculumDeveloper, ctrl.deleteModule);
router.post('/modules/:id/duplicate', isCurriculumDeveloper, ctrl.duplicateModule);
router.patch('/topics/:id', isCurriculumDeveloper, ctrl.updateTopic);
router.delete('/topics/:id', isCurriculumDeveloper, ctrl.deleteTopic);
router.post('/topics/:id/duplicate', isCurriculumDeveloper, ctrl.duplicateTopic);
router.patch('/lessons/:id', isCurriculumDeveloper, ctrl.updateLesson);
router.delete('/lessons/:id', isCurriculumDeveloper, ctrl.deleteLesson);
router.post('/lessons/:id/duplicate', isCurriculumDeveloper, ctrl.duplicateLesson);
router.post('/lessons/:id/regenerate', isCurriculumDeveloper, ctrl.regenerateLesson);
router.post('/lessons/:id/generate-content', isCurriculumDeveloper, ctrl.generateAndSaveLessonContent);
router.post('/topics/:id/generate-quiz', isCurriculumDeveloper, ctrl.generateAndSaveUnitQuiz);
router.post('/topics/:id/generate-assignment', isCurriculumDeveloper, ctrl.generateAndSaveUnitAssignment);
router.post('/modules/:id/generate-capstone', isCurriculumDeveloper, ctrl.generateAndSaveCapstone);
router.put('/:courseId/reorder-topics', isCurriculumDeveloper, ctrl.reorderTopics);

// Course CRUD
router.get('/', isCurriculumDeveloper, ctrl.listCourses);
router.post('/', isCurriculumDeveloper, ctrl.saveCourse);
router.get('/:id', isCurriculumDeveloper, ctrl.getCourse);
router.put('/:id', isCurriculumDeveloper, ctrl.updateCourse);
router.delete('/:id', isCurriculumDeveloper, ctrl.deleteCourse);

// Workflow
router.put('/:id/submit', isCurriculumDeveloper, ctrl.submitForReview);
router.put('/:id/review', isAdmin, ctrl.reviewCourse);
router.put('/:id/publish', isAdmin, ctrl.publishCourse);
router.put('/:id/reorder-modules', isCurriculumDeveloper, ctrl.reorderModules);

module.exports = router;
