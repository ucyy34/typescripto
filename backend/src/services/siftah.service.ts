/**
 * Siftah Service
 * Business logic for the "first sale of the day" recommendation system
 * 
 * Algorithm:
 * 1. Check if source store has made siftah (at least one paid order today)
 * 2. If yes, find stores that haven't made siftah yet
 * 3. Find products from those stores matching criteria:
 *    - Same category as source product
 *    - Active and approved
 *    - In stock
 *    - Rating >= 3.5
 *    - Price <= source price * 1.5
 * 4. Return the best match sorted by: rating DESC, price ASC, created_at ASC
 */

import { Op, QueryTypes, Transaction } from 'sequelize';
import { Product, Store, Category, StoreDailySales } from '../models';
import { sequelize } from '../config/sequelize';
import { getTurkeyBusinessDateString } from '../utils/dateUtils';
import type ProductModel from '../models/Product';

type ProductWithStoreCategory = ProductModel & {
    store: {
        id: string;
        status?: string;
        name?: string;
        slug?: string;
        logo?: string | null;
        rating?: number;
    };
    category: {
        id: string;
        name: string;
        slug: string;
    };
};

interface SiftahRecommendationResult {
    has_recommendation: boolean;
    reason?: string;
    product?: SerializedProduct;
}

interface SerializedProduct {
    id: string;
    title: string;
    slug: string;
    price: number;
    compare_price: number | null;
    rating: number;
    total_reviews: number;
    images: string[];
    stock: number;
    store: {
        id: string;
        name: string;
        slug: string;
        logo: string | null;
        rating: number;
    };
    category: {
        id: string;
        name: string;
        slug: string;
    };
    price_comparison: {
        difference: number;
        percentage: number;
        label: string;
    };
    siftah_message: string;
}

interface RecordSaleOptions {
    transaction?: Transaction;
}

class SiftahService {

    /**
     * Checks if a store has made siftah (at least one successful order) today
     */
    async hasStoreMadeSiftah(storeId: string): Promise<boolean> {
        const today = getTurkeyBusinessDateString();

        const [result] = await sequelize.query<{ successful_order_count: number }>(`
      SELECT successful_order_count
      FROM store_daily_sales
      WHERE store_id = :storeId AND sale_date = :today
    `, {
            replacements: { storeId, today },
            type: QueryTypes.SELECT
        });

        return result ? result.successful_order_count > 0 : false;
    }

    /**
     * Gets IDs of stores that haven't made siftah today and are approved
     */
    async getNoSiftahStoreIds(): Promise<string[]> {
        const today = getTurkeyBusinessDateString();

        const stores = await sequelize.query<{ id: string }>(`
      SELECT s.id
      FROM stores s
      LEFT JOIN store_daily_sales sds 
        ON s.id = sds.store_id AND sds.sale_date = :today
      WHERE s.status = 'approved'
        AND (sds.id IS NULL OR sds.successful_order_count = 0)
    `, {
            replacements: { today },
            type: QueryTypes.SELECT
        });

        return stores.map((s) => s.id);
    }

