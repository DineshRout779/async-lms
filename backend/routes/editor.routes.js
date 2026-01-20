const express = require('express');
const router = express.Router();
const { startEditor } = require('../controllers/editor.controller');
const verifyToken = require('../middlewares/verfiyToken');

router.post('/start', verifyToken, startEditor);
router.post('/files', verifyToken, startEditor);

module.exports = router;
