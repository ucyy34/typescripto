/**
 * Return Service
 * Business logic for return request management
 */

import { ReturnRequest, Order, OrderItem, Store, User, Product } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import commissionService from './commission.service';
import type OrderModel from '../models/Order';
import type ReturnRequestModel, { ReturnReason } from '../models/ReturnRequest';
import type StoreModel from '../models/Store';
import type { ReturnStatus } from '../models/types/model.types';

interface ReturnItemPayload {
  order_item_id: string;
  quantity: number;
  item_reason?: string;
}

interface ReturnData {
  order_id: string;
  reason: ReturnReason;
  description: string;
  items: ReturnItemPayload[];
  images?: string[];
}

interface ReturnFilters {
  page?: number | string;
  limit?: number | string;
  status?: string;
  reason?: string;
}

interface UpdateStatusData {
  status: ReturnStatus;
  store_response?: string;
  tracking_number?: string;
  carrier?: string;
  cancellation_reason?: string;
  admin_notes?: string;
}

interface OrderItemSummary {
  id: string;
  price: number;
  quantity: number;
  product_snapshot: {
    title: string;
  };
}

interface ValidatedReturnItem {
  order_item_id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  item_reason: string;
}

class ReturnService {
  // Basic text sanitizer to avoid control chars and overly long inputs
  sanitizeText(input: string | undefined | null, maxLen: number = 1000): string {
    return String(input || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .slice(0, maxLen)
      .trim();
  }
  /**
   * Create new return request
   * @param {string} userId - User ID
   * @param {Object} returnData - Return request data
   * @returns {Promise<ReturnRequest>} Created return request
   */
  async createReturnRequest(userId: string, returnData: ReturnData): Promise<ReturnRequestModel> {
    const { order_id, reason, description, items, images } = returnData;

    // Get order with items
    const order: OrderModel | null = await Order.findOne({
      where: { id: order_id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
        },
      ],
    });

    if (!order) {
      throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
    }

    // Verify order belongs to user
    if (order.user_id !== userId) {
      throw new ApiError('Unauthorized to return this order', StatusCodes.FORBIDDEN);
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      throw new ApiError(
        'Only delivered orders can be returned',
        StatusCodes.BAD_REQUEST
      );
    }

    // Check if return window is still open (store setting or default 14 days)
    const deliveredDate = new Date(order.delivered_at);
    const daysSinceDelivery = Math.floor(
      (new Date().getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    let returnWindowDays = 14;
    try {
      const store: StoreModel | null = await Store.findByPk(order.store_id);
      if (store && store.settings && typeof store.settings.return_window_days === 'number') {
        returnWindowDays = store.settings.return_window_days;
      }
    } catch (_) { }

    if (daysSinceDelivery > returnWindowDays) {
      throw new ApiError(
        `Return window has expired. Returns must be requested within ${returnWindowDays} days of delivery.`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Check if return already exists for this order
    const existingReturn = await ReturnRequest.findOne({
      where: {
        order_id,
        status: {
          [Op.notIn]: ['rejected', 'completed', 'cancelled'],
        },
      },
    });

    if (existingReturn) {
      throw new ApiError(
        'A return request already exists for this order',
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate items and calculate refund amount
    const { validatedItems, refundAmount } = await this.validateReturnItems(
      items,
      order
    );

    // Create return request
    const returnRequest: ReturnRequestModel = await ReturnRequest.create({
      order_id,
      user_id: userId,
      store_id: order.store_id,
      reason,
      description: this.sanitizeText(description, 2000),
      items: validatedItems,
      images: Array.isArray(images) ? images.map((u) => this.sanitizeText(u, 2000)) : [],
      refund_amount: refundAmount,
      status: 'pending',
    });

    return this.getReturnRequestById(returnRequest.id, userId);
  }

  /**
   * Validate return items and calculate refund
   * @param {Array} items - Items to return
   * @param {Order} order - Original order
   * @returns {Promise<Object>} Validated items and refund amount
   * @private
   */
  async validateReturnItems(items: ReturnItemPayload[], order: OrderModel): Promise<{ validatedItems: ValidatedReturnItem[]; refundAmount: number }> {
    const validatedItems: ValidatedReturnItem[] = [];
    let refundAmount = 0;
    let returnedSubtotalGross = 0; // sum of unitPrice * qty before coupon

    // Build map of previously returned quantities per order_item_id (exclude rejected/cancelled)
    const previousReturns: ReturnRequestModel[] = await ReturnRequest.findAll({
      where: {
        order_id: order.id,
        status: { [Op.notIn]: ['rejected', 'cancelled'] },
      },
      attributes: ['items'],
    });
    const previouslyReturned = new Map<string, number>();
    for (const rr of previousReturns) {
      const rrItems = (rr.items || []) as Array<{ order_item_id: string; quantity: number }>;
      rrItems.forEach((ri) => {
        const key = ri.order_item_id;
        const qty = Number(ri.quantity) || 0;
        previouslyReturned.set(key, (previouslyReturned.get(key) || 0) + qty);
      });
    }

    // Pre-calc totals for pro‑rata coupon sharing
    const orderHasCoupon = !!order.coupon_discount && Number(order.coupon_discount) > 0;
    const orderItems = order.items as OrderItemSummary[];
    const orderItemsSubtotal = orderItems.reduce(
      (sum, oi) => sum + (Number(oi.price) * Number(oi.quantity)),
      0
    );

    for (const item of items) {
      const orderItem = orderItems.find((oi) => oi.id === item.order_item_id);

      if (!orderItem) {
        throw new ApiError(`Order item ${item.order_item_id} not found`, StatusCodes.NOT_FOUND);
      }

      const alreadyReturned = previouslyReturned.get(orderItem.id) || 0;
      const orderedQty = Number(orderItem.quantity);
      const requestedQty = Number(item.quantity);

      if (requestedQty <= 0) {
        throw new ApiError('Return quantity must be greater than zero', StatusCodes.BAD_REQUEST);
      }
      if (requestedQty + alreadyReturned > orderedQty) {
        throw new ApiError(
          `Return quantity exceeds remaining quantity for ${orderItem.product_snapshot.title}. Remaining: ${orderedQty - alreadyReturned}`,
          StatusCodes.BAD_REQUEST
        );
      }

      const unitPrice = Number(orderItem.price);
      const grossRefund = unitPrice * requestedQty;
      returnedSubtotalGross += grossRefund;

      // Pro‑rata coupon discount share per this returned portion
      let couponShare = 0;
      if (orderHasCoupon && orderItemsSubtotal > 0) {
        const thisItemSubtotal = Number(orderItem.price) * Number(orderItem.quantity);
        const itemShareRatio = thisItemSubtotal / orderItemsSubtotal;
        const itemCouponTotalShare = Number(order.coupon_discount) * itemShareRatio;
        const perUnitCoupon = itemCouponTotalShare / Number(orderItem.quantity);
        couponShare = perUnitCoupon * requestedQty;
      }

      // Net refund excludes shipping; taxes were applied globally, not per item (kept simple here)
      const netRefund = Math.max(0, grossRefund - couponShare);
      refundAmount += netRefund;

      validatedItems.push({
        order_item_id: item.order_item_id,
        product_id: orderItem.product_id,
        product_title: orderItem.product_snapshot.title,
        quantity: requestedQty,
        unit_price: parseFloat(unitPrice.toFixed(2)),
        refund_amount: parseFloat(netRefund.toFixed(2)),
        item_reason: (item.item_reason || '').toString().slice(0, 500),
      });
    }

    // Shipping and tax refund policies
    try {
      const store: StoreModel | null = await Store.findByPk(order.store_id);
      const policy = (store && store.settings) || {};
      const shippingPolicy = policy.return_shipping_policy || 'none'; // 'none' | 'pro_rata' | 'full'
      const taxPolicy = policy.tax_refund_policy || 'pro_rata'; // 'none' | 'pro_rata' | 'full'

      const subtotalBase = orderItemsSubtotal > 0 ? orderItemsSubtotal : 0;
      const ratio = subtotalBase > 0 ? Math.min(1, returnedSubtotalGross / subtotalBase) : 0;

      // Shipping refund
      if (Number(order.shipping_fee) > 0) {
        if (shippingPolicy === 'full') {
          refundAmount += Number(order.shipping_fee);
        } else if (shippingPolicy === 'pro_rata') {
          refundAmount += Number(order.shipping_fee) * ratio;
        }
      }

      // Tax refund
      if (Number(order.tax) > 0) {
        if (taxPolicy === 'full') {
          refundAmount += Number(order.tax);
        } else if (taxPolicy === 'pro_rata') {
          refundAmount += Number(order.tax) * ratio;
        }
      }
    } catch (_) { }

    return {
      validatedItems,
      refundAmount: parseFloat(refundAmount.toFixed(2)),
    };
  }

  /**
   * Get return request by ID
   * @param {string} returnId - Return request ID
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {Promise<ReturnRequest>} Return request
   */
  async getReturnRequestById(returnId: string, userId: string, role: string = 'buyer'): Promise<ReturnRequestModel> {
    const whereClause: Record<string, unknown> = { id: returnId };

    const returnRequest: ReturnRequestModel | null = await ReturnRequest.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'status', 'total'],
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
    });

    if (!returnRequest) {
      throw new ApiError('Return request not found', StatusCodes.NOT_FOUND);
    }

    // Authorization check
    if (role === 'buyer' && returnRequest.user_id !== userId) {
      throw new ApiError('Unauthorized access', StatusCodes.FORBIDDEN);
    }

    if (role === 'seller') {
      // Verify seller owns the store
      const store = await Store.findOne({
        where: { id: returnRequest.store_id, user_id: userId },
      });
      if (!store) {
        throw new ApiError('Unauthorized access', StatusCodes.FORBIDDEN);
      }
    }

    return returnRequest;
  }

  /**
   * Get user's return requests
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Returns and pagination
   */
  async getUserReturnRequests(userId: string, filters: ReturnFilters = {}): Promise<{ returns: ReturnRequestModel[]; pagination: { total: number; page: number; limit: number; pages: number } }> {
    const { page = 1, limit = 20, status, reason } = filters;
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClause: Record<string, unknown> = { user_id: userId };

    if (status) {
      whereClause.status = status;
    }

    if (reason) {
      whereClause.reason = reason;
    }

    const { rows: returns, count } = await ReturnRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'total'],
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name'],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      returns,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(count / parsedLimit),
      },
    };
  }

