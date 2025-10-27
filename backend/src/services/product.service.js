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
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 60;

const serializeForCache = (value) => {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'symbol') {
      return value.description || value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForCache(item));
  }

  const serialized = {};

  for (const key of Object.keys(value)) {
    serialized[key] = serializeForCache(value[key]);
  }

  for (const symbolKey of Object.getOwnPropertySymbols(value)) {
    const serializedKey = symbolKey.description || symbolKey.toString();
    serialized[`$symbol:${serializedKey}`] = serializeForCache(value[symbolKey]);
  }

  return serialized;
};

const buildCacheKey = (prefix, payload) => {
  return `${prefix}:${JSON.stringify(serializeForCache(payload))}`;
};

const transformProductSummary = (product) => {
  if (!product) return null;

  const safeImages = Array.isArray(product.images) ? product.images : [];
  const safeBadges = Array.isArray(product.badges) ? product.badges : [];
  const safeTags = Array.isArray(product.tags) ? product.tags : [];
  const safeMetaKeywords = Array.isArray(product.meta_keywords) ? product.meta_keywords : [];

  return {
    id: product.id,
    store_id: product.store_id,
    category_id: product.category_id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    short_description: product.short_description,
    sku: product.sku,
    price: product.price,
    compare_price: product.compare_price,
    cost_price: product.cost_price,
    stock: product.stock,
    low_stock_threshold: product.low_stock_threshold,
    images: safeImages,
    thumbnail: safeImages.length > 0 ? safeImages[0] : null,
    status: product.status,
    rejection_reason: product.rejection_reason,
    is_active: product.is_active,
    is_featured: product.is_featured,
    weight: product.weight,
    dimensions: product.dimensions,
    attributes: product.attributes,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    meta_keywords: safeMetaKeywords,
    tags: safeTags,
    badges: safeBadges,
    rating: product.rating,
    total_reviews: product.total_reviews,
    total_sales: product.total_sales,
    views_count: product.views_count,
    approved_at: product.approved_at,
    approved_by: product.approved_by,
    created_at: product.created_at,
    updated_at: product.updated_at,
    store: product.store
      ? {
          id: product.store.id,
          name: product.store.name,
          slug: product.store.slug,
          logo: product.store.logo,
          rating: product.store.rating,
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
};

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
    await cache.delPattern('product:search:*');

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
      limit = DEFAULT_LIMIT,
      store_id,
      category_id,
      status,
      search,
      min_price,
      max_price,
      in_stock,
      is_featured,
      sort = '-created_at',
      includeAllStatuses, // Flag to include all statuses (for vendor's own products)
    } = filters;

    const shouldIncludeAll = includeAllStatuses === 'true' || includeAllStatuses === true;

    const parsedPage = Number(page) || 1;
    const pageNumber = parsedPage > 0 ? Math.floor(parsedPage) : 1;
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.floor(parsedLimit), 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
    const offset = (pageNumber - 1) * safeLimit;

    const where = {};

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

    if (!shouldIncludeAll) {
      if (!status) {
        where.status = 'approved';
      }

      if (!status || status === 'approved') {
        where.is_active = true;
        where.stock = { ...(where.stock || {}), [Op.gt]: 0 };
      }
    }

    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
    const order = [[sortField, sortDirection]];

    const cacheKey = buildCacheKey('products', { where, offset, limit: safeLimit, order });
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { rows: products, count: total } = await Product.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order,
      subQuery: false,
      distinct: true,
      attributes: [
        'id',
        'store_id',
        'category_id',
        'title',
        'slug',
        'description',
        'short_description',
        'sku',
        'price',
        'compare_price',
        'cost_price',
        'stock',
        'low_stock_threshold',
        'images',
        'status',
        'rejection_reason',
        'is_active',
        'is_featured',
        'weight',
        'dimensions',
        'attributes',
        'seo_title',
        'seo_description',
        'meta_keywords',
        'tags',
        'badges',
        'rating',
        'total_reviews',
        'total_sales',
        'views_count',
        'approved_at',
        'approved_by',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug', 'logo', 'rating'],
          where: { status: 'approved' },
          required: true,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    const plainProducts = products.map((product) =>
      transformProductSummary(product.get ? product.get({ plain: true }) : product)
    );

    const result = {
      products: plainProducts,
      pagination: {
        page: pageNumber,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasNext: pageNumber < Math.ceil(total / safeLimit),
        hasPrev: pageNumber > 1,
      },
    };

    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Search products for storefront autocomplete/results
   * @param {string} query
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async searchProducts(query, options = {}) {
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) {
      return {
        query: '',
        totalMatches: 0,
        products: [],
        suggestions: [],
      };
    }

    const normalizedQuery = trimmedQuery.replace(/\s+/g, ' ');
    const lowerQuery = normalizedQuery.toLowerCase();
    const requestedLimit = Number(options.limit) || 8;
    const limit = Math.min(Math.max(Math.floor(requestedLimit), 1), 20);
    const includeSuggestions = options.includeSuggestions !== false;

    const cacheKey = buildCacheKey('product:search', {
      query: lowerQuery,
      limit,
      includeSuggestions: includeSuggestions ? 1 : 0,
    });
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const rawTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const lowerTokens = rawTokens.map((token) => token.toLowerCase());
    const overlapTokens = Array.from(new Set([...rawTokens, ...lowerTokens]));

    const where = {
      status: 'approved',
      is_active: true,
      stock: { [Op.gt]: 0 },
      [Op.or]: [
        { title: { [Op.iLike]: `%${normalizedQuery}%` } },
        { short_description: { [Op.iLike]: `%${normalizedQuery}%` } },
        { description: { [Op.iLike]: `%${normalizedQuery}%` } },
        { seo_title: { [Op.iLike]: `%${normalizedQuery}%` } },
        { seo_description: { [Op.iLike]: `%${normalizedQuery}%` } },
        { slug: { [Op.iLike]: `%${normalizedQuery}%` } },
        { '$store.name$': { [Op.iLike]: `%${normalizedQuery}%` } },
        { '$store.slug$': { [Op.iLike]: `%${normalizedQuery}%` } },
      ],
    };

    if (overlapTokens.length > 0) {
      where[Op.or].push({ tags: { [Op.overlap]: overlapTokens } });
      where[Op.or].push({ meta_keywords: { [Op.overlap]: overlapTokens } });
    }

    const products = await Product.findAll({
      where,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug', 'logo'],
          where: { status: 'approved' },
          required: true,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
          required: false,
        },
      ],
      order: [
        ['is_featured', 'DESC'],
        ['total_sales', 'DESC'],
        ['rating', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
      attributes: [
        'id',
        'store_id',
        'category_id',
        'title',
        'slug',
        'short_description',
        'price',
        'compare_price',
        'stock',
        'low_stock_threshold',
        'images',
        'badges',
        'tags',
        'meta_keywords',
        'seo_title',
        'seo_description',
        'rating',
        'total_reviews',
        'total_sales',
        'created_at',
        'updated_at',
      ],
    });

    const transformedProducts = products.map((product) =>
      transformProductSummary(product.get ? product.get({ plain: true }) : product)
    );

    let keywordSuggestions = [];
    if (includeSuggestions) {
      const suggestionSet = new Set();
      const addSuggestion = (value) => {
        if (value === undefined || value === null) return;
        const trimmed = String(value).trim();
        if (trimmed) {
          suggestionSet.add(trimmed);
        }
      };

      for (const product of transformedProducts) {
        if (Array.isArray(product.tags)) {
          product.tags.forEach(addSuggestion);
        }
        if (Array.isArray(product.meta_keywords)) {
          product.meta_keywords.forEach(addSuggestion);
        }
        if (product.category?.name) {
          addSuggestion(product.category.name);
        }
        if (product.store?.name) {
          addSuggestion(product.store.name);
        }
      }

      const loweredQuery = lowerQuery;
      keywordSuggestions = Array.from(suggestionSet)
        .map((value) => value.trim())
        .filter((value) => value && value.toLowerCase() !== loweredQuery)
        .slice(0, Math.max(5, 10 - transformedProducts.length));
    }

    const result = {
      query: normalizedQuery,
      totalMatches: transformedProducts.length,
      products: transformedProducts,
      suggestions: keywordSuggestions.map((value) => ({
        type: 'keyword',
        value,
      })),
    };

    await cache.set(cacheKey, result, 120);

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
    await cache.delPattern('product:search:*');

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
    await cache.delPattern('product:search:*');

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
    const transformed = products.map((product) =>
      transformProductSummary(product.get ? product.get({ plain: true }) : product)
    );

    await cache.set(cacheKey, transformed, 3600);

    return transformed;
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
    const transformed = products.map((product) =>
      transformProductSummary(product.get ? product.get({ plain: true }) : product)
    );

    await cache.set(cacheKey, transformed, 1800);

    return transformed;
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
      attributes: [
        'id',
        'store_id',
        'category_id',
        'title',
        'slug',
        'short_description',
        'price',
        'compare_price',
        'stock',
        'low_stock_threshold',
        'images',
        'badges',
        'tags',
        'meta_keywords',
        'seo_title',
        'seo_description',
        'rating',
        'total_reviews',
        'total_sales',
        'created_at',
        'updated_at',
      ],
    });

    const transformed = products.map((product) =>
      transformProductSummary(product.get ? product.get({ plain: true }) : product)
    );

    await cache.set(cacheKey, transformed, 60);

    return transformed;
  }
}

module.exports = new ProductService();
