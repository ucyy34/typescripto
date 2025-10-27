/**
 * Store Service
 * Business logic for store management
 */

const { Store, User, Product } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const slugify = require('slugify');
const { cache } = require('../config/redis');

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

    return store;
  }

  /**
   * Get store by slug
   * @param {string} slug
   * @param {boolean} includeInactive
   * @returns {Promise<Store>}
   */
  async getStoreBySlug(slug, includeInactive = false) {
    const cacheKey = `stores:slug:${slug}:${includeInactive ? 'all' : 'public'}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

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

    if (!includeInactive) {
      await cache.set(cacheKey, store, 3600);
    }

    return store;
  }

  /**
   * Get all stores with pagination and filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated stores
   */
  async getStores(filters) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      city,
      is_featured,
      sort = '-created_at',
      includeAllStatuses,
    } = filters;

    const offset = (page - 1) * limit;
    const where = {};

    const shouldIncludeAllStatuses = includeAllStatuses === 'true' || includeAllStatuses === true;

    // Apply filters
    if (!shouldIncludeAllStatuses) {
      if (!status) {
        where.status = 'approved';
      } else if (status !== 'all') {
        where.status = status;
      }
    } else if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    if (city) {
      where.city = { [Op.iLike]: `%${city}%` };
    }

    if (is_featured !== undefined) {
      const parsedFeatured =
        typeof is_featured === 'string' ? is_featured.toLowerCase() === 'true' : Boolean(is_featured);
      where.is_featured = parsedFeatured;
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

    const storePayload = await Promise.all(
      stores.map(async (store) => {
        const productCount = await Product.count({
          where: {
            store_id: store.id,
            status: 'approved',
            is_active: true,
            stock: { [Op.gt]: 0 },
          },
        });

        const plain = store.toJSON();
        plain.product_count = productCount;
        plain.rating = plain.rating ? parseFloat(plain.rating) : 0;
        return plain;
      })
    );

    return {
      stores: storePayload,
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

    await cache.delPattern('stores:*');

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

    await cache.delPattern('stores:*');

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

    await cache.delPattern('stores:*');
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
}

module.exports = new StoreService();
