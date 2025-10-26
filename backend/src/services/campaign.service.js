/**
 * Campaign Service
 * Business logic for campaign management
 */

const { Campaign, Store, Product, Category, User, Order } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');

class CampaignService {
  /**
   * Create a new campaign
   * @param {Object} data - Campaign data
   * @param {string} userId - User ID (creator)
   * @param {string} userRole - User role (admin/seller)
   * @returns {Promise<Campaign>}
   */
  async createCampaign(data, userId, userRole) {
    try {
      // Prepare campaign data
      const campaignData = {
        ...data,
        created_by: userId,
      };

      // If user is seller, must provide store_id and it must be their store
      if (userRole === 'seller') {
        if (!data.store_id) {
          throw new ApiError(400, 'Sellers must specify a store for campaigns');
        }

        // Verify store ownership
        const store = await Store.findOne({
          where: {
            id: data.store_id,
            user_id: userId,
            status: 'approved',
          },
        });

        if (!store) {
          throw new ApiError(404, 'Store not found or not approved');
        }

        // Seller campaigns need admin approval
        campaignData.approval_status = 'pending';

        // Sellers can only create campaigns for their store
        if (data.applicable_to === 'entire_platform') {
          throw new ApiError(403, 'Only admins can create platform-wide campaigns');
        }
      } else if (userRole === 'admin') {
        // Admin campaigns are auto-approved
        campaignData.approval_status = 'approved';
      }

      // Validate product IDs if specified
      if (data.product_ids && data.product_ids.length > 0) {
        const products = await Product.findAll({
          where: { id: { [Op.in]: data.product_ids } },
          attributes: ['id', 'store_id'],
        });

        if (products.length !== data.product_ids.length) {
          throw new ApiError(400, 'One or more product IDs are invalid');
        }

        // If seller, verify all products belong to their store
        if (userRole === 'seller') {
          const allBelongToStore = products.every(p => p.store_id === data.store_id);
          if (!allBelongToStore) {
            throw new ApiError(403, 'You can only create campaigns for your own products');
          }
        }
      }

      // Validate category IDs if specified
      if (data.category_ids && data.category_ids.length > 0) {
        const categories = await Category.findAll({
          where: { id: { [Op.in]: data.category_ids } },
        });

        if (categories.length !== data.category_ids.length) {
          throw new ApiError(400, 'One or more category IDs are invalid');
        }
      }

      // Create campaign
      const campaign = await Campaign.create(campaignData);

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create campaign', error.message);
    }
  }

