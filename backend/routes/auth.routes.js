const { login, signup, getMe, googleRedirect, googleCallback, completeGoogleSignup } = require('../controllers/auth.controller');
const { validateLogin, validateSignup } = require('../middlewares/validators');
const verifyToken = require('../middlewares/verfiyToken');

const router = require('express').Router();

// Public routes
router.post('/login', validateLogin, login);
router.post('/signup', validateSignup, signup);

// Google OAuth redirect flow (server-side)
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.post('/google/complete', completeGoogleSignup);

// Protected routes
router.get('/me', verifyToken, getMe);

module.exports = router;
