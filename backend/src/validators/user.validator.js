const Joi = require('joi');

const roles = ['buyer', 'seller', 'admin'];
const statusFilters = ['active', 'inactive'];

const listUsersQuerySchema = Joi.object({
  role: Joi.string()
    .valid(...roles)
    .optional(),
  status: Joi.string()
    .valid(...statusFilters)
    .optional(),
  limit: Joi.number().integer().min(1).max(200).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

const userIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
});

const updateUserStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...roles)
    .required(),
});

module.exports = {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
};
