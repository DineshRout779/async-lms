const { login, signup, getMe, googleAuth } = require('../controllers/auth.controller');
const { validateLogin, validateSignup } = require('../middlewares/validators');
const verifyToken = require('../middlewares/verfiyToken');

const router = require('express').Router();

// Public routes
router.post('/login', validateLogin, login);
router.post('/signup', validateSignup, signup);
router.post('/google', googleAuth);

// Protected routes
router.get('/me', verifyToken, getMe);

module.exports = router;
