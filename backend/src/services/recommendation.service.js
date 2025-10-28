/**
 * Recommendation Service
 * Generates product suggestions based on cart or wishlist context
 */

const { Op } = require('sequelize');
const { Product, Store, Category, WishlistItem } = require('../models');
const { cache } = require('../config/redis');
const eventBus = require('../events/eventBus');
const { ORDER_EVENTS } = require('../events/order.events');
const logger = require('../utils/logger');

const CACHE_TTL_SECONDS = 60 * 3;

class RecommendationService {
  constructor() {
    this.initialized = false;
    this.registerConsumers();
  }

  registerConsumers() {
    if (this.initialized || process.env.EVENT_CONSUMERS_DISABLED === 'true') {
      return;
    }

    eventBus.subscribe(ORDER_EVENTS.COMPLETED, async (payload) => {
      await this.recordOrderCompletion(payload);
    });

    this.initialized = true;
  }

  async getCartRecommendations({ cartItems = [], userId = null, limit = 6 }) {
    const categories = [
      ...new Set(
        cartItems
          .map((item) => item.category?.id || item.category_id)
          .filter(Boolean)
      ),
    ];
    const excludeIds = [
      ...new Set(cartItems.map((item) => item.product_id || item.id).filter(Boolean)),
    ];

    const cacheKey = this._cartCacheKey(userId, categories, excludeIds, limit);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const baseWhere = {
      status: 'approved',
      is_active: true,
      stock: { [Op.gt]: 0 },
    };

    const include = [
      { model: Store, as: 'store', attributes: ['id', 'name', 'slug'] },
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
    ];

    let products = [];

    if (categories.length > 0) {
      products = await Product.findAll({
        where: {
          ...baseWhere,
          category_id: { [Op.in]: categories },
          ...(excludeIds.length > 0 ? { id: { [Op.notIn]: excludeIds } } : {}),
        },
        include,
        order: [
          ['is_featured', 'DESC'],
          ['total_sales', 'DESC'],
          ['rating', 'DESC'],
        ],
        limit,
      });
    }

    if (products.length < limit) {
      const fallbackLimit = limit - products.length;
      const alreadySelectedSet = new Set([...excludeIds, ...products.map((p) => p.id)]);
      const alreadySelected = [...alreadySelectedSet];
      const fallbackWhere = {
        ...baseWhere,
        ...(alreadySelected.length > 0 ? { id: { [Op.notIn]: alreadySelected } } : {}),
      };

      const fallback = await Product.findAll({
        where: fallbackWhere,
        include,
        order: [
          ['total_sales', 'DESC'],
          ['rating', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit: fallbackLimit,
      });
      products = [...products, ...fallback];
    }

    const serialized = products.map((product) => this._serializeProduct(product));
    await cache.set(cacheKey, serialized, CACHE_TTL_SECONDS);
    return serialized;
  }

  async getWishlistContextRecommendations(userId, limit = 6) {
    const cacheKey = `recommendations:wishlist:${userId}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const wishlistItems = await WishlistItem.findAll({
      where: { user_id: userId },
      attributes: ['product_id'],
    });

    const wishlistIds = wishlistItems.map((item) => item.product_id);
    const categories = await Product.findAll({
      where: { id: wishlistIds },
      attributes: ['category_id'],
      group: ['category_id'],
    });

    const categoryIds = categories.map((c) => c.category_id).filter(Boolean);
    const recommendations = await this.getCartRecommendations({
      cartItems: categoryIds.map((id) => ({ category_id: id })),
      userId,
      limit,
    });

    await cache.set(cacheKey, recommendations, CACHE_TTL_SECONDS);
    return recommendations;
  }

  async recordOrderCompletion({ userId, items = [] }) {
    if (!userId || !items.length) {
      return null;
    }

    const productIds = items
      .map((item) => item.productId || item.product_id)
      .filter(Boolean);

    if (productIds.length === 0) {
      return null;
    }

    const cacheKey = `recommendations:orders:${userId}`;
    const payload = {
      lastPurchased: productIds,
      updatedAt: new Date().toISOString(),
    };
    await cache.set(cacheKey, payload, CACHE_TTL_SECONDS);
    return payload;
  }

  _serializeProduct(product) {
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: parseFloat(product.price),
      compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
      stock: product.stock,
      rating: product.rating,
      total_reviews: product.total_reviews,
      images: product.images || [],
      store: product.store,
      category: product.category,
    };
  }

  _cartCacheKey(userId, categories, excludeIds, limit) {
    const categoryKey = categories.sort().join(',') || 'none';
    const excludeKey = excludeIds.sort().join(',') || 'none';
    const userKey = userId || 'guest';
    return `recommendations:cart:${userKey}:${categoryKey}:${excludeKey}:${limit}`;
  }

  async recordOrderCompletion(payload) {
    if (!payload || !payload.userId) {
      logger.info('Skipping recommendation update for anonymous completion');
      return;
    }

    const cacheKey = `recommendations:history:${payload.userId}`;
    await cache.set(
      cacheKey,
      {
        lastCompletedOrderId: payload.orderId,
        completedAt: payload.timestamp || new Date().toISOString(),
      },
      CACHE_TTL_SECONDS
    );

    logger.info('Recorded order completion for recommendations', {
      userId: payload.userId,
      orderId: payload.orderId,
    });
  }
}

module.exports = new RecommendationService();
