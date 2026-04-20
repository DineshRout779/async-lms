const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verfiyToken');
const isAdmin = require('../middlewares/isAdmin');
const isAdminOrFacilitator = require('../middlewares/isAdminOrFacilitator');
const ctrl = require('../controllers/aiCurriculum.controller');

// All routes require auth
router.use(verifyToken);

// AI generation helpers
router.post('/extract-skills', isAdminOrFacilitator, ctrl.extractSkills);
router.post('/generate', isAdminOrFacilitator, ctrl.generate);

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

// Inline edits
router.patch('/modules/:id', isAdminOrFacilitator, ctrl.updateModule);
router.patch('/topics/:id', isAdminOrFacilitator, ctrl.updateTopic);
router.patch('/lessons/:id', isAdminOrFacilitator, ctrl.updateLesson);
router.post('/lessons/:id/regenerate', isAdminOrFacilitator, ctrl.regenerateLesson);

// Reorder
router.put('/:id/reorder-modules', isAdminOrFacilitator, ctrl.reorderModules);

module.exports = router;
