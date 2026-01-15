const router = require('express').Router();
const {
  getAllSubjects,
  getCourseStructure,
  getSubtopicContent,
} = require('../controllers/subject.controller');
const verifyToken = require('../middlewares/verfiyToken');

// GET specific content when clicking a subtopic
router.get('/content/:subtopicSlug', verifyToken, getSubtopicContent);

// Fetch all published subjects
router.get('/', verifyToken, getAllSubjects);

// GET a course and its hierarchy (topics/subtopics)
router.get('/:slug', verifyToken, getCourseStructure);

module.exports = router;