  /**
   * Get store's return requests
   * @param {string} storeId - Store ID
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Returns and pagination
   */
  async getStoreReturnRequests(storeId: string, userId: string, filters: ReturnFilters = {}): Promise<{ returns: ReturnRequestModel[]; pagination: { total: number; page: number; limit: number; pages: number } }> {
    // Verify user owns store
    const store = await Store.findOne({
      where: { id: storeId, user_id: userId },
    });

    if (!store) {
      throw new ApiError('Store not found or unauthorized', StatusCodes.FORBIDDEN);
    }

    const { page = 1, limit = 20, status, reason } = filters;
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClause: Record<string, unknown> = { store_id: storeId };

    if (status) {
      whereClause.status = status;
    }

    if (reason) {
      whereClause.reason = reason;
    }

    const { rows: returns, count } = await ReturnRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'total'],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      returns,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(count / parsedLimit),
      },
    };
  }

  /**
   * Update return request status
   * @param {string} returnId - Return request ID
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @param {Object} updateData - Status update data
   * @returns {Promise<ReturnRequest>} Updated return request
   */
  async updateReturnStatus(returnId: string, userId: string, role: string, updateData: UpdateStatusData): Promise<ReturnRequestModel> {
    const { status, store_response, tracking_number, carrier, cancellation_reason, admin_notes } =
      updateData;

    const returnRequest = await this.getReturnRequestById(returnId, userId, role);

    // Check if transition is valid
    if (!returnRequest.canTransitionTo(status)) {
      throw new ApiError(
        `Cannot transition from ${returnRequest.status} to ${status}`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Authorization checks for different actions
    if (['approved', 'rejected', 'items_received', 'refund_processed'].includes(status)) {
      if (role !== 'seller' && role !== 'admin') {
        throw new ApiError('Only store owner or admin can perform this action', StatusCodes.FORBIDDEN);
      }
    }

    // Use transaction for status updates that affect order
    const transaction = await sequelize.transaction();

    try {
      // Update return request status
      await returnRequest.transitionTo(status, {
        approved_by: userId,
        store_response: this.sanitizeText(store_response, 2000),
        tracking_number,
        carrier,
        cancellation_reason: this.sanitizeText(cancellation_reason, 1000),
      });

      if (admin_notes) {
        returnRequest.admin_notes = this.sanitizeText(admin_notes, 2000);
        await returnRequest.save({ transaction });
      }

      // Update order status if refund is processed
      if (status === 'refund_processed' || status === 'completed') {
        const order: OrderModel | null = await Order.findByPk(returnRequest.order_id);
        if (order) {
          order.status = 'refunded';
          order.payment_status = 'refunded';
          await order.save({ transaction });
        }

        // Restore stock for returned items
        for (const item of returnRequest.items) {
          await Product.increment('stock', {
            by: item.quantity,
            where: { id: item.product_id },
            transaction,
          });
        }

        // Adjust commission transaction based on refund
        try {
          await commissionService.handleOrderRefund(returnRequest.order_id, returnRequest.refund_amount);
        } catch (e: unknown) {
          // Log and continue; commission adjustments should not break returns
          console.warn('[returns] commission adjust failed:', e);
        }
      }

      await transaction.commit();

      return this.getReturnRequestById(returnId, userId, role);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Cancel return request
   * @param {string} returnId - Return request ID
   * @param {string} userId - User ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<ReturnRequest>} Cancelled return request
   */
  async cancelReturnRequest(returnId: string, userId: string, reason: string): Promise<ReturnRequestModel> {
    const returnRequest = await this.getReturnRequestById(returnId, userId, 'buyer');

    if (!returnRequest.isCancellable()) {
      throw new ApiError('This return request cannot be cancelled', StatusCodes.BAD_REQUEST);
    }

    await returnRequest.transitionTo('cancelled', {
      cancellation_reason: reason,
    });

    return this.getReturnRequestById(returnId, userId, 'buyer');
  }
}

export = new ReturnService();



