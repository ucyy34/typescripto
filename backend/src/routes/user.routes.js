const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validateQuery, validateParams, validate } = require('../middlewares/validate');
const {
  userListQuerySchema,
  userIdParamSchema,
  updateStatusSchema,
  updateRoleSchema,
} = require('../validators/user.validator');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/', validateQuery(userListQuerySchema), userController.getAllUsers);

// Get user by ID
router.get('/:id', validateParams(userIdParamSchema), userController.getUserById);

// Update user status (activate/suspend)
router.patch(
  '/:id/status',
  validateParams(userIdParamSchema),
  validate(updateStatusSchema),
  userController.updateUserStatus
);

// Update user role
router.patch(
  '/:id/role',
  validateParams(userIdParamSchema),
  validate(updateRoleSchema),
  userController.updateUserRole
);

module.exports = router;
