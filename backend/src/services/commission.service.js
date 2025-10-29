/**
 * Commission Service
 * Handles commission calculations and transactions
 */

const {
  CommissionSettings,
  CommissionTransaction,
  Store,
  Order,
  OrderItem,
  Product,
  Category,
} = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');

class CommissionService {
  /**
   * Calculate commission for an order
   * Supports category-based rates (overrides global settings)
   * @param {Object} order - Order object
   * @returns {Promise<Object>} Commission calculation details
   */
  async calculateCommission(order) {
    // Get commission settings for the store
    const settings = await CommissionSettings.getActiveSettings(order.store_id);

    if (!settings) {
      throw new ApiError(
        'No commission settings found for this store',
        StatusCodes.NOT_FOUND
      );
    }

    if (!settings.isValid()) {
      throw new ApiError(
        'Commission settings are not currently valid',
        StatusCodes.BAD_REQUEST
      );
    }

    // Get order items with product categories
    const orderItems = await OrderItem.findAll({
      where: { order_id: order.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'commission_rate'],
            },
          ],
        },
      ],
    });

    let totalCommission = 0;
    let hasCustomRates = false;
    const itemBreakdown = [];

    // Calculate commission for each item (category-based or global)
    for (const item of orderItems) {
      const itemTotal = parseFloat(item.total);
      const category = item.product?.category;
      
      let itemCommissionRate = parseFloat(settings.default_rate);
      let rateSource = 'global';

      // Check if category has custom commission rate
      if (category && category.commission_rate !== null) {
        itemCommissionRate = parseFloat(category.commission_rate);
        rateSource = 'category';
        hasCustomRates = true;
      }

      const itemCommission = itemTotal * (itemCommissionRate / 100);
      totalCommission += itemCommission;

      itemBreakdown.push({
        product_id: item.product_id,
        product_name: item.product?.name || 'Unknown',
        category_name: category?.name || 'Unknown',
        item_total: itemTotal,
        commission_rate: itemCommissionRate,
        commission_amount: parseFloat(itemCommission.toFixed(2)),
        rate_source: rateSource,
      });
    }

    // Apply min/max constraints
    if (settings.min_commission && totalCommission < settings.min_commission) {
      totalCommission = settings.min_commission;
    }
    if (settings.max_commission && totalCommission > settings.max_commission) {
      totalCommission = settings.max_commission;
    }

    const commissionAmount = parseFloat(totalCommission.toFixed(2));
    const sellerAmount = parseFloat((order.total - commissionAmount).toFixed(2));

    // Calculate average rate for display
    const averageRate = (commissionAmount / parseFloat(order.total)) * 100;

    return {
      settings,
      order_total: parseFloat(order.total),
      commission_rate: parseFloat(averageRate.toFixed(2)),
      commission_amount: commissionAmount,
      seller_amount: sellerAmount,
      platform_amount: commissionAmount,
      calculation_type: hasCustomRates ? 'category_based' : 'global',
      item_breakdown: itemBreakdown,
    };
  }

  /**
   * Create commission transaction for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<CommissionTransaction>}
   */
  async createCommissionTransaction(orderId) {
    // Get order with store info
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Store,
          as: 'store',
        },
      ],
    });

    if (!order) {
      throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
    }

    // Check if commission already exists
    const existingCommission = await CommissionTransaction.findOne({
      where: { order_id: orderId },
    });

    if (existingCommission) {
      return existingCommission;
    }

    // Calculate commission (category-based or global)
    const calculation = await this.calculateCommission(order);

    // Store item breakdown in notes for reference
    const notes = calculation.calculation_type === 'category_based'
      ? `Category-based calculation\n${JSON.stringify(calculation.item_breakdown, null, 2)}`
      : 'Global rate calculation';

    // Create transaction
    const transaction = await CommissionTransaction.create({
      order_id: orderId,
      store_id: order.store_id,
      setting_id: calculation.settings.id,
      order_total: calculation.order_total,
      commission_rate: calculation.commission_rate,
      commission_amount: calculation.commission_amount,
      seller_amount: calculation.seller_amount,
      platform_amount: calculation.platform_amount,
      status: 'calculated',
      calculated_at: new Date(),
      notes: notes,
    });

    return transaction;
  }

  /**
   * Get commission transaction for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<CommissionTransaction>}
   */
  async getCommissionByOrderId(orderId) {
    const transaction = await CommissionTransaction.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'status', 'total'],
        },
        {
          model: CommissionSettings,
          as: 'settings',
        },
      ],
    });

    if (!transaction) {
      throw new ApiError(
        'Commission transaction not found',
        StatusCodes.NOT_FOUND
      );
    }

    return transaction;
  }

  /**
   * Get store's commission transactions
   * @param {string} storeId - Store ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>}
   */
  async getStoreCommissions(storeId, filters = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = filters;

    const offset = (page - 1) * limit;
    const whereClause = { store_id: storeId };

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.calculated_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const { rows: transactions, count } = await CommissionTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'status', 'total', 'created_at'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['calculated_at', 'DESC']],
    });

    return {
      transactions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get store's commission summary
   * @param {string} storeId - Store ID
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Object>}
   */
  async getStoreSummary(storeId, startDate, endDate) {
    const summary = await CommissionTransaction.getStoreSummary(
      storeId,
      startDate,
      endDate
    );

    return summary;
  }

  /**
   * Get platform commission summary
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Object>}
   */
  async getPlatformSummary(startDate, endDate) {
    const summary = await CommissionTransaction.getPlatformSummary(
      startDate,
      endDate
    );

    return summary;
  }

  /**
   * Get all commission transactions (admin)
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>}
   */
  async getAllCommissions(filters = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      storeId,
      startDate,
      endDate,
    } = filters;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (storeId) {
      whereClause.store_id = storeId;
    }

    if (startDate && endDate) {
      whereClause.calculated_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const { rows: transactions, count } = await CommissionTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'status', 'total'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['calculated_at', 'DESC']],
    });

    return {
      transactions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Create or update commission settings
   * @param {Object} settingsData - Settings data
   * @returns {Promise<CommissionSettings>}
   */
  async createOrUpdateSettings(settingsData) {
    const { store_id, ...data } = settingsData;

    // If updating store-specific settings
    if (store_id) {
      // Verify store exists
      const store = await Store.findByPk(store_id);
      if (!store) {
        throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
      }

      // Check if settings already exist
      const existing = await CommissionSettings.findOne({
        where: { store_id },
      });

      if (existing) {
        await existing.update(data);
        return existing;
      }
    }

    // Create new settings
    const settings = await CommissionSettings.create({
      store_id: store_id || null,
      ...data,
    });

    return settings;
  }

  /**
   * Get commission settings for a store
   * @param {string} storeId - Store ID (null for global)
   * @returns {Promise<CommissionSettings>}
   */
  async getSettings(storeId = null) {
    const settings = await CommissionSettings.findOne({
      where: { store_id: storeId },
      order: [['created_at', 'DESC']],
    });

    if (!settings && storeId) {
      // Return global settings if no store-specific settings
      return this.getSettings(null);
    }

    return settings;
  }

  /**
   * Handle order refund - update commission transaction
   * @param {string} orderId - Order ID
   * @param {number} refundAmount - Refund amount
   * @returns {Promise<CommissionTransaction>}
   */
  async handleOrderRefund(orderId, refundAmount = null) {
    const transaction = await CommissionTransaction.findOne({
      where: { order_id: orderId },
    });

    if (!transaction) {
      throw new ApiError(
        'Commission transaction not found',
        StatusCodes.NOT_FOUND
      );
    }

    await transaction.markAsRefunded(refundAmount);

    return transaction;
  }

  /**
   * Mark commission as paid to seller
   * @param {string} transactionId - Transaction ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<CommissionTransaction>}
   */
  async markAsPaid(transactionId, paymentDetails) {
    const transaction = await CommissionTransaction.findByPk(transactionId);

    if (!transaction) {
      throw new ApiError(
        'Commission transaction not found',
        StatusCodes.NOT_FOUND
      );
    }

    await transaction.markAsPaid(
      paymentDetails.payment_method,
      paymentDetails.payment_reference,
      paymentDetails.payout_id
    );

    return transaction;
  }

  /**
   * Initialize default global settings if none exist
   * @returns {Promise<CommissionSettings>}
   */
  async initializeDefaultSettings() {
    const existing = await CommissionSettings.findOne({
      where: { store_id: null },
    });

    if (existing) {
      return existing;
    }

    return CommissionSettings.createDefaultSettings();
  }

  async handleOrderPaid(event) {
    if (!event || !event.orderId) {
      return null;
    }

    try {
      return await this.createCommissionTransaction(event.orderId);
    } catch (error) {
      console.error('[Commission Service] Failed to process commission for paid order', {
        orderId: event.orderId,
        error: error.message,
      });
      return null;
    }
  }

  async handleOrderFailed(event) {
    if (!event || !event.orderId) {
      return null;
    }

    await CommissionTransaction.destroy({ where: { order_id: event.orderId } });
    return null;
  }
}

module.exports = new CommissionService();

