/**
 * Siftah Controller
 * Handles HTTP requests for siftah recommendation endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

// TODO(ts-migration): replace any with proper service types
import _siftahService from '../services/siftah.service';
const siftahService = _siftahService as any;

class SiftahController {
    async getRecommendations(req: Request, res: Response, next: NextFunction) {
        try {
            const { product_id } = req.query;
            const result = await siftahService.getSiftahRecommendation(product_id);
            res.status(StatusCodes.OK).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

export = new SiftahController();
