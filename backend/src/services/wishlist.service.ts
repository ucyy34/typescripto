/**
 * Wishlist Service
 * Handles wishlist operations for authenticated users
 */

import { Op } from 'sequelize';
import { WishlistItem, Product, Store, Category } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { cache } from '../config/redis';
import type WishlistItemModel from '../models/WishlistItem';
import type ProductModel from '../models/Product';
import type { WishlistItemMetadata } from '../models/types/json.types';

interface StoreSummary {
  id: string;
  name: string;
  slug: string;
}

interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

interface SerializedWishlistItem {
  id: string;
  product_id: string;
  added_at: Date;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    compare_price: number | null;
    stock: number;
    rating: number;
    total_reviews: number;
    images: string[];
    store: StoreSummary | null;
    category: CategorySummary | null;
  };
}

class WishlistService {
  _cacheKey(userId: string): string {
    return `wishlist:user:${userId}`;
  }

  async list(userId: string): Promise<SerializedWishlistItem[]> {
    const cacheKey = this._cacheKey(userId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached as SerializedWishlistItem[];
    }

    const items: WishlistItemModel[] = await WishlistItem.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          required: true,
          where: {
            status: 'approved',
            is_active: true,
          },
          include: [
            { model: Store, as: 'store', attributes: ['id', 'name', 'slug'] },
            { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
          ],
        },
      ],
    });

    const formatted = items.map((item) => this.serializeWishlistItem(item));
    await cache.set(cacheKey, formatted, CACHE_TTL_SECONDS);
    return formatted;
  }

  async add(userId: string, productId: string, metadata: WishlistItemMetadata | null = null): Promise<SerializedWishlistItem[]> {
    await this._assertProductExists(productId);

    const [entry]: [WishlistItemModel, boolean] = await WishlistItem.findOrCreate({
      where: { user_id: userId, product_id: productId },
      defaults: { metadata },
    });

    if (!entry.isNewRecord && metadata) {
      entry.metadata = metadata;
      await entry.save({ fields: ['metadata'] });
    }

    await cache.del(this._cacheKey(userId));
    return this.list(userId);
  }

  async remove(userId: string, productId: string): Promise<SerializedWishlistItem[]> {
    const deleted = await WishlistItem.destroy({
      where: { user_id: userId, product_id: productId },
    });

    if (!deleted) {
      throw new ApiError('Wishlist item not found', StatusCodes.NOT_FOUND);
    }

    await cache.del(this._cacheKey(userId));
    return this.list(userId);
  }

  async sync(userId: string, productIds: string[] = []): Promise<SerializedWishlistItem[]> {
    if (!Array.isArray(productIds)) {
      throw new ApiError('Invalid wishlist payload', StatusCodes.BAD_REQUEST);
    }

    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      await WishlistItem.destroy({ where: { user_id: userId } });
      await cache.del(this._cacheKey(userId));
      return [];
    }

    const validProducts: ProductModel[] = await Product.findAll({
      where: {
        id: uniqueIds,
        status: 'approved',
        is_active: true,
      },
      attributes: ['id'],
    });

    const validIds = validProducts.map((p) => p.id);

    await WishlistItem.destroy({
      where: {
        user_id: userId,
        product_id: { [Op.notIn]: validIds },
      },
    });

    const existing: WishlistItemModel[] = await WishlistItem.findAll({
      where: {
        user_id: userId,
        product_id: validIds,
      },
      attributes: ['product_id'],
    });

    const existingIds = new Set(existing.map((item) => item.product_id));
    const createPayload = validIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ user_id: userId, product_id: id }));

    if (createPayload.length > 0) {
      await WishlistItem.bulkCreate(createPayload);
    }

    await cache.del(this._cacheKey(userId));
    return this.list(userId);
  }

  serializeWishlistItem(item: WishlistItemModel): SerializedWishlistItem {
    const product = item.product as ProductModel & { store?: StoreSummary; category?: CategorySummary };
    return {
      id: item.id,
      product_id: product.id,
      added_at: item.created_at,
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: parseFloat(product.price),
        compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
        stock: product.stock,
        rating: product.rating,
        total_reviews: product.total_reviews,
        images: product.images || [],
        store: product.store,
        category: product.category,
      },
    };
  }

  async _assertProductExists(productId: string): Promise<ProductModel> {
    const product: ProductModel | null = await Product.findOne({
      where: {
        id: productId,
        status: 'approved',
        is_active: true,
      },
    });

    if (!product) {
      throw new ApiError('Product not found or unavailable', StatusCodes.NOT_FOUND);
    }

    return product;
  }
}

export = new WishlistService();
