/**
 * Product Mapper
 * Maps between Sequelize models and Domain types
 * 
 * RULE: Cents columns are source of truth. NO decimal fallback.
 */

import { IProduct, ProductStatus } from '../../domain/types/product.types';

/**
 * Maps Sequelize Product model to domain IProduct
 */
export class ProductMapper {
    /**
     * Convert Sequelize Product instance to domain IProduct
     * @param raw - Sequelize model instance
     */
    static toDomain(raw: any): IProduct {
        if (!raw) {
            throw new Error('ProductMapper.toDomain: raw is null/undefined');
        }

        return {
            id: raw.id,
            storeId: raw.store_id,
            categoryId: raw.category_id,

            // Basic info
            title: raw.title,
            slug: raw.slug,
            description: raw.description || '',
            shortDescription: raw.short_description,

            // Pricing - CENTS ONLY (NO FALLBACK - price_cents is required after migration)
            priceCents: raw.price_cents ?? 0,
            comparePriceCents: raw.compare_price_cents,
            costPriceCents: raw.cost_price_cents,
            currency: raw.currency || 'TRY',

            // Inventory
            stock: raw.stock ?? 0,
            lowStockThreshold: raw.low_stock_threshold,
            sku: raw.sku,

            // Media
            images: Array.isArray(raw.images) ? raw.images : [],

            // Status
            isActive: raw.is_active ?? true,
            isFeatured: raw.is_featured ?? false,
            status: (raw.status || 'pending') as ProductStatus,
            approvedAt: raw.approved_at ? new Date(raw.approved_at) : undefined,
            approvedBy: raw.approved_by,

            // Metadata
            material: raw.material,
            technique: raw.technique,
            dimensions: raw.dimensions,
            weight: raw.weight,

            // SEO
            seoTitle: raw.seo_title,
            seoDescription: raw.seo_description,
            metaKeywords: raw.meta_keywords,

            // Stats
            rating: raw.rating ? parseFloat(raw.rating) : undefined,
            totalReviews: raw.total_reviews,
            totalSales: raw.total_sales,

            // Timestamps
            createdAt: new Date(raw.created_at),
            updatedAt: new Date(raw.updated_at),
        };
    }

    /**
     * Convert domain IProduct to Sequelize-compatible object for persistence
     */
    static toPersistence(product: Partial<IProduct>): Record<string, unknown> {
        const data: Record<string, unknown> = {};

        if (product.storeId !== undefined) data.store_id = product.storeId;
        if (product.categoryId !== undefined) data.category_id = product.categoryId;

        // Basic info
        if (product.title !== undefined) data.title = product.title;
        if (product.slug !== undefined) data.slug = product.slug;
        if (product.description !== undefined) data.description = product.description;
        if (product.shortDescription !== undefined) data.short_description = product.shortDescription;

        // Pricing - cents only
        if (product.priceCents !== undefined) {
            data.price_cents = product.priceCents;
            data.price = product.priceCents / 100; // Keep decimal for backward compatibility
        }
        if (product.comparePriceCents !== undefined) {
            data.compare_price_cents = product.comparePriceCents;
            data.compare_price = product.comparePriceCents / 100;
        }
        if (product.currency !== undefined) data.currency = product.currency;

        // Inventory
        if (product.stock !== undefined) data.stock = product.stock;
        if (product.lowStockThreshold !== undefined) data.low_stock_threshold = product.lowStockThreshold;
        if (product.sku !== undefined) data.sku = product.sku;

        // Media
        if (product.images !== undefined) data.images = product.images;

        // Status
        if (product.isActive !== undefined) data.is_active = product.isActive;
        if (product.isFeatured !== undefined) data.is_featured = product.isFeatured;
        if (product.status !== undefined) data.status = product.status;
        if (product.approvedAt !== undefined) data.approved_at = product.approvedAt;
        if (product.approvedBy !== undefined) data.approved_by = product.approvedBy;

        // Metadata
        if (product.material !== undefined) data.material = product.material;
        if (product.technique !== undefined) data.technique = product.technique;
        if (product.dimensions !== undefined) data.dimensions = product.dimensions;
        if (product.weight !== undefined) data.weight = product.weight;

        // SEO
        if (product.seoTitle !== undefined) data.seo_title = product.seoTitle;
        if (product.seoDescription !== undefined) data.seo_description = product.seoDescription;
        if (product.metaKeywords !== undefined) data.meta_keywords = product.metaKeywords;

        // Stats
        if (product.rating !== undefined) data.rating = product.rating;
        if (product.totalReviews !== undefined) data.total_reviews = product.totalReviews;
        if (product.totalSales !== undefined) data.total_sales = product.totalSales;

        return data;
    }

    /**
     * Convert array of Sequelize products to domain array
     */
    static toDomainArray(rawProducts: any[]): IProduct[] {
        return rawProducts.map(ProductMapper.toDomain);
    }
}
