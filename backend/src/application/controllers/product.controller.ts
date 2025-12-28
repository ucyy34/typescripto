/**
 * Product Controller V2
 * 
 * Uses Clean Architecture: controller → Zod validation → repository → mapper → response
 * All monetary values are cents internally, converted for display in response.
 */

import { Request, Response, NextFunction } from 'express';
import { SequelizeProductRepository } from '../../infrastructure/repositories/SequelizeProductRepository';
import { NotFoundError, UnauthorizedError } from '../../shared/errors';
import {
    CreateProductDTO,
    ProductListQuery,
    ProductResponseDTO,
    ProductListItemDTO,
} from '../schemas/product.schema';
import { IProduct } from '../../domain/types/product.types';

// Repository instance
const productRepo = new SequelizeProductRepository();

// ============================================
// DTO MAPPER
// ============================================

/**
 * Convert domain product to response DTO
 * MONEY: Converts cents to decimal for display
 */
function toResponseDTO(product: IProduct): ProductResponseDTO {
    return {
        id: product.id,
        storeId: product.storeId,
        categoryId: product.categoryId,

        title: product.title,
        slug: product.slug,
        description: product.description || undefined,
        shortDescription: product.shortDescription,
        sku: product.sku,

        // MONEY: Convert cents to decimal for display
        price: product.priceCents / 100,
        comparePrice: product.comparePriceCents ? product.comparePriceCents / 100 : undefined,
        costPrice: product.costPriceCents ? product.costPriceCents / 100 : undefined,
        currency: product.currency,

        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold ?? 10,

        images: product.images,

        status: product.status as 'draft' | 'pending' | 'approved' | 'rejected',
        isActive: product.isActive,
        isFeatured: product.isFeatured,

        weight: product.weight,
        dimensions: product.dimensions ? JSON.parse(product.dimensions as unknown as string) : undefined,

        material: product.material,
        technique: product.technique,

        attributes: {},

        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        metaKeywords: product.metaKeywords ?? [],
        tags: [],
        badges: [],

        rating: product.rating ?? 0,
        totalReviews: product.totalReviews ?? 0,
        totalSales: product.totalSales ?? 0,
        viewsCount: 0,

        createdAt: product.createdAt instanceof Date
            ? product.createdAt.toISOString()
            : String(product.createdAt),
        updatedAt: product.updatedAt instanceof Date
            ? product.updatedAt.toISOString()
            : String(product.updatedAt),
    };
}

/**
 * Convert domain product to list item DTO (lighter version)
 */
function toListItemDTO(product: IProduct): ProductListItemDTO {
    return {
        id: product.id,
        storeId: product.storeId,
        title: product.title,
        slug: product.slug,
        price: product.priceCents / 100,
        comparePrice: product.comparePriceCents ? product.comparePriceCents / 100 : undefined,
        currency: product.currency,
        images: product.images,
        rating: product.rating ?? 0,
        totalReviews: product.totalReviews ?? 0,
        stock: product.stock,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
    };
}

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * GET /api/v2/products
 * List products with pagination and filters
 */
export async function listProducts(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const query = req.query as unknown as ProductListQuery;

        const result = await productRepo.findAll({
            page: query.page,
            limit: query.limit,
            categoryId: query.category,
            storeId: query.storeId,
            search: query.search,
            minPriceCents: query.minPriceCents,
            maxPriceCents: query.maxPriceCents,
            isActive: query.isActive,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });

        const items = result.items.map(toListItemDTO);

        return res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            data: {
                items,
                pagination: result.pagination,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v2/products/:id
 * Get product by ID
 */
export async function getProduct(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const { id } = req.params;

        const product = await productRepo.findById(id);

        if (!product) {
            throw new NotFoundError('Product', id);
        }

        const response = toResponseDTO(product);

        return res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: response,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v2/products
 * Create new product
 * 
 * MONEY CONTRACT: priceCents MUST be integer (cents)
 */
export async function createProduct(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const body = req.body as CreateProductDTO;

        // Auth check
        const user = (req as any).user;
        if (!user) {
            throw new UnauthorizedError('Authentication required to create products');
        }

        // Verify user is seller or admin
        if (user.role !== 'seller' && user.role !== 'admin') {
            throw new UnauthorizedError('Only sellers can create products');
        }

        // Build product data
        const productData: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'> = {
            storeId: body.storeId,
            categoryId: body.categoryId,
            title: body.title,
            slug: '', // Will be generated by model hook
            description: body.description || '',
            shortDescription: body.shortDescription,
            sku: body.sku,

            // MONEY: Already in cents from schema validation
            priceCents: body.priceCents,
            comparePriceCents: body.comparePriceCents,
            costPriceCents: body.costPriceCents,
            currency: 'TRY',

            stock: body.stock,
            lowStockThreshold: body.lowStockThreshold,

            images: body.images,

            isActive: body.isActive,
            isFeatured: body.isFeatured,
            status: 'pending', // New products start as pending

            material: body.material,
            technique: body.technique,
            dimensions: body.dimensions ? JSON.stringify(body.dimensions) : undefined,
            weight: body.weight,

            seoTitle: body.seoTitle,
            seoDescription: body.seoDescription,
            metaKeywords: body.metaKeywords,
        };

        const product = await productRepo.create(productData);

        const response = toResponseDTO(product);

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: response,
        });
    } catch (error) {
        next(error);
    }
}
