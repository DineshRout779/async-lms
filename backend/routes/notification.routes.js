'use strict';
const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verfiyToken');
const ctrl = require('../controllers/notification.controller');

router.use(verifyToken);

router.get('/',                    ctrl.list);
router.patch('/read-all',          ctrl.markAllRead);
router.patch('/:id/read',          ctrl.markRead);
router.delete('/:id',              ctrl.remove);

module.exports = router;
