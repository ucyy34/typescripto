/**
 * Shipping Controller
 * Handles shipping operations
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types
import _shippingService from '../services/shipping.service';
const shippingService = _shippingService as any;

import { success, created } from '../utils/response';

const shippingController = {
  getRates: async (req: Request, res: Response) => {
    const data = await shippingService.getRates(req.body);
    return success(res, { rates: data }, 'Rates fetched');
  },

  createShipment: async (req: Request, res: Response) => {
    const payload = { ...req.body, storeId: req.params.storeId };
    const data = await shippingService.createShipment(payload);
    return created(res, data, 'Shipment created');
  },

  getShipment: async (req: Request, res: Response) => {
    const data = await shippingService.getShipmentById(req.params.id);
    return success(res, data, 'Shipment fetched');
  },

  cancelShipment: async (req: Request, res: Response) => {
    const data = await shippingService.cancelShipment(req.params.id);
    return success(res, data, 'Shipment cancelled');
  },

  track: async (req: Request, res: Response) => {
    const data = await shippingService.track(req.params.trackingNumber);
    return success(res, data, 'Tracking fetched');
  },
};

export = shippingController;
