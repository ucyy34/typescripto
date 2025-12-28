/**
 * User Validators
 * Joi schemas for user administration endpoints
 */

import Joi from 'joi';

const userListQuerySchema = Joi.object({
    role: Joi.string().valid('buyer', 'seller', 'admin').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    limit: Joi.number().integer().min(1).max(200).default(100),
    offset: Joi.number().integer().min(0).default(0),
});

const userIdParamSchema = Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

const updateStatusSchema = Joi.object({
    is_active: Joi.boolean().strict().required(),
});

const updateRoleSchema = Joi.object({
    role: Joi.string().valid('buyer', 'seller', 'admin').required(),
});

export {
    userListQuerySchema,
    userIdParamSchema,
    updateStatusSchema,
    updateRoleSchema,
};

// CommonJS compatibility
module.exports = {
    userListQuerySchema,
    userIdParamSchema,
    updateStatusSchema,
    updateRoleSchema,
};
