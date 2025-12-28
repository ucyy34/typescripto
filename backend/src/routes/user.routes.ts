/**
 * User Routes
 * User management endpoints (Admin only)
 */

import { Router } from 'express';

import userController from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validateQuery, validateParams, validate } from '../middlewares/validate';
import {
  userListQuerySchema,
  userIdParamSchema,
  updateStatusSchema,
  updateRoleSchema,
} from '../validators/user.validator';

const router: Router = Router();

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

export = router;