    /**
     * Gets a siftah recommendation for a given product
     */
    async getSiftahRecommendation(productId: string): Promise<SiftahRecommendationResult> {

        // 1. Fetch source product with store and category
        const sourceProduct: ProductWithStoreCategory | null = await Product.findByPk(productId, {
            include: [
                { model: Store, as: 'store' },
                { model: Category, as: 'category' }
            ]
        });

        // Validation: Source product must exist
        if (!sourceProduct) {
            return { has_recommendation: false, reason: 'source_product_not_found' };
        }

        // Validation: Source product must be active and approved
        if (!sourceProduct.is_active || sourceProduct.status !== 'approved') {
            return { has_recommendation: false, reason: 'source_product_inactive' };
        }

        // Validation: Source product must be in stock
        if (sourceProduct.stock <= 0) {
            return { has_recommendation: false, reason: 'source_product_out_of_stock' };
        }

        // Validation: Source store must be approved
        if (!sourceProduct.store || sourceProduct.store.status !== 'approved') {
            return { has_recommendation: false, reason: 'source_store_not_approved' };
        }

        // 2. Check if source store has made siftah today
        const sourceStoreSiftahDone = await this.hasStoreMadeSiftah(sourceProduct.store_id);

        if (!sourceStoreSiftahDone) {
            // Source store hasn't made siftah yet, no recommendation
            return { has_recommendation: false, reason: 'source_store_no_siftah' };
        }

        // 3. Get stores that haven't made siftah today
        const noSiftahStoreIds = await this.getNoSiftahStoreIds();

        if (noSiftahStoreIds.length === 0) {
            return { has_recommendation: false, reason: 'no_siftah_stores_available' };
        }

        // 4. Calculate price limit (max 50% more than source)
        const maxPrice = parseFloat(sourceProduct.price) * 1.5;

        // 5. Query for the best matching product - first try same category
        // Sorting: rating DESC, price ASC, created_at ASC (deterministic)
        let recommendation: ProductWithStoreCategory | null = await Product.findOne({
            where: {
                id: { [Op.ne]: productId }, // Exclude source product
                store_id: { [Op.in]: noSiftahStoreIds }, // Only from no-siftah stores
                category_id: sourceProduct.category_id, // Same category only
                status: 'approved',
                is_active: true,
                stock: { [Op.gt]: 0 },
                rating: { [Op.gte]: 3.5 },
                price: { [Op.lte]: maxPrice }
            },
            include: [
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'slug', 'logo', 'rating'],
                    where: { status: 'approved' }
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'slug']
                }
            ],
            order: sequelize.random() // Random selection for varied recommendations
        });

        // 5b. FALLBACK: If no product in same category, try any category
        if (!recommendation) {
            recommendation = await Product.findOne({
                where: {
                    id: { [Op.ne]: productId }, // Exclude source product
                    store_id: { [Op.in]: noSiftahStoreIds }, // Only from no-siftah stores
                    // category_id removed for fallback - any category
                    status: 'approved',
                    is_active: true,
                    stock: { [Op.gt]: 0 },
                    rating: { [Op.gte]: 3.5 },
                    price: { [Op.lte]: maxPrice }
                },
                include: [
                    {
                        model: Store,
                        as: 'store',
                        attributes: ['id', 'name', 'slug', 'logo', 'rating'],
                        where: { status: 'approved' }
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'slug']
                    }
                ],
                order: sequelize.random() // Random selection for varied recommendations
            });
        }

        if (!recommendation) {
            return { has_recommendation: false, reason: 'no_eligible_products' };
        }

        // 6. Serialize and return
        return {
            has_recommendation: true,
            product: this.serializeProduct(recommendation, sourceProduct)
        };
    }

    /**
     * Serializes a product for API response
     */
    serializeProduct(product: ProductWithStoreCategory, sourceProduct: ProductWithStoreCategory): SerializedProduct {
        const priceDiff = parseFloat(product.price) - parseFloat(sourceProduct.price);
        const priceDiffPercent = Math.round((priceDiff / parseFloat(sourceProduct.price)) * 100);

        let priceLabel: string;
        if (priceDiff < 0) {
            priceLabel = `₺${Math.abs(priceDiff).toFixed(2)} daha uygun`;
        } else if (priceDiff > 0) {
            priceLabel = `₺${priceDiff.toFixed(2)} fark`;
        } else {
            priceLabel = 'Aynı fiyat';
        }

        return {
            id: product.id,
            title: product.title,
            slug: product.slug,
            price: parseFloat(product.price),
            compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
            rating: parseFloat(product.rating),
            total_reviews: product.total_reviews,
            images: product.images || [],
            stock: product.stock,
            store: {
                id: product.store.id,
                name: product.store.name,
                slug: product.store.slug,
                logo: product.store.logo,
                rating: parseFloat(product.store.rating)
            },
            category: {
                id: product.category.id,
                name: product.category.name,
                slug: product.category.slug
            },
            price_comparison: {
                difference: priceDiff,
                percentage: priceDiffPercent,
                label: priceLabel
            },
            siftah_message: 'Bu mağazanın bugün ilk müşterisi olun!'
        };
    }

    /**
     * Records a siftah sale for a store (called when an order is paid)
     * Uses ON CONFLICT for atomic upsert
     */
    async recordSiftahSale(storeId: string, options: RecordSaleOptions = {}): Promise<void> {
        const today = getTurkeyBusinessDateString();
        const { transaction } = options;

        await sequelize.query(`
      INSERT INTO store_daily_sales (id, store_id, sale_date, successful_order_count, first_order_at, last_order_at, created_at, updated_at)
      VALUES (gen_random_uuid(), :storeId, :today, 1, NOW(), NOW(), NOW(), NOW())
      ON CONFLICT (store_id, sale_date)
      DO UPDATE SET
        successful_order_count = store_daily_sales.successful_order_count + 1,
        last_order_at = NOW(),
        updated_at = NOW()
    `, {
            replacements: { storeId, today },
            type: QueryTypes.INSERT,
            transaction
        });
    }
}

export = new SiftahService();
