/**
 * Category Service
 * Business logic for category management
 */

import { Category, CategoryVariant, Product, Store } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { cache } from '../config/redis';
import { sequelize } from '../config/sequelize';
import { Op } from 'sequelize';
import type CategoryModel from '../models/Category';
import type ProductModel from '../models/Product';

class CategoryService {
  /**
   * Get all categories (tree structure)
   * @returns {Promise<Array<Category>>}
   */
  async getAllCategories() {
    // Try cache first
    const cacheKey = 'categories:tree';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const categories = await Category.getTree();

    // Cache for 24 hours
    await cache.set(cacheKey, categories, 86400);

    return categories;
  }

  /**
   * Get top-level categories
   * @returns {Promise<Array<Category>>}
   */
  async getTopLevelCategories() {
    const cacheKey = 'categories:top-level';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const categories = await Category.getTopLevel();

    // Cache for 24 hours
    await cache.set(cacheKey, categories, 86400);

    return categories;
  }

  /**
   * Get category by ID
   * @param {string} categoryId
   * @returns {Promise<Category>}
   */
  async getCategoryById(categoryId: string) {
    const category: CategoryModel | null = await Category.findByPk(categoryId, {
      include: [
        {
          model: Category,
          as: 'children',
          where: { is_active: true },
          required: false,
        },
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    if (!category) {
      throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    }

    const stats = await this.getCategoryStats(category.id);
    category.setDataValue('stats', stats);

    return category;
  }

  /**
   * Get category by slug
   * @param {string} slug
   * @returns {Promise<Category>}
   */
  async getCategoryBySlug(slug: string) {
    const category: CategoryModel | null = await Category.findOne({
      where: { slug },
      include: [
        {
          model: Category,
          as: 'children',
          where: { is_active: true },
          required: false,
        },
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    if (!category) {
      throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    }

    const stats = await this.getCategoryStats(category.id);
    category.setDataValue('stats', stats);

    return category;
  }

  /**
   * Build aggregated stats for a category (public storefront)
   * @param {string} categoryId
   * @returns {Promise<Object>}
   */
  async getCategoryStats(categoryId: string) {
    const baseWhere = {
      category_id: categoryId,
      status: 'approved',
      is_active: true,
      stock: { [Op.gt]: 0 },
    };

    const [summary] = (await Product.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Product.id')), 'totalProducts'],
        [sequelize.fn('AVG', sequelize.col('Product.price')), 'avgPrice'],
        [sequelize.fn('MIN', sequelize.col('Product.price')), 'minPrice'],
        [sequelize.fn('MAX', sequelize.col('Product.price')), 'maxPrice'],
        [sequelize.fn('AVG', sequelize.col('Product.rating')), 'avgRating'],
        [sequelize.fn('SUM', sequelize.col('Product.total_sales')), 'totalSales'],
      ],
      where: baseWhere,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: [],
          where: { status: 'approved' },
          required: true,
        },
      ],
      raw: true,
    })) as Array<Record<string, string | number>>;

    const uniqueStoreCount = await (Product as typeof ProductModel).aggregate('store_id', 'count', {
      distinct: true,
      where: baseWhere,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: [],
          where: { status: 'approved' },
          required: true,
        },
      ],
    });

