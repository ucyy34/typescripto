/**
 * Campaign Validators
 * Joi validation schemas for campaign operations
 */

import Joi from 'joi';

/**
 * Create campaign schema
 */
const createCampaignSchema = Joi.object({
    // Basic Info
    name: Joi.string().min(3).max(200).required().messages({
        'string.min': 'Campaign name must be at least 3 characters',
        'string.max': 'Campaign name cannot exceed 200 characters',
        'any.required': 'Campaign name is required',
    }),
    description: Joi.string().allow('', null).max(2000).optional(),

    // Campaign Type
    campaign_type: Joi.string()
        .valid(
            'FLASH_SALE',
            'BUY_X_GET_Y',
            'CATEGORY_DISCOUNT',
            'FREE_SHIPPING',
            'BUNDLE_DEAL',
            'GIFT_WITH_PURCHASE',
            'MINIMUM_PURCHASE'
        )
        .required()
        .messages({
            'any.required': 'Campaign type is required',
            'any.only': 'Invalid campaign type',
        }),

    // Discount Configuration
    discount_type: Joi.string()
        .valid('percentage', 'fixed', 'free_shipping', 'buy_x_get_y')
        .default('percentage'),

    discount_value: Joi.number().min(0).max(999999).default(0).messages({
        'number.min': 'Discount value cannot be negative',
        'number.max': 'Discount value is too large',
    }),

    max_discount_amount: Joi.number().min(0).allow(null).optional(),

    // BUY_X_GET_Y Configuration
    buy_quantity: Joi.number().integer().min(1).when('campaign_type', {
        is: 'BUY_X_GET_Y',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),

    get_quantity: Joi.number().integer().min(1).when('campaign_type', {
        is: 'BUY_X_GET_Y',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),

    // GIFT_WITH_PURCHASE Configuration
    gift_product_ids: Joi.array()
        .items(Joi.string().uuid())
        .when('campaign_type', {
            is: 'GIFT_WITH_PURCHASE',
            then: Joi.array().items(Joi.string().uuid()).required().min(1),
            otherwise: Joi.optional(),
        }),

    // Validity Period
    start_date: Joi.date().iso().default(() => new Date()),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required().messages({
        'date.greater': 'End date must be after start date',
        'any.required': 'End date is required',
    }),

    // Conditions
    min_order_amount: Joi.number().min(0).default(0),
    min_quantity: Joi.number().integer().min(1).default(1),

    // Targeting
    applicable_to: Joi.string()
        .valid('products', 'categories', 'all_store', 'entire_platform')
        .default('products'),

    product_ids: Joi.array().items(Joi.string().uuid()).default([]),
    category_ids: Joi.array().items(Joi.string().uuid()).default([]),

    // Store ID (for vendor campaigns, set automatically from auth)
    store_id: Joi.string().uuid().allow(null).optional(),

    // Display Settings
    badge_text: Joi.string().max(50).allow('', null).optional(),
    badge_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#FF6B6B'),
    show_countdown: Joi.boolean().default(false),

    // Priority & Limits
    priority: Joi.number().integer().min(0).max(100).default(0),
    usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    max_uses_per_user: Joi.number().integer().min(1).default(1),

    // Status
    is_active: Joi.boolean().default(true),
    is_featured: Joi.boolean().default(false),

    // Notes
    notes: Joi.string().max(2000).allow('', null).optional(),
});

/**
 * Update campaign schema
 */
const updateCampaignSchema = Joi.object({
    name: Joi.string().min(3).max(200).optional(),
    description: Joi.string().allow('', null).max(2000).optional(),

    discount_value: Joi.number().min(0).max(999999).optional(),
    max_discount_amount: Joi.number().min(0).allow(null).optional(),

    buy_quantity: Joi.number().integer().min(1).optional(),
    get_quantity: Joi.number().integer().min(1).optional(),
    gift_product_ids: Joi.array().items(Joi.string().uuid()).optional(),

    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),

    min_order_amount: Joi.number().min(0).optional(),
    min_quantity: Joi.number().integer().min(1).optional(),

    product_ids: Joi.array().items(Joi.string().uuid()).optional(),
    category_ids: Joi.array().items(Joi.string().uuid()).optional(),

    badge_text: Joi.string().max(50).allow('', null).optional(),
    badge_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    show_countdown: Joi.boolean().optional(),

    priority: Joi.number().integer().min(0).max(100).optional(),
    usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    max_uses_per_user: Joi.number().integer().min(1).optional(),

    is_active: Joi.boolean().optional(),
    is_featured: Joi.boolean().optional(),

    notes: Joi.string().max(2000).allow('', null).optional(),
}).min(1);

/**
 * Campaign query schema
 */
const campaignQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    campaign_type: Joi.string().valid(
        'FLASH_SALE',
        'BUY_X_GET_Y',
        'CATEGORY_DISCOUNT',
        'FREE_SHIPPING',
        'BUNDLE_DEAL',
        'GIFT_WITH_PURCHASE',
        'MINIMUM_PURCHASE'
    ).optional(),
    is_active: Joi.boolean().optional(),
    approval_status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
    store_id: Joi.string().uuid().optional(),
    search: Joi.string().max(200).optional(),
    sort_by: Joi.string().valid('name', 'created_at', 'start_date', 'end_date', 'priority').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Campaign ID param schema
 */
const campaignIdParamSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid campaign ID format',
        'any.required': 'Campaign ID is required',
    }),
});

/**
 * Campaign approval schema
 */
const approveCampaignSchema = Joi.object({
    approval_status: Joi.string().valid('approved', 'rejected').required(),
    rejection_reason: Joi.string().when('approval_status', {
        is: 'rejected',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
});

/**
 * Get campaigns for product schema
 */
const getProductCampaignsSchema = Joi.object({
    product_id: Joi.string().uuid().required(),
    category_id: Joi.string().uuid().optional(),
    store_id: Joi.string().uuid().optional(),
});

export {
    createCampaignSchema,
    updateCampaignSchema,
    campaignQuerySchema,
    campaignIdParamSchema,
    approveCampaignSchema,
    getProductCampaignsSchema,
};

// CommonJS compatibility
module.exports = {
    createCampaignSchema,
    updateCampaignSchema,
    campaignQuerySchema,
    campaignIdParamSchema,
    approveCampaignSchema,
    getProductCampaignsSchema,
};
