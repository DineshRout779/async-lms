const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workspace.controller');
const verifyToken = require('../middlewares/verfiyToken');

// All workspace routes require a valid session
router.use(verifyToken);

// Read-only — any authenticated user can view (enables share-by-link)
router.get('/tree', ctrl.getTree);
router.get('/file', ctrl.readFile);

// Write operations — owner only (enforced in controller via req.user.id)
router.post('/file', ctrl.writeFile);
router.post('/create', ctrl.create);
router.post('/delete', ctrl.delete);
router.post('/rename', ctrl.rename);

module.exports = router;