    return {
      totalProducts: summary?.totalProducts ? Number(summary.totalProducts) : 0,
      averagePrice: summary?.avgPrice ? Number(summary.avgPrice) : 0,
      minPrice: summary?.minPrice ? Number(summary.minPrice) : 0,
      maxPrice: summary?.maxPrice ? Number(summary.maxPrice) : 0,
      averageRating: summary?.avgRating ? Number(summary.avgRating) : 0,
      totalSales: summary?.totalSales ? Number(summary.totalSales) : 0,
      uniqueStoreCount: uniqueStoreCount ? Number(uniqueStoreCount) : 0,
    };
  }

  /**
   * Get featured categories
   * @returns {Promise<Array<Category>>}
   */
  async getFeaturedCategories() {
    const cacheKey = 'categories:featured';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const categories = await Category.getFeatured();

    // Cache for 24 hours
    await cache.set(cacheKey, categories, 86400);

    return categories;
  }

  /**
   * Create category (admin only)
   * @param {Object} categoryData
   * @returns {Promise<Category>}
   */
  async createCategory(categoryData: Record<string, unknown>) {
    // If parent_id is provided, check if parent exists
    if (categoryData.parent_id) {
      const parent = await Category.findByPk(categoryData.parent_id);
      if (!parent) {
        throw new ApiError('Parent category not found', StatusCodes.NOT_FOUND);
      }
    }

    const category = await Category.create(categoryData);

    // Clear cache
    await cache.delPattern('categories:*');

    return category;
  }

  /**
   * Update category (admin only)
   * @param {string} categoryId
   * @param {Object} updateData
   * @returns {Promise<Category>}
   */
  async updateCategory(categoryId: string, updateData: Record<string, unknown>) {
    const category: CategoryModel | null = await Category.findByPk(categoryId);

    if (!category) {
      throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    }

    // If changing parent, validate
    if (updateData.parent_id) {
      // Cannot set self as parent
      if (updateData.parent_id === categoryId) {
        throw new ApiError('Category cannot be its own parent', StatusCodes.BAD_REQUEST);
      }

      const parent = await Category.findByPk(updateData.parent_id);
      if (!parent) {
        throw new ApiError('Parent category not found', StatusCodes.NOT_FOUND);
      }
    }

    await category.update(updateData);

    // Clear cache
    await cache.delPattern('categories:*');

    return category;
  }

  /**
   * Delete category (soft delete, admin only)
   * @param {string} categoryId
   * @returns {Promise<void>}
   */
  async deleteCategory(categoryId) {
    const category = await Category.findByPk(categoryId);

    if (!category) {
      throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    }

    // Check if category has products (future implementation)
    // const productCount = await Product.count({ where: { category_id: categoryId }});
    // if (productCount > 0) {
    //   throw new ApiError('Cannot delete category with existing products', StatusCodes.BAD_REQUEST);
    // }

    await category.destroy();

    // Clear cache
    await cache.delPattern('categories:*');
  }

  /**
   * Get variants for a specific category
   * @param {string} categoryId
   * @returns {Promise<Array<CategoryVariant>>}
   */
  async getCategoryVariants(categoryId) {
    const cacheKey = `category:${categoryId}:variants`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    }

    const variants = await CategoryVariant.findAll({
      where: { category_id: categoryId },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    });

    // Cache for 12 hours
    await cache.set(cacheKey, variants, 43200);

    return variants;
  }

  /**
   * Create variant for a category (admin only)
   * @param {string} categoryId
   * @param {Object} variantData
   * @returns {Promise<CategoryVariant>}
   */
  async createCategoryVariant(categoryId, variantData) {
    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    }

    const variant = await CategoryVariant.create({
      ...variantData,
      category_id: categoryId,
    });

    // Clear cache
    await cache.del(`category:${categoryId}:variants`);

    return variant;
  }

  /**
   * Update variant (admin only)
   * @param {string} variantId
   * @param {Object} updateData
   * @returns {Promise<CategoryVariant>}
   */
  async updateCategoryVariant(variantId, updateData) {
    const variant = await CategoryVariant.findByPk(variantId);

    if (!variant) {
      throw new ApiError('Variant not found', StatusCodes.NOT_FOUND);
    }

    await variant.update(updateData);

    // Clear cache
    await cache.del(`category:${variant.category_id}:variants`);

    return variant;
  }

  /**
   * Delete variant (admin only)
   * @param {string} variantId
   * @returns {Promise<void>}
   */
  async deleteCategoryVariant(variantId) {
    const variant = await CategoryVariant.findByPk(variantId);

    if (!variant) {
      throw new ApiError('Variant not found', StatusCodes.NOT_FOUND);
    }

    const categoryId = variant.category_id;
    await variant.destroy();

    // Clear cache
    await cache.del(`category:${categoryId}:variants`);
  }
}

export = new CategoryService();
