/**
 * Siftah Controller
 * Handles HTTP requests for siftah recommendation endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import siftahService = require('../services/siftah.service');

interface SiftahQuery {
    product_id?: string;
}

class SiftahController {
    async getRecommendations(req: Request<Record<string, string>, unknown, unknown, SiftahQuery>, res: Response, next: NextFunction) {
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
