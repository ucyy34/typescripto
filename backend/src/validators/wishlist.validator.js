const Joi = require('joi');

const addItemSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
});

const productIdParamSchema = Joi.object({
  productId: Joi.string().uuid().required(),
});

const recommendationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(6),
  seed: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
    .optional(),
  include_cart: Joi.boolean().truthy('true').falsy('false').optional(),
  include_wishlist: Joi.boolean().truthy('true').falsy('false').optional(),
});

module.exports = {
  addItemSchema,
  productIdParamSchema,
  recommendationQuerySchema,
};
