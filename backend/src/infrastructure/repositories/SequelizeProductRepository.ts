/**
 * Sequelize Product Repository
 * Implements IProductRepository using Sequelize ORM
 */

import { IProductRepository } from '../../domain/interfaces/IProductRepository';
import { IProduct, IProductQueryOptions } from '../../domain/types/product.types';
import { IPaginatedResult } from '../../domain/types/common.types';
import { ProductMapper } from '../mappers/ProductMapper';
import { NotFoundError, StockError } from '../../shared/errors';

// Import Sequelize models (existing JS models)
const { Product, Category, Store } = require('../../models');
const { Op, literal } = require('sequelize');

export class SequelizeProductRepository implements IProductRepository {
    /**
     * Find product by ID
     */
    async findById(id: string): Promise<IProduct | null> {
        const product = await Product.findByPk(id, {
            include: [
                { model: Category, as: 'category' },
                { model: Store, as: 'store' },
            ],
        });

        return product ? ProductMapper.toDomain(product) : null;
    }

    /**
     * Find product by slug
     */
    async findBySlug(slug: string): Promise<IProduct | null> {
        const product = await Product.findOne({
            where: { slug, is_active: true, status: 'approved' },
            include: [
                { model: Category, as: 'category' },
                { model: Store, as: 'store' },
            ],
        });

        return product ? ProductMapper.toDomain(product) : null;
    }

