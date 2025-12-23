/**
 * Address Controller
 * Handles user address management (CRUD operations)
 */

const { StatusCodes } = require('http-status-codes');
const { Address } = require('../models');
const { success } = require('../utils/response');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * Get all addresses for the authenticated user
 * GET /api/addresses
 */
const getUserAddresses = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const addresses = await Address.getUserAddresses(userId);

  return success(res, {
    addresses,
    message: 'Addresses retrieved successfully',
  });
});

/**
 * Get a specific address by ID
 * GET /api/addresses/:id
 */
const getAddressById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const address = await Address.findOne({
    where: { id, user_id: userId },
  });

  if (!address) {
    throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
  }

  return success(res, {
    address,
    message: 'Address retrieved successfully',
  });
});

/**
 * Create a new address
 * POST /api/addresses
 */
const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    type,
    label,
    full_name,
    phone,
    address_line1,
    address_line2,
    city,
    district,
    state,
    postal_code,
    country,
    is_default,
    notes,
  } = req.body;

  // Validate required fields
  if (!full_name || !phone || !address_line1 || !city || !postal_code) {
    throw new ApiError(
      'Missing required fields: full_name, phone, address_line1, city, postal_code',
      StatusCodes.BAD_REQUEST
    );
  }

  // Create the address
  const address = await Address.create({
    user_id: userId,
    type: type || 'shipping',
    label,
    full_name,
    phone,
    address_line1,
    address_line2,
    city,
    district,
    state,
    postal_code,
    country: country || 'Turkey',
    is_default: is_default || false,
    notes,
  });

  return success(
    res,
    {
      address,
      message: 'Address created successfully',
    },
    StatusCodes.CREATED
  );
});

/**
 * Update an existing address
 * PUT /api/addresses/:id
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const {
    type,
    label,
    full_name,
    phone,
    address_line1,
    address_line2,
    city,
    district,
    state,
    postal_code,
    country,
    is_default,
    notes,
  } = req.body;

  // Find the address
  const address = await Address.findOne({
    where: { id, user_id: userId },
  });

  if (!address) {
    throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
  }

  // Update the address
  await address.update({
    type: type !== undefined ? type : address.type,
  });

  return success(res, {
    address,
    message: 'Address updated successfully',
  });
});

/**
 * Delete an address
 * DELETE /api/addresses/:id
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const address = await Address.findOne({
    where: { id, user_id: userId },
  });

  if (!address) {
    throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
  }

  await address.destroy();

  return success(res, {
    message: 'Address deleted successfully',
  });
});

/**
 * Set an address as default
 * POST /api/addresses/:id/set-default
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Check if address exists and belongs to user
  const address = await Address.findOne({
    where: { id, user_id: userId },
  });

  if (!address) {
    throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
  }

  // Set as default
  await Address.setAsDefault(id, userId);

  // Reload the address to get updated data
  await address.reload();

  return success(res, {
    address,
    message: 'Default address updated successfully',
  });
});

/**
 * Get default address by type
 * GET /api/addresses/default/:type
 */
const getDefaultAddress = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const userId = req.user.id;

  if (!['shipping', 'billing'].includes(type)) {
    throw new ApiError('Invalid address type. Must be "shipping" or "billing"', StatusCodes.BAD_REQUEST);
  }

  const address = await Address.getDefaultByType(userId, type);

  if (!address) {
    return success(res, {
      address: null,
      message: `No default ${type} address found`,
    });
  }

  return success(res, {
    address,
    message: 'Default address retrieved successfully',
  });
});

module.exports = {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
};
