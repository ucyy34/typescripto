/**
 * Variant Controller
 * Handles variant API requests
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import variantService from '../services/variant.service';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

const variantController = {
    /**
     * Get all variant types for dropdown
     */
    getVariantTypes: asyncHandler(async (req: Request, res: Response) => {
        const types = variantService.getVariantTypes();
        res.json({
            success: true,
            data: types
        });
    }),

    /**
     * Get values for a specific variant type
     */
    getVariantValues: asyncHandler(async (req: Request, res: Response) => {
        const { type } = req.params;
        const values = variantService.getVariantValues(type);
        res.json({
            success: true,
            data: values
        });
    }),

    /**
     * Get all variants for a product
     */
    getProductVariants: asyncHandler(async (req: Request, res: Response) => {
        const { productId } = req.params;
        const variants = await variantService.getProductVariants(productId);
        res.json({
            success: true,
            data: variants
        });
    }),

    /**
     * Add a variant to a product
     */
    addVariant: asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const { productId } = req.params;
        const userId = authReq.user!.id;
        const variant = await variantService.addVariant(productId, req.body, userId);
        res.status(201).json({
            success: true,
            message: 'Variant added successfully',
            data: variant
        });
    }),

    /**
     * Update a variant
     */
    updateVariant: asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const { productId, variantId } = req.params;
        const userId = authReq.user!.id;
        const variant = await variantService.updateVariant(productId, variantId, req.body, userId);
        res.json({
            success: true,
            message: 'Variant updated successfully',
            data: variant
        });
    }),

    /**
     * Delete a variant
     */
    deleteVariant: asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const { productId, variantId } = req.params;
        const userId = authReq.user!.id;
        await variantService.deleteVariant(productId, variantId, userId);
        res.json({
            success: true,
            message: 'Variant deleted successfully'
        });
    })
};

export = variantController;
