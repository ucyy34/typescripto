/**
 * Variant Controller
 * Handles variant API requests
 */

const { asyncHandler } = require('../middlewares/errorHandler');
const variantService = require('../services/variant.service');

const variantController = {
    /**
     * Get all variant types for dropdown
     */
    getVariantTypes: asyncHandler(async (req, res) => {
        const types = variantService.getVariantTypes();
        res.json({
            success: true,
            data: types
        });
    }),

    /**
     * Get values for a specific variant type
     */
    getVariantValues: asyncHandler(async (req, res) => {
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
    getProductVariants: asyncHandler(async (req, res) => {
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
    addVariant: asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const userId = req.user.id;
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
    updateVariant: asyncHandler(async (req, res) => {
        const { productId, variantId } = req.params;
        const userId = req.user.id;
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
    deleteVariant: asyncHandler(async (req, res) => {
        const { productId, variantId } = req.params;
        const userId = req.user.id;
        await variantService.deleteVariant(productId, variantId, userId);
        res.json({
            success: true,
            message: 'Variant deleted successfully'
        });
    })
};

module.exports = variantController;
