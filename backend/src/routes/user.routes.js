const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user status (activate/suspend)
router.patch('/:id/status', userController.updateUserStatus);

// Update user role
router.patch('/:id/role', userController.updateUserRole);

module.exports = router;
