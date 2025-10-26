/**
 * Review Validators
 * Joi schemas for review validation
 */

const Joi = require('joi');

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

const reviewIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid review ID format',
    'any.required': 'Review ID is required',
  }),
});

const productReviewParamsSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid product ID format',
    'any.required': 'Product ID is required',
  }),
});

const storeReviewParamsSchema = Joi.object({
  storeId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid store ID format',
    'any.required': 'Store ID is required',
  }),
});

const reviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('recent', 'highest', 'lowest', 'helpful').default('recent'),
});

const reviewModerationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const reviewDecisionSchema = Joi.object({
  reason: Joi.string().max(500).required().messages({
    'string.empty': 'Rejection reason cannot be empty',
    'any.required': 'Rejection reason is required',
  }),
});

const markHelpfulSchema = Joi.object({
  helpful: Joi.boolean().default(true),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  reviewQuerySchema,
  reviewModerationQuerySchema,
  productReviewParamsSchema,
  storeReviewParamsSchema,
  reviewDecisionSchema,
  markHelpfulSchema,
};
