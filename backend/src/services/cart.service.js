/**
 * Cart Service
 * Business logic for shopping cart management
 * Supports both guest (session) and user (database) carts
 */

const { Cart, Product, Store, Category } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');

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
  }
  /**
   * Get user's cart with populated product details
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cart with items and totals
   */
  async getUserCart(userId) {
    // Find or create cart for user
    const cart = await Cart.findOrCreateForUser(userId);
    // Get cart with populated product details
    const cartWithDetails = await this.populateCartItems(cart.items);

    return {
      id: cart.id,
      items: cartWithDetails.items,
      totals: cartWithDetails.totals,
      updated_at: cart.updated_at,
    };
  }

  /**
   * Get guest cart from session
   * @param {Object} session - Express session
   * @returns {Promise<Object>} Cart with items and totals
   */
  async getGuestCart(session) {
    const guestCart = session.cart || { items: [] };
    const cartWithDetails = await this.populateCartItems(guestCart.items);

    return {
      items: cartWithDetails.items,
      totals: cartWithDetails.totals,
    };
  }

  /**
   * Add item to user cart
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} Updated cart
   */
  async addItemToUserCart(userId, productId, quantity) {
    // Validate product and stock
    const product = await this.validateProductAndStock(productId, quantity);

    // Get or create cart
    const cart = await Cart.findOrCreateForUser(userId);

    // Check if item already exists
    const items = cart.items || [];
    const existingItem = items.find((item) => item.product_id === productId);

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      await this.validateProductAndStock(productId, newQuantity, { productHint: product });
      existingItem.quantity = newQuantity;
    } else {
      // Add new item
      items.push({ product_id: productId, quantity });
    }

    // Persist items reliably (ensure JSONB update is detected)
    cart.items = items;
    await cart.save({ fields: ['items'] });

    return this.getUserCart(userId);
  }

  /**
   * Add item to guest cart (session)
   * @param {Object} session - Express session
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} Updated cart
   */
  async addItemToGuestCart(session, productId, quantity) {
    // Validate product and stock
    await this.validateProductAndStock(productId, quantity);

    // Initialize guest cart if not exists
    if (!session.cart) {
      session.cart = { items: [] };
    }

    const items = session.cart.items;
    const existingItem = items.find((item) => item.product_id === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      await this.validateProductAndStock(productId, newQuantity);
      existingItem.quantity = newQuantity;
    } else {
      items.push({ product_id: productId, quantity });
    }

    session.cart.items = items;

    return this.getGuestCart(session);
  }

  /**
   * Update item quantity in user cart
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart
   */
  async updateUserCartItem(userId, productId, quantity) {
    const cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) {
      throw new ApiError('Cart not found', StatusCodes.NOT_FOUND);
    }

    const items = cart.items || [];
    const item = items.find((i) => i.product_id === productId);

    if (!item) {
      throw new ApiError('Item not found in cart', StatusCodes.NOT_FOUND);
    }

    if (quantity === 0) {
      // Remove item
      cart.items = items.filter((i) => i.product_id !== productId);
    } else {
      // Validate stock
      await this.validateProductAndStock(productId, quantity);
      item.quantity = quantity;
      cart.items = items;
    }

    await cart.save();
    return this.getUserCart(userId);
  }

  /**
   * Update item quantity in guest cart
   * @param {Object} session - Express session
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart
   */
  async updateGuestCartItem(session, productId, quantity) {
    if (!session.cart || !session.cart.items) {
      throw new ApiError('Cart is empty', StatusCodes.NOT_FOUND);
    }

    const items = session.cart.items;
    const item = items.find((i) => i.product_id === productId);

    if (!item) {
      throw new ApiError('Item not found in cart', StatusCodes.NOT_FOUND);
    }

    if (quantity === 0) {
      session.cart.items = items.filter((i) => i.product_id !== productId);
    } else {
      await this.validateProductAndStock(productId, quantity);
      item.quantity = quantity;
    }

    return this.getGuestCart(session);
  }

  /**
   * Remove item from user cart
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Updated cart
   */
  async removeItemFromUserCart(userId, productId) {
    const cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) {
      throw new ApiError('Cart not found', StatusCodes.NOT_FOUND);
    }

    cart.items = (cart.items || []).filter((item) => item.product_id !== productId);
    await cart.save();

    return this.getUserCart(userId);
  }

  /**
   * Remove item from guest cart
   * @param {Object} session - Express session
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Updated cart
   */
  async removeItemFromGuestCart(session, productId) {
    if (!session.cart) {
      throw new ApiError('Cart is empty', StatusCodes.NOT_FOUND);
    }

    session.cart.items = (session.cart.items || []).filter((item) => item.product_id !== productId);

    return this.getGuestCart(session);
  }

  /**
   * Clear user cart
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Empty cart
   */
  async clearUserCart(userId) {
    const cart = await Cart.findOne({ where: { user_id: userId } });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return { items: [], totals: { subtotal: 0, item_count: 0 } };
  }

  /**
   * Clear guest cart
   * @param {Object} session - Express session
   * @returns {Object} Empty cart
   */
  clearGuestCart(session) {
    session.cart = { items: [] };
    return { items: [], totals: { subtotal: 0, item_count: 0 } };
  }

  /**
   * Merge guest cart to user cart (after login)
   * @param {string} userId - User ID
   * @param {Object} session - Express session with guest cart
   * @returns {Promise<Object>} Merged cart
   */
  async mergeGuestCartToUser(userId, session) {
    const guestItems = session.cart?.items || [];
    if (guestItems.length === 0) {
      return this.getUserCart(userId);
    }

    const userCart = await Cart.findOrCreateForUser(userId);
    const userItems = userCart.items || [];

    // Merge items
    for (const guestItem of guestItems) {
      const existingItem = userItems.find((item) => item.product_id === guestItem.product_id);

      if (existingItem) {
        // Add quantities
        const newQuantity = existingItem.quantity + guestItem.quantity;
        await this.validateProductAndStock(guestItem.product_id, newQuantity);
        existingItem.quantity = newQuantity;
      } else {
        // Add guest item to user cart
        await this.validateProductAndStock(guestItem.product_id, guestItem.quantity);
        userItems.push(guestItem);
      }
    }

    userCart.items = userItems;
    await userCart.save();

    // Clear guest cart
    session.cart = { items: [] };

    return this.getUserCart(userId);
  }

  /**
   * Validate product exists, is available, and has sufficient stock
   * @param {string} productId - Product ID
   * @param {number} quantity - Requested quantity
   * @returns {Promise<Product>} Validated product
   * @private
   */
  async validateProductAndStock(productId, quantity, options = {}) {
    const { productHint = null } = options;
    let product = productHint;

    if (!product) {
      product = await Product.findByPk(productId, {
        attributes: [
          'id',
          'title',
          'slug',
          'price',
          'compare_price',
          'images',
          'stock',
          'is_active',
          'status',
        ],
        include: [{ model: Store, as: 'store', attributes: ['status'] }],
      });
    }

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
      logger.warn('Cart item requested beyond stock', {
        productId,
        available: product.stock,
        requested: quantity,
      });
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
      };
    }

    const productIds = items.map((item) => item.product_id);
    const productMap = await this._getProductsWithCache(productIds);

    let subtotal = 0;
    let item_count = 0;

    const populatedItems = items
      .map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) return null;

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
        attributes: [
          'id',
          'title',
          'slug',
          'price',
          'compare_price',
          'images',
          'stock',
          'is_active',
          'status',
        ],
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
}

module.exports = new CartService();
