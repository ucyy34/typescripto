/**
 * Siftah Validator
 * Request validation schemas for siftah endpoints
 */

const Joi = require('joi');

const siftahQuerySchema = Joi.object({
    product_id: Joi.string().uuid().required().messages({
        'string.guid': 'product_id must be a valid UUID',
        'any.required': 'product_id is required'
    })
});

module.exports = { siftahQuerySchema };