    /**
     * Find products by store ID
     */
    async findByStoreId(
        storeId: string,
        options: IProductQueryOptions = {}
    ): Promise<IPaginatedResult<IProduct>> {
        const { page = 1, limit = 20, status, isActive } = options;
        const offset = (page - 1) * limit;

        const where: Record<string, unknown> = { store_id: storeId };
        if (status) where.status = status;
        if (isActive !== undefined) where.is_active = isActive;

        const { rows, count } = await Product.findAndCountAll({
            where,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        return {
            data: ProductMapper.toDomainArray(rows),
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Find active, approved products (public listing)
     */
    async findActive(
        options: IProductQueryOptions = {}
    ): Promise<IPaginatedResult<IProduct>> {
        const {
            page = 1,
            limit = 20,
            categorySlug,
            search,
            minPriceCents,
            maxPriceCents,
        } = options;
        const offset = (page - 1) * limit;

        const where: Record<string, unknown> = {
            is_active: true,
            status: 'approved',
        };

        // Search filter
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
            ];
        }

        // Price filters (cents-based)
        if (minPriceCents !== undefined || maxPriceCents !== undefined) {
            where.price_cents = {};
            if (minPriceCents !== undefined) {
                (where.price_cents as Record<string, unknown>)[Op.gte] = minPriceCents;
            }
            if (maxPriceCents !== undefined) {
                (where.price_cents as Record<string, unknown>)[Op.lte] = maxPriceCents;
            }
        }

        // Build include
        const include: any[] = [
            { model: Store, as: 'store' },
        ];

        // Category filter
        if (categorySlug) {
            include.push({
                model: Category,
                as: 'category',
                where: { slug: categorySlug },
                required: true,
            });
        } else {
            include.push({ model: Category, as: 'category' });
        }

        const { rows, count } = await Product.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        return {
            data: ProductMapper.toDomainArray(rows),
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Find multiple products by IDs
     */
    async findByIds(ids: string[]): Promise<IProduct[]> {
        const products = await Product.findAll({
            where: { id: { [Op.in]: ids } },
        });

        return ProductMapper.toDomainArray(products);
    }

    /**
     * Decrement stock for a product
     */
    async decrementStock(id: string, quantity: number): Promise<void> {
        const product = await Product.findByPk(id);

        if (!product) {
            throw new NotFoundError('Product', id);
        }

        if (product.stock < quantity) {
            throw new StockError(
                `Insufficient stock for product ${product.title}`,
                id,
                product.stock,
                quantity
            );
        }

        product.stock -= quantity;
        await product.save();
    }

    /**
     * Increment stock for a product (e.g., after order cancellation)
     */
    async incrementStock(id: string, quantity: number): Promise<void> {
        const product = await Product.findByPk(id);

        if (!product) {
            throw new NotFoundError('Product', id);
        }

        product.stock += quantity;
        await product.save();
    }

    /**
     * Find all products with filters and pagination
     * This is the generic list method for V2 API
     */
    async findAll(options: {
        page?: number;
        limit?: number;
        categoryId?: string;
        storeId?: string;
        search?: string;
        minPriceCents?: number;
        maxPriceCents?: number;
        isActive?: boolean;
        status?: string;
        sortBy?: string;
        sortOrder?: string;
    } = {}): Promise<{ items: IProduct[]; pagination: { total: number; page: number; limit: number; pages: number } }> {
        const {
            page = 1,
            limit = 20,
            categoryId,
            storeId,
            search,
            minPriceCents,
            maxPriceCents,
            isActive = true,
            status = 'approved',
            sortBy = 'created_at',
            sortOrder = 'desc',
        } = options;
        const offset = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        // Default public filters
        if (isActive !== undefined) where.is_active = isActive;
        if (status) where.status = status;
        if (storeId) where.store_id = storeId;
        if (categoryId) where.category_id = categoryId;

        // Search filter
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
            ];
        }

        // Price filters (cents-based)
        if (minPriceCents !== undefined || maxPriceCents !== undefined) {
            where.price_cents = {};
            if (minPriceCents !== undefined) {
                (where.price_cents as Record<string, unknown>)[Op.gte] = minPriceCents;
            }
            if (maxPriceCents !== undefined) {
                (where.price_cents as Record<string, unknown>)[Op.lte] = maxPriceCents;
            }
        }

        // Build sort order
        const orderColumn = sortBy === 'price_cents' ? 'price_cents' : sortBy;
        const order = [[orderColumn, sortOrder.toUpperCase()]];

        const { rows, count } = await Product.findAndCountAll({
            where,
            include: [
                { model: Category, as: 'category' },
                { model: Store, as: 'store' },
            ],
            limit,
            offset,
            order,
        });

        return {
            items: ProductMapper.toDomainArray(rows),
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Create a new product
     */
    async create(
        productData: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<IProduct> {
        const persistData = ProductMapper.toPersistence(productData);

        const product = await Product.create(persistData);

        // Reload with associations
        await product.reload({
            include: [
                { model: Category, as: 'category' },
                { model: Store, as: 'store' },
            ],
        });

        return ProductMapper.toDomain(product);
    }

    // ==========================================
    // CHECKOUT V2 METHODS
    // ==========================================

    /**
     * Find multiple products by IDs with FOR UPDATE lock
     * Used for atomic checkout to prevent race conditions
     */
    async findManyByIdsForUpdate(
        ids: string[],
        transaction: import('sequelize').Transaction
    ): Promise<IProduct[]> {
        if (ids.length === 0) return [];

        const products = await Product.findAll({
            where: { id: { [Op.in]: ids } },
            transaction,
            lock: transaction.LOCK.UPDATE,
            order: [['id', 'ASC']], // Consistent ordering to prevent deadlocks
        });

        return ProductMapper.toDomainArray(products);
    }

    /**
     * Decrement stock for multiple products atomically
     * @throws StockError if any product has insufficient stock
     */
    async decrementStockBulk(
        items: { productId: string; quantity: number }[],
        transaction: import('sequelize').Transaction
    ): Promise<void> {
        for (const item of items) {
            const [affectedRows] = await Product.update(
                { stock: literal(`stock - ${item.quantity}`) },
                {
                    where: {
                        id: item.productId,
                        stock: { [Op.gte]: item.quantity }
                    },
                    transaction
                }
            );

            if (affectedRows === 0) {
                throw new StockError(
                    `Insufficient stock for product ${item.productId}`,
                    item.productId
                );
            }
        }
    }
}

// Singleton instance
let instance: SequelizeProductRepository | null = null;

export function getProductRepository(): IProductRepository {
    if (!instance) {
        instance = new SequelizeProductRepository();
    }
    return instance;
}
