const { login, signup } = require('../controller/auth.controller');
const { validateLogin, validateSignup } = require('../middlewares/validators');

const router = require('express').Router();

router.post('/login', validateLogin, login);

router.post('/signup', validateSignup, signup);

module.exports = router;
