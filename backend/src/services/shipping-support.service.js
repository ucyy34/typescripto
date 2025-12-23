/**
 * Shipping Support Service
 * Calculates shipping support amounts based on store policies and platform rules
 * 
 * KEY CONCEPT: "Kargo Desteği" (Shipping Support) instead of "Kargo Ücreti" (Shipping Fee)
 * Customer provides "support" to stores, not paying a "fee"
 */

const { Op } = require('sequelize');
const { Store, ShippingSupportRule, Order, PlatformSettings } = require('../models');
const logger = require('../utils/logger');

// Fallback if database not available
const FALLBACK_SHIPPING_COST = 35.00;

class ShippingSupportService {

    /**
     * Get platform default shipping cost from database
     * @returns {Promise<number>}
     */
    async getPlatformDefaultCost() {
        try {
            const cost = await PlatformSettings.getValue('default_shipping_cost', FALLBACK_SHIPPING_COST);
            return parseFloat(cost) || FALLBACK_SHIPPING_COST;
        } catch (error) {
            logger.error('[ShippingSupportService] Error fetching default cost:', error);
            return FALLBACK_SHIPPING_COST;
        }
    }

    /**
     * Get store shipping charge percentage from platform settings
     * This is the percentage of platform-covered shipping that gets charged back to stores
     * @returns {Promise<number>} Percentage (0-100)
     */
    async getStoreShippingChargePercentage() {
        try {
            const percentage = await PlatformSettings.getValue('store_shipping_charge_percentage', 50);
            return Math.min(100, Math.max(0, parseFloat(percentage) || 50));
        } catch (error) {
            logger.error('[ShippingSupportService] Error fetching store charge percentage:', error);
            return 50; // Default 50%
        }
    }

    /**
     * Get maximum shipping cap from platform settings
     * Customer never pays more than this amount for shipping
     * @returns {Promise<number>} Max cap (0 = no cap)
     */
    async getMaxShippingCap() {
        try {
            const cap = await PlatformSettings.getValue('max_shipping_cap', 0);
            return parseFloat(cap) || 0; // 0 means no cap
        } catch (error) {
            logger.error('[ShippingSupportService] Error fetching max shipping cap:', error);
            return 0;
        }
    }

    /**
     * Get store's effective shipping cost
     * @param {Object} store - Store object or store_id
     * @returns {number}
     */
    async getStoreShippingCost(store) {
        let storeData = store;

        if (typeof store === 'string') {
            storeData = await Store.findByPk(store);
        }

        if (!storeData) {
            return await this.getPlatformDefaultCost();
        }

        // If store has custom cost, use it; otherwise use platform default
        if (storeData.shipping_cost !== null && storeData.shipping_cost !== undefined) {
            return parseFloat(storeData.shipping_cost);
        }

        return await this.getPlatformDefaultCost();
    }

    /**
     * Calculate shipping support for a single store order
     * @param {Object} params
     * @param {string} params.storeId - Store ID
     * @param {number} params.orderTotal - Order subtotal for this store
     * @param {number} params.cartTotal - Total cart value (for platform rules)
     * @param {number} params.storeCount - Number of stores in cart
     * @param {boolean} params.isNewCustomer - Is this customer's first order
     * @returns {Object} Shipping breakdown
     */
    async calculateShippingSupport({ storeId, orderTotal, cartTotal = null, storeCount = 1, isNewCustomer = false }) {
        try {
            const store = await Store.findByPk(storeId);

            if (!store) {
                throw new Error('Store not found');
            }

            // Get actual shipping cost
            const actualCost = await this.getStoreShippingCost(store);

            // Initialize breakdown
            let breakdown = {
                actualCost,
                customerPays: actualCost,
                storeCovered: 0,
                platformCovered: 0,
                appliedRuleId: null,
                isFree: false,
            };

            // STEP 1: Check store-level free shipping
            if (store.is_free_shipping) {
                // Store offers free shipping on all orders
                breakdown.customerPays = 0;
                breakdown.storeCovered = actualCost;
                breakdown.isFree = true;

                logger.info(`[ShippingSupportService] Store ${storeId} offers free shipping`);
                return breakdown;
            }

            // STEP 2: Check store's free shipping threshold
            if (store.free_shipping_threshold && orderTotal >= parseFloat(store.free_shipping_threshold)) {
                // Order exceeds store's free shipping threshold
                breakdown.customerPays = 0;
                breakdown.storeCovered = actualCost;
                breakdown.isFree = true;

                logger.info(`[ShippingSupportService] Order ${orderTotal} >= threshold ${store.free_shipping_threshold}`);
                return breakdown;
            }

            // STEP 3: Check platform rules (highest priority - can override)
            const platformRule = await this.findApplicablePlatformRule({
                cartTotal: cartTotal || orderTotal,
                storeCount,
                isNewCustomer,
            });

            if (platformRule) {
                const platformContribution = (actualCost * platformRule.platform_contribution) / 100;
                breakdown.platformCovered = Math.round(platformContribution * 100) / 100;
                breakdown.customerPays = actualCost - breakdown.platformCovered;
                breakdown.appliedRuleId = platformRule.id;
                breakdown.isFree = breakdown.customerPays <= 0;

                logger.info(`[ShippingSupportService] Platform rule applied: ${platformRule.name}, covering ${platformRule.platform_contribution}%`);
            }

            // Ensure customer never pays negative
            breakdown.customerPays = Math.max(0, breakdown.customerPays);

            return breakdown;

        } catch (error) {
            logger.error('[ShippingSupportService] Error calculating shipping:', error);
            throw error;
        }
    }

