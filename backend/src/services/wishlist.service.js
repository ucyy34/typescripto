/**
 * Wishlist Service
 * Handles wishlist storage for authenticated users and guests
 */

const { Op } = require('sequelize');
const { StatusCodes } = require('http-status-codes');
const { Wishlist, Product, Store, Category } = require('../models');
const cartService = require('./cart.service');
const { ApiError } = require('../middlewares/errorHandler');

class WishlistService {
  async getWishlist(user, session) {
    if (user) {
      return this._getUserWishlist(user.id);
    }

    return this._getSessionWishlist(session);
  }

  async addItem(user, session, productId) {
    await this._validateProduct(productId);

    if (user) {
      const wishlist = await Wishlist.findOrCreateForUser(user.id);
      wishlist.addItem(productId);
      await wishlist.save({ fields: ['items'] });
      return this._buildUserWishlistResponse(wishlist);
    }

    if (!session.wishlist) {
      session.wishlist = [];
    }

    const exists = session.wishlist.find((item) => item.product_id === productId);
    if (!exists) {
      session.wishlist.push({
        product_id: productId,
        added_at: new Date().toISOString(),
      });
    }

    return this._buildSessionWishlistResponse(session.wishlist);
  }

  async removeItem(user, session, productId) {
    if (user) {
      const wishlist = await Wishlist.findOrCreateForUser(user.id);
      wishlist.removeItem(productId);
      await wishlist.save({ fields: ['items'] });
      return this._buildUserWishlistResponse(wishlist);
    }

    if (!session.wishlist) {
      session.wishlist = [];
    }

    session.wishlist = session.wishlist.filter((item) => item.product_id !== productId);
    return this._buildSessionWishlistResponse(session.wishlist);
  }

  async clearWishlist(user, session) {
    if (user) {
      const wishlist = await Wishlist.findOrCreateForUser(user.id);
      wishlist.clearItems();
      await wishlist.save({ fields: ['items'] });
      return this._buildUserWishlistResponse(wishlist);
    }

    session.wishlist = [];
    return this._buildSessionWishlistResponse(session.wishlist);
  }

  async mergeGuestWishlist(userId, session) {
    if (!session?.wishlist || session.wishlist.length === 0) {
      return this._getUserWishlist(userId);
    }

    const wishlist = await Wishlist.findOrCreateForUser(userId);
    const existingIds = new Set((wishlist.items || []).map((item) => item.product_id));

    const merged = Array.isArray(wishlist.items) ? [...wishlist.items] : [];
    for (const item of session.wishlist) {
      if (!item?.product_id || existingIds.has(item.product_id)) {
        continue;
      }
      merged.push({
        product_id: item.product_id,
        added_at: item.added_at || new Date().toISOString(),
      });
    }

    wishlist.items = merged;
    await wishlist.save({ fields: ['items'] });

    session.wishlist = [];
    return this._buildUserWishlistResponse(wishlist);
  }

