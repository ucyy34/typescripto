/**
 * Review Validators
 * Joi schemas for review validation
 */

const Joi = require('joi');

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required',
  }),
  title: Joi.string().max(200).optional().allow(''),
  comment: Joi.string().max(2000).optional().allow(''),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().max(200).optional().allow(''),
  comment: Joi.string().max(2000).optional().allow(''),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

const reviewIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'string.guid': 'Review ID must be a valid UUID',
    'any.required': 'Review ID is required',
  }),
});

const productReviewParamSchema = Joi.object({
  productId: uuidSchema.required().messages({
    'string.guid': 'Product ID must be a valid UUID',
    'any.required': 'Product ID is required',
  }),
});

const storeReviewParamSchema = Joi.object({
  storeId: uuidSchema.required().messages({
    'string.guid': 'Store ID must be a valid UUID',
    'any.required': 'Store ID is required',
  }),
});

const markHelpfulSchema = Joi.object({
  helpful: Joi.boolean().required().messages({
    'boolean.base': 'helpful must be a boolean',
    'any.required': 'helpful flag is required',
  }),
});

const reviewModerationSchema = Joi.object({
  reason: Joi.string().max(500).allow('').optional(),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  productReviewParamSchema,
  storeReviewParamSchema,
  markHelpfulSchema,
  reviewModerationSchema,
};
