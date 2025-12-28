/**
 * Category Controller
 * Handle category HTTP requests
 */

import { Request, Response } from 'express';
import categoryService from '../services/category.service';
import { success, created, noContent } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

class CategoryController {
  /**
   * Get all categories (tree structure)
   * GET /api/v1/categories
   */
  getAllCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.getAllCategories();

    return success(res, categories, 'Categories retrieved successfully');
  });

  /**
   * Get top-level categories
   * GET /api/v1/categories/top-level
   */
  getTopLevelCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.getTopLevelCategories();

    return success(res, categories, 'Top-level categories retrieved successfully');
  });

  /**
   * Get category by slug
   * GET /api/v1/categories/slug/:slug
   */
  getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.getCategoryBySlug(req.params.slug);

    return success(res, category, 'Category retrieved successfully');
  });

  /**
   * Get featured categories
   * GET /api/v1/categories/featured
   */
  getFeaturedCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.getFeaturedCategories();

    return success(res, categories, 'Featured categories retrieved successfully');
  });

  /**
   * Get category by ID
   * GET /api/v1/categories/:id
   */
  getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.getCategoryById(req.params.id);

    return success(res, category, 'Category retrieved successfully');
  });

  /**
   * Create category (admin only)
   * POST /api/v1/categories
   */
  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.createCategory(req.body);

    return created(res, category, 'Category created successfully');
  });

  /**
   * Update category (admin only)
   * PUT /api/v1/categories/:id
   */
  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);

    return success(res, category, 'Category updated successfully');
  });

  /**
   * Delete category (admin only)
   * DELETE /api/v1/categories/:id
   */
  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id);

    return noContent(res);
  });

  /**
   * Get variants for a category
   * GET /api/v1/categories/:id/variants
   */
  getCategoryVariants = asyncHandler(async (req: Request, res: Response) => {
    const variants = await categoryService.getCategoryVariants(req.params.id);

    return success(res, variants, 'Category variants retrieved successfully');
  });

  /**
   * Create variant for a category (admin only)
   * POST /api/v1/categories/:id/variants
   */
  createVariant = asyncHandler(async (req: Request, res: Response) => {
    const variant = await categoryService.createCategoryVariant(req.params.id, req.body);

    return created(res, variant, 'Variant created successfully');
  });

  /**
   * Update variant (admin only)
   * PUT /api/v1/categories/:id/variants/:variantId
   */
  updateVariant = asyncHandler(async (req: Request, res: Response) => {
    const variant = await categoryService.updateCategoryVariant(req.params.variantId, req.body);

    return success(res, variant, 'Variant updated successfully');
  });

  /**
   * Delete variant (admin only)
   * DELETE /api/v1/categories/:id/variants/:variantId
   */
  deleteVariant = asyncHandler(async (req: Request, res: Response) => {
    await categoryService.deleteCategoryVariant(req.params.variantId);

    return noContent(res);
  });
}

export = new CategoryController();
