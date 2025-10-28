/**
 * Cart Service
 * Business logic for shopping cart management backed by Redis.
 */

const { StatusCodes } = require('http-status-codes');
const { redisClient } = require('../config/redis');
const { Product, Store, Category } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const orderService = require('./order.service');

const DEFAULT_PRODUCT_CACHE_TTL = 60 * 1000; // 60 seconds
const DEFAULT_MISSING_PRODUCT_TTL = 10 * 1000; // 10 seconds
const DEFAULT_CACHE_MAX_ITEMS = 500;

const USER_CART_PREFIX = 'cart:user:';
const GUEST_CART_PREFIX = 'cart:guest:';

class CartService {
  constructor() {
    this.productCache = new Map();
    this.cacheConfig = {
      ttl: DEFAULT_PRODUCT_CACHE_TTL,
      negativeTtl: DEFAULT_MISSING_PRODUCT_TTL,
      maxItems: DEFAULT_CACHE_MAX_ITEMS,
    };
    this.debugEnabled = process.env.NODE_ENV !== 'production';
  }

  _resolveCartKey(userId, guestId) {
    if (userId) {
      return `${USER_CART_PREFIX}${userId}`;
    }

    if (guestId) {
      return `${GUEST_CART_PREFIX}${guestId}`;
    }

    throw new ApiError('Guest identifier is required for cart operations', StatusCodes.BAD_REQUEST);
  }

  async _getItemQuantity(key, productId) {
    if (!productId) {
      return 0;
    }

    const raw = await redisClient.hget(key, productId);
    if (!raw) {
      return 0;
    }

    try {
      const parsed = JSON.parse(raw);
      return Number.isFinite(parsed?.quantity) ? parseInt(parsed.quantity, 10) : 0;
    } catch (_) {
      const fallback = parseInt(raw, 10);
      return Number.isFinite(fallback) ? fallback : 0;
    }
  }

  async _setItemQuantity(key, productId, quantity) {
    if (!productId) {
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      await redisClient.hdel(key, productId);
      return;
    }

    await redisClient.hset(key, productId, JSON.stringify({ quantity }));
  }