    /**
     * Find applicable platform shipping rule
     * @param {Object} cart - Cart data
     * @returns {ShippingSupportRule|null}
     */
    async findApplicablePlatformRule({ cartTotal, storeCount, isNewCustomer }) {
        try {
            const now = new Date();

            const rules = await ShippingSupportRule.findAll({
                where: {
                    is_active: true,
                    [Op.or]: [
                        { start_date: null },
                        { start_date: { [Op.lte]: now } },
                    ],
                },
                order: [['priority', 'ASC']],
            });

            // Filter by end_date (need to check separately due to OR complexity)
            const validRules = rules.filter(rule => {
                if (rule.end_date && new Date(rule.end_date) < now) {
                    return false;
                }
                return true;
            });

            // Find first matching rule (priority order)
            for (const rule of validRules) {
                const applies = rule.appliesTo({
                    total: cartTotal,
                    storeCount,
                    isNewCustomer,
                });

                if (applies) {
                    // Also check scope
                    if (rule.scope === 'multi_store_only' && storeCount <= 1) {
                        continue;
                    }
                    if (rule.scope === 'new_customers' && !isNewCustomer) {
                        continue;
                    }

                    return rule;
                }
            }

            return null;
        } catch (error) {
            logger.error('[ShippingSupportService] Error finding platform rule:', error);
            return null;
        }
    }

