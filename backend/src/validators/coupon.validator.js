/**
 * Coupon Validation Schemas
 * Joi validation for coupon endpoints
 */

const Joi = require('joi');

/**
 * Create coupon validation
 */
const createCouponSchema = Joi.object({
  code: Joi.string().min(3).max(50).uppercase().required().messages({
    'string.min': 'Coupon code must be at least 3 characters',
    'string.max': 'Coupon code cannot exceed 50 characters',
    'any.required': 'Coupon code is required',
  }),
  name: Joi.string().max(200).required().messages({
    'any.required': 'Coupon name is required',
  }),
  description: Joi.string().max(1000).optional().allow(''),
  discount_type: Joi.string()
    .valid('percentage', 'fixed', 'free_shipping')
    .default('percentage'),
  discount_value: Joi.number().min(0).required().messages({
    'number.min': 'Discount value cannot be negative',
    'any.required': 'Discount value is required',
  }),
  max_discount_amount: Joi.number().min(0).optional().allow(null),
  usage_limit: Joi.number().integer().min(1).optional().allow(null),
  usage_limit_per_user: Joi.number().integer().min(1).default(1),
  valid_from: Joi.date().optional(),
  valid_until: Joi.date().optional().greater(Joi.ref('valid_from')).messages({
    'date.greater': 'End date must be after start date',
  }),
  min_order_amount: Joi.number().min(0).default(0),
  applicable_to: Joi.string()
    .valid('all', 'products', 'categories', 'stores')
    .default('all'),
  applicable_ids: Joi.array().items(Joi.string().uuid()).default([]),
  first_order_only: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true),
  notes: Joi.string().max(1000).optional().allow(''),
});

/**
 * Update coupon validation
 */
const updateCouponSchema = Joi.object({
  code: Joi.string().min(3).max(50).uppercase().optional(),
  name: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  discount_type: Joi.string()
    .valid('percentage', 'fixed', 'free_shipping')
    .optional(),
  discount_value: Joi.number().min(0).optional(),
  max_discount_amount: Joi.number().min(0).optional().allow(null),
  usage_limit: Joi.number().integer().min(1).optional().allow(null),
  usage_limit_per_user: Joi.number().integer().min(1).optional(),
  valid_from: Joi.date().optional(),
  valid_until: Joi.date().optional(),
  min_order_amount: Joi.number().min(0).optional(),
  applicable_to: Joi.string()
    .valid('all', 'products', 'categories', 'stores')
    .optional(),
  applicable_ids: Joi.array().items(Joi.string().uuid()).optional(),
  first_order_only: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  notes: Joi.string().max(1000).optional().allow(''),
}).min(1);

/**
 * Validate coupon code (for applying)
 */
const validateCouponSchema = Joi.object({
  code: Joi.string().required().messages({
    'any.required': 'Coupon code is required',
  }),
  order_amount: Joi.number().min(0).optional().default(0),
  user_id: Joi.string().uuid().optional().allow(null),
  store_id: Joi.string().uuid().optional().allow(null),
});

/**
 * Apply coupon schema
 */
const applyCouponSchema = Joi.object({
  code: Joi.string().required().messages({
    'any.required': 'Coupon code is required',
  }),
});

/**
 * Coupon query validation
 */
const couponQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  is_active: Joi.string().valid('true', 'false').optional(),
  discount_type: Joi.string()
    .valid('percentage', 'fixed', 'free_shipping')
    .optional(),
  search: Joi.string().max(100).optional(),
});

/**
 * UUID param validation
 */
const couponIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid coupon ID format',
    'any.required': 'Coupon ID is required',
  }),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  applyCouponSchema,
  couponQuerySchema,
  couponIdParamSchema,
};








