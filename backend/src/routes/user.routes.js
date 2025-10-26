const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validate, validateQuery, validateParams } = require('../middlewares/validate');
const {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
} = require('../validators/user.validator');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/', validateQuery(listUsersQuerySchema), userController.getAllUsers);

// Get user by ID
router.get('/:id', validateParams(userIdParamSchema), userController.getUserById);

// Update user status (activate/suspend)
router.patch(
  '/:id/status',
  validateParams(userIdParamSchema),
  validate(updateUserStatusSchema),
  userController.updateUserStatus
);

// Update user role
router.patch(
  '/:id/role',
  validateParams(userIdParamSchema),
  validate(updateUserRoleSchema),
  userController.updateUserRole
);

module.exports = router;
