/**
 * Product Controller
 * Handle product HTTP requests
 */

import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import productService = require('../services/product.service');
import { success, created, noContent, paginated } from '../utils/response';
import { asyncHandler, ApiError } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';
import type { CreateProductDTO, ProductIdParams, ProductListQuery } from '../application/schemas/product.schema';

interface ProductQuery extends ProductListQuery {
  includeAllStatuses?: string | boolean;
  store_id?: string;
}

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'products');

class ProductController {
  /**
   * Create new product
   * POST /api/v1/products
   */
  createProduct = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, CreateProductDTO>, res: Response) => {
    const authReq = req;
    const product = await productService.createProduct(authReq.user!.id, req.body);

    return created(res, product, 'Product created successfully. Waiting for admin approval.');
  });

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  getProduct = asyncHandler(async (req: AuthenticatedRequest<ProductIdParams>, res: Response) => {
    const authReq = req;
    const includeInactive = authReq.user?.role === 'admin';
    const requestUserId = authReq.user?.id;
    const product = await productService.getProductById(req.params.id, includeInactive, requestUserId);

    return success(res, product, 'Product retrieved successfully');
  });

  /**
   * Get product by slug
   * GET /api/v1/products/slug/:slug
   */
  getProductBySlug = asyncHandler(async (req: AuthenticatedRequest<{ slug: string }>, res: Response) => {
    const authReq = req;
    const includeInactive = authReq.user?.role === 'admin';
    const product = await productService.getProductBySlug(req.params.slug, includeInactive);

    return success(res, product, 'Product retrieved successfully');
  });

  /**
   * Get all products with filters
   * GET /api/v1/products
   */
  getProducts = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, unknown, ProductQuery>, res: Response) => {
    const authReq = req;
    const { includeAllStatuses, store_id, ...otherQuery } = req.query;

    if (includeAllStatuses === 'true' || includeAllStatuses === true) {
      if (!authReq.user) {
        throw new ApiError('Authentication required to view all product statuses', StatusCodes.UNAUTHORIZED);
      }

      if (authReq.user.role !== 'admin') {
        if (!store_id) {
          throw new ApiError('store_id is required when using includeAllStatuses', StatusCodes.BAD_REQUEST);
        }
      }
    }

    const result = await productService.getProducts(
      { includeAllStatuses, store_id, ...otherQuery },
      authReq.user
    );

    return paginated(res, result.products, result.pagination, result.meta);
  });

  /**
   * Search products for storefront
   * GET /api/v1/products/search
   */
  searchProducts = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, { q?: string; limit?: string; includeSuggestions?: string }>, res: Response) => {
    const { q, limit, includeSuggestions } = req.query;
    const result = await productService.searchProducts({
      query: q,
      limit,
      includeSuggestions,
    });

    return success(res, result, 'Product search completed successfully');
  });

  /**
   * Get products by store
   * GET /api/v1/stores/:storeId/products
   */
  getProductsByStore = asyncHandler(async (req: Request<{ storeId: string }, unknown, unknown, ProductQuery>, res: Response) => {
    const result = await productService.getProductsByStore(req.params.storeId, req.query);

    return paginated(res, result.products, result.pagination);
  });

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  updateProduct = asyncHandler(async (req: AuthenticatedRequest<ProductIdParams, unknown, Partial<CreateProductDTO>>, res: Response) => {
    const authReq = req;
    const product = await productService.updateProduct(req.params.id, authReq.user!.id, req.body);

    return success(res, product, 'Product updated successfully');
  });

  /**
   * Update product status (admin only)
   * PATCH /api/v1/products/:id/status
   */
  updateProductStatus = asyncHandler(async (req: AuthenticatedRequest<ProductIdParams, unknown, { status: string; rejection_reason?: string }>, res: Response) => {
    const authReq = req;
    const { status, rejection_reason } = req.body;
    const product = await productService.updateProductStatus(req.params.id, authReq.user!.id, status, rejection_reason);

    return success(res, product, `Product status updated to ${status}`);
  });

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  deleteProduct = asyncHandler(async (req: AuthenticatedRequest<ProductIdParams>, res: Response) => {
    const authReq = req;
    await productService.deleteProduct(req.params.id, authReq.user!.id);

    return noContent(res);
  });

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  getFeaturedProducts = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, { limit?: string }>, res: Response) => {
    const limit = parseInt(req.query.limit || '10', 10) || 10;
    const products = await productService.getFeaturedProducts(limit);

    return success(res, products, 'Featured products retrieved successfully');
  });

  /**
   * Get best-selling products
   * GET /api/v1/products/bestsellers
   */
  getBestSellers = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, { limit?: string }>, res: Response) => {
    const limit = parseInt(req.query.limit || '10', 10) || 10;
    const products = await productService.getBestSellers(limit);

    return success(res, products, 'Best-selling products retrieved successfully');
  });

  /**
   * Get random products (for discovery experiences)
   * GET /api/v1/products/random
   */
  getRandomProducts = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, { limit?: string }>, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit || '6', 10) || 6, 24);
    const products = await productService.getRandomProducts(limit);

    return success(res, products, 'Random products retrieved successfully');
  });

  /**
   * Upload a product image and convert it to WebP format
   * POST /api/v1/products/upload-image
   */
  uploadProductImage = asyncHandler(async (req: AuthenticatedRequest & { file?: { buffer: Buffer; size: number; originalname: string } }, res: Response) => {
    const authReq = req;
    if (!authReq.file) {
      throw new ApiError('Image file is required', StatusCodes.BAD_REQUEST);
    }

    await fs.mkdir(UPLOAD_ROOT, { recursive: true });

    const fileName = `${uuidv4()}.webp`;
    const filePath = path.join(UPLOAD_ROOT, fileName);

    try {
      await sharp(authReq.file.buffer)
        .rotate()
        .webp({ quality: 80 })
        .toFile(filePath);
    } catch (error) {
      console.error('[ProductController] Failed to process image upload:', error);
      throw new ApiError('Image processing failed', StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const publicUrl = `/uploads/products/${fileName}`;

    return success(
      res,
      {
        url: publicUrl,
        format: 'webp',
        size: authReq.file.size,
        originalName: authReq.file.originalname,
      },
      'Image uploaded successfully'
    );
  });
}

export = new ProductController();
