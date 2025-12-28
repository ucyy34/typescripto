/**
 * Store Service
 * Business logic for store management
 */

import { Store, User, Product } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';
import slugify from 'slugify';
import { cache } from '../config/redis';

// Local instance type alias
type StoreInstance = InstanceType<typeof Store>;

// Types
interface StoreData {
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    logo?: string;
    banner?: string;
    address?: string;
    city?: string;
    [key: string]: unknown;
}

interface Requester {
    id?: string;
    role?: string;
}

interface StoreFilters {
    page?: number | string;
    limit?: number | string;
    status?: string;
    search?: string;
    city?: string;
    is_featured?: boolean | string;
    sort?: string;
}

interface PaginatedStoreResult {
    stores: StoreInstance[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

interface StoreStats {
    total_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    total_sales: number;
    rating: number;
    total_reviews: number;
}

class StoreService {
    /**
     * Create new store (seller only)
     */
    async createStore(userId: string, storeData: StoreData): Promise<StoreInstance> {
        // Check if user is seller
        const user = await User.findByPk(userId);
        if (!user) {
            throw new ApiError('User not found', StatusCodes.NOT_FOUND);
        }

        if (user.role !== 'seller' && user.role !== 'admin') {
            throw new ApiError('Only sellers can create stores', StatusCodes.FORBIDDEN);
        }

        // Check if user already has a store
        const existingStore = await Store.findOne({ where: { user_id: userId } });
        if (existingStore) {
            throw new ApiError('User already has a store', StatusCodes.CONFLICT);
        }

        // Generate slug from name
        let slug = slugify(storeData.name, { lower: true, strict: true });

        // Check if slug exists and make it unique
        const slugExists = await Store.findOne({ where: { slug } });
        if (slugExists) {
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            slug = `${slug}-${randomSuffix}`;
        }

        // Create store
        const store = await Store.create({
            ...storeData,
            slug,
            user_id: userId,
            status: 'pending', // Needs admin approval
        });

        // Clear cache
        await cache.delPattern('stores:*');

        return store;
    }

    /**
     * Get store by ID
     */
    async getStoreById(storeId: string, requester: Requester | null = null): Promise<StoreInstance> {
        const store = await Store.findOne({
            where: { id: storeId },
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                },
            ],
        });

        if (!store) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        const isAdmin = requester?.role === 'admin';
        const isOwner = requester?.id && store.user_id === requester.id;

        if (store.status !== 'approved' && !isAdmin && !isOwner) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        return store;
    }

    /**
     * Get store by slug
     */
    async getStoreBySlug(slug: string, requester: Requester | null = null): Promise<StoreInstance> {
        const store = await Store.findOne({
            where: { slug },
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                },
            ],
        });

        if (!store) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        const isAdmin = requester?.role === 'admin';
        const isOwner = requester?.id && store.user_id === requester.id;

        if (store.status !== 'approved' && !isAdmin && !isOwner) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        return store;
    }

    /**
     * Get all stores with pagination and filters
     */
    async getStores(filters: StoreFilters): Promise<PaginatedStoreResult> {
        const {
            page = 1,
            limit = 20,
            status,
            search,
            city,
            is_featured,
            sort = '-created_at',
        } = filters;

        const pageNumber = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNumber = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
        const offset = (pageNumber - 1) * limitNumber;
        const where: Record<string, unknown> = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        if (city) {
            where.city = { [Op.iLike]: `%${city}%` };
        }

        if (is_featured !== undefined) {
            const featuredValue =
                typeof is_featured === 'string'
                    ? is_featured.toLowerCase() === 'true'
                    : Boolean(is_featured);
            where.is_featured = featuredValue;
        }

        const order: [string, string][] = [];
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
        order.push([sortField, sortDirection]);

        const { rows: stores, count: total } = await Store.findAndCountAll({
            where,
            limit: limitNumber,
            offset,
            order,
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'first_name', 'last_name'],
                },
            ],
        });

        const totalPages = Math.max(1, Math.ceil(total / limitNumber));

        return {
            stores,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages,
                hasNext: pageNumber < totalPages,
                hasPrev: pageNumber > 1,
            },
        };
    }

    /**
     * Get store by user ID
     */
    async getStoreByUserId(userId: string): Promise<StoreInstance | null> {
        return Store.findOne({ where: { user_id: userId } });
    }

    /**
     * Update store (owner only)
     */
    async updateStore(storeId: string, userId: string, updateData: Partial<StoreData>): Promise<StoreInstance> {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        // Check ownership
        if (store.user_id !== userId) {
            throw new ApiError('You do not have permission to update this store', StatusCodes.FORBIDDEN);
        }

        // Prevent updating status through this method
        const safeUpdateData = { ...updateData };
        delete safeUpdateData.status;
        delete (safeUpdateData as Record<string, unknown>).approved_at;
        delete (safeUpdateData as Record<string, unknown>).approved_by;

        await store.update(safeUpdateData);

        return store;
    }

    /**
     * Update store status (admin only)
     */
    async updateStoreStatus(
        storeId: string,
        adminId: string,
        status: string,
        rejection_reason: string | null = null
    ): Promise<StoreInstance> {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        const updateData: Record<string, unknown> = { status };

        if (status === 'approved') {
            updateData.approved_at = new Date();
            updateData.approved_by = adminId;
            updateData.rejection_reason = null;
        } else if (status === 'rejected') {
            updateData.rejection_reason = rejection_reason;
            updateData.approved_at = null;
            updateData.approved_by = null;
        }

        await store.update(updateData);

        await cache.delPattern('stores:*');

        return store;
    }

    /**
     * Delete store (soft delete)
     */
    async deleteStore(storeId: string, userId: string): Promise<void> {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        // Check ownership
        if (store.user_id !== userId) {
            throw new ApiError('You do not have permission to delete this store', StatusCodes.FORBIDDEN);
        }

        await store.destroy(); // Soft delete
    }

    /**
     * Get store statistics
     */
    async getStoreStats(storeId: string): Promise<StoreStats> {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
        }

        const productCount = await Product.count({
            where: { store_id: storeId, status: 'approved' },
        });

        const lowStockProducts = await Product.count({
            where: {
                store_id: storeId,
                [Op.and]: [
                    { stock: { [Op.gt]: 0 } },
                    { stock: { [Op.lte]: Product.sequelize.col('low_stock_threshold') } },
                ],
            },
        });

        const outOfStockProducts = await Product.count({
            where: { store_id: storeId, stock: 0 },
        });

        return {
            total_products: productCount,
            low_stock_products: lowStockProducts,
            out_of_stock_products: outOfStockProducts,
            total_sales: store.total_sales,
            rating: parseFloat(String(store.rating)),
            total_reviews: store.total_reviews,
        };
    }
}

export default new StoreService();
