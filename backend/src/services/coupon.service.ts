/**
 * Coupon Service
 * Business logic for coupon management and validation
 */

import { Coupon, CouponUsage, Order, User, Store } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';

interface ValidateCouponOptions {
  userId?: string | null;
  orderAmount?: number;
  orderItems?: Array<{
    product_id?: string;
    category_id?: string;
    store_id?: string;
  }>;
  storeId?: string | null;
}

interface CouponFilters {
  page?: number | string;
  limit?: number | string;
  status?: string;
  storeId?: string;
  search?: string;
}

class CouponService {
  /**
   * Deactivate expired coupons (auto housekeeping)
   */
  async deactivateExpiredCoupons() {
    const now = new Date();
    await Coupon.update(
      { is_active: false },
      {
        where: {
          is_active: true,
          valid_until: { [Op.ne]: null, [Op.lt]: now },
        },
      }
    );
  }
  /**
   * Validate coupon code
   * @param {string} code - Coupon code
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result with coupon and discount
   */
  async validateCoupon(code: string, options: ValidateCouponOptions = {}) {
    const {
      userId = null,
      orderAmount = 0,
      orderItems = [],
      storeId = null,
    } = options;

    // Find coupon
    const coupon = await Coupon.findByCode(code);

    if (!coupon) {
      throw new ApiError('Invalid coupon code', StatusCodes.NOT_FOUND);
    }

    // Check if active
    if (!coupon.is_active) {
      throw new ApiError('This coupon is not active', StatusCodes.BAD_REQUEST);
    }

    // Check validity period
    if (!coupon.isValidNow()) {
      throw new ApiError(
        'This coupon is expired or not yet valid',
        StatusCodes.BAD_REQUEST
      );
    }

    // Check global usage limit
    if (coupon.hasReachedLimit()) {
      throw new ApiError(
        'This coupon has reached its usage limit',
        StatusCodes.BAD_REQUEST
      );
    }

    // Check user-specific usage limit
    if (userId) {
      const userUsageCount = await CouponUsage.getUserUsageCount(
        coupon.id,
        userId
      );

      if (userUsageCount >= coupon.usage_limit_per_user) {
        throw new ApiError(
          `You have already used this coupon ${coupon.usage_limit_per_user} time(s)`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // Check minimum order amount
    if (orderAmount < parseFloat(String(coupon.min_order_amount))) {
      throw new ApiError(
        `Minimum order amount is ₺${coupon.min_order_amount}`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Check first order only
    if (coupon.first_order_only && userId) {
      const userOrderCount = await Order.count({
        where: { user_id: userId },
      });

      if (userOrderCount > 0) {
        throw new ApiError(
          'This coupon is only valid for your first order',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // Check applicability (products, categories, stores)
    // Stores: must validate against storeId even if orderItems are not provided
    if (coupon.applicable_to === 'stores') {
      if (!storeId || !coupon.applicable_ids?.includes(storeId)) {
        throw new ApiError(
          'This coupon is not applicable to this store',
          StatusCodes.BAD_REQUEST
        );
      }
    } else if (coupon.applicable_to === 'products') {
      if (!orderItems || orderItems.length === 0) {
        throw new ApiError(
          'This coupon applies to specific products and requires item details',
          StatusCodes.BAD_REQUEST
        );
      }
      const isApplicable = await this.checkApplicability(
        coupon,
        orderItems,
        storeId
      );
      if (!isApplicable) {
        throw new ApiError(
          'This coupon is not applicable to items in your cart',
          StatusCodes.BAD_REQUEST
        );
      }
    } else if (coupon.applicable_to === 'categories') {
      // Optional: require items to validate categories mapping
      if (orderItems && orderItems.length > 0) {
        const isApplicable = await this.checkApplicability(
          coupon,
          orderItems,
          storeId
        );
        if (!isApplicable) {
          throw new ApiError(
            'This coupon is not applicable to items in your cart',
            StatusCodes.BAD_REQUEST
          );
        }
      }
      // If no orderItems provided, skip category validation here.
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(orderAmount);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
      discount_amount: discountAmount,
      final_amount: Math.max(0, orderAmount - discountAmount),
    };
  }

  /**
   * Check if coupon is applicable to cart items
   * @param {Coupon} coupon
   * @param {Array} orderItems
   * @param {string} storeId
   * @returns {Promise<boolean>}
   */
  async checkApplicability(coupon, orderItems, storeId) {
    if (coupon.applicable_to === 'all') {
      return true;
    }

    if (coupon.applicable_to === 'stores') {
      return coupon.applicable_ids.includes(storeId);
    }

    if (coupon.applicable_to === 'products') {
      const productIds = orderItems.map((item) => item.product_id);
      return productIds.some((id) => coupon.applicable_ids.includes(id));
    }

    if (coupon.applicable_to === 'categories') {
      // This would need to check product categories
      // For now, return true (implement later if needed)
      return true;
    }

    return false;
  }

  /**
   * Apply coupon to order
   * @param {string} code - Coupon code
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<CouponUsage>}
   */
  async applyCouponToOrder(code, orderId, userId = null) {
    // Get order
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
    }

    // Validate coupon
    const validation = await this.validateCoupon(code, {
      userId,
      orderAmount: parseFloat(String(order.total)),
      storeId: order.store_id,
    });

    // Create coupon usage record
    const usage = await CouponUsage.create({
      coupon_id: validation.coupon.id,
      user_id: userId,
      order_id: orderId,
      discount_amount: validation.discount_amount,
      order_total: parseFloat(String(order.total)),
      final_total: validation.final_amount,
    });

    // Increment coupon usage count
    await Coupon.increment('times_used', {
      where: { id: validation.coupon.id },
    });

    return usage;
  }

  /**
   * Create new coupon
   * @param {Object} couponData - Coupon data
   * @param {string} createdBy - Admin user ID
   * @returns {Promise<Coupon>}
   */
  async createCoupon(couponData, createdBy) {
    // Determine creator role; if seller, enforce store-scoped coupons
    const creator = await User.findByPk(createdBy);
    if (!creator) {
      throw new ApiError('Creator not found', StatusCodes.NOT_FOUND);
    }

    let data = { ...couponData, created_by: createdBy };

    if (creator.role === 'seller') {
      const store = await Store.findOne({ where: { user_id: createdBy } });
      if (!store) {
        throw new ApiError('Seller has no store to scope coupon', StatusCodes.BAD_REQUEST);
      }
      data.applicable_to = 'stores';
      data.applicable_ids = [store.id];
      // Require admin approval for seller-created coupons
      data.is_active = false;
    }

    const coupon = await Coupon.create(data);
    return coupon;
  }

  /**
   * Update coupon
   * @param {string} couponId - Coupon ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Coupon>}
   */
  async updateCoupon(couponId, updateData) {
    const coupon = await Coupon.findByPk(couponId);

    if (!coupon) {
      throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);
    }

    // Don't allow changing code if coupon has been used
    if (updateData.code && coupon.times_used > 0) {
      throw new ApiError(
        'Cannot change code of a used coupon',
        StatusCodes.BAD_REQUEST
      );
    }

    await coupon.update(updateData);

    return coupon;
  }

  /**
   * Delete coupon (soft delete)
   * @param {string} couponId - Coupon ID
   * @returns {Promise<boolean>}
   */
  async deleteCoupon(couponId) {
    const coupon = await Coupon.findByPk(couponId);

    if (!coupon) {
      throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);
    }

    // Soft delete
    await coupon.destroy();

    return true;
  }

  /**
   * Get all coupons (admin)
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>}
   */
  async getAllCoupons(filters: CouponFilters = {}) {
    // Housekeeping: auto-deactivate expired coupons so admin sees up-to-date state
    await this.deactivateExpiredCoupons();
    const {
      page = 1,
      limit = 20,
      is_active,
      discount_type,
      search,
    } = filters;

    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;
    const whereClause: Record<string, unknown> = {};

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    if (discount_type) {
      whereClause.discount_type = discount_type;
    }

    if (search) {
      whereClause[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows: coupons, count } = await Coupon.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'first_name', 'last_name'],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['created_at', 'DESC']],
      paranoid: false, // Include soft-deleted
    });

    return {
      coupons,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(count / parsedLimit),
      },
    };
  }

  /**
   * Get active coupons for user
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Array<Coupon>>}
   */
  async getActiveCoupons(userId = null) {
    const coupons = await Coupon.getActiveCoupons();

    // Filter based on user usage if userId provided
    if (userId) {
      const filteredCoupons = [];

      for (const coupon of coupons) {
        const userUsageCount = await CouponUsage.getUserUsageCount(
          coupon.id,
          userId
        );

        if (userUsageCount < coupon.usage_limit_per_user) {
          filteredCoupons.push(coupon);
        }
      }

      return filteredCoupons;
    }

    return coupons;
  }

  /**
   * Get coupon by ID
   * @param {string} couponId - Coupon ID
   * @returns {Promise<Coupon>}
   */
  async getCouponById(couponId) {
    const coupon = await Coupon.findByPk(couponId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'first_name', 'last_name'],
        },
        {
          model: CouponUsage,
          as: 'usages',
          limit: 10,
          order: [['used_at', 'DESC']],
        },
      ],
    });

    if (!coupon) {
      throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);
    }

    return coupon;
  }

  /**
   * Approve coupon (activate)
   */
  async approveCoupon(couponId, adminId, notes = null) {
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);

    await coupon.update({ is_active: true, notes: notes ?? coupon.notes });
    return coupon;
  }

  /**
   * Reject coupon (deactivate + optional reason)
   */
  async rejectCoupon(couponId, adminId, reason = null) {
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);

    await coupon.update({ is_active: false, notes: reason ?? coupon.notes });
    return coupon;
  }

  /**
   * Enable coupon
   */
  async enableCoupon(couponId) {
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);

    await coupon.update({ is_active: true });
    return coupon;
  }

  /**
   * Disable coupon
   */
  async disableCoupon(couponId: string) {
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);

    await coupon.update({ is_active: false });
    return coupon;
  }

  /**
   * Get coupon statistics
   * @param {string} couponId - Coupon ID
   * @returns {Promise<Object>}
   */
  async getCouponStats(couponId: string) {
    const coupon = await Coupon.findByPk(couponId);

    if (!coupon) {
      throw new ApiError('Coupon not found', StatusCodes.NOT_FOUND);
    }

    const usages = await CouponUsage.findAll({
      where: { coupon_id: couponId },
      attributes: [
        [Coupon.sequelize.fn('COUNT', Coupon.sequelize.col('id')), 'total_uses'],
        [Coupon.sequelize.fn('SUM', Coupon.sequelize.col('discount_amount')), 'total_discount'],
        [Coupon.sequelize.fn('SUM', Coupon.sequelize.col('order_total')), 'total_sales'],
      ],
      raw: true,
    });

    const usageSummary = (usages[0] || {}) as {
      total_uses?: string | number;
      total_discount?: string | number;
      total_sales?: string | number;
    };

    return {
      coupon_id: couponId,
      code: coupon.code,
      total_uses: parseInt(String(usageSummary.total_uses ?? 0), 10) || 0,
      total_discount: parseFloat(String(usageSummary.total_discount ?? 0)) || 0,
      total_sales: parseFloat(String(usageSummary.total_sales ?? 0)) || 0,
      usage_limit: coupon.usage_limit,
      times_used: coupon.times_used,
      is_active: coupon.is_active,
    };
  }

  /**
   * Get user's coupon history
   * @param {string} userId - User ID
   * @returns {Promise<Array<CouponUsage>>}
   */
  async getUserCouponHistory(userId: string) {
    return CouponUsage.getUserHistory(userId);
  }
}

export = new CouponService();
