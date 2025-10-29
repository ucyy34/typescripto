/**
 * Cart Service
 * Business logic for shopping cart management backed by Redis
 */

const { Product, Store, Category } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { redisClient } = require('../config/redis');
const orderService = require('./order.service');

const DEFAULT_PRODUCT_CACHE_TTL = 60 * 1000; // 60 seconds
const DEFAULT_MISSING_PRODUCT_TTL = 10 * 1000; // 10 seconds
const DEFAULT_CACHE_MAX_ITEMS = 500;

const CART_KEY_PREFIX = 'cart';
const USER_CART_PREFIX = `${CART_KEY_PREFIX}:user:`;
const GUEST_CART_PREFIX = `${CART_KEY_PREFIX}:guest:`;
const USER_CART_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const GUEST_CART_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

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

  /**
   * Retrieve cart for a user or guest based on identifiers
   * @param {string|null} userId
   * @param {string|null} guestId
   */
  async getCart(userId = null, guestId = null) {
    const key = this._resolveCartKey(userId, guestId);
    const ttl = this._resolveCartTtl(userId);
    const { items, metadata } = await this._loadCartState(key);

    const cartWithDetails = await this.populateCartItems(items);

    if (cartWithDetails.missingProductIds.length > 0) {
      await this._pruneMissingProductsInStorage({
        key,
        items,
        missingProductIds: cartWithDetails.missingProductIds,
        ttl,
      });
    }

    return {
      items: cartWithDetails.items,
      totals: cartWithDetails.totals,
      updated_at: metadata?.updated_at || null,
    };
  }

  /**
   * Add item to cart for user or guest
   */
  async addItem(userId, guestId, productId, quantity) {
    const key = this._requireCartKey(userId, guestId);
    const ttl = this._resolveCartTtl(userId);

    await this.validateProductAndStock(productId, quantity);

    const { items } = await this._loadCartState(key);
    const existing = items.find((item) => item.product_id === productId);

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      await this.validateProductAndStock(productId, newQuantity);
      existing.quantity = newQuantity;
    } else {
      items.push({ product_id: productId, quantity });
    }

    await this._persistCartState(key, items, ttl);
    return this.getCart(userId, guestId);
  }

  /**
   * Update item quantity in cart
   */
  async updateItem(userId, guestId, productId, quantity) {
    const key = this._requireCartKey(userId, guestId);
    const ttl = this._resolveCartTtl(userId);

    const { items } = await this._loadCartState(key);
    const existing = items.find((item) => item.product_id === productId);

    if (!existing) {
      throw new ApiError('Item not found in cart', StatusCodes.NOT_FOUND);
    }

    if (quantity === 0) {
      const filtered = items.filter((item) => item.product_id !== productId);
      await this._persistCartState(key, filtered, ttl);
      return this.getCart(userId, guestId);
    }

    await this.validateProductAndStock(productId, quantity);
    existing.quantity = quantity;
    await this._persistCartState(key, items, ttl);
    return this.getCart(userId, guestId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId, guestId, productId) {
    const key = this._requireCartKey(userId, guestId);
    const ttl = this._resolveCartTtl(userId);

    const { items } = await this._loadCartState(key);
    const filtered = items.filter((item) => item.product_id !== productId);

    await this._persistCartState(key, filtered, ttl);
    return this.getCart(userId, guestId);
  }

  /**
   * Clear cart contents
   */
  async clearCart(userId = null, guestId = null) {
    const key = this._resolveCartKey(userId, guestId);
    if (key) {
      await redisClient.del(key);
    }

    return { items: [], totals: { subtotal: 0, item_count: 0 } };
  }

  /**
   * Merge guest cart items into authenticated user's cart
   */
  async mergeGuestCartToUser(userId, guestId) {
    if (!userId) {
      throw new ApiError('User ID is required to merge carts', StatusCodes.BAD_REQUEST);
    }

    if (!guestId) {
      return this.getCart(userId, null);
    }

    const userKey = this._requireCartKey(userId, null);
    const guestKey = this._resolveCartKey(null, guestId);

    const ttl = this._resolveCartTtl(userId);

    await redisClient.watch(userKey, guestKey);

    try {
      const [{ items: userItems }, { items: guestItems }] = await Promise.all([
        this._loadCartState(userKey),
        this._loadCartState(guestKey),
      ]);

      if (!guestItems || guestItems.length === 0) {
        return this.getCart(userId, null);
      }

      const merged = [...userItems];

      for (const guestItem of guestItems) {
        const existing = merged.find((item) => item.product_id === guestItem.product_id);
        const newQuantity = (existing?.quantity || 0) + guestItem.quantity;
        await this.validateProductAndStock(guestItem.product_id, newQuantity);

        if (existing) {
          existing.quantity = newQuantity;
        } else {
          merged.push({ product_id: guestItem.product_id, quantity: guestItem.quantity });
        }
      }

      const transaction = redisClient.multi();
      transaction.hset(userKey, {
        items: JSON.stringify(merged),
        updated_at: new Date().toISOString(),
      });
      if (ttl) {
        transaction.expire(userKey, ttl);
      }
      if (guestKey) {
        transaction.del(guestKey);
      }

      const execResult = await transaction.exec();
      if (!execResult) {
        throw new ApiError('Cart merge conflict, please retry', StatusCodes.CONFLICT);
      }
    } finally {
      await redisClient.unwatch();
    }

    return this.getCart(userId, null);
  }

  async checkout({ userId = null, guestId = null, checkoutInput = {} }) {
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

  /**
   * Validate product exists, is available, and has sufficient stock
   */
  async validateProductAndStock(productId, quantity) {
    const product = await Product.findByPk(productId, {
      include: [{ model: Store, as: 'store', attributes: ['status'] }],
    });

    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    if (product.stock < quantity) {
      console.warn(
        `[CartService] Low stock warning: Product ${productId} has ${product.stock} items, requested ${quantity}`
      );
    }

    return product;
  }

  /**
   * Populate cart items with product details and calculate totals
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

  _resolveCartKey(userId, guestId) {
    if (userId) {
      return `${USER_CART_PREFIX}${userId}`;
    }

    if (guestId) {
      return `${GUEST_CART_PREFIX}${guestId}`;
    }

    return null;
  }

  _requireCartKey(userId, guestId) {
    const key = this._resolveCartKey(userId, guestId);
    if (!key) {
      throw new ApiError('Guest session missing', StatusCodes.BAD_REQUEST);
    }
    return key;
  }

  _resolveCartTtl(userId) {
    return userId ? USER_CART_TTL_SECONDS : GUEST_CART_TTL_SECONDS;
  }

  async _loadCartState(key) {
    if (!key) {
      return { key: null, items: [], metadata: {} };
    }

    const data = await redisClient.hgetall(key);
    if (!data || Object.keys(data).length === 0) {
      return { key, items: [], metadata: {} };
    }

    let items = [];
    if (data.items) {
      try {
        const parsed = JSON.parse(data.items);
        items = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn(`[CartService] Failed to parse cart data for ${key}`, error);
        items = [];
      }
    }

    return { key, items, metadata: data };
  }

  async _persistCartState(key, items, ttlSeconds) {
    if (!key) {
      return;
    }

    await redisClient.hset(key, {
      items: JSON.stringify(items),
      updated_at: new Date().toISOString(),
    });

    if (ttlSeconds) {
      await redisClient.expire(key, ttlSeconds);
    }
  }

  async _pruneMissingProductsInStorage({ key, items, missingProductIds, ttl }) {
    if (!key || !Array.isArray(items) || !missingProductIds || missingProductIds.length === 0) {
      return;
    }

    const filtered = items.filter((item) => !missingProductIds.includes(item.product_id));

    if (filtered.length === items.length) {
      return;
    }

    await this._persistCartState(key, filtered, ttl);
    this._debug(`Pruned ${items.length - filtered.length} missing products from cart ${key}`);
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
