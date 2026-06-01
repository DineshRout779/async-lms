const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verfiyToken');
const isAdmin = require('../middlewares/isAdmin');
const isAdminOrFacilitator = require('../middlewares/isAdminOrFacilitator');
const ctrl = require('../controllers/aiCurriculum.controller');

// All routes require auth
router.use(verifyToken);

// AI generation helpers (specific paths first, before /:id param routes)
router.post('/extract-skills', isAdminOrFacilitator, ctrl.extractSkills);
router.post('/generate', isAdminOrFacilitator, ctrl.generate);
router.post('/generate-topics', isAdminOrFacilitator, ctrl.generateTopics);
router.post('/generate-units', isAdminOrFacilitator, ctrl.generateAndSaveUnits);
router.post('/generate-subtopics', isAdminOrFacilitator, ctrl.generateAndSaveSubtopics);
router.post('/exercises/generate-tests', isAdminOrFacilitator, ctrl.generateTaskTests);

// Create sub-resources
router.post('/modules', isAdminOrFacilitator, ctrl.addModule);
router.post('/topics', isAdminOrFacilitator, ctrl.addTopic);
router.post('/lessons', isAdminOrFacilitator, ctrl.addLesson);

// Inline edits (must come before /:id to avoid param capture)
router.patch('/modules/:id', isAdminOrFacilitator, ctrl.updateModule);
router.delete('/modules/:id', isAdminOrFacilitator, ctrl.deleteModule);
router.post('/modules/:id/duplicate', isAdminOrFacilitator, ctrl.duplicateModule);
router.patch('/topics/:id', isAdminOrFacilitator, ctrl.updateTopic);
router.delete('/topics/:id', isAdminOrFacilitator, ctrl.deleteTopic);
router.post('/topics/:id/duplicate', isAdminOrFacilitator, ctrl.duplicateTopic);
router.patch('/lessons/:id', isAdminOrFacilitator, ctrl.updateLesson);
router.delete('/lessons/:id', isAdminOrFacilitator, ctrl.deleteLesson);
router.post('/lessons/:id/duplicate', isAdminOrFacilitator, ctrl.duplicateLesson);
router.post('/lessons/:id/regenerate', isAdminOrFacilitator, ctrl.regenerateLesson);
router.post('/lessons/:id/generate-content', isAdminOrFacilitator, ctrl.generateAndSaveLessonContent);
router.post('/topics/:id/generate-quiz', isAdminOrFacilitator, ctrl.generateAndSaveUnitQuiz);
router.post('/topics/:id/generate-assignment', isAdminOrFacilitator, ctrl.generateAndSaveUnitAssignment);
router.post('/modules/:id/generate-capstone', isAdminOrFacilitator, ctrl.generateAndSaveCapstone);
router.put('/:courseId/reorder-topics', isAdminOrFacilitator, ctrl.reorderTopics);

// Course CRUD
router.get('/', isAdminOrFacilitator, ctrl.listCourses);
router.post('/', isAdminOrFacilitator, ctrl.saveCourse);
router.get('/:id', isAdminOrFacilitator, ctrl.getCourse);
router.put('/:id', isAdminOrFacilitator, ctrl.updateCourse);
router.delete('/:id', isAdminOrFacilitator, ctrl.deleteCourse);

// Workflow
router.put('/:id/submit', isAdminOrFacilitator, ctrl.submitForReview);
router.put('/:id/review', isAdmin, ctrl.reviewCourse);
router.put('/:id/publish', isAdmin, ctrl.publishCourse);
router.put('/:id/reorder-modules', isAdminOrFacilitator, ctrl.reorderModules);

module.exports = router;