  async _removeItems(key, productIds) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return;
    }

    await redisClient.hdel(key, ...productIds);
  }

  async _readCartItems(key) {
    const hash = await redisClient.hgetall(key);
    const entries = Object.entries(hash || {});

    return entries
      .map(([productId, raw]) => {
        if (!productId) {
          return null;
        }

        let quantity = 0;
        try {
          const parsed = JSON.parse(raw);
          quantity = Number.isFinite(parsed?.quantity) ? parseInt(parsed.quantity, 10) : 0;
        } catch (_) {
          quantity = parseInt(raw, 10);
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }

        return { product_id: productId, quantity };
      })
      .filter(Boolean);
  }

  async getCart(userId, guestId) {
    const key = this._resolveCartKey(userId, guestId);
    const rawItems = await this._readCartItems(key);
    const cartWithDetails = await this.populateCartItems(rawItems);

    if (cartWithDetails.missingProductIds.length > 0) {
      await this._removeItems(key, cartWithDetails.missingProductIds);
      this._debug(
        `Pruned ${cartWithDetails.missingProductIds.length} missing products from cart ${key}`
      );
    }

    return {
      items: cartWithDetails.items,
      totals: cartWithDetails.totals,
    };
  }

  async addItem(userId, guestId, productId, quantity = 1) {
    const key = this._resolveCartKey(userId, guestId);
    const existingQuantity = await this._getItemQuantity(key, productId);
    const newQuantity = existingQuantity + quantity;

    await this.validateProductAndStock(productId, newQuantity);
    await this._setItemQuantity(key, productId, newQuantity);

    return this.getCart(userId, guestId);
  }

  async updateItem(userId, guestId, productId, quantity) {
    const key = this._resolveCartKey(userId, guestId);

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new ApiError('Quantity must be zero or greater', StatusCodes.BAD_REQUEST);
    }

    if (quantity === 0) {
      await redisClient.hdel(key, productId);
      return this.getCart(userId, guestId);
    }

    await this.validateProductAndStock(productId, quantity);
    await this._setItemQuantity(key, productId, quantity);

    return this.getCart(userId, guestId);
  }

  async removeItem(userId, guestId, productId) {
    const key = this._resolveCartKey(userId, guestId);
    await redisClient.hdel(key, productId);
    return this.getCart(userId, guestId);
  }

  async clearCart(userId, guestId) {
    const key = this._resolveCartKey(userId, guestId);
    await redisClient.del(key);
    return {
      items: [],
      totals: { subtotal: 0, item_count: 0 },
    };
  }

  async mergeGuestCartToUser(userId, guestId) {
    if (!userId) {
      throw new ApiError('User ID is required to merge guest cart', StatusCodes.BAD_REQUEST);
    }

    if (!guestId) {
      return this.getCart(userId, null);
    }

    const guestKey = this._resolveCartKey(null, guestId);
    const userKey = this._resolveCartKey(userId, null);

    const guestItems = await this._readCartItems(guestKey);
    if (guestItems.length === 0) {
      return this.getCart(userId, null);
    }

    for (const guestItem of guestItems) {
      const currentQuantity = await this._getItemQuantity(userKey, guestItem.product_id);
      const mergedQuantity = currentQuantity + guestItem.quantity;
      await this.validateProductAndStock(guestItem.product_id, mergedQuantity);
      await this._setItemQuantity(userKey, guestItem.product_id, mergedQuantity);
    }

    await redisClient.del(guestKey);
    return this.getCart(userId, null);
  }

  async checkout({ userId, guestId, checkoutInput = {} }) {
    const cart = await this.getCart(userId, guestId);

    if (!cart.items || cart.items.length === 0) {
      throw new ApiError('Cart is empty', StatusCodes.BAD_REQUEST);
    }

    const order = await orderService.createFromCart(userId, cart, checkoutInput);

    if (userId) {
      await this.clearCart(userId, null);
    } else if (guestId) {
      await this.clearCart(null, guestId);
    }

    return order;
  }

  async validateProductAndStock(productId, quantity) {
    const product = await Product.findByPk(productId, {
      include: [{ model: Store, as: 'store', attributes: ['status'] }],
    });

    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    if (Number.isFinite(product.stock) && product.stock < quantity) {
      console.warn(
        `[CartService] Low stock warning: Product ${productId} has ${product.stock} items, requested ${quantity}`
      );
    }

    return product;
  }

  async populateCartItems(items) {
    if (!items || items.length === 0) {
      return {
        items: [],
        totals: { subtotal: 0, item_count: 0 },
        missingProductIds: [],
      };
    }

    const productIds = items.map((item) => item.product_id);
    const productMap = await this._getProductsWithCache(productIds);

    let subtotal = 0;
    let item_count = 0;
    const missingProductIds = [];

    const populatedItems = items
      .map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) {
          missingProductIds.push(item.product_id);
          return null;
        }

        const itemTotal = parseFloat(product.price) * item.quantity;
        subtotal += itemTotal;
        item_count += item.quantity;

        return {
          product_id: product.id,
          title: product.title,
          slug: product.slug,
          price: parseFloat(product.price),
          compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
          image: product.images && product.images[0] ? product.images[0] : null,
          quantity: item.quantity,
          stock: product.stock,
          is_available: product.is_active && product.status === 'approved',
          store: product.store,
          category: product.category,
          item_total: itemTotal,
        };
      })
      .filter((item) => item !== null);

    return {
      items: populatedItems,
      totals: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        item_count,
      },
      missingProductIds,
    };
  }

  async _getProductsWithCache(productIds) {
    if (!productIds || productIds.length === 0) {
      return new Map();
    }

    const now = Date.now();
    const uniqueIds = [...new Set(productIds)];
    const productsById = new Map();
    const missingIds = [];

    for (const id of uniqueIds) {
      const cached = this._getCachedProduct(id, now);
      if (cached !== undefined) {
        productsById.set(id, cached);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      const freshProducts = await Product.findAll({
        where: {
          id: missingIds,
        },
        include: [
          { model: Store, as: 'store', attributes: ['id', 'name', 'slug', 'status'] },
          { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        ],
      });

      const foundIds = new Set();

      for (const product of freshProducts) {
        foundIds.add(product.id);
        this._rememberProduct(product.id, product, this.cacheConfig.ttl, now);
        productsById.set(product.id, product);
      }

      for (const id of missingIds) {
        if (!foundIds.has(id)) {
          this._rememberProduct(id, null, this.cacheConfig.negativeTtl, now);
          productsById.set(id, null);
        }
      }
    }

    const orderedProducts = new Map();
    for (const id of productIds) {
      if (!orderedProducts.has(id)) {
        orderedProducts.set(id, productsById.get(id) ?? null);
      }
    }

    return orderedProducts;
  }

  _getCachedProduct(id, now) {
    const entry = this.productCache.get(id);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= now) {
      this.productCache.delete(id);
      return undefined;
    }

    return entry.product;
  }

  _rememberProduct(id, product, ttl, now) {
    this._enforceCacheLimit();
    this.productCache.set(id, {
      product,
      expiresAt: now + ttl,
      cachedAt: now,
    });
  }

  _enforceCacheLimit() {
    if (this.productCache.size < this.cacheConfig.maxItems) {
      return;
    }

    const overflow = this.productCache.size - this.cacheConfig.maxItems + 1;
    for (let i = 0; i < overflow; i += 1) {
      const oldestKey = this.productCache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.productCache.delete(oldestKey);
    }
  }

  _debug(...args) {
    if (this.debugEnabled) {
      console.log('[CartService]', ...args);
    }
  }
}

module.exports = new CartService();