    /**
     * Calculate shipping for entire cart (multiple stores)
     * @param {Array} cartItems - Items grouped by store
     * @param {boolean} isNewCustomer
     * @returns {Object} Cart shipping summary
     */
    async calculateCartShipping(cartItems, isNewCustomer = false) {
        try {
            // Group items by store
            const storeGroups = {};
            let cartTotal = 0;

            cartItems.forEach(item => {
                const storeId = item.store_id || item.storeId;
                if (!storeGroups[storeId]) {
                    storeGroups[storeId] = {
                        storeId,
                        items: [],
                        subtotal: 0,
                    };
                }
                storeGroups[storeId].items.push(item);
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                storeGroups[storeId].subtotal += itemTotal;
                cartTotal += itemTotal;
            });

            const storeCount = Object.keys(storeGroups).length;

            // STEP 1: Check for GLOBAL cart-level platform rule first
            // If total cart meets a cart_total rule with 100% contribution, all shipping is free
            const globalRule = await this.findApplicablePlatformRule({
                cartTotal,
                storeCount,
                isNewCustomer,
            });

            const hasGlobalFreeShipping = globalRule &&
                globalRule.condition_type === 'cart_total' &&
                globalRule.platform_contribution >= 100;

            // Calculate shipping for each store
            const storeShipping = [];
            let totalCustomerPays = 0;
            let totalActualCost = 0;
            let totalPlatformCovered = 0;
            let totalStoreCovered = 0;

            for (const storeId of Object.keys(storeGroups)) {
                const group = storeGroups[storeId];

                // If global free shipping applies, override per-store calculations
                if (hasGlobalFreeShipping) {
                    const actualCost = await this.getStoreShippingCost(storeId);

                    storeShipping.push({
                        storeId,
                        storeName: null,
                        subtotal: group.subtotal,
                        actualCost,
                        customerPays: 0,
                        storeCovered: 0,
                        platformCovered: actualCost,
                        appliedRuleId: globalRule.id,
                        isFree: true,
                    });

                    totalActualCost += actualCost;
                    totalPlatformCovered += actualCost;

                    logger.info(`[ShippingSupportService] Global cart rule applied: ${globalRule.name} for store ${storeId}`);
                } else {
                    // Normal per-store calculation
                    const breakdown = await this.calculateShippingSupport({
                        storeId,
                        orderTotal: group.subtotal,
                        cartTotal,
                        storeCount,
                        isNewCustomer,
                    });

                    storeShipping.push({
                        storeId,
                        storeName: null,
                        subtotal: group.subtotal,
                        ...breakdown,
                    });

                    totalCustomerPays += breakdown.customerPays;
                    totalActualCost += breakdown.actualCost;
                    totalPlatformCovered += breakdown.platformCovered;
                    totalStoreCovered += breakdown.storeCovered;
                }
            }

            // Get store charge percentage for calculating what stores owe platform
            const storeChargePercentage = await this.getStoreShippingChargePercentage();

            // Calculate what each store owes platform for platform-covered shipping
            let totalStoreOwes = 0;
            for (const storeData of storeShipping) {
                if (storeData.platformCovered > 0) {
                    const storeOwes = Math.round((storeData.platformCovered * storeChargePercentage / 100) * 100) / 100;
                    storeData.storeOwes = storeOwes;
                    totalStoreOwes += storeOwes;
                } else {
                    storeData.storeOwes = 0;
                }
            }

            // Apply maximum shipping cap
            const maxShippingCap = await this.getMaxShippingCap();
            let finalCustomerPays = totalCustomerPays;
            let capApplied = false;

            if (maxShippingCap > 0 && totalCustomerPays > maxShippingCap) {
                finalCustomerPays = maxShippingCap;
                capApplied = true;
                logger.info(`[ShippingSupportService] Shipping cap applied: ${totalCustomerPays} -> ${maxShippingCap}`);
            }

            return {
                stores: storeShipping,
                summary: {
                    totalShippingSupport: Math.round(finalCustomerPays * 100) / 100,
                    totalActualCost: Math.round(totalActualCost * 100) / 100,
                    totalPlatformCovered: Math.round(totalPlatformCovered * 100) / 100,
                    totalStoreCovered: Math.round(totalStoreCovered * 100) / 100,
                    totalStoreOwes: Math.round(totalStoreOwes * 100) / 100,
                    storeChargePercentage,
                    isFree: finalCustomerPays <= 0,
                    storeCount,
                    appliedGlobalRule: hasGlobalFreeShipping ? globalRule.name : null,
                    // Shipping cap info
                    maxShippingCap: maxShippingCap > 0 ? maxShippingCap : null,
                    capApplied,
                    savedByCap: capApplied ? Math.round((totalCustomerPays - finalCustomerPays) * 100) / 100 : 0,
                },
            };

        } catch (error) {
            logger.error('[ShippingSupportService] Error calculating cart shipping:', error);
            throw error;
        }
    }

    /**
     * Get shipping report for admin dashboard
     * @param {Object} options - Date range options
     * @returns {Object} Shipping statistics
     */
    async getShippingReport(options = {}) {
        try {
            const { startDate, endDate } = options;

            const where = {};
            if (startDate) {
                where.created_at = { [Op.gte]: new Date(startDate) };
            }
            if (endDate) {
                where.created_at = { ...where.created_at, [Op.lte]: new Date(endDate) };
            }

            const orders = await Order.findAll({
                where,
                attributes: [
                    'shipping_actual_cost',
                    'shipping_customer_paid',
                    'shipping_store_covered',
                    'shipping_platform_covered',
                ],
            });

            let totalActualCost = 0;
            let totalCustomerPaid = 0;
            let totalStoreCovered = 0;
            let totalPlatformCovered = 0;

            orders.forEach(order => {
                totalActualCost += parseFloat(order.shipping_actual_cost) || 0;
                totalCustomerPaid += parseFloat(order.shipping_customer_paid) || 0;
                totalStoreCovered += parseFloat(order.shipping_store_covered) || 0;
                totalPlatformCovered += parseFloat(order.shipping_platform_covered) || 0;
            });

            return {
                orderCount: orders.length,
                totalActualCost: Math.round(totalActualCost * 100) / 100,
                totalCustomerPaid: Math.round(totalCustomerPaid * 100) / 100,
                totalStoreCovered: Math.round(totalStoreCovered * 100) / 100,
                totalPlatformCovered: Math.round(totalPlatformCovered * 100) / 100,
                customerPercentage: totalActualCost > 0 ? Math.round((totalCustomerPaid / totalActualCost) * 1000) / 10 : 0,
                storePercentage: totalActualCost > 0 ? Math.round((totalStoreCovered / totalActualCost) * 1000) / 10 : 0,
                platformPercentage: totalActualCost > 0 ? Math.round((totalPlatformCovered / totalActualCost) * 1000) / 10 : 0,
            };

        } catch (error) {
            logger.error('[ShippingSupportService] Error generating shipping report:', error);
            throw error;
        }
    }
}

module.exports = new ShippingSupportService();
