/**
 * Category Service
 * Business logic for category management
 */

const { Category, CategoryVariant } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { cache } = require('../config/redis');

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
  async getCategoryById(categoryId) {
    const category = await Category.findByPk(categoryId, {
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

    return category;
  }

  /**
   * Get category by slug
   * @param {string} slug
   * @returns {Promise<Category>}
   */
  async getCategoryBySlug(slug) {
    const cacheKey = `categories:slug:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const category = await Category.findBySlug(slug);

    if (!category) {
      throw new ApiError('Category not found', StatusCodes.NOT_FOUND);
    }

    await cache.set(cacheKey, category, 86400);

    return category;
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
  async createCategory(categoryData) {
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
  async updateCategory(categoryId, updateData) {
    const category = await Category.findByPk(categoryId);

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
}

module.exports = new CategoryService();
