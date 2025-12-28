/**
 * Product Repository Interface
 * Abstracts data access for Product aggregate
 */

import { IProduct, IProductQueryOptions } from '../types/product.types';
import { IPaginatedResult } from '../types/common.types';

/**
 * Product repository interface
 * Implementations: SequelizeProductRepository
 */
export interface IProductRepository {
    /**
     * Find product by ID
     */
    findById(id: string): Promise<IProduct | null>;

    /**
     * Find product by slug (for SEO-friendly URLs)
     */
    findBySlug(slug: string): Promise<IProduct | null>;

    /**
     * Find products by store ID
     */
    findByStoreId(storeId: string, options?: IProductQueryOptions): Promise<IPaginatedResult<IProduct>>;

    /**
     * Find active, approved products (public listing)
     */
    findActive(options?: IProductQueryOptions): Promise<IPaginatedResult<IProduct>>;

    /**
     * Find multiple products by IDs
     */
    findByIds(ids: string[]): Promise<IProduct[]>;

    /**
     * Decrement stock for a product (after order placed)
     */
    decrementStock(id: string, quantity: number): Promise<void>;

    /**
     * Increment stock for a product (after order cancelled)
     */
    incrementStock(id: string, quantity: number): Promise<void>;
}
