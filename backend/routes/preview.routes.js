// routes/preview.js
const express = require('express');
const { previewController } = require('../controllers/preview.controller');

const router = express.Router();

router.use('/:userId/:projectId/:port', previewController);

module.exports = router;
