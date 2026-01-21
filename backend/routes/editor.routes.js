const express = require('express');
const router = express.Router();
const { startEditor } = require('../controllers/editor.controller');
const verifyToken = require('../middlewares/verfiyToken');
const { validateEditorStartup } = require('../middlewares/validators');

router.post('/start', verifyToken, validateEditorStartup, startEditor);

module.exports = router;
