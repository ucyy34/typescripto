/**
 * Shipping Support Controller
 * Handles shipping support calculation and management endpoints
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service/model types
const shippingSupportService = require('../services/shipping-support.service');
const { ShippingSupportRule, Store, Order, PlatformSettings } = require('../models');
const logger = require('../utils/logger');

interface AuthenticatedRequest extends Request {
    user?: { id: string; role: string };
}

const shippingSupportController = {
    calculateCartShipping: async (req: Request, res: Response) => {
        try {
            const authReq = req as AuthenticatedRequest;
            let { items, isNewCustomer = false } = req.body;
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Cart items are required' });
            }
            if (authReq.user) {
                const orderCount = await Order.count({ where: { user_id: authReq.user.id } });
                isNewCustomer = orderCount === 0;
            }
            const result = await shippingSupportService.calculateCartShipping(items, isNewCustomer);
            res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error('[ShippingController] Calculate error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getDefaultCost: async (req: Request, res: Response) => {
        try {
            const defaultCost = await shippingSupportService.getPlatformDefaultCost();
            const storeChargePercentage = await shippingSupportService.getStoreShippingChargePercentage();
            const maxShippingCap = await shippingSupportService.getMaxShippingCap();
            res.json({ success: true, data: { defaultCost, storeChargePercentage, maxShippingCap, currency: 'TRY' } });
        } catch (error: any) {
            logger.error('[ShippingController] Get default error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateMaxShippingCap: async (req: Request, res: Response) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { cap } = req.body;
            if (cap === undefined || cap === null) {
                return res.status(400).json({ success: false, message: 'cap is required' });
            }
            const capValue = parseFloat(cap);
            if (isNaN(capValue) || capValue < 0) {
                return res.status(400).json({ success: false, message: 'cap must be a non-negative number' });
            }
            await PlatformSettings.setValue('max_shipping_cap', capValue, 'number', authReq.user?.id);
            logger.info(`[ShippingController] Max shipping cap updated to ${capValue} by user ${authReq.user?.id}`);
            res.json({ success: true, message: capValue === 0 ? 'Kargo tavanı kaldırıldı' : 'Maksimum kargo tavanı güncellendi', data: { maxShippingCap: capValue } });
        } catch (error: any) {
            logger.error('[ShippingController] Update max cap error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateStoreChargePercentage: async (req: Request, res: Response) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { percentage } = req.body;
            if (percentage === undefined || percentage === null) {
                return res.status(400).json({ success: false, message: 'percentage is required' });
            }
            const pct = parseInt(percentage);
            if (isNaN(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ success: false, message: 'percentage must be between 0 and 100' });
            }
            await PlatformSettings.setValue('store_shipping_charge_percentage', pct, 'number', authReq.user?.id);
            logger.info(`[ShippingController] Store charge percentage updated to ${pct}% by user ${authReq.user?.id}`);
            res.json({ success: true, message: 'Mağaza kargo yansıtma oranı güncellendi', data: { percentage: pct } });
        } catch (error: any) {
            logger.error('[ShippingController] Update store charge error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateDefaultCost: async (req: Request, res: Response) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { defaultCost } = req.body;
            if (defaultCost === undefined || defaultCost === null) {
                return res.status(400).json({ success: false, message: 'defaultCost is required' });
            }
            const cost = parseFloat(defaultCost);
            if (isNaN(cost) || cost < 0) {
                return res.status(400).json({ success: false, message: 'defaultCost must be a positive number' });
            }
            await PlatformSettings.setValue('default_shipping_cost', cost, 'number', authReq.user?.id);
            logger.info(`[ShippingController] Default shipping cost updated to ${cost} by user ${authReq.user?.id}`);
            res.json({ success: true, message: 'Varsayılan kargo maliyeti güncellendi', data: { defaultCost: cost, currency: 'TRY' } });
        } catch (error: any) {
            logger.error('[ShippingController] Update default cost error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getAllRules: async (req: Request, res: Response) => {
        try {
            const rules = await ShippingSupportRule.findAll({ order: [['priority', 'ASC'], ['created_at', 'DESC']] });
            res.json({ success: true, data: { rules } });
        } catch (error: any) {
            logger.error('[ShippingController] Get rules error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createRule: async (req: Request, res: Response) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { name, description, condition_type, threshold_amount, scope, platform_contribution, is_active, start_date, end_date, priority } = req.body;
            if (!name || !condition_type) {
                return res.status(400).json({ success: false, message: 'Name and condition_type are required' });
            }
            const rule = await ShippingSupportRule.create({
                name, description, condition_type, threshold_amount,
                scope: scope || 'all',
                platform_contribution: platform_contribution || 100,
                is_active: is_active !== false,
                start_date, end_date,
                priority: priority || 10,
                created_by: authReq.user?.id,
            });
            res.status(201).json({ success: true, message: 'Kural oluşturuldu', data: { rule } });
        } catch (error: any) {
            logger.error('[ShippingController] Create rule error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateRule: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const rule = await ShippingSupportRule.findByPk(id);
            if (!rule) {
                return res.status(404).json({ success: false, message: 'Kural bulunamadı' });
            }
            await rule.update(updateData);
            res.json({ success: true, message: 'Kural güncellendi', data: { rule } });
        } catch (error: any) {
            logger.error('[ShippingController] Update rule error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteRule: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const rule = await ShippingSupportRule.findByPk(id);
            if (!rule) {
                return res.status(404).json({ success: false, message: 'Kural bulunamadı' });
            }
            await rule.destroy();
            res.json({ success: true, message: 'Kural silindi' });
        } catch (error: any) {
            logger.error('[ShippingController] Delete rule error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getShippingReport: async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;
            const report = await shippingSupportService.getShippingReport({ startDate, endDate });
            res.json({ success: true, data: report });
        } catch (error: any) {
            logger.error('[ShippingController] Get report error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getStoreSettings: async (req: Request, res: Response) => {
        try {
            const { storeId } = req.params;
            const store = await Store.findByPk(storeId, { attributes: ['id', 'name', 'shipping_cost', 'free_shipping_threshold', 'is_free_shipping'] });
            if (!store) {
                return res.status(404).json({ success: false, message: 'Mağaza bulunamadı' });
            }
            const platformDefault = await shippingSupportService.getPlatformDefaultCost();
            res.json({
                success: true,
                data: {
                    storeId: store.id, storeName: store.name, shippingCost: store.shipping_cost,
                    freeShippingThreshold: store.free_shipping_threshold, isFreeShipping: store.is_free_shipping,
                    platformDefault, effectiveCost: store.shipping_cost || platformDefault,
                },
            });
        } catch (error: any) {
            logger.error('[ShippingController] Get store settings error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateStoreSettings: async (req: Request, res: Response) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { storeId } = req.params;
            const { shipping_cost, free_shipping_threshold, is_free_shipping } = req.body;
            const store = await Store.findByPk(storeId);
            if (!store) {
                return res.status(404).json({ success: false, message: 'Mağaza bulunamadı' });
            }
            if (authReq.user?.id !== store.user_id && authReq.user?.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Bu mağazayı düzenleme yetkiniz yok' });
            }
            await store.update({
                shipping_cost: shipping_cost ?? store.shipping_cost,
                free_shipping_threshold: free_shipping_threshold ?? store.free_shipping_threshold,
                is_free_shipping: is_free_shipping ?? store.is_free_shipping,
            });
            res.json({
                success: true,
                message: 'Kargo ayarları güncellendi',
                data: { shippingCost: store.shipping_cost, freeShippingThreshold: store.free_shipping_threshold, isFreeShipping: store.is_free_shipping },
            });
        } catch (error: any) {
            logger.error('[ShippingController] Update store settings error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
};

export = shippingSupportController;
