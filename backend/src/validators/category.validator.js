/**
 * Category Validation Schemas
 */

const Joi = require('joi');

const categorySlugSchema = Joi.object({
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(2)
    .max(150)
    .required()
    .messages({
      'string.pattern.base': 'Category slug may only contain lowercase letters, numbers, and hyphens',
      'string.min': 'Category slug must be at least 2 characters',
      'string.max': 'Category slug cannot exceed 150 characters',
      'any.required': 'Category slug is required',
    }),
});

module.exports = {
  categorySlugSchema,
};
