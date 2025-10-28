/**
 * Order Validation Schemas
 * Joi validation for order endpoints
 */

const Joi = require('joi');

/**
 * Shipping address schema
 */
const shippingAddressSchema = Joi.object({
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
 * Create order validation
 */
const createOrderSchema = Joi.object({
  store_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid store ID format',
    'any.required': 'Store ID is required',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).max(100).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Order items are required',
    }),
  shipping_address: shippingAddressSchema.required(),
  billing_address: shippingAddressSchema.optional(),
  payment_method: Joi.string()
    .valid('card', 'credit_card', 'debit_card', 'paypal', 'apple', 'google', 'crypto', 'bank_transfer', 'cash_on_delivery')
    .default('credit_card'),
  customer_note: Joi.string().max(1000).optional().allow(''),
});

/**
 * Update order status validation
 */
const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    .required()
    .messages({
      'any.only': 'Invalid order status',
      'any.required': 'Status is required',
    }),
  tracking_number: Joi.string().max(100).optional(),
  carrier: Joi.string().max(100).optional(),
  cancellation_reason: Joi.string().max(500).optional(),
});

/**
 * Order ID param validation
 */
const orderIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid order ID format',
    'any.required': 'Order ID is required',
  }),
});

/**
 * Store ID param validation
 */
const storeIdParamSchema = Joi.object({
  storeId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid store ID format',
    'any.required': 'Store ID is required',
  }),
});

/**
 * Order query validation
 */
const orderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(
    'pending_payment',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  ),
  sort: Joi.string()
    .valid('created_at', '-created_at', 'total', '-total', 'status')
    .default('-created_at'),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
  storeIdParamSchema,
  orderQuerySchema,
  markPaidSchema: Joi.object({
    transaction_id: Joi.string().max(255).optional(),
    details: Joi.object().optional(),
  }),
  markShippedSchema: Joi.object({
    tracking_number: Joi.string().max(100).required(),
    carrier: Joi.string().max(100).required(),
    shipped_at: Joi.date().optional(),
  }),
  markCompletedSchema: Joi.object({
    delivered_at: Joi.date().optional(),
  }),
  markFailedSchema: Joi.object({
    reason: Joi.string().max(500).optional(),
  }),
};
