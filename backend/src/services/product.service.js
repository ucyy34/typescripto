/**
 * Product Service
 * Business logic for product management
 */

const { Product, Store, Category, User, ProductVariant } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const slugify = require('slugify');

const BADGE_ALLOW_LIST = new Set([
  'handmade',
  'eco-friendly',
  'bestseller',
  'new',
  'organic',
  'limited',
]);

class ProductService {
  /**
   * Create new product
   * @param {string} userId - User ID (store owner)
   * @param {Object} productData - Product data
   * @returns {Promise<Product>}
   */
  async createProduct(userId, productData) {
    // Check if store exists and belongs to user
    const store = await Store.findOne({
      where: { id: productData.store_id, user_id: userId },
    });

    if (!store) {
      throw new ApiError('Store not found or you do not have permission', StatusCodes.FORBIDDEN);
    }

    // Check if store is approved
    if (store.status !== 'approved') {
      throw new ApiError('Store must be approved before adding products', StatusCodes.BAD_REQUEST);
    }

    // TEMPORARILY DISABLED: Category validation
    // TODO: Re-enable with proper UUID handling
    // const category = await Category.findByPk(productData.category_id);
    // if (!category) {
    //   throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    // }

    // Generate slug from title
    let slug = slugify(productData.title, { lower: true, strict: true });

    // Check if slug exists and make it unique
    const slugExists = await Product.findOne({ where: { slug } });
    if (slugExists) {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${randomSuffix}`;
    }

    const normalizedPayload = this.prepareProductData(productData);

    const payload = {
      ...normalizedPayload,
      slug,
      status: 'pending',
    };

    // Use transaction to ensure product and variants are created atomically
    const transaction = await Product.sequelize.transaction();

    try {
      // Create product
      const product = await Product.create(payload, { transaction });

      // Create variants if provided (supports both old and new format)
      if (Array.isArray(productData.variants) && productData.variants.length > 0) {
        for (const v of productData.variants) {
          await ProductVariant.create({
            product_id: product.id,
            // New cascade format fields
            color_hex: v.color_hex || null,
            color_name: v.color_name || null,
            variant_type: v.variant_type || null,
            variant_value: v.variant_value || null,
            price: v.price ?? null,
            stock: v.stock ?? null,
            sku: v.sku || null,
            image_url: v.image_url || null,
            // Legacy fields for backward compatibility
            category_variant_id: v.category_variant_id || null,
            variant_name: v.variant_name || null,
            selected_options: v.selected_options || null,
          }, { transaction });
        }
      }

      // Commit transaction
      await transaction.commit();

      // Clear cache
      await cache.delPattern('products:*');

      return product;
    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();
      throw error;
    }
  }

  prepareProductData(productData = {}, options = {}) {
    const { isUpdate = false, existingProduct = {} } = options;

    const baseTitle = productData.title ?? existingProduct.title ?? '';
    const title = baseTitle ? baseTitle.trim() : '';

    const descriptionSource =
      productData.description ?? (isUpdate ? existingProduct.description : '') ?? '';
    const description = descriptionSource ? descriptionSource.trim() : '';

    const shortDescriptionSource =
      productData.short_description ??
      (isUpdate ? existingProduct.short_description : '') ??
      description;
    const shortDescription = shortDescriptionSource ? shortDescriptionSource.trim() : '';

    const tags = Array.isArray(productData.tags)
      ? [...new Set(productData.tags.map((tag) => tag.trim()).filter(Boolean))]
      : isUpdate && Array.isArray(existingProduct.tags)
        ? [...new Set(existingProduct.tags.map((tag) => tag.trim()).filter(Boolean))]
        : [];

    const badges = Array.isArray(productData.badges)
      ? [...new Set(productData.badges.map((badge) => badge.trim().toLowerCase()).filter(Boolean))].filter(
        (badge) => BADGE_ALLOW_LIST.has(badge)
      )
      : [];

    const images = Array.isArray(productData.images)
      ? [...new Set(productData.images.map((image) => image.trim()).filter(Boolean))]
      : isUpdate && Array.isArray(existingProduct.images)
        ? [...new Set(existingProduct.images.map((image) => image.trim()).filter(Boolean))]
        : [];

    const metaKeywords = Array.isArray(productData.meta_keywords)
      ? [...new Set(productData.meta_keywords.map((keyword) => keyword.trim()).filter(Boolean))]
      : tags.length > 0
        ? [...tags]
        : [];

    const seoTitleSource = productData.seo_title ?? (isUpdate ? existingProduct.seo_title : '') ?? title;
    const seoTitle = seoTitleSource ? seoTitleSource.trim().substring(0, 200) : null;

    const providedSeoDescription =
      productData.seo_description ?? (isUpdate ? existingProduct.seo_description : null);
    const seoDescriptionCandidate =
      (typeof providedSeoDescription === 'string' && providedSeoDescription.trim().length > 0
        ? providedSeoDescription.trim()
        : null) || shortDescription || description || '';
    const seoDescription = seoDescriptionCandidate
      ? seoDescriptionCandidate.substring(0, 500)
      : null;

    const stockValue = Number(productData.stock ?? existingProduct.stock ?? 0);
    const isActive = stockValue > 0 ? Boolean(productData.is_active ?? true) : false;

    return {
      ...productData,
      title,
      description,
      short_description: shortDescription,
      tags,
      badges,
      images,
      meta_keywords: metaKeywords,
      seo_title: seoTitle,
      seo_description: seoDescription,
      stock: stockValue,
      is_active: isActive,
    };
  }

  /**
   * Get product by ID
   * @param {string} productId
   * @param {boolean} includeInactive
   * @param {string} requestUserId - If provided, allows owner to see their inactive products
   * @returns {Promise<Product>}
   */
  async getProductById(productId, includeInactive = false, requestUserId = null) {
    // Try cache first (only for public requests)
    const cacheKey = `product:${productId}`;
    const cached = await cache.get(cacheKey);
    if (cached && !includeInactive && !requestUserId) {
      return cached;
    }

    // If checking ownership, fetch without filters first to check ownership
    const checkOwnership = !includeInactive && requestUserId;
    const where = { id: productId };

    if (!includeInactive && !checkOwnership) {
      where.status = 'approved';
      where.is_active = true;
      where.stock = { [Op.gt]: 0 };
    }

    const product = await Product.findOne({
      where: checkOwnership ? { id: productId } : where,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug', 'logo', 'rating', 'user_id'],
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: ProductVariant,
          as: 'productVariants',
        },
      ],
    });

    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    // If checking ownership, verify and apply filters if not owner
    if (checkOwnership) {
      const isOwner = product.store && product.store.user_id === requestUserId;
      if (!isOwner) {
        // Not owner, check if it meets public criteria
        if (product.status !== 'approved' || !product.is_active || product.stock <= 0) {
          throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
        }
      }
      // If owner, return as is (no filters applied)
      logger.info(`[ProductService] Vendor ${requestUserId} accessing their ${product.is_active ? 'active' : 'inactive'} product ${productId}`);
    }

    // Increment views (async, don't wait)
    product.incrementViews().catch(() => { });

    // Cache for 1 hour (only public products)
    if (!includeInactive && !requestUserId) {
      await cache.set(cacheKey, product, 3600);
    }

    return product;
  }

  /**
   * Get products with filters and pagination
   * @param {Object} filters
   * @param {Object} user - Authenticated user (optional)
   * @returns {Promise<Object>}
   */
  async getProducts(filters, user = null) {
    const {
      page = 1,
      limit = 20,
      store_id,
      category_id,
      status,
      search,
      min_price,
      max_price,
      in_stock,
      is_featured,
      sort = '-created_at',
      includeAllStatuses,  // Flag to include all statuses (for vendor's own products)
    } = filters;

    // Parse includeAllStatuses from string (query params are strings)
    const shouldIncludeAll = includeAllStatuses === 'true' || includeAllStatuses === true;

    // Verify ownership if includeAllStatuses is used by non-admin
    if (shouldIncludeAll && user && user.role !== 'admin') {
      if (!store_id) {
        throw new ApiError('store_id is required for non-admin users', StatusCodes.BAD_REQUEST);
      }

      // Get store to verify ownership
      const { Store } = require('../models');
      const store = await Store.findByPk(store_id);

      if (!store) {
        throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
      }

      if (store.user_id !== user.id) {
        throw new ApiError('You can only view products from your own store', StatusCodes.FORBIDDEN);
      }

      logger.info(`[ProductService] Vendor ${user.id} viewing all statuses for their store ${store_id}`);
    }

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (store_id) where.store_id = store_id;
    if (category_id) where.category_id = category_id;
    if (status) where.status = status;
    if (is_featured !== undefined) where.is_featured = is_featured;

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } },
      ];
    }

    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined) where.price[Op.gte] = min_price;
      if (max_price !== undefined) where.price[Op.lte] = max_price;
    }

    if (in_stock) {
      where.stock = { [Op.gt]: 0 };
    }

    // If includeAllStatuses is true, vendor sees ALL their products (pending, approved, rejected, active, inactive)
    // Otherwise, only show approved, active, and in-stock products to public
    if (!shouldIncludeAll && !status) {
      // No status filter specified, enforce availability for public view
      where.status = 'approved';
      where.is_active = true;
      if (!where.stock) {
        where.stock = { [Op.gt]: 0 };
      }
    }

    // Parse sort
    let order = [];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
    order.push([sortField, sortDirection]);

    // Try cache for common queries (include shouldIncludeAll in cache key)
    const cacheKey = `products:${JSON.stringify({ where, offset, limit, order, includeAll: shouldIncludeAll })}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query products
    const { rows: products, count: total } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug', 'logo'],
          where: { status: 'approved' },
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get products by store ID
   * @param {string} storeId
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getProductsByStore(storeId, filters) {
    return this.getProducts({ ...filters, store_id: storeId });
  }

  /**
   * Update product
   * @param {string} productId
   * @param {string} userId
   * @param {Object} updateData
   * @returns {Promise<Product>}
   */
  async updateProduct(productId, userId, updateData) {
    const product = await Product.findByPk(productId, {
      include: [{ model: Store, as: 'store' }],
    });

    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    // Check ownership
    if (product.store.user_id !== userId) {
      throw new ApiError('You do not have permission to update this product', StatusCodes.FORBIDDEN);
    }

    // Prevent updating status and approval fields
    delete updateData.status;
    delete updateData.approved_at;
    delete updateData.approved_by;
    delete updateData.store_id; // Cannot change store

    const sanitizedUpdate = { ...updateData };

    if (sanitizedUpdate.images) {
      sanitizedUpdate.images = sanitizedUpdate.images.filter(
        (image) => typeof image === 'string' && image.trim().length > 0
      );
    }

    if (sanitizedUpdate.badges) {
      sanitizedUpdate.badges = [...new Set(
        sanitizedUpdate.badges.map((badge) => badge.trim().toLowerCase()).filter(Boolean)
      )].filter((badge) => BADGE_ALLOW_LIST.has(badge));
    }

    if (sanitizedUpdate.tags) {
      sanitizedUpdate.tags = sanitizedUpdate.tags.map((tag) => tag.trim()).filter(Boolean);
    }

    if (sanitizedUpdate.meta_keywords) {
      sanitizedUpdate.meta_keywords = sanitizedUpdate.meta_keywords.map((keyword) => keyword.trim()).filter(Boolean);
    }

    if (sanitizedUpdate.seo_title) {
      sanitizedUpdate.seo_title = sanitizedUpdate.seo_title.trim().substring(0, 200);
    }

    if (sanitizedUpdate.seo_description) {
      sanitizedUpdate.seo_description = sanitizedUpdate.seo_description.trim().substring(0, 500);
    }

    if (sanitizedUpdate.title && sanitizedUpdate.seo_title === undefined) {
      const existingSeoMatchesTitle =
        !product.seo_title || product.seo_title.trim() === (product.title || '').trim();
      if (existingSeoMatchesTitle) {
        sanitizedUpdate.seo_title = sanitizedUpdate.title;
      }
    }

    const hasDescriptionUpdate =
      sanitizedUpdate.short_description !== undefined || sanitizedUpdate.description !== undefined;

    if (hasDescriptionUpdate && sanitizedUpdate.seo_description === undefined) {
      const referenceShort =
        sanitizedUpdate.short_description !== undefined
          ? sanitizedUpdate.short_description
          : product.short_description;
      const referenceDescription =
        sanitizedUpdate.description !== undefined ? sanitizedUpdate.description : product.description;

      const existingSeo = product.seo_description ? product.seo_description.trim() : '';
      const shortMatch = referenceShort ? referenceShort.trim() : '';
      const descriptionMatch = referenceDescription ? referenceDescription.trim() : '';

      if (!existingSeo || existingSeo === shortMatch || existingSeo === descriptionMatch) {
        const fallbackDescription = shortMatch || descriptionMatch;
        sanitizedUpdate.seo_description = fallbackDescription ? fallbackDescription.substring(0, 500) : null;
      }
    }

    // Check if stock is being set to zero and product is currently active
    let stockWarning = null;
    let stockInfo = null;
    if (sanitizedUpdate.stock !== undefined) {
      const newStock = Number(sanitizedUpdate.stock);
      const oldStock = product.stock || 0;

      // Auto-deactivate when stock reaches zero
      if (newStock <= 0 && product.is_active) {
        sanitizedUpdate.is_active = false;
        stockWarning = 'Product has been automatically deactivated due to zero stock';
        logger.warn(`[ProductService] ${stockWarning}: ${product.title} (ID: ${productId})`);
      }

      // Auto-reactivate when stock is replenished (from zero to positive)
      // Only reactivate if: 1) product is approved, 2) currently inactive, 3) was previously at zero stock
      if (newStock > 0 && oldStock === 0 && !product.is_active && product.status === 'approved') {
        sanitizedUpdate.is_active = true;
        stockInfo = 'Product has been automatically reactivated due to stock replenishment';
        logger.info(`[ProductService] ${stockInfo}: ${product.title} (ID: ${productId})`);
      }
    }

    await product.update(sanitizedUpdate);

    // Clear cache
    await cache.del(`product:${productId}`);
    await cache.delPattern('products:*');

    // Reload product to get updated values
    await product.reload();

    // Add warning/info messages to product object if they exist
    if (stockWarning) {
      product.dataValues.warning = stockWarning;
    }
    if (stockInfo) {
      product.dataValues.info = stockInfo;
    }

    return product;
  }

  /**
   * Update product status (admin only)
   * @param {string} productId
   * @param {string} adminId
   * @param {string} status
   * @param {string} rejection_reason
   * @returns {Promise<Product>}
   */
  async updateProductStatus(productId, adminId, status, rejection_reason = null) {
    const product = await Product.findByPk(productId);

    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    const updateData = { status };

    if (status === 'approved') {
      updateData.approved_at = new Date();
      updateData.approved_by = adminId;
      updateData.rejection_reason = null;
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason;
      updateData.approved_at = null;
      updateData.approved_by = null;
    }

    await product.update(updateData);

    // Clear cache
    await cache.del(`product:${productId}`);
    await cache.delPattern('products:*');

    return product;
  }

  /**
   * Delete product (soft delete)
   * @param {string} productId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteProduct(productId, userId) {
    const product = await Product.findByPk(productId, {
      include: [{ model: Store, as: 'store' }],
    });

    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    // Check ownership
    if (product.store.user_id !== userId) {
      throw new ApiError('You do not have permission to delete this product', StatusCodes.FORBIDDEN);
    }

    await product.destroy(); // Soft delete

    // Clear cache
    await cache.del(`product:${productId}`);
    await cache.delPattern('products:*');
  }

  /**
   * Get featured products
   * @param {number} limit
   * @returns {Promise<Array<Product>>}
   */
  async getFeaturedProducts(limit = 10) {
    const cacheKey = `products:featured:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const products = await Product.findFeatured(limit);

    // Cache for 1 hour
    await cache.set(cacheKey, products, 3600);

    return products;
  }

  /**
   * Get best-selling products
   * @param {number} limit
   * @returns {Promise<Array<Product>>}
   */
  async getBestSellers(limit = 10) {
    const cacheKey = `products:bestsellers:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const products = await Product.findBestSellers(limit);

    // Cache for 30 minutes
    await cache.set(cacheKey, products, 1800);

    return products;
  }

  /**
   * Get random approved & active products
   * @param {number} limit
   * @returns {Promise<Array<Product>>}
   */
  async getRandomProducts(limit = 6) {
    const cacheKey = `products:random:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const products = await Product.findAll({
      where: {
        status: 'approved',
        is_active: true,
        stock: { [Op.gt]: 0 },
      },
      include: [
        { model: Store, as: 'store', attributes: ['id', 'name', 'slug'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      ],
      order: Product.sequelize.random(),
      limit,
    });

    // Cache briefly (1 minute) to keep results fresh but avoid hammering DB
    await cache.set(cacheKey, products, 60);

    return products;
  }
}

module.exports = new ProductService();
