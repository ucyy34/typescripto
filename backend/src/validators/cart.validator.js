/**
 * Cart Validation Schemas
 * Joi validation for cart endpoints
 */

const Joi = require('joi');

const addressSchema = Joi.object({
  full_name: Joi.string().min(2).max(200).required(),
  phone: Joi.string()
    .pattern(/^[+]?[0-9\s()-]+$/)
    .required(),
  address_line1: Joi.string().min(5).max(500).required(),
  address_line2: Joi.string().max(500).optional().allow(''),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().max(100).optional().allow(''),
  postal_code: Joi.string().min(4).max(20).required(),
  country: Joi.string().min(2).max(100).default('Turkey'),
});

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
  checkoutSchema: Joi.object({
    store_id: Joi.string().uuid().optional(),
    payment_method: Joi.string()
      .valid(
        'card',
        'credit_card',
        'debit_card',
        'paypal',
        'apple',
        'google',
        'crypto',
        'bank_transfer',
        'cash_on_delivery'
      )
      .default('credit_card'),
    shipping_address: addressSchema.required(),
    billing_address: addressSchema.optional(),
    customer_note: Joi.string().max(1000).optional().allow(''),
    metadata: Joi.object().optional(),
  }),
};
