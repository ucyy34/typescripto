const Joi = require('joi');

const recommendationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(24).optional(),
  cartProductIds: Joi.alternatives()
    .try(Joi.array().items(Joi.string().uuid()), Joi.string())
    .optional(),
  wishlistProductIds: Joi.alternatives()
    .try(Joi.array().items(Joi.string().uuid()), Joi.string())
    .optional(),
});

module.exports = {
  recommendationQuerySchema,
};
