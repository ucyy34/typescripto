/**
 * Store Service
 * Business logic for store management
 */

const { Store, User, Product, Category } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const slugify = require('slugify');
const { cache } = require('../config/redis');
const { sequelize } = require('../config/sequelize');

class StoreService {
  /**
   * Create new store (seller only)
   * @param {string} userId - User ID (seller)
   * @param {Object} storeData - Store data
   * @returns {Promise<Store>}
   */
  async createStore(userId, storeData) {
    // Check if user is seller
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    if (user.role !== 'seller' && user.role !== 'admin') {
      throw new ApiError('Only sellers can create stores', StatusCodes.FORBIDDEN);
    }

    // Check if user already has a store
    const existingStore = await Store.findOne({ where: { user_id: userId } });
    if (existingStore) {
      throw new ApiError('User already has a store', StatusCodes.CONFLICT);
    }

    // Generate slug from name
    let slug = slugify(storeData.name, { lower: true, strict: true });

    // Check if slug exists and make it unique
    const slugExists = await Store.findOne({ where: { slug } });
    if (slugExists) {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${randomSuffix}`;
    }

    // Create store
    const store = await Store.create({
      ...storeData,
      slug,
      user_id: userId,
      status: 'pending', // Needs admin approval
    });

    // Clear cache
    await cache.delPattern('stores:*');

    return store;
  }

  /**
   * Get store by ID
   * @param {string} storeId
   * @param {boolean} includeInactive - Include inactive stores
   * @returns {Promise<Store>}
   */
  async getStoreById(storeId, includeInactive = false) {
    const where = { id: storeId };

    if (!includeInactive) {
      where.status = 'approved';
    }

    const store = await Store.findOne({
      where,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    if (!store) {
      throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
    }

    await this.hydrateStoreSummaries(store);

    return store;
  }

  /**
   * Get store by slug
   * @param {string} slug
   * @param {boolean} includeInactive
   * @returns {Promise<Store>}
   */
  async getStoreBySlug(slug, includeInactive = false) {
    const where = { slug };

    if (!includeInactive) {
      where.status = 'approved';
    }

    const store = await Store.findOne({
      where,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    if (!store) {
      throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
    }

    await this.hydrateStoreSummaries(store);

    return store;
  }

  /**
   * Get all stores with pagination and filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated stores
   */
  async getStores(filters) {
    const { page = 1, limit = 20, status, search, city, is_featured, sort = '-created_at' } = filters;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status && status !== 'all') {
      where.status = status;
    } else if (!status) {
      where.status = 'approved';
    }

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    if (city) {
      where.city = { [Op.iLike]: `%${city}%` };
    }

    if (is_featured !== undefined) {
      where.is_featured = is_featured;
    }

    // Parse sort parameter
    let order = [];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
    order.push([sortField, sortDirection]);

    // Query stores
    const { rows: stores, count: total } = await Store.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
    });

    await this.hydrateStoreSummaries(stores);

    return {
      stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get store by user ID
   * @param {string} userId
   * @returns {Promise<Store|null>}
   */
  async getStoreByUserId(userId) {
    return Store.findOne({ where: { user_id: userId } });
  }

  /**
   * Update store (owner only)
   * @param {string} storeId
   * @param {string} userId
   * @param {Object} updateData
   * @returns {Promise<Store>}
   */
  async updateStore(storeId, userId, updateData) {
    const store = await Store.findByPk(storeId);

    if (!store) {
      throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
    }

    // Check ownership
    if (store.user_id !== userId) {
      throw new ApiError('You do not have permission to update this store', StatusCodes.FORBIDDEN);
    }

    // Prevent updating status through this method
    delete updateData.status;
    delete updateData.approved_at;
    delete updateData.approved_by;

    await store.update(updateData);

    return store;
  }

  /**
   * Update store status (admin only)
   * @param {string} storeId
   * @param {string} adminId
   * @param {string} status
   * @param {string} rejection_reason
   * @returns {Promise<Store>}
   */
  async updateStoreStatus(storeId, adminId, status, rejection_reason = null) {
    const store = await Store.findByPk(storeId);

    if (!store) {
      throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
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

    await store.update(updateData);

    return store;
  }

  /**
   * Delete store (soft delete)
   * @param {string} storeId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteStore(storeId, userId) {
    const store = await Store.findByPk(storeId);

    if (!store) {
      throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
    }

    // Check ownership
    if (store.user_id !== userId) {
      throw new ApiError('You do not have permission to delete this store', StatusCodes.FORBIDDEN);
    }

    // Check if store has active orders (future implementation)
    // const activeOrders = await Order.count({ where: { store_id: storeId, status: ['pending', 'processing'] }});
    // if (activeOrders > 0) {
    //   throw new ApiError('Cannot delete store with active orders', StatusCodes.BAD_REQUEST);
    // }

    await store.destroy(); // Soft delete
  }

  /**
   * Get store statistics
   * @param {string} storeId
   * @returns {Promise<Object>}
   */
  async getStoreStats(storeId) {
    const store = await Store.findByPk(storeId);

    if (!store) {
      throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
    }

    const productCount = await Product.count({
      where: { store_id: storeId, status: 'approved' },
    });

    const lowStockProducts = await Product.count({
      where: {
        store_id: storeId,
        stock: { [Op.lte]: sequelize.col('low_stock_threshold') },
        stock: { [Op.gt]: 0 },
      },
    });

    const outOfStockProducts = await Product.count({
      where: { store_id: storeId, stock: 0 },
    });

    return {
      total_products: productCount,
      low_stock_products: lowStockProducts,
      out_of_stock_products: outOfStockProducts,
      total_sales: store.total_sales,
      rating: parseFloat(store.rating),
      total_reviews: store.total_reviews,
    };
  }

  /**
   * Attach product summaries (counts, categories) to store models
   * @param {Array|Store} storeRecords
   */
  async hydrateStoreSummaries(storeRecords) {
    if (!storeRecords) {
      return;
    }

    const storesArray = Array.isArray(storeRecords) ? storeRecords : [storeRecords];

    if (!storesArray.length) {
      return;
    }

    const storeIds = storesArray.map((store) => store?.id).filter(Boolean);
    if (!storeIds.length) {
      return;
    }

    const baseWhere = {
      store_id: storeIds,
      status: 'approved',
      is_active: true,
      stock: { [Op.gt]: 0 },
    };

    const summaryRows = await Product.findAll({
      attributes: [
        'store_id',
        [sequelize.fn('COUNT', sequelize.col('Product.id')), 'productCount'],
        [sequelize.fn('SUM', sequelize.col('Product.total_sales')), 'totalSales'],
        [sequelize.fn('AVG', sequelize.col('Product.rating')), 'avgRating'],
        [sequelize.fn('AVG', sequelize.col('Product.price')), 'avgPrice'],
        [sequelize.fn('MIN', sequelize.col('Product.price')), 'minPrice'],
        [sequelize.fn('MAX', sequelize.col('Product.price')), 'maxPrice'],
      ],
      where: baseWhere,
      group: ['Product.store_id'],
      raw: true,
    });

    const summaryMap = new Map();
    summaryRows.forEach((row) => {
      summaryMap.set(row.store_id, {
        totalProducts: row.productCount ? Number(row.productCount) : 0,
        totalSales: row.totalSales ? Number(row.totalSales) : 0,
        averageRating: row.avgRating ? Number(row.avgRating) : 0,
        averagePrice: row.avgPrice ? Number(row.avgPrice) : 0,
        minPrice: row.minPrice ? Number(row.minPrice) : 0,
        maxPrice: row.maxPrice ? Number(row.maxPrice) : 0,
      });
    });

    const categoryRows = await Product.findAll({
      attributes: [
        'store_id',
        'category_id',
        [sequelize.fn('COUNT', sequelize.col('Product.id')), 'productCount'],
      ],
      where: baseWhere,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
          required: true,
        },
      ],
      group: ['Product.store_id', 'Product.category_id', 'category.id'],
      raw: true,
    });

    const categoryMap = new Map();
    categoryRows.forEach((row) => {
      const storeId = row.store_id;
      if (!categoryMap.has(storeId)) {
        categoryMap.set(storeId, []);
      }
      categoryMap.get(storeId).push({
        id: row.category_id,
        name: row['category.name'],
        slug: row['category.slug'],
        productCount: row.productCount ? Number(row.productCount) : 0,
      });
    });

    categoryMap.forEach((list) => {
      list.sort((a, b) => b.productCount - a.productCount);
    });

    storesArray.forEach((store) => {
      if (!store) return;
      const summary = summaryMap.get(store.id) || {};
      const categories = categoryMap.get(store.id) || [];

      store.setDataValue('productSummary', {
        totalProducts: summary.totalProducts || 0,
        totalSales: summary.totalSales || 0,
        averageRating: summary.averageRating || 0,
        averagePrice: summary.averagePrice || 0,
        minPrice: summary.minPrice || 0,
        maxPrice: summary.maxPrice || 0,
        topCategories: categories.slice(0, 3),
      });

      store.setDataValue('primaryCategory', categories[0]?.slug || null);
    });
  }
}

module.exports = new StoreService();
