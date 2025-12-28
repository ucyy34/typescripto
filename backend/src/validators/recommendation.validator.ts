/**
 * Recommendation Validation Schemas
 */

import Joi from 'joi';

const recommendationQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(24).optional(),
    cartProductIds: Joi.alternatives()
        .try(Joi.array().items(Joi.string().uuid()), Joi.string())
        .optional(),
    wishlistProductIds: Joi.alternatives()
        .try(Joi.array().items(Joi.string().uuid()), Joi.string())
        .optional(),
});

export { recommendationQuerySchema };

// CommonJS compatibility
module.exports = { recommendationQuerySchema };
