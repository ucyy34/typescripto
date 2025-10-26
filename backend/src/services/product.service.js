/**
 * Product Service
 * Business logic for product management
 */

const { Product, Store, Category, User, ProductVariant } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const { cache } = require('../config/redis');
const slugify = require('slugify');

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

    // Check if category exists (temporarily disabled for testing)
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

    const sanitizedData = { ...productData };

    if (!sanitizedData.seo_title && sanitizedData.title) {
      sanitizedData.seo_title = sanitizedData.title;
    }

    if (!sanitizedData.seo_description) {
      if (sanitizedData.short_description) {
        sanitizedData.seo_description = sanitizedData.short_description;
      } else if (sanitizedData.description) {
        sanitizedData.seo_description = sanitizedData.description.substring(0, 160);
      }
    }

    if (!sanitizedData.meta_keywords || sanitizedData.meta_keywords.length === 0) {
      if (Array.isArray(sanitizedData.tags) && sanitizedData.tags.length > 0) {
        sanitizedData.meta_keywords = [...new Set(sanitizedData.tags.map((tag) => tag.toLowerCase()))];
      } else {
        sanitizedData.meta_keywords = [];
      }
    }

    // Create product
    const product = await Product.create({
      ...sanitizedData,
      slug,
      status: 'pending', // Needs admin approval
    });

    // Create variants if provided
    if (Array.isArray(productData.variants) && productData.variants.length > 0) {
      try {
        for (const v of productData.variants) {
          await ProductVariant.create({
            product_id: product.id,
            category_variant_id: v.category_variant_id,
            variant_name: v.variant_name,
            selected_options: v.selected_options,
          });
        }
      } catch (e) {
        // Do not fail product creation if variants fail; log only
        console.warn('[product] Failed to create variants:', e.message);
      }
    }

    // Clear cache
    await cache.delPattern('products:*');

    return product;
  }

  /**
   * Get product by ID
   * @param {string} productId
   * @param {boolean} includeInactive
   * @returns {Promise<Product>}
   */
  async getProductById(productId, includeInactive = false) {
    // Try cache first
    const cacheKey = `product:${productId}`;
    const cached = await cache.get(cacheKey);
    if (cached && !includeInactive) {
      return cached;
    }

    const where = { id: productId };

    if (!includeInactive) {
      where.status = 'approved';
      where.is_active = true;
      if (!where.stock || typeof where.stock !== 'object') {
        where.stock = { [Op.gt]: 0 };
      } else {
        where.stock[Op.gt] = 0;
      }
    }

    const product = await Product.findOne({
      where,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug', 'logo', 'rating'],
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

    // Increment views (async, don't wait)
    product.incrementViews().catch(() => {});

    // Cache for 1 hour
    if (!includeInactive) {
      await cache.set(cacheKey, product, 3600);
    }

    return product;
  }

  /**
   * Get products with filters and pagination
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getProducts(filters) {
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

    // If no status filter and includeAllStatuses is not true, only show approved and active products
    // This allows vendors to see all their products (pending, approved, rejected, active, inactive) by setting includeAllStatuses=true
    if (!status && !shouldIncludeAll) {
      where.status = 'approved';
      where.is_active = true;
      if (!where.stock || typeof where.stock !== 'object') {
        where.stock = { [Op.gt]: 0 };
      } else {
        where.stock[Op.gt] = 0;
      }
    }

    // Parse sort
    let order = [];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
    order.push([sortField, sortDirection]);

    // Try cache for common queries
    const cacheKey = `products:${JSON.stringify({ where, offset, limit, order })}`;
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

    if (updateData.title && !Object.prototype.hasOwnProperty.call(updateData, 'seo_title')) {
      updateData.seo_title = updateData.title;
    }

    if (
      (updateData.short_description || updateData.description) &&
      !Object.prototype.hasOwnProperty.call(updateData, 'seo_description')
    ) {
      updateData.seo_description =
        updateData.short_description ||
        (updateData.description ? updateData.description.substring(0, 160) : product.short_description || product.seo_description);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'tags')) {
      if (Array.isArray(updateData.tags) && updateData.tags.length > 0) {
        updateData.meta_keywords = [...new Set(updateData.tags.map((tag) => tag.toLowerCase()))];
      } else {
        updateData.meta_keywords = [];
      }
    }

    await product.update(updateData);

    // Clear cache
    await cache.del(`product:${productId}`);
    await cache.delPattern('products:*');

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
