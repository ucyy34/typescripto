/**
 * Cart Validation Schemas
 * Joi validation for cart endpoints
 */

const Joi = require('joi');

/**
 * Add item to cart validation
 */
const addItemSchema = Joi.object({
  product_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid product ID format',
    'any.required': 'Product ID is required',
  }),
  quantity: Joi.number().integer().min(1).max(100).default(1).messages({
    'number.min': 'Quantity must be at least 1',
    'number.max': 'Quantity cannot exceed 100',
  }),
});

/**
 * Update cart item validation
 */
const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(100).required().messages({
    'number.min': 'Quantity must be at least 0',
    'number.max': 'Quantity cannot exceed 100',
    'any.required': 'Quantity is required',
  }),
});

/**
 * Product ID param validation
 */
const productIdParamSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid product ID format',
    'any.required': 'Product ID is required',
  }),
});

module.exports = {
  addItemSchema,
  updateItemSchema,
  productIdParamSchema,
};
