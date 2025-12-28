/**
 * Product Service
 * Business logic for products
 */

import { Op } from 'sequelize';
import { StatusCodes } from 'http-status-codes';
import { AppError, ErrorCode } from '../utils/AppError';
import { Product as IProduct } from '../types';

// Models
const { Product, Store, Category, Review, StoreDailySales, WishlistItem, ProductVariant } = require('../models');

interface ProductQuery {
  page?: string;
  limit?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  search?: string;
}

class ProductService {
  /**
   * Get all products with filters and pagination
   */
  async getProducts(query: ProductQuery = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 12;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {
      is_active: true,
      status: 'approved',
    };

    // Filter by category slug
    let categoryFilter = {};
    if (query.category) {
      categoryFilter = { slug: query.category };
    }

    // Filter by price range
    if (query.min_price || query.max_price) {
      where.price = {};
      if (query.min_price) where.price[Op.gte] = parseFloat(query.min_price);
      if (query.max_price) where.price[Op.lte] = parseFloat(query.max_price);
    }

    // Search query
    if (query.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query.search}%` } },
        { description: { [Op.iLike]: `%${query.search}%` } },
      ];
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          where: categoryFilter,
          required: !!query.category,
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug'],
        },
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    return {
      products: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string) {
    const product = await Product.findOne({
      where: { slug, is_active: true, status: 'approved' },
      include: [
        { model: Store, as: 'store', attributes: ['id', 'name', 'slug', 'status'] },
        { model: Category, as: 'category' },
        { model: ProductVariant, as: 'productVariants' },
      ],
    });

    if (!product) {
      throw new AppError('Product not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    // Check stock status strictly
    if (product.store?.status !== 'approved') {
      throw new AppError('Store is currently unavailable', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return product;
  }

  /**
   * Check stock availability
   * @param productId
   * @param quantity
   */
  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await Product.findByPk(productId);
    if (!product) throw new AppError('Product not found', ErrorCode.NOT_FOUND);

    if (product.stock < quantity) {
      return false;
    }
    return true;
  }

  /**
   * Validate price (Internal Helper)
   * Converts user input price to cents for storage/logic if needed,
   * though currently DB uses float/decimal.
   * This is a placeholder for the requested integer logic.
   */
  calculateAmountCents(price: number): number {
    return Math.round(price * 100);
  }
}

export = new ProductService();
