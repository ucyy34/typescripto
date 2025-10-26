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

module.exports = {
  createReviewSchema,
  updateReviewSchema,
};
