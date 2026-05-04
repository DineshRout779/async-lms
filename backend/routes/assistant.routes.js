const router = require('express').Router();
const verifyToken = require('../middlewares/verfiyToken');
const { chat, generateResume, optimizeWithJD } = require('../controllers/assistant.controller');

router.post('/chat', verifyToken, chat);
router.post('/resume', verifyToken, generateResume);
router.post('/resume/optimize', verifyToken, optimizeWithJD);

module.exports = router;