  /**
   * Get all campaigns with filters and pagination
   * @param {Object} query - Query parameters
   * @param {string} userRole - User role
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { campaigns, pagination }
   */
  async getAllCampaigns(query, userRole, userId) {
    try {
      const {
        page = 1,
        limit = 20,
        campaign_type,
        is_active,
        approval_status,
        store_id,
        search,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = query;

      const offset = (page - 1) * limit;
      const where = {};

      // Role-based filtering
      if (userRole === 'seller') {
        // Sellers can only see their own campaigns
        const store = await Store.findOne({
          where: { user_id: userId },
          attributes: ['id'],
        });

        if (!store) {
          throw new ApiError(404, 'Store not found');
        }

        where.store_id = store.id;
      } else if (store_id) {
        where.store_id = store_id;
      }

      // Filters
      if (campaign_type) where.campaign_type = campaign_type;
      if (typeof is_active !== 'undefined') where.is_active = is_active;
      if (approval_status) where.approval_status = approval_status;

      // Search
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { count, rows: campaigns } = await Campaign.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sort_by, sort_order.toUpperCase()]],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name', 'slug'],
          },
        ],
      });

      return {
        campaigns,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch campaigns', error.message);
    }
  }

  /**
   * Get campaign by ID
   * @param {string} campaignId
   * @param {string} userRole
   * @param {string} userId
   * @returns {Promise<Campaign>}
   */
  async getCampaignById(campaignId, userRole, userId) {
    try {
      const campaign = await Campaign.findByPk(campaignId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name', 'slug'],
          },
        ],
      });

      if (!campaign) {
        throw new ApiError(404, 'Campaign not found');
      }

      // Check permissions
      if (userRole === 'seller') {
        const store = await Store.findOne({
          where: { user_id: userId },
        });

        if (!store || campaign.store_id !== store.id) {
          throw new ApiError(403, 'You do not have permission to view this campaign');
        }
      }

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch campaign', error.message);
    }
  }

  /**
   * Update campaign
   * @param {string} campaignId
   * @param {Object} data
   * @param {string} userRole
   * @param {string} userId
   * @returns {Promise<Campaign>}
   */
  async updateCampaign(campaignId, data, userRole, userId) {
    try {
      const campaign = await Campaign.findByPk(campaignId);

      if (!campaign) {
        throw new ApiError(404, 'Campaign not found');
      }

      // Check permissions
      if (userRole === 'seller') {
        const store = await Store.findOne({
          where: { user_id: userId },
        });

        if (!store || campaign.store_id !== store.id) {
          throw new ApiError(403, 'You do not have permission to update this campaign');
        }

        // If campaign was rejected and being updated, reset to pending
        if (campaign.approval_status === 'rejected') {
          data.approval_status = 'pending';
          data.rejection_reason = null;
        }
      }

      // Validate product IDs if being updated
      if (data.product_ids && data.product_ids.length > 0) {
        const products = await Product.findAll({
          where: { id: { [Op.in]: data.product_ids } },
          attributes: ['id', 'store_id'],
        });

        if (products.length !== data.product_ids.length) {
          throw new ApiError(400, 'One or more product IDs are invalid');
        }

        if (userRole === 'seller') {
          const allBelongToStore = products.every(p => p.store_id === campaign.store_id);
          if (!allBelongToStore) {
            throw new ApiError(403, 'You can only add your own products to campaigns');
          }
        }
      }

      await campaign.update(data);

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update campaign', error.message);
    }
  }

  /**
   * Delete campaign (soft delete)
   * @param {string} campaignId
   * @param {string} userRole
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteCampaign(campaignId, userRole, userId) {
    try {
      const campaign = await Campaign.findByPk(campaignId);

      if (!campaign) {
        throw new ApiError(404, 'Campaign not found');
      }

      // Check permissions
      if (userRole === 'seller') {
        const store = await Store.findOne({
          where: { user_id: userId },
        });

        if (!store || campaign.store_id !== store.id) {
          throw new ApiError(403, 'You do not have permission to delete this campaign');
        }
      }

      await campaign.destroy();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete campaign', error.message);
    }
  }

  /**
   * Approve or reject campaign (admin only)
   * @param {string} campaignId
   * @param {Object} data - { approval_status, rejection_reason }
   * @returns {Promise<Campaign>}
   */
  async approveCampaign(campaignId, data) {
    try {
      const campaign = await Campaign.findByPk(campaignId);

      if (!campaign) {
        throw new ApiError(404, 'Campaign not found');
      }

      await campaign.update({
        approval_status: data.approval_status,
        rejection_reason: data.rejection_reason || null,
      });

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update campaign approval status', error.message);
    }
  }

  /**
   * Get active campaigns for public display
   * @param {Object} filters - { storeId, productId, categoryId }
   * @returns {Promise<Array<Campaign>>}
   */
  async getActiveCampaigns(filters = {}) {
    try {
      return await Campaign.getActiveCampaigns(filters);
    } catch (error) {
      throw new ApiError(500, 'Failed to fetch active campaigns', error.message);
    }
  }

  /**
   * Get campaigns applicable to a specific product
   * @param {string} productId
   * @returns {Promise<Array<Campaign>>}
   */
  async getCampaignsForProduct(productId) {
    try {
      const product = await Product.findByPk(productId, {
        attributes: ['id', 'category_id', 'store_id'],
      });

      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      const campaigns = await Campaign.getCampaignsForProduct(
        productId,
        product.category_id,
        product.store_id
      );

      // Return only the best campaign (highest priority)
      return campaigns.length > 0 ? [campaigns[0]] : [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch product campaigns', error.message);
    }
  }

  /**
   * Get campaign statistics
   * @param {string} campaignId
   * @param {string} userRole
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getCampaignStats(campaignId, userRole, userId) {
    try {
      const campaign = await this.getCampaignById(campaignId, userRole, userId);

      // Get orders that used this campaign
      const orders = await Order.findAll({
        where: {
          campaign_id: campaignId,
        },
        attributes: ['id', 'total_amount', 'status', 'created_at'],
      });

      const stats = {
        view_count: campaign.view_count,
        click_count: campaign.click_count,
        conversion_count: campaign.conversion_count,
        usage_count: campaign.usage_count,
        total_revenue: parseFloat(campaign.total_revenue || 0),
        conversion_rate: campaign.view_count > 0 
          ? ((campaign.conversion_count / campaign.view_count) * 100).toFixed(2) 
          : 0,
        click_through_rate: campaign.view_count > 0
          ? ((campaign.click_count / campaign.view_count) * 100).toFixed(2)
          : 0,
        time_remaining: campaign.getTimeRemaining(),
        is_active: campaign.isActiveNow(),
        orders: orders,
      };

      return stats;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch campaign statistics', error.message);
    }
  }

  /**
   * Increment campaign view count
   * @param {string} campaignId
   * @returns {Promise<void>}
   */
  async incrementViewCount(campaignId) {
    try {
      await Campaign.increment('view_count', { where: { id: campaignId } });
    } catch (error) {
      // Silent fail for analytics
      console.error('Failed to increment view count:', error);
    }
  }

  /**
   * Increment campaign click count
   * @param {string} campaignId
   * @returns {Promise<void>}
   */
  async incrementClickCount(campaignId) {
    try {
      await Campaign.increment('click_count', { where: { id: campaignId } });
    } catch (error) {
      // Silent fail for analytics
      console.error('Failed to increment click count:', error);
    }
  }

  /**
   * Record campaign conversion (order completed)
   * @param {string} campaignId
   * @param {number} orderAmount
   * @returns {Promise<void>}
   */
  async recordConversion(campaignId, orderAmount) {
    try {
      await Campaign.increment(
        {
          conversion_count: 1,
          usage_count: 1,
          total_revenue: orderAmount,
        },
        { where: { id: campaignId } }
      );
    } catch (error) {
      // Silent fail for analytics
      console.error('Failed to record conversion:', error);
    }
  }
}

module.exports = new CampaignService();




