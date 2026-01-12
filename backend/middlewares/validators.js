const { body } = require('express-validator');

// auth validations
exports.verifyLogin = [
  body('email').isEmpty('Email required'),
  body('password').isEmpty('Password is required'),
];

exports.verifySignup = [
  body('email').isEmpty('Email required'),
  body('name').isEmpty('Name required'),
  body('password').isEmpty('Password is required'),
];
