const router = require('express').Router();
const verifyToken = require('../middlewares/verfiyToken');
const { chat } = require('../controllers/assistant.controller');

router.post('/chat', verifyToken, chat);

module.exports = router;
