const router = require('express').Router();
const userController = require('../controllers/user.controller');
const verifyToken = require('../middlewares/verfiyToken');
const isAdmin = require('../middlewares/isAdmin');

// Student Routes
router.get('/subjects', verifyToken, userController.getUserSubjects);

// Admin Routes (Protecting all subsequent routes with isAdmin)
router.use(verifyToken, isAdmin);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.patch('/:id/role', userController.changeUserRole);

module.exports = router;
