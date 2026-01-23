const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workspace.controller');

router.get('/tree', ctrl.getTree);
router.get('/file', ctrl.readFile);
router.post('/file', ctrl.writeFile);
router.post('/create', ctrl.create);
router.post('/delete', ctrl.delete);
router.post('/rename', ctrl.rename);

module.exports = router;
