const Joi = require('joi');

const wishlistAddSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
});

const wishlistParamsSchema = Joi.object({
  productId: Joi.string().uuid().required(),
});

module.exports = {
  wishlistAddSchema,
  wishlistParamsSchema,
};