  async getRecommendations({ user, session, seedProductIds = [], limit = 6, includeCart = true, includeWishlist = true }) {
    const seeds = new Set(seedProductIds.filter(Boolean));

    if (includeWishlist) {
      if (user) {
        const wishlist = await Wishlist.findOne({ where: { user_id: user.id } });
        if (wishlist?.items) {
          wishlist.items.forEach((item) => {
            if (item?.product_id) {
              seeds.add(item.product_id);
            }
          });
        }
      } else if (session?.wishlist) {
        session.wishlist.forEach((item) => {
          if (item?.product_id) {
            seeds.add(item.product_id);
          }
        });
      }
    }

    if (includeCart) {
      const cartItems = user
        ? await cartService.getUserCart(user.id)
        : await cartService.getGuestCart(session);

      if (cartItems?.items) {
        cartItems.items.forEach((item) => {
          if (item?.product_id) {
            seeds.add(item.product_id);
          }
        });
      }
    }

    const seedList = [...seeds];

    let categoryIds = new Set();
    let storeIds = new Set();

    if (seedList.length > 0) {
      const products = await Product.findAll({
        where: { id: seedList },
        attributes: ['id', 'category_id', 'store_id'],
      });

      categoryIds = new Set(products.map((p) => p.category_id).filter(Boolean));
      storeIds = new Set(products.map((p) => p.store_id).filter(Boolean));
    }

    const where = {
      status: 'approved',
      is_active: true,
    };

    if (categoryIds.size > 0) {
      where.category_id = { [Op.in]: [...categoryIds] };
    }

    const excludeIds = seedList.length > 0 ? { [Op.notIn]: seedList } : undefined;
    if (excludeIds) {
      where.id = excludeIds;
    }

    const order = [];
    if (storeIds.size > 0) {
      where.store_id = { [Op.in]: [...storeIds] };
      order.push(['total_sales', 'DESC']);
    } else {
      order.push(['total_sales', 'DESC']);
    }
    order.push(['created_at', 'DESC']);

    const recommendations = await Product.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['id', 'name', 'slug', 'status'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      ],
      limit,
      order,
    });

    if (recommendations.length === 0 && seedList.length === 0) {
      const fallback = await Product.findAll({
        where: {
          status: 'approved',
          is_active: true,
        },
        include: [
          { model: Store, as: 'store', attributes: ['id', 'name', 'slug', 'status'] },
          { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        ],
        limit,
        order: [
          ['rating', 'DESC'],
          ['total_sales', 'DESC'],
          ['created_at', 'DESC'],
        ],
      });

      return fallback.map((product) => this._serializeProduct(product));
    }

    return recommendations.map((product) => this._serializeProduct(product));
  }

  async _getUserWishlist(userId) {
    const wishlist = await Wishlist.findOrCreateForUser(userId);
    return this._buildUserWishlistResponse(wishlist);
  }

  async _getSessionWishlist(session) {
    if (!session.wishlist) {
      session.wishlist = [];
    }

    return this._buildSessionWishlistResponse(session.wishlist);
  }

  async _buildUserWishlistResponse(wishlist) {
    const rawItems = Array.isArray(wishlist.items) ? wishlist.items : [];
    const populated = await this._populateWishlistItems(rawItems);

    if (populated.missingProductIds.length > 0) {
      wishlist.items = rawItems.filter((item) => !populated.missingProductIds.includes(item.product_id));
      await wishlist.save({ fields: ['items'] });
    }

    return {
      id: wishlist.id,
      items: populated.items,
      item_count: populated.items.length,
      updated_at: wishlist.updated_at,
    };
  }

  async _buildSessionWishlistResponse(sessionItems) {
    const rawItems = Array.isArray(sessionItems) ? sessionItems : [];
    const populated = await this._populateWishlistItems(rawItems);

    if (populated.missingProductIds.length > 0) {
      const filtered = rawItems.filter((item) => !populated.missingProductIds.includes(item.product_id));
      sessionItems.length = 0;
      filtered.forEach((item) => sessionItems.push(item));
    }

    return {
      items: populated.items,
      item_count: populated.items.length,
    };
  }

  async _populateWishlistItems(items) {
    if (!items || items.length === 0) {
      return { items: [], missingProductIds: [] };
    }

    const productIds = items.map((item) => item.product_id).filter(Boolean);

    if (productIds.length === 0) {
      return { items: [], missingProductIds: [] };
    }

    const products = await Product.findAll({
      where: { id: productIds },
      include: [
        { model: Store, as: 'store', attributes: ['id', 'name', 'slug', 'status'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      ],
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const missingProductIds = [];

    const populatedItems = items
      .map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) {
          missingProductIds.push(item.product_id);
          return null;
        }

        return {
          product_id: product.id,
          added_at: item.added_at || new Date().toISOString(),
          product: this._serializeProduct(product),
        };
      })
      .filter(Boolean);

    return { items: populatedItems, missingProductIds };
  }

  _serializeProduct(product) {
    if (!product) {
      return null;
    }

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price ? parseFloat(product.price) : 0,
      compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
      stock: product.stock,
      status: product.status,
      is_active: product.is_active,
      images: Array.isArray(product.images) ? product.images : [],
      rating: product.rating ? parseFloat(product.rating) : 0,
      total_reviews: product.total_reviews || 0,
      store: product.store
        ? {
            id: product.store.id,
            name: product.store.name,
            slug: product.store.slug,
            status: product.store.status,
          }
        : null,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
    };
  }

  async _validateProduct(productId) {
    const product = await Product.findOne({
      where: {
        id: productId,
        status: 'approved',
        is_active: true,
      },
    });

    if (!product) {
      throw new ApiError('Product not found or inactive', StatusCodes.NOT_FOUND);
    }

    return product;
  }
}

module.exports = new WishlistService();
