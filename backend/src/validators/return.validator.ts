/**
 * Return Request Validation Schemas
 * Joi validation for return request endpoints
 */

import Joi from 'joi';

/**
 * Create return request validation
 */
const createReturnRequestSchema = Joi.object({
    order_id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid order ID format',
        'any.required': 'Order ID is required',
    }),
    reason: Joi.string()
        .valid(
            'defective',
            'wrong_item',
            'not_as_described',
            'damaged',
            'changed_mind',
            'better_price_elsewhere',
            'other'
        )
        .required()
        .messages({
            'any.only': 'Invalid return reason',
            'any.required': 'Return reason is required',
        }),
    description: Joi.string().min(10).max(2000).required().messages({
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 2000 characters',
        'any.required': 'Detailed description is required',
    }),
    items: Joi.array()
        .items(
            Joi.object({
                order_item_id: Joi.string().uuid().required(),
                quantity: Joi.number().integer().min(1).required(),
                item_reason: Joi.string().max(500).optional(),
            })
        )
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one item must be selected for return',
            'any.required': 'Return items are required',
        }),
    images: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

/**
 * Update return request status validation
 */
const updateReturnStatusSchema = Joi.object({
    status: Joi.string()
        .valid(
            'approved',
            'rejected',
            'items_received',
            'refund_processed',
            'completed',
            'cancelled'
        )
        .required()
        .messages({
            'any.only': 'Invalid return status',
            'any.required': 'Status is required',
        }),
    store_response: Joi.string().max(1000).optional(),
    tracking_number: Joi.string().max(100).optional(),
    carrier: Joi.string().max(100).optional(),
    cancellation_reason: Joi.string().max(500).optional(),
    admin_notes: Joi.string().max(1000).optional(),
});

/**
 * Return ID param validation
 */
const returnIdParamSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid return request ID format',
        'any.required': 'Return request ID is required',
    }),
});

/**
 * Return query validation
 */
const returnQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(
        'pending',
        'approved',
        'rejected',
        'items_received',
        'refund_processed',
        'completed',
        'cancelled'
    ),
    reason: Joi.string().valid(
        'defective',
        'wrong_item',
        'not_as_described',
        'damaged',
        'changed_mind',
        'better_price_elsewhere',
        'other'
    ),
    sort: Joi.string()
        .valid('created_at', '-created_at', 'status', 'refund_amount')
        .default('-created_at'),
});

export {
    createReturnRequestSchema,
    updateReturnStatusSchema,
    returnIdParamSchema,
    returnQuerySchema,
};

// CommonJS compatibility
module.exports = {
    createReturnRequestSchema,
    updateReturnStatusSchema,
    returnIdParamSchema,
    returnQuerySchema,
};
