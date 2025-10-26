const Joi = require('joi');

const addressSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  phone: Joi.string().min(5).required(),
  country: Joi.string().required(),
  city: Joi.string().required(),
  district: Joi.string().allow('', null),
  postalCode: Joi.string().allow('', null),
  addressLine1: Joi.string().required(),
  addressLine2: Joi.string().allow('', null),
});

const ratesSchema = Joi.object({
  orderId: Joi.string().required(),
  storeId: Joi.string().required(),
  destination: addressSchema.required(),
  totalWeight: Joi.number().min(0.01).required(),
  dimensions: Joi.object({
    length: Joi.number().min(0).default(0),
    width: Joi.number().min(0).default(0),
    height: Joi.number().min(0).default(0),
  }).default({ length: 0, width: 0, height: 0 }),
});

const createShipmentSchema = Joi.object({
  orderId: Joi.string().required(),
  storeId: Joi.string().required(),
  destination: addressSchema.required(),
  totalWeight: Joi.number().min(0.01).required(),
  selectedRate: Joi.object({
    carrier: Joi.string().required(),
    service: Joi.string().required(),
    amount: Joi.number().required(),
    currency: Joi.string().default('TRY'),
  }).required(),
  items: Joi.array()
    .items(
      Joi.object({
        orderItemId: Joi.string().required(),
        qty: Joi.number().integer().min(1).required(),
      })
    )
    .default([]),
});

const paramsWithId = Joi.object({
  storeId: Joi.string().required(),
  id: Joi.string().required(),
});

const paramsTrack = Joi.object({
  trackingNumber: Joi.string().required(),
});

module.exports = {
  ratesSchema,
  createShipmentSchema,
  paramsWithId,
  paramsTrack,
};
