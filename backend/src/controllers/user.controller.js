const { StatusCodes } = require('http-status-codes');
const { User } = require('../models');
const { paginated, success } = require('../utils/response');
const { ApiError, asyncHandler } = require('../middlewares/errorHandler');

const parseLimit = (value, fallback = 100) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(200, parsed);
};

const parseOffset = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

const getAllUsers = asyncHandler(async (req, res) => {
  const { role, status, limit = 100, offset = 0 } = req.query;

  const where = {};

  if (role) {
    where.role = role;
  }

  if (status) {
    where.is_active = status === 'active';
  }

  const limitNumber = parseLimit(limit);
  const offsetNumber = parseOffset(offset);
  const pageNumber = Math.floor(offsetNumber / limitNumber) + 1;

  const { rows: users, count: total } = await User.findAndCountAll({
    where,
    attributes: [
      'id',
      'email',
      'first_name',
      'last_name',
      'role',
      'is_active',
      'createdAt',
      'updatedAt',
    ],
    limit: limitNumber,
    offset: offsetNumber,
    order: [['createdAt', 'DESC']],
  });

  return paginated(
    res,
    users,
    {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNumber)),
    },
    'Users retrieved successfully'
  );
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    attributes: [
      'id',
      'email',
      'first_name',
      'last_name',
      'role',
      'is_active',
      'createdAt',
      'updatedAt',
    ],
  });

  if (!user) {
    throw new ApiError('User not found', StatusCodes.NOT_FOUND);
  }

  return success(res, user, 'User retrieved successfully');
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    throw new ApiError('is_active must be a boolean', StatusCodes.BAD_REQUEST);
  }

  const user = await User.findByPk(id);

  if (!user) {
    throw new ApiError('User not found', StatusCodes.NOT_FOUND);
  }

  if (user.id === req.user.id && !is_active) {
    throw new ApiError(
      'You cannot deactivate your own account',
      StatusCodes.BAD_REQUEST
    );
  }

  user.is_active = is_active;
  await user.save();

  return success(
    res,
    {
      id: user.id,
      email: user.email,
      is_active: user.is_active,
    },
    `User ${is_active ? 'activated' : 'suspended'} successfully`
  );
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['buyer', 'seller', 'admin'];
  if (!validRoles.includes(role)) {
    throw new ApiError(
      `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      StatusCodes.BAD_REQUEST
    );
  }

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
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
};
