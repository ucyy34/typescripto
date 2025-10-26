const { StatusCodes } = require('http-status-codes');
const { User } = require('../models');
const { success } = require('../utils/response');
const { ApiError, asyncHandler } = require('../middlewares/errorHandler');

const USER_ATTRIBUTES = [
  'id',
  'email',
  'first_name',
  'last_name',
  'role',
  'is_active',
  'createdAt',
  'updatedAt',
];

const getPaginationMeta = (total, limit, offset, currentCount) => ({
  total,
  limit,
  offset,
  count: currentCount,
  hasNext: offset + currentCount < total,
  hasPrev: offset > 0,
});

const userController = {
  /**
   * Get all users (admin only)
   */
  getAllUsers: asyncHandler(async (req, res) => {
    const { role, status, limit, offset } = req.query;

    const where = {};
    if (role) {
      where.role = role;
    }
    if (status) {
      where.is_active = status === 'active';
    }

    const [users, total] = await Promise.all([
      User.findAll({
        where,
        attributes: USER_ATTRIBUTES,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      }),
      User.count({ where }),
    ]);

    return success(
      res,
      {
        users,
        pagination: getPaginationMeta(total, limit, offset, users.length),
      },
      'Users retrieved successfully'
    );
  }),

  /**
   * Get user by ID (admin only)
   */
  getUserById: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
      attributes: USER_ATTRIBUTES,
    });

    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    return success(res, user, 'User retrieved successfully');
  }),

  /**
   * Update user status (activate/suspend)
   */
  updateUserStatus: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    if (user.id === req.user.id && !req.body.is_active) {
      throw new ApiError(
        'You cannot deactivate your own account',
        StatusCodes.BAD_REQUEST
      );
    }

    user.is_active = req.body.is_active;
    await user.save();

    return success(
      res,
      {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
      },
      `User ${user.is_active ? 'activated' : 'suspended'} successfully`
    );
  }),

  /**
   * Update user role (admin only)
   */
  updateUserRole: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    if (user.id === req.user.id) {
      throw new ApiError(
        'You cannot change your own role',
        StatusCodes.BAD_REQUEST
      );
    }

    user.role = req.body.role;
    await user.save();

    return success(
      res,
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      'User role updated successfully'
    );
  }),
};

module.exports = userController;
