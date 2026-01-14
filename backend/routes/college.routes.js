const { getAllColleges } = require('../controllers/college.controller');
const verifyToken = require('../middlewares/verfiyToken');
const router = require('express').Router();

router.get('/', verifyToken, getAllColleges);

module.exports = router;
