/**
 * Recommendation Service
 * Generates personalised product suggestions
 */

const { Op } = require('sequelize');
const { Wishlist, Cart, Product, OrderItem, Order, Category, Store } = require('../models');

class RecommendationService {
  async getRecommendations({ userId, cartProductIds = [], wishlistProductIds = [], limit = 8 }) {
    const interestIds = new Set();
    const categories = new Set();

    const normalizedCartIds = Array.isArray(cartProductIds)
      ? cartProductIds
      : String(cartProductIds || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

    const normalizedWishlistIds = Array.isArray(wishlistProductIds)
      ? wishlistProductIds
      : String(wishlistProductIds || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

    normalizedCartIds.forEach((id) => interestIds.add(id));
    normalizedWishlistIds.forEach((id) => interestIds.add(id));

    if (userId) {
      const wishlistItems = await Wishlist.findAll({
        attributes: ['product_id'],
        where: { user_id: userId },
      });
      wishlistItems.forEach((item) => interestIds.add(item.product_id));

      const cart = await Cart.findOne({ where: { user_id: userId } });
      (cart?.items || []).forEach((item) => interestIds.add(item.product_id));

      const recentOrderItems = await OrderItem.findAll({
        attributes: ['product_id'],
        include: [
          {
            model: Order,
            as: 'order',
            attributes: [],
            where: { user_id: userId },
          },
        ],
        limit: 25,
        order: [['createdAt', 'DESC']],
      });
      recentOrderItems.forEach((item) => interestIds.add(item.product_id));
    }

    if (interestIds.size > 0) {
      const interestProducts = await Product.findAll({
        attributes: ['id', 'category_id'],
        where: { id: { [Op.in]: Array.from(interestIds) } },
      });
      interestProducts.forEach((product) => {
        if (product.category_id) {
          categories.add(product.category_id);
        }
      });
    }

    const whereClause = {
      status: 'approved',
      is_active: true,
    };

    if (categories.size > 0) {
      whereClause.category_id = { [Op.in]: Array.from(categories) };
    }

    if (interestIds.size > 0) {
      whereClause.id = { [Op.notIn]: Array.from(interestIds) };
    }

    let products = await Product.findAll({
      where: whereClause,
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
      order: [
        ['rating', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
    });

    if (products.length < limit) {
      const fallback = await Product.findAll({
        where: {
          status: 'approved',
          is_active: true,
          id: interestIds.size > 0 ? { [Op.notIn]: Array.from(interestIds) } : { [Op.ne]: null },
        },
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
        order: [['createdAt', 'DESC']],
        limit: limit - products.length,
      });

      products = [...products, ...fallback];
    }

    return products.map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      compare_price: product.compare_price,
      images: product.images,
      store: product.store,
      category: product.category,
      rating: product.rating,
      stock: product.stock,
    }));
  }
}

module.exports = new RecommendationService();
