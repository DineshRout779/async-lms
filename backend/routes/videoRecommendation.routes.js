const express = require('express');
const router = express.Router();
// Assuming you have an auth middleware, we should protect admin routes
// const { protect, authorize } = require('../middlewares/auth.middleware');

const {
  addChannelToWhitelist,
  getWhitelistedChannels,
  removeChannelFromWhitelist,
  getPipelineLogs
} = require('../controllers/videoRecommendation.controller');

// If we need to protect these, we could add `protect` middleware
router.post('/channel-whitelist', addChannelToWhitelist);
router.get('/channel-whitelist', getWhitelistedChannels);
router.delete('/channel-whitelist/:id', removeChannelFromWhitelist);
router.get('/pipeline-logs', getPipelineLogs);

module.exports = router;
