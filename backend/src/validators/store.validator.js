/**
 * Store Validation Schemas
 * Joi validation for store endpoints
 */

const Joi = require('joi');

/**
 * Create store validation schema
 */
const createStoreSchema = Joi.object({
  name: Joi.string().min(3).max(200).required().trim().messages({
    'string.min': 'Store name must be at least 3 characters',
    'string.max': 'Store name cannot exceed 200 characters',
    'any.required': 'Store name is required',
  }),
  description: Joi.string().max(2000).optional().allow('').trim(),
  phone: Joi.string()
    .pattern(/^[+]?[0-9\s()-]+$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  email: Joi.string().email().optional().allow('').trim().lowercase(),
  address: Joi.string().max(500).optional().allow('').trim(),
  city: Joi.string().max(100).optional().allow('').trim(),
  country: Joi.string().max(100).optional().default('Turkey'),
  postal_code: Joi.string().max(20).optional().allow('').trim(),
  tax_number: Joi.string().max(50).optional().allow('').trim(),
  bank_account: Joi.object().optional(),
  settings: Joi.object({
    allow_reviews: Joi.boolean().default(true),
    auto_accept_orders: Joi.boolean().default(false),
    minimum_order_amount: Joi.number().min(0).default(0),
    shipping_fee: Joi.number().min(0).default(0),
    free_shipping_threshold: Joi.number().min(0).default(0),
  }).optional(),
});

/**
 * Update store validation schema
 */
const updateStoreSchema = Joi.object({
  name: Joi.string().min(3).max(200).optional().trim(),
  description: Joi.string().max(2000).optional().allow('').trim(),
  phone: Joi.string()
    .pattern(/^[+]?[0-9\s()-]+$/)
    .optional()
    .allow(''),
  email: Joi.string().email().optional().allow('').trim().lowercase(),
  address: Joi.string().max(500).optional().allow('').trim(),
  city: Joi.string().max(100).optional().allow('').trim(),
  country: Joi.string().max(100).optional(),
  postal_code: Joi.string().max(20).optional().allow('').trim(),
  tax_number: Joi.string().max(50).optional().allow('').trim(),
  bank_account: Joi.object().optional(),
  settings: Joi.object({
    allow_reviews: Joi.boolean().optional(),
    auto_accept_orders: Joi.boolean().optional(),
    minimum_order_amount: Joi.number().min(0).optional(),
    shipping_fee: Joi.number().min(0).optional(),
    free_shipping_threshold: Joi.number().min(0).optional(),
  }).optional(),
});

/**
 * Update store status validation schema (admin only)
 */
const updateStoreStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'suspended')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, approved, rejected, suspended',
      'any.required': 'Status is required',
    }),
  rejection_reason: Joi.when('status', {
    is: 'rejected',
    then: Joi.string().required().messages({
      'any.required': 'Rejection reason is required when rejecting a store',
    }),
    otherwise: Joi.string().optional().allow(''),
  }),
});

/**
 * Store ID param validation
 */
const storeIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid store ID format',
    'any.required': 'Store ID is required',
  }),
});

/**
 * Store query params validation
 */
const storeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'suspended').optional(),
  search: Joi.string().max(200).optional().trim(),
  city: Joi.string().max(100).optional().trim(),
  is_featured: Joi.boolean().optional(),
  sort: Joi.string()
    .valid('name', 'rating', 'total_sales', 'created_at', '-name', '-rating', '-total_sales', '-created_at')
    .default('-created_at'),
});

module.exports = {
  createStoreSchema,
  updateStoreSchema,
  updateStoreStatusSchema,
  storeIdSchema,
  storeQuerySchema,
};
