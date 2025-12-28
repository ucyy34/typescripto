/**
 * Siftah Validator
 * Request validation schemas for siftah endpoints
 */

import Joi from 'joi';

const siftahQuerySchema = Joi.object({
    product_id: Joi.string().uuid().required().messages({
        'string.guid': 'product_id must be a valid UUID',
        'any.required': 'product_id is required'
    })
});

export { siftahQuerySchema };

// CommonJS compatibility
module.exports = { siftahQuerySchema };
