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
  order_id: uuidSchema.optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().max(200).optional().allow(''),
  comment: Joi.string().max(2000).optional().allow(''),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

const reviewFeedbackSchema = Joi.object({
  helpful: Joi.boolean().strict().required(),
});

const productReviewParamsSchema = Joi.object({
  productId: uuidSchema.required(),
});

const storeReviewParamsSchema = Joi.object({
  storeId: uuidSchema.required(),
});

const reviewIdParamSchema = Joi.object({
  id: uuidSchema.required(),
});

const productReviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sort: Joi.string().valid('recent', 'highest', 'lowest', 'helpful').default('recent'),
});

const storeReviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const pendingReviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const reviewModerationSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

const reviewApprovalSchema = Joi.object({
  notes: Joi.string().trim().max(500).allow('', null),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewFeedbackSchema,
  productReviewParamsSchema,
  storeReviewParamsSchema,
  reviewIdParamSchema,
  productReviewQuerySchema,
  storeReviewQuerySchema,
  pendingReviewQuerySchema,
  reviewModerationSchema,
  reviewApprovalSchema,
};
