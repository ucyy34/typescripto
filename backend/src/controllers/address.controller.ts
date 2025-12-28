/**
 * Address Controller
 * Handles user address management (CRUD operations)
 */

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const { Address } = require('../models');
import { success } from '../utils/response';
import { asyncHandler, ApiError } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

const addressController = {
  getUserAddresses: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const addresses = await Address.getUserAddresses(authReq.user!.id);
    return success(res, { addresses, message: 'Addresses retrieved successfully' });
  }),

  getAddressById: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const address = await Address.findOne({ where: { id, user_id: authReq.user!.id } });
    if (!address) {
      throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
    }
    return success(res, { address, message: 'Address retrieved successfully' });
  }),

  createAddress: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { type, label, full_name, phone, address_line1, address_line2, city, district, state, postal_code, country, is_default, notes } = req.body;
    if (!full_name || !phone || !address_line1 || !city || !postal_code) {
      throw new ApiError('Missing required fields: full_name, phone, address_line1, city, postal_code', StatusCodes.BAD_REQUEST);
    }
    const address = await Address.create({
      user_id: authReq.user!.id,
      type: type || 'shipping',
      label, full_name, phone, address_line1, address_line2, city, district, state, postal_code,
      country: country || 'Turkey',
      is_default: is_default || false,
      notes,
    });
    return success(res, { address }, 'Address created successfully', StatusCodes.CREATED);
  }),

  updateAddress: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const address = await Address.findOne({ where: { id, user_id: authReq.user!.id } });
    if (!address) {
      throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
    }
    const { type } = req.body;
    await address.update({ type: type !== undefined ? type : address.type });
    return success(res, { address, message: 'Address updated successfully' });
  }),

  deleteAddress: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const address = await Address.findOne({ where: { id, user_id: authReq.user!.id } });
    if (!address) {
      throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
    }
    await address.destroy();
    return success(res, { message: 'Address deleted successfully' });
  }),

  setDefaultAddress: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const address = await Address.findOne({ where: { id, user_id: authReq.user!.id } });
    if (!address) {
      throw new ApiError('Address not found', StatusCodes.NOT_FOUND);
    }
    await Address.setAsDefault(id, authReq.user!.id);
    await address.reload();
    return success(res, { address, message: 'Default address updated successfully' });
  }),

  getDefaultAddress: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { type } = req.params;
    if (!['shipping', 'billing'].includes(type)) {
      throw new ApiError('Invalid address type. Must be "shipping" or "billing"', StatusCodes.BAD_REQUEST);
    }
    const address = await Address.getDefaultByType(authReq.user!.id, type);
    if (!address) {
      return success(res, { address: null, message: `No default ${type} address found` });
    }
    return success(res, { address, message: 'Default address retrieved successfully' });
  }),
};

export = addressController;
