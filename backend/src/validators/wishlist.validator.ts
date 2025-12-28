/**
 * Wishlist Validation Schemas
 */

import Joi from 'joi';

const addWishlistItemSchema = Joi.object({
    product_id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid product ID format',
        'any.required': 'Product ID is required',
    }),
    metadata: Joi.object().optional(),
});

const productIdParamSchema = Joi.object({
    productId: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid product ID format',
        'any.required': 'Product ID is required',
    }),
});

const syncWishlistSchema = Joi.object({
    items: Joi.array()
        .items(
            Joi.alternatives().try(
                Joi.string().uuid(),
                Joi.object({ product_id: Joi.string().uuid().required() })
            )
        )
        .max(500)
        .default([]),
});

export {
    addWishlistItemSchema,
    productIdParamSchema,
    syncWishlistSchema,
};

// CommonJS compatibility
module.exports = {
    addWishlistItemSchema,
    productIdParamSchema,
    syncWishlistSchema,
};
