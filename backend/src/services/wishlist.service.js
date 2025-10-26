/**
 * Wishlist Service
 * Handles wishlist operations for authenticated users
 */

const { Op } = require('sequelize');
const { WishlistItem, Product, Store, Category } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { cache } = require('../config/redis');

const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

class WishlistService {
  _cacheKey(userId) {
    return `wishlist:user:${userId}`;
  }

  async list(userId) {
    const cacheKey = this._cacheKey(userId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await WishlistItem.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          required: true,
          where: {
            status: 'approved',
            is_active: true,
          },
          include: [
            { model: Store, as: 'store', attributes: ['id', 'name', 'slug'] },
            { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
          ],
        },
      ],
    });

    const formatted = items.map((item) => this.serializeWishlistItem(item));
    await cache.set(cacheKey, formatted, CACHE_TTL_SECONDS);
    return formatted;
  }

  async add(userId, productId, metadata = null) {
    await this._assertProductExists(productId);

    const [entry] = await WishlistItem.findOrCreate({
      where: { user_id: userId, product_id: productId },
      defaults: { metadata },
    });

    if (!entry.isNewRecord && metadata) {
      entry.metadata = metadata;
      await entry.save({ fields: ['metadata'] });
    }

    await cache.del(this._cacheKey(userId));
    return this.list(userId);
  }

  async remove(userId, productId) {
    const deleted = await WishlistItem.destroy({
      where: { user_id: userId, product_id: productId },
    });

    if (!deleted) {
      throw new ApiError('Wishlist item not found', StatusCodes.NOT_FOUND);
    }

    await cache.del(this._cacheKey(userId));
    return this.list(userId);
  }

  async sync(userId, productIds = []) {
    if (!Array.isArray(productIds)) {
      throw new ApiError('Invalid wishlist payload', StatusCodes.BAD_REQUEST);
    }

    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      await WishlistItem.destroy({ where: { user_id: userId } });
      await cache.del(this._cacheKey(userId));
      return [];
    }

    const validProducts = await Product.findAll({
      where: {
        id: uniqueIds,
        status: 'approved',
        is_active: true,
      },
      attributes: ['id'],
    });

    const validIds = validProducts.map((p) => p.id);

    await WishlistItem.destroy({
      where: {
        user_id: userId,
        product_id: { [Op.notIn]: validIds },
      },
    });

    const existing = await WishlistItem.findAll({
      where: {
        user_id: userId,
        product_id: validIds,
      },
      attributes: ['product_id'],
    });

    const existingIds = new Set(existing.map((item) => item.product_id));
    const createPayload = validIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ user_id: userId, product_id: id }));

    if (createPayload.length > 0) {
      await WishlistItem.bulkCreate(createPayload);
    }

    await cache.del(this._cacheKey(userId));
    return this.list(userId);
  }

  serializeWishlistItem(item) {
    const product = item.product;
    return {
      id: item.id,
      product_id: product.id,
      added_at: item.created_at,
      product: {
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
      },
    };
  }

  async _assertProductExists(productId) {
    const product = await Product.findOne({
      where: {
        id: productId,
        status: 'approved',
        is_active: true,
      },
    });

    if (!product) {
      throw new ApiError('Product not found or unavailable', StatusCodes.NOT_FOUND);
    }

    return product;
  }
}

module.exports = new WishlistService();
