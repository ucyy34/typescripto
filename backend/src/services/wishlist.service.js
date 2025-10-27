/**
 * Wishlist Service
 * Handles persistence for user wishlists
 */

const { Wishlist, Product, Store, Category } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');

class WishlistService {
  /**
   * Get wishlist items for a user with product details
   */
  async getWishlist(userId) {
    const items = await Wishlist.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          required: true,
          where: { status: 'approved', is_active: true },
          attributes: [
            'id',
            'title',
            'slug',
            'price',
            'compare_price',
            'stock',
            'rating',
            'images',
            'category_id',
            'store_id',
          ],
          include: [
            {
              model: Store,
              as: 'store',
              attributes: ['id', 'name', 'slug', 'logo'],
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'slug'],
            },
          ],
        },
      ],
    });

    return items.map((entry) => ({
      id: entry.id,
      product_id: entry.product_id,
      created_at: entry.createdAt,
      product: entry.product,
    }));
  }

  /**
   * Add product to wishlist
   */
  async addItem(userId, productId) {
    const product = await Product.findOne({
      where: { id: productId, status: 'approved', is_active: true },
    });

    if (!product) {
      throw new ApiError('Product not available', StatusCodes.NOT_FOUND);
    }

    const [item] = await Wishlist.findOrCreate({
      where: { user_id: userId, product_id: productId },
      defaults: { user_id: userId, product_id: productId },
    });

    return item;
  }

  /**
   * Remove product from wishlist
   */
  async removeItem(userId, productId) {
    const deleted = await Wishlist.destroy({
      where: { user_id: userId, product_id: productId },
    });

    if (deleted === 0) {
      throw new ApiError('Item not found in wishlist', StatusCodes.NOT_FOUND);
    }

    return true;
  }
}

module.exports = new WishlistService();
