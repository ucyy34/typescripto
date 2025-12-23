/**
 * Shipping Support Controller
 * Handles shipping support calculation and management endpoints
 */

const shippingSupportService = require('../services/shipping-support.service');
const { ShippingSupportRule, Store, Order } = require('../models');
const logger = require('../utils/logger');

/**
 * Calculate shipping support for cart
 * POST /api/v1/shipping/calculate
 */
exports.calculateCartShipping = async (req, res) => {
    try {
        let { items, isNewCustomer = false } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart items are required',
            });
        }

        // If user is logged in, verify "new customer" status from DB
        if (req.user) {
            const orderCount = await Order.count({ where: { user_id: req.user.id } });
            isNewCustomer = orderCount === 0;
        }

        const result = await shippingSupportService.calculateCartShipping(items, isNewCustomer);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error('[ShippingController] Calculate error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get platform default shipping cost
 * GET /api/v1/shipping/default
 */
exports.getDefaultCost = async (req, res) => {
    try {
        const defaultCost = await shippingSupportService.getPlatformDefaultCost();
        const storeChargePercentage = await shippingSupportService.getStoreShippingChargePercentage();
        const maxShippingCap = await shippingSupportService.getMaxShippingCap();

        res.json({
            success: true,
            data: {
                defaultCost,
                storeChargePercentage,
                maxShippingCap,
                currency: 'TRY',
            },
        });
    } catch (error) {
        logger.error('[ShippingController] Get default error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update max shipping cap
 * PUT /api/v1/shipping/admin/max-cap
 * Admin only
 */
exports.updateMaxShippingCap = async (req, res) => {
    try {
        const { cap } = req.body;

        if (cap === undefined || cap === null) {
            return res.status(400).json({
                success: false,
                message: 'cap is required',
            });
        }

        const capValue = parseFloat(cap);
        if (isNaN(capValue) || capValue < 0) {
            return res.status(400).json({
                success: false,
                message: 'cap must be a non-negative number',
            });
        }

        const { PlatformSettings } = require('../models');

        await PlatformSettings.setValue(
            'max_shipping_cap',
            capValue,
            'number',
            req.user?.id
        );

        logger.info(`[ShippingController] Max shipping cap updated to ${capValue} by user ${req.user?.id}`);

        res.json({
            success: true,
            message: capValue === 0 ? 'Kargo tavanı kaldırıldı' : 'Maksimum kargo tavanı güncellendi',
            data: {
                maxShippingCap: capValue,
            },
        });
    } catch (error) {
        logger.error('[ShippingController] Update max cap error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update store shipping charge percentage
 * PUT /api/v1/shipping/admin/store-charge
 * Admin only - How much of platform-covered shipping is charged back to stores
 */
exports.updateStoreChargePercentage = async (req, res) => {
    try {
        const { percentage } = req.body;

        if (percentage === undefined || percentage === null) {
            return res.status(400).json({
                success: false,
                message: 'percentage is required',
            });
        }

        const pct = parseInt(percentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            return res.status(400).json({
                success: false,
                message: 'percentage must be between 0 and 100',
            });
        }

        const { PlatformSettings } = require('../models');

        await PlatformSettings.setValue(
            'store_shipping_charge_percentage',
            pct,
            'number',
            req.user?.id
        );

        logger.info(`[ShippingController] Store charge percentage updated to ${pct}% by user ${req.user?.id}`);

        res.json({
            success: true,
            message: 'Mağaza kargo yansıtma oranı güncellendi',
            data: {
                percentage: pct,
            },
        });
    } catch (error) {
        logger.error('[ShippingController] Update store charge error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update platform default shipping cost
 * PUT /api/v1/shipping/default
 * Admin only
 */
exports.updateDefaultCost = async (req, res) => {
    try {
        const { defaultCost } = req.body;

        if (defaultCost === undefined || defaultCost === null) {
            return res.status(400).json({
                success: false,
                message: 'defaultCost is required',
            });
        }

        const cost = parseFloat(defaultCost);
        if (isNaN(cost) || cost < 0) {
            return res.status(400).json({
                success: false,
                message: 'defaultCost must be a positive number',
            });
        }

        // Import here to avoid circular dependency issues
        const { PlatformSettings } = require('../models');

        await PlatformSettings.setValue(
            'default_shipping_cost',
            cost,
            'number',
            req.user?.id
        );

        logger.info(`[ShippingController] Default shipping cost updated to ${cost} by user ${req.user?.id}`);

        res.json({
            success: true,
            message: 'Varsayılan kargo maliyeti güncellendi',
            data: {
                defaultCost: cost,
                currency: 'TRY',
            },
        });
    } catch (error) {
        logger.error('[ShippingController] Update default cost error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * Get all shipping support rules
 * GET /api/v1/shipping/admin/rules
 */
exports.getAllRules = async (req, res) => {
    try {
        const rules = await ShippingSupportRule.findAll({
            order: [['priority', 'ASC'], ['created_at', 'DESC']],
        });

        res.json({
            success: true,
            data: { rules },
        });
    } catch (error) {
        logger.error('[ShippingController] Get rules error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Create shipping support rule
 * POST /api/v1/shipping/admin/rules
 */
exports.createRule = async (req, res) => {
    try {
        const {
            name,
            description,
            condition_type,
            threshold_amount,
            scope,
            platform_contribution,
            is_active,
            start_date,
            end_date,
            priority,
        } = req.body;

        if (!name || !condition_type) {
            return res.status(400).json({
                success: false,
                message: 'Name and condition_type are required',
            });
        }

        const rule = await ShippingSupportRule.create({
            name,
            description,
            condition_type,
            threshold_amount,
            scope: scope || 'all',
            platform_contribution: platform_contribution || 100,
            is_active: is_active !== false,
            start_date,
            end_date,
            priority: priority || 10,
            created_by: req.user?.id,
        });

        res.status(201).json({
            success: true,
            message: 'Kural oluşturuldu',
            data: { rule },
        });
    } catch (error) {
        logger.error('[ShippingController] Create rule error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update shipping support rule
 * PUT /api/v1/shipping/admin/rules/:id
 */
exports.updateRule = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const rule = await ShippingSupportRule.findByPk(id);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: 'Kural bulunamadı',
            });
        }

        await rule.update(updateData);

        res.json({
            success: true,
            message: 'Kural güncellendi',
            data: { rule },
        });
    } catch (error) {
        logger.error('[ShippingController] Update rule error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Delete shipping support rule
 * DELETE /api/v1/shipping/admin/rules/:id
 */
exports.deleteRule = async (req, res) => {
    try {
        const { id } = req.params;

        const rule = await ShippingSupportRule.findByPk(id);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: 'Kural bulunamadı',
            });
        }

        await rule.destroy();

        res.json({
            success: true,
            message: 'Kural silindi',
        });
    } catch (error) {
        logger.error('[ShippingController] Delete rule error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get shipping report
 * GET /api/v1/shipping/admin/report
 */
exports.getShippingReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const report = await shippingSupportService.getShippingReport({
            startDate,
            endDate,
        });

        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        logger.error('[ShippingController] Get report error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ==========================================
// VENDOR ENDPOINTS
// ==========================================

/**
 * Get store shipping settings
 * GET /api/v1/shipping/store/:storeId
 */
exports.getStoreSettings = async (req, res) => {
    try {
        const { storeId } = req.params;

        const store = await Store.findByPk(storeId, {
            attributes: ['id', 'name', 'shipping_cost', 'free_shipping_threshold', 'is_free_shipping'],
        });

        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Mağaza bulunamadı',
            });
        }

        const platformDefault = await shippingSupportService.getPlatformDefaultCost();

        res.json({
            success: true,
            data: {
                storeId: store.id,
                storeName: store.name,
                shippingCost: store.shipping_cost,
                freeShippingThreshold: store.free_shipping_threshold,
                isFreeShipping: store.is_free_shipping,
                platformDefault,
                effectiveCost: store.shipping_cost || platformDefault,
            },
        });
    } catch (error) {
        logger.error('[ShippingController] Get store settings error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update store shipping settings
 * PUT /api/v1/shipping/store/:storeId
 */
exports.updateStoreSettings = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { shipping_cost, free_shipping_threshold, is_free_shipping } = req.body;

        const store = await Store.findByPk(storeId);
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Mağaza bulunamadı',
            });
        }

        // Verify ownership
        if (req.user?.id !== store.user_id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bu mağazayı düzenleme yetkiniz yok',
            });
        }

        await store.update({
            shipping_cost: shipping_cost ?? store.shipping_cost,
            free_shipping_threshold: free_shipping_threshold ?? store.free_shipping_threshold,
            is_free_shipping: is_free_shipping ?? store.is_free_shipping,
        });

        res.json({
            success: true,
            message: 'Kargo ayarları güncellendi',
            data: {
                shippingCost: store.shipping_cost,
                freeShippingThreshold: store.free_shipping_threshold,
                isFreeShipping: store.is_free_shipping,
            },
        });
    } catch (error) {
        logger.error('[ShippingController] Update store settings error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
