/**
 * Cart Service
 * Business logic for shopping cart management
 * Supports both guest (session) and user (database) carts
 */

const { Product, Store, Category } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const orderService = require('./order.service');
const { redisClient } = require('../config/redis');

const GUEST_CART_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const DEFAULT_PRODUCT_CACHE_TTL = 60 * 1000; // 60 seconds
const DEFAULT_MISSING_PRODUCT_TTL = 10 * 1000; // 10 seconds
const DEFAULT_CACHE_MAX_ITEMS = 500;

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
  async getCart(userId, guestId) {
    const key = this._resolveCartKey(userId, guestId);
    const items = await this._getRawCartEntries(key);
    const cartWithDetails = await this.populateCartItems(items);

    if (cartWithDetails.missingProductIds.length > 0) {
      await this._pruneMissingProducts(key, cartWithDetails.missingProductIds);
    }

    return {
      items: cartWithDetails.items,
      totals: cartWithDetails.totals,
      updated_at: new Date().toISOString(),
      context: userId
        ? { type: 'user', id: userId }
        : { type: 'guest', id: guestId },
    };
  }

  async addItem(userId, guestId, productId, quantity) {
    const key = this._resolveCartKey(userId, guestId);
    const existing = await redisClient.hget(key, productId);
    const currentQuantity = existing ? parseInt(existing, 10) || 0 : 0;
    const newQuantity = currentQuantity + quantity;

    if (newQuantity <= 0) {
      await redisClient.hdel(key, productId);
      return this.getCart(userId, guestId);
    }

    await this.validateProductAndStock(productId, newQuantity);

    await redisClient.hset(key, productId, newQuantity);
    await this._ensureGuestExpiration(userId, key);

    return this.getCart(userId, guestId);
  }

  async updateItem(userId, guestId, productId, quantity) {
    const key = this._resolveCartKey(userId, guestId);

    if (quantity <= 0) {
      await redisClient.hdel(key, productId);
      return this.getCart(userId, guestId);
    }

    await this.validateProductAndStock(productId, quantity);
    await redisClient.hset(key, productId, quantity);
    await this._ensureGuestExpiration(userId, key);

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
    return { items: [], totals: { subtotal: 0, item_count: 0 } };
  }

  async mergeGuestCartToUser(userId, guestId) {
    if (!guestId) {
      return this.getCart(userId, null);
    }

    const guestKey = this._resolveCartKey(null, guestId);
    const guestItems = await this._getRawCartEntries(guestKey);

    if (guestItems.length === 0) {
      return this.getCart(userId, null);
    }

    const userKey = this._resolveCartKey(userId, null);
    const userRaw = await redisClient.hgetall(userKey);
    const pipeline = redisClient.multi();

    for (const item of guestItems) {
      const existing = userRaw?.[item.product_id];
      const currentQuantity = existing ? parseInt(existing, 10) || 0 : 0;
      const newQuantity = currentQuantity + item.quantity;

      await this.validateProductAndStock(item.product_id, newQuantity);
      pipeline.hset(userKey, item.product_id, newQuantity);
    }

    await pipeline.exec();
    await redisClient.del(guestKey);

    return this.getCart(userId, null);
  }

  async checkout({ userId, guestId, checkoutInput = {} }) {
    const cart = await this.getCart(userId, guestId);

    if (!cart.items || cart.items.length === 0) {
      throw new ApiError('Cart is empty', StatusCodes.BAD_REQUEST);
    }

    const orderStoreId = checkoutInput.store_id || cart.items[0]?.store?.id;
    if (!orderStoreId) {
      throw new ApiError('Store ID is required for checkout', StatusCodes.BAD_REQUEST);
    }

    const items = cart.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    const orderPayload = {
      store_id: orderStoreId,
      items,
      shipping_address: checkoutInput.shipping_address,
      billing_address: checkoutInput.billing_address || checkoutInput.shipping_address,
      payment_method: checkoutInput.payment_method,
      customer_note: checkoutInput.customer_note,
    };

    const order = await orderService.createOrder(userId || null, orderPayload);

    if (userId) {
      await this.clearCart(userId, null);
    } else if (guestId) {
      await this.clearCart(null, guestId);
    }

    return order;
  }

  _resolveCartKey(userId, guestId) {
    if (userId) {
      return `cart:user:${userId}`;
    }

    if (guestId) {
      return `cart:guest:${guestId}`;
    }

    throw new ApiError('Guest identifier is required for cart operations', StatusCodes.BAD_REQUEST);
  }

  async _getRawCartEntries(key) {
    const raw = await redisClient.hgetall(key);
    const entries = Object.entries(raw || {});

    return entries
      .map(([productId, qty]) => ({
        product_id: productId,
        quantity: Number.parseInt(qty, 10) || 0,
      }))
      .filter((item) => item.quantity > 0);
  }

  async _ensureGuestExpiration(userId, key) {
    if (userId) {
      return;
    }

    await redisClient.expire(key, GUEST_CART_TTL_SECONDS);
  }

  async _pruneMissingProducts(key, missingProductIds) {
    if (!missingProductIds || missingProductIds.length === 0) {
      return;
    }

    await redisClient.hdel(key, ...missingProductIds);
    this._debug(`Pruned ${missingProductIds.length} missing products from ${key}`);
  }

  /**
   * Validate product exists, is available, and has sufficient stock
   * @param {string} productId - Product ID
   * @param {number} quantity - Requested quantity
   * @returns {Promise<Product>} Validated product
   * @private
   */
  async validateProductAndStock(productId, quantity) {
    const product = await Product.findByPk(productId, {
      include: [{ model: Store, as: 'store', attributes: ['status'] }],
    });

    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    // Note: Removed status checks for cart operations
    // Users should be able to add items to cart regardless of approval status
    // Frontend will show availability status when displaying cart
    
    // Only check critical constraints:
    // 1. Product exists (already checked above)
    // 2. Stock is sufficient (but allow 0 stock items in cart with warning)
    
    if (product.stock < quantity) {
      // Log warning but don't throw error - allow adding to cart
      console.warn(`[CartService] Low stock warning: Product ${productId} has ${product.stock} items, requested ${quantity}`);
      // Still allow adding to cart, frontend will show "out of stock" message
    }

    return product;
  }

  /**
   * Populate cart items with product details and calculate totals
   * @param {Array} items - Array of {product_id, quantity}
   * @returns {Promise<Object>} Items with details and totals
   * @private
   */
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

  /**
   * Retrieve product entities from cache, falling back to the database for misses.
   * Results are cached with a short TTL to reduce repeated lookups when cart
   * operations are chained (e.g. add → fetch → update).
   * @param {Array<string>} productIds
   * @returns {Promise<Map<string, Product|null>>}
   * @private
   */
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

      // Cache negative lookups briefly to avoid hammering the DB for missing IDs
      for (const id of missingIds) {
        if (!foundIds.has(id)) {
          this._rememberProduct(id, null, this.cacheConfig.negativeTtl, now);
          productsById.set(id, null);
        }
      }
    }

    // Map original order to preserve deterministic item ordering downstream
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
