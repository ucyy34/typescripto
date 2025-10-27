/**
 * User Controller
 * Administrative operations for managing users
 */

const { StatusCodes } = require('http-status-codes');
const { User } = require('../models');
const { success, paginated } = require('../utils/response');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

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

const buildStatusFilter = (status) => {
  if (typeof status === 'undefined' || status === null) {
    return undefined;
  }

  if (typeof status === 'boolean') {
    return status;
  }

  return status === 'active';
};

const getAllUsers = asyncHandler(async (req, res) => {
  const { role, status, limit = 100, offset = 0 } = req.query;
  const where = {};

  if (role) {
    where.role = role;
  }

  const parsedStatus = buildStatusFilter(status);
  if (typeof parsedStatus !== 'undefined') {
    where.is_active = parsedStatus;
  }

  const queryLimit = Number(limit);
  const queryOffset = Number(offset);

  try {
    const [users, total] = await Promise.all([
      User.findAll({
        where,
        attributes: USER_ATTRIBUTES,
        limit: queryLimit,
        offset: queryOffset,
        order: [['createdAt', 'DESC']],
      }),
      User.count({ where }),
    ]);

    const page = Math.floor(queryOffset / queryLimit) + 1;
    const pagination = {
      page,
      limit: queryLimit,
      total,
      totalPages: Math.ceil(total / queryLimit) || 1,
      hasNext: queryOffset + queryLimit < total,
      hasPrev: queryOffset > 0,
    };

    return paginated(res, users, pagination, 'Users retrieved successfully');
  } catch (error) {
    console.error('[User Controller] Error fetching users:', error);
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Failed to fetch users', StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: USER_ATTRIBUTES,
    });

    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    return success(res, user, 'User retrieved successfully');
  } catch (error) {
    console.error('[User Controller] Error fetching user:', error);
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Failed to fetch user', StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active: isActive } = req.body;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    if (user.id === req.user.id && isActive === false) {
      throw new ApiError('You cannot deactivate your own account', StatusCodes.BAD_REQUEST);
    }

    user.is_active = isActive;
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
  } catch (error) {
    console.error('[User Controller] Error updating user status:', error);
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Failed to update user status', StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    if (user.id === req.user.id) {
      throw new ApiError('You cannot change your own role', StatusCodes.BAD_REQUEST);
    }

    user.role = role;
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
  } catch (error) {
    console.error('[User Controller] Error updating user role:', error);
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Failed to update user role', StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
};
