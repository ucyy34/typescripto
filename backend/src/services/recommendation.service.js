/**
 * Recommendation Service
 * Generates product suggestions based on cart or wishlist context
 */

const { Op } = require('sequelize');
const { Product, Store, Category, WishlistItem } = require('../models');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TTL_SECONDS = 60 * 3;

class RecommendationService {
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

  async recordOrderCompletion(event) {
    if (!event) {
      return;
    }

    logger.info('[Recommendation] order.completed received', {
      orderId: event.orderId,
      userId: event.userId || null,
    });

    if (!event.userId) {
      return;
    }

    logger.info('[Recommendation] order.completed received', {
      orderId: event.orderId,
      userId: event.userId,
    });

    await cache.delPattern(`recommendations:cart:${event.userId}:*`);
  }
}

module.exports = new RecommendationService();
