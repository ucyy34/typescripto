/**
 * Product Service
 * Business logic for product management
 */

const { Product, Store, Category, ProductVariant } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const { cache } = require('../config/redis');
const slugify = require('slugify');
const {
  parsePagination,
  parseBoolean,
  encodeCursor,
  buildCursorClause,
} = require('../utils/pagination');

const MAX_SEO_DESCRIPTION_LENGTH = 160;

const PRODUCT_LIST_ATTRIBUTES = [
  'id',
  'title',
  'slug',
  'price',
  'compare_price',
  'short_description',
  'images',
  'badges',
  'rating',
  'total_reviews',
  'total_sales',
  'stock',
  'is_active',
  'status',
  'created_at',
  'updated_at',
  'store_id',
  'category_id',
];

const buildProductIncludes = () => [
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
    attributes: ['id', 'name', 'slug', 'icon'],
    required: false,
  },
];

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
      store_id,
      category_id,
      status,
      search,
      min_price,
      max_price,
      in_stock,
      is_featured,
      includeAllStatuses,
      skip_total,
    } = filters;

    const pagination = parsePagination(filters);
    const shouldIncludeAll = parseBoolean(includeAllStatuses);
    const shouldFilterInStock = parseBoolean(in_stock);
    const requestedFeatured =
      is_featured !== undefined && is_featured !== null ? parseBoolean(is_featured) : undefined;

    const andConditions = [];

    if (store_id) {
      andConditions.push({ store_id });
    }

    if (category_id) {
      andConditions.push({ category_id });
    }

    if (status) {
      andConditions.push({ status });
    } else if (!shouldIncludeAll) {
      andConditions.push({ status: 'approved' });
    }

    if (!shouldIncludeAll && (!status || status === 'approved')) {
      andConditions.push({ is_active: true });
    }

    if (requestedFeatured !== undefined) {
      andConditions.push({ is_featured: requestedFeatured });
    }

    const priceFilters = {};
    const minPrice = Number.parseFloat(min_price);
    const maxPrice = Number.parseFloat(max_price);

    if (Number.isFinite(minPrice)) {
      priceFilters[Op.gte] = minPrice;
    }

    if (Number.isFinite(maxPrice)) {
      priceFilters[Op.lte] = maxPrice;
    }

    if (Object.keys(priceFilters).length > 0) {
      andConditions.push({ price: priceFilters });
    }

    if (shouldFilterInStock || (!shouldIncludeAll && (!status || status === 'approved'))) {
      andConditions.push({ stock: { [Op.gt]: 0 } });
    }

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      const normalizedSearch = searchTerm.replace(/\s+/g, ' ');
      const wildcard = `%${normalizedSearch}%`;
      const tokens = normalizedSearch.split(' ').filter(Boolean);

      const orConditions = [
        { title: { [Op.iLike]: wildcard } },
        { short_description: { [Op.iLike]: wildcard } },
        { description: { [Op.iLike]: wildcard } },
        { seo_title: { [Op.iLike]: wildcard } },
        { seo_description: { [Op.iLike]: wildcard } },
        { slug: { [Op.iLike]: wildcard } },
        { '$store.name$': { [Op.iLike]: wildcard } },
        { '$store.slug$': { [Op.iLike]: wildcard } },
      ];

      if (tokens.length > 0) {
        orConditions.push({ tags: { [Op.overlap]: tokens } });
        orConditions.push({ meta_keywords: { [Op.overlap]: tokens } });
      }

      andConditions.push({ [Op.or]: orConditions });
    }

    const cursorClause = buildCursorClause({
      cursor: pagination.cursor,
      sortField: pagination.sortField,
      sortDirection: pagination.sortDirection,
    });

    const baseConditions = [...andConditions];

    if (cursorClause) {
      andConditions.push(cursorClause);
    }

    const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};
    const countWhere = cursorClause
      ? baseConditions.length > 0
        ? { [Op.and]: baseConditions }
        : {}
      : where;

    let cacheKey = null;
    if (!pagination.usingCursor && !searchTerm) {
      cacheKey = `products:${JSON.stringify({
        store_id,
        category_id,
        status: status || (shouldIncludeAll ? null : 'approved'),
        in_stock: shouldFilterInStock,
        is_featured: requestedFeatured,
        min_price: Number.isFinite(minPrice) ? minPrice : null,
        max_price: Number.isFinite(maxPrice) ? maxPrice : null,
        offset: pagination.offset,
        limit: pagination.limit,
        order: pagination.order,
      })}`;

      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const fetchLimit = pagination.limit + 1;
    const include = buildProductIncludes();

    const queryOptions = {
      where,
      include,
      order: pagination.order,
      limit: fetchLimit,
      subQuery: false,
      attributes: PRODUCT_LIST_ATTRIBUTES,
    };

    if (!pagination.usingCursor) {
      queryOptions.offset = pagination.offset;
    }

    const products = await Product.findAll(queryOptions);

    let hasMore = false;
    let visibleProducts = products;

    if (products.length > pagination.limit) {
      hasMore = true;
      visibleProducts = products.slice(0, pagination.limit);
    }

    const serializedProducts = visibleProducts.map((product) => {
      const plain = product.get({ plain: true });
      plain.primary_image = Array.isArray(plain.images) && plain.images.length > 0 ? plain.images[0] : null;
      plain.badges = Array.isArray(plain.badges) ? plain.badges.filter(Boolean) : [];
      return plain;
    });

    const shouldSkipTotal = parseBoolean(skip_total) || pagination.usingCursor;
    let total = null;
    let totalPages = null;

    if (!shouldSkipTotal) {
      const countInclude = buildProductIncludes();
      total = await Product.count({
        where: countWhere,
        include: countInclude,
        distinct: true,
        col: 'Product.id',
      });
      totalPages = Math.ceil(total / pagination.limit) || 1;
    }

    const nextCursor = hasMore && serializedProducts.length > 0
      ? encodeCursor(pagination.sortField, serializedProducts[serializedProducts.length - 1])
      : null;

    const previousCursor = pagination.usingCursor && serializedProducts.length > 0
      ? encodeCursor(pagination.sortField, serializedProducts[0])
      : null;

    const computedHasNext = pagination.usingCursor
      ? hasMore
      : total !== null
        ? pagination.page < totalPages
        : hasMore;

    const result = {
      products: serializedProducts,
      pagination: {
        page: pagination.usingCursor ? null : pagination.page,
        limit: pagination.limit,
        total: total !== null ? total : undefined,
        totalPages: totalPages !== null ? totalPages : undefined,
        hasNext: computedHasNext,
        hasPrev: pagination.usingCursor ? Boolean(pagination.cursor) : pagination.page > 1,
        nextCursor,
        previousCursor,
        cursor: pagination.usingCursor ? pagination.rawCursor : null,
        sort: `${pagination.sortDirection === 'DESC' ? '-' : ''}${pagination.sortField}`,
        usingCursor: pagination.usingCursor,
      },
    };

    // Cache only page-based requests with simple filters to avoid key explosion
    if (cacheKey) {
      await cache.set(cacheKey, result, 300);
    }

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
    const limit = Math.min(Math.max(requestedLimit, 1), 20);
    const includeSuggestions = options.includeSuggestions !== false;

    const cacheKey = `product:search:${lowerQuery}:${limit}:${includeSuggestions ? 1 : 0}`;
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
    });

    const transformedProducts = products.map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      compare_price: product.compare_price,
      short_description: product.short_description,
      thumbnail: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
      badges: Array.isArray(product.badges) ? product.badges : [],
      rating: product.rating,
      total_reviews: product.total_reviews,
      store: product.store
        ? {
            id: product.store.id,
            name: product.store.name,
            slug: product.store.slug,
            logo: product.store.logo,
          }
        : null,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
    }));

    let keywordSuggestions = [];
    if (includeSuggestions) {
      const suggestionSet = new Set();
      for (const product of products) {
        if (Array.isArray(product.tags)) {
          product.tags.forEach((tag) => suggestionSet.add(String(tag).trim()));
        }
        if (Array.isArray(product.meta_keywords)) {
          product.meta_keywords.forEach((keyword) => suggestionSet.add(String(keyword).trim()));
        }
        if (product.category?.name) {
          suggestionSet.add(product.category.name);
        }
        if (product.store?.name) {
          suggestionSet.add(product.store.name);
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
