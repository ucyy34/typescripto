/**
 * Product Validation Schemas
 * Joi validation for product endpoints
 */

const Joi = require('joi');

const imageUrlSchema = Joi.string()
  .max(2048)
  .custom((value, helpers) => {
    if (!value) return value;
    const trimmed = value.trim();
    if (trimmed.startsWith('/uploads/')) {
      return trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        return trimmed;
      }
    } catch (err) {
      // Swallow, we will reject below
    }

    return helpers.error('any.invalid');
  }, 'Image URL validation')
  .messages({
    'any.invalid': 'Image URL must be a valid URL or start with /uploads/',
  });

/**
 * Create product validation schema
 */
const createProductSchema = Joi.object({
  store_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid store ID format',
    'any.required': 'Store ID is required',
  }),
  category_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid category ID format',
    'any.required': 'Category ID is required',
  }),
  title: Joi.string().min(5).max(300).required().trim().messages({
    'string.min': 'Product title must be at least 5 characters',
    'string.max': 'Product title cannot exceed 300 characters',
    'any.required': 'Product title is required',
  }),
  description: Joi.string().max(10000).optional().allow('').trim(),
  short_description: Joi.string().max(500).optional().allow('').trim(),
  sku: Joi.string().max(100).optional().allow('').trim(),
  price: Joi.number().min(0).precision(2).required().messages({
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required',
  }),
  compare_price: Joi.number().min(0).precision(2).optional().allow(null),
  cost_price: Joi.number().min(0).precision(2).optional().allow(null),
  stock: Joi.number().integer().min(0).default(0),
  low_stock_threshold: Joi.number().integer().min(0).default(10),
  images: Joi.array().items(imageUrlSchema).max(10).default([]),
  weight: Joi.number().min(0).precision(2).optional().allow(null),
  dimensions: Joi.object({
    length: Joi.number().min(0).optional(),
    width: Joi.number().min(0).optional(),
    height: Joi.number().min(0).optional(),
  }).optional(),
  attributes: Joi.object().optional().default({}),
  tags: Joi.array().items(Joi.string().max(50)).max(20).default([]),
  badges: Joi.array()
    .items(Joi.string().valid('handmade', 'limited', 'eco-friendly', 'spiritual', 'traditional', 'artisan'))
    .max(10)
    .default([])
    .messages({
      'any.only': 'Badge must be one of: handmade, limited, eco-friendly, spiritual, traditional, artisan',
    }),
  variants: Joi.array().items(
    Joi.object({
      category_variant_id: Joi.string().uuid().required(),
      variant_name: Joi.string().min(1).required(),
      selected_options: Joi.array()
        .items(
          Joi.object({
            label: Joi.string().allow('', null),
            value: Joi.alternatives(Joi.string(), Joi.number()).required(),
          })
        )
        .min(1)
        .required(),
    })
  ).optional().default([]),
  seo_title: Joi.string().max(200).optional().allow('').trim(),
  seo_description: Joi.string().max(500).optional().allow('').trim(),
  meta_keywords: Joi.array().items(Joi.string().max(50)).max(20).optional().default([]),
  is_active: Joi.boolean().default(true),
});

/**
 * Update product validation schema
 */
const updateProductSchema = Joi.object({
  category_id: Joi.string().uuid().optional(),
  title: Joi.string().min(5).max(300).optional().trim(),
  description: Joi.string().max(10000).optional().allow('').trim(),
  short_description: Joi.string().max(500).optional().allow('').trim(),
  sku: Joi.string().max(100).optional().allow('').trim(),
  price: Joi.number().min(0).precision(2).optional(),
  compare_price: Joi.number().min(0).precision(2).optional().allow(null),
  cost_price: Joi.number().min(0).precision(2).optional().allow(null),
  stock: Joi.number().integer().min(0).optional(),
  low_stock_threshold: Joi.number().integer().min(0).optional(),
  images: Joi.array().items(imageUrlSchema).max(10).optional(),
  weight: Joi.number().min(0).precision(2).optional().allow(null),
  dimensions: Joi.object({
    length: Joi.number().min(0).optional(),
    width: Joi.number().min(0).optional(),
    height: Joi.number().min(0).optional(),
  }).optional(),
  attributes: Joi.object().optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  badges: Joi.array()
    .items(Joi.string().valid('handmade', 'limited', 'eco-friendly', 'spiritual', 'traditional', 'artisan'))
    .max(10)
    .optional()
    .messages({
      'any.only': 'Badge must be one of: handmade, limited, eco-friendly, spiritual, traditional, artisan',
    }),
  seo_title: Joi.string().max(200).optional().allow('').trim(),
  seo_description: Joi.string().max(500).optional().allow('').trim(),
  meta_keywords: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  is_active: Joi.boolean().optional(),
});

/**
 * Update product status validation schema (admin)
 */
const updateProductStatusSchema = Joi.object({
  status: Joi.string()
    .valid('draft', 'pending', 'approved', 'rejected')
    .required()
    .messages({
      'any.only': 'Status must be one of: draft, pending, approved, rejected',
      'any.required': 'Status is required',
    }),
  rejection_reason: Joi.when('status', {
    is: 'rejected',
    then: Joi.string().required().messages({
      'any.required': 'Rejection reason is required when rejecting a product',
    }),
    otherwise: Joi.string().optional().allow(''),
  }),
});

/**
 * Product ID param validation
 */
const productIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid product ID format',
    'any.required': 'Product ID is required',
  }),
});

/**
 * Product query params validation
 */
const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  store_id: Joi.string().uuid().optional(),
  category_id: Joi.string().uuid().optional(),
  status: Joi.string().valid('draft', 'pending', 'approved', 'rejected').optional(),
  search: Joi.string().max(200).optional().trim(),
  min_price: Joi.number().min(0).optional(),
  max_price: Joi.number().min(0).optional(),
  in_stock: Joi.boolean().optional(),
  is_featured: Joi.boolean().optional(),
  sort: Joi.string()
    .valid(
      'title',
      'price',
      'rating',
      'total_sales',
      'created_at',
      '-title',
      '-price',
      '-rating',
      '-total_sales',
      '-created_at'
    )
    .default('-created_at'),
  includeAllStatuses: Joi.boolean().optional(), // Allow vendors to see all their products (inactive, rejected, etc.)
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  productIdSchema,
  productQuerySchema,
};
