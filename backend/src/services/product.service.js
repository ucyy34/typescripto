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

const MAX_SEO_DESCRIPTION_LENGTH = 160;
const SEARCH_CACHE_PREFIX = 'products:search';

const sanitizeSeoText = (text, limit) => {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.substring(0, limit - 3).trim()}...`;
};

const deriveSeoDescription = (shortDescription, description) => {
  return (
    sanitizeSeoText(shortDescription, MAX_SEO_DESCRIPTION_LENGTH) ||
    sanitizeSeoText(description, MAX_SEO_DESCRIPTION_LENGTH)
  );
};

const assignIfValue = (target, key, value) => {
  if (value !== undefined) {
    target[key] = value;
  }
};

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

    const productPayload = {
      ...productData,
      slug,
      status: 'pending', // Needs admin approval
    };

    if (!productPayload.seo_title && productData.title) {
      assignIfValue(productPayload, 'seo_title', sanitizeSeoText(productData.title, 200));
    }

    if (!productPayload.seo_description) {
      assignIfValue(
        productPayload,
        'seo_description',
        deriveSeoDescription(productData.short_description, productData.description)
      );
    }

    // Create product
    const product = await Product.create(productPayload);

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
    await cache.delPattern(`${SEARCH_CACHE_PREFIX}:*`);

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
      where.stock = { [Op.gt]: 0 };
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
   * Get product by slug
   * @param {string} slug
   * @param {boolean} includeInactive
   * @returns {Promise<Product>}
   */
  async getProductBySlug(slug, includeInactive = false) {
    const cacheKey = `product:slug:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached && !includeInactive) {
      return cached;
    }

    const where = { slug };

    if (!includeInactive) {
      where.status = 'approved';
      where.is_active = true;
      where.stock = { [Op.gt]: 0 };
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

    product.incrementViews().catch(() => {});

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
      where.stock = { ...(where.stock || {}), [Op.gt]: 0 };
    }

    // If no status filter and includeAllStatuses is not true, only show approved and active products
    // This allows vendors to see all their products (pending, approved, rejected, active, inactive) by setting includeAllStatuses=true
    if (!shouldIncludeAll) {
      if (!status) {
        where.status = 'approved';
      }

      if (!status || status === 'approved') {
        where.is_active = true;
        where.stock = { ...(where.stock || {}), [Op.gt]: 0 };
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
   * Search products for storefront autocomplete and results pages
   * @param {Object} params
   * @param {string} params.query
   * @param {number} params.limit
   * @param {boolean} params.includeSuggestions
   * @returns {Promise<Object>}
   */
  async searchProducts({ query, limit = 8, includeSuggestions = true }) {
    const trimmedQuery = (query || '').trim();

    if (trimmedQuery.length < 2) {
      return { query: trimmedQuery, results: [], suggestions: [] };
    }

    const normalizedQuery = trimmedQuery.replace(/\s+/g, ' ');
    const normalizedKey = normalizedQuery.toLowerCase();
    const searchLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 30);
    const includeSuggestionData = includeSuggestions !== false && includeSuggestions !== 'false';

    const cacheKey = `${SEARCH_CACHE_PREFIX}:${normalizedKey}:${searchLimit}:${includeSuggestionData ? '1' : '0'}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tokens = normalizedKey
      .split(/\s+/)
      .filter((token) => token.length > 1 && token.length <= 50)
      .slice(0, 6);

    const orConditions = [
      { title: { [Op.iLike]: `%${normalizedQuery}%` } },
      { short_description: { [Op.iLike]: `%${normalizedQuery}%` } },
      { description: { [Op.iLike]: `%${normalizedQuery}%` } },
      { sku: { [Op.iLike]: `%${normalizedQuery}%` } },
      { '$store.name$': { [Op.iLike]: `%${normalizedQuery}%` } },
      { '$category.name$': { [Op.iLike]: `%${normalizedQuery}%` } },
    ];

    if (tokens.length > 0) {
      orConditions.push({ tags: { [Op.overlap]: tokens } });
      orConditions.push({ meta_keywords: { [Op.overlap]: tokens } });
    }

    const products = await Product.findAll({
      where: {
        status: 'approved',
        is_active: true,
        stock: { [Op.gt]: 0 },
        [Op.or]: orConditions,
      },
      attributes: [
        'id',
        'title',
        'slug',
        'price',
        'images',
        'short_description',
        'badges',
        'rating',
        'total_reviews',
        'tags',
        'meta_keywords',
      ],
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug', 'logo'],
          required: false,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
          required: false,
        },
      ],
      order: [
        ['total_sales', 'DESC'],
        ['rating', 'DESC'],
        ['title', 'ASC'],
      ],
      limit: searchLimit,
    });

    const results = products.map((product) => product.get({ plain: true }));

    const response = {
      query: normalizedQuery,
      results,
      suggestions: [],
    };

    if (includeSuggestionData && results.length > 0) {
      const suggestionMap = new Map();

      const registerSuggestion = (value, type, extra = {}) => {
        if (!value) return;
        const key = `${type}:${value.toLowerCase()}`;
        const current = suggestionMap.get(key) || { value, type, count: 0, ...extra };
        current.count += 1;
        suggestionMap.set(key, current);
      };

      for (const product of results) {
        if (Array.isArray(product.tags)) {
          product.tags.forEach((tag) => registerSuggestion(tag, 'tag'));
        }

        if (Array.isArray(product.meta_keywords)) {
          product.meta_keywords.forEach((keyword) => registerSuggestion(keyword, 'keyword'));
        }

        if (product.category?.name) {
          registerSuggestion(product.category.name, 'category', { slug: product.category.slug });
        }

        if (product.store?.name) {
          registerSuggestion(product.store.name, 'store', { slug: product.store.slug });
        }
      }

      response.suggestions = Array.from(suggestionMap.values())
        .sort((a, b) => b.count - a.count)
        .map(({ value, type, slug }) => ({ value, type, slug }))
        .slice(0, 12);
    }

    await cache.set(cacheKey, response, 180);

    return response;
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

    // Auto-fill SEO fields when not provided explicitly
    const nextTitle = updateData.title ?? product.title;
    const nextShortDescription = updateData.short_description ?? product.short_description;
    const nextDescription = updateData.description ?? product.description;

    if (updateData.seo_title === undefined) {
      if (updateData.title) {
        assignIfValue(updateData, 'seo_title', sanitizeSeoText(updateData.title, 200));
      } else if (!product.seo_title && nextTitle) {
        assignIfValue(updateData, 'seo_title', sanitizeSeoText(nextTitle, 200));
      }
    } else if (typeof updateData.seo_title === 'string') {
      const trimmedSeoTitle = sanitizeSeoText(updateData.seo_title, 200);
      if (trimmedSeoTitle === undefined) {
        delete updateData.seo_title;
      } else {
        updateData.seo_title = trimmedSeoTitle;
      }
    }

    if (updateData.seo_description === undefined) {
      if (updateData.short_description || updateData.description) {
        assignIfValue(
          updateData,
          'seo_description',
          deriveSeoDescription(updateData.short_description, updateData.description)
        );
      } else if (!product.seo_description) {
        assignIfValue(
          updateData,
          'seo_description',
          deriveSeoDescription(nextShortDescription, nextDescription)
        );
      }
    } else if (typeof updateData.seo_description === 'string') {
      const trimmedSeoDescription = sanitizeSeoText(updateData.seo_description, MAX_SEO_DESCRIPTION_LENGTH);
      if (trimmedSeoDescription === undefined) {
        delete updateData.seo_description;
      } else {
        updateData.seo_description = trimmedSeoDescription;
      }
    }

    const currentSlug = product.slug;

    await product.update(updateData);

    // Clear cache
    await cache.del(`product:${productId}`);
    if (currentSlug) {
      await cache.del(`product:slug:${currentSlug}`);
    }
    await cache.delPattern('products:*');
    await cache.delPattern(`${SEARCH_CACHE_PREFIX}:*`);

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

    const currentSlug = product.slug;

    await product.update(updateData);

    // Clear cache
    await cache.del(`product:${productId}`);
    if (currentSlug) {
      await cache.del(`product:slug:${currentSlug}`);
    }
    await cache.delPattern('products:*');
    await cache.delPattern(`${SEARCH_CACHE_PREFIX}:*`);

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

    const currentSlug = product.slug;

    await product.destroy(); // Soft delete

    // Clear cache
    await cache.del(`product:${productId}`);
    if (currentSlug) {
      await cache.del(`product:slug:${currentSlug}`);
    }
    await cache.delPattern('products:*');
    await cache.delPattern(`${SEARCH_CACHE_PREFIX}:*`);
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
