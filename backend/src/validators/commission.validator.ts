/**
 * Commission Validation Schemas
 * Joi validation for commission endpoints
 */

import Joi from 'joi';

/**
 * Create/Update commission settings validation
 */
const commissionSettingsSchema = Joi.object({
    store_id: Joi.string().uuid().allow(null).optional(),
    commission_type: Joi.string()
        .valid('percentage', 'fixed', 'tiered', 'category_based')
        .default('percentage'),
    default_rate: Joi.number().min(0).max(100).required().messages({
        'number.min': 'Commission rate cannot be negative',
        'number.max': 'Commission rate cannot exceed 100%',
        'any.required': 'Commission rate is required',
    }),
    min_commission: Joi.number().min(0).optional(),
    max_commission: Joi.number().min(0).optional(),
    is_active: Joi.boolean().default(true),
    applied_from: Joi.date().optional(),
    applied_until: Joi.date().optional(),
    notes: Joi.string().max(1000).optional(),
});

/**
 * Query filters for commission transactions
 */
const commissionQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(
        'pending',
        'calculated',
        'paid_to_seller',
        'refunded',
        'cancelled'
    ).optional(),
    storeId: Joi.string().uuid().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
});

/**
 * Store summary query validation
 */
const summaryQuerySchema = Joi.object({
    startDate: Joi.date().required().messages({
        'any.required': 'Start date is required',
    }),
    endDate: Joi.date().required().messages({
        'any.required': 'End date is required',
    }),
});

/**
 * Mark as paid validation
 */
const markAsPaidSchema = Joi.object({
    payment_method: Joi.string().max(50).required().messages({
        'any.required': 'Payment method is required',
    }),
    payment_reference: Joi.string().max(100).required().messages({
        'any.required': 'Payment reference is required',
    }),
    payout_id: Joi.string().uuid().optional(),
});

/**
 * UUID param validation
 */
const uuidParamSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid ID format',
        'any.required': 'ID is required',
    }),
});

/**
 * Store ID param validation
 */
const storeIdParamSchema = Joi.object({
    storeId: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid store ID format',
        'any.required': 'Store ID is required',
    }),
});

export {
    commissionSettingsSchema,
    commissionQuerySchema,
    summaryQuerySchema,
    markAsPaidSchema,
    uuidParamSchema,
    storeIdParamSchema,
};

// CommonJS compatibility
module.exports = {
    commissionSettingsSchema,
    commissionQuerySchema,
    summaryQuerySchema,
    markAsPaidSchema,
    uuidParamSchema,
    storeIdParamSchema,
};
