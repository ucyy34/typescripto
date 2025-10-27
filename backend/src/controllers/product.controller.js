/**
 * Product Controller
 * Handle product HTTP requests
 */

const productService = require('../services/product.service');
const { success, created, noContent, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class ProductController {
  /**
   * Create new product
   * POST /api/v1/products
   */
  createProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.user.id, req.body);

    return created(res, product, 'Product created successfully. Waiting for admin approval.');
  });

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  getProduct = asyncHandler(async (req, res) => {
    const includeInactive = req.user?.role === 'admin';
    const product = await productService.getProductById(req.params.id, includeInactive);

    return success(res, product, 'Product retrieved successfully');
  });

  /**
   * Get product by slug
   * GET /api/v1/products/slug/:slug
   */
  getProductBySlug = asyncHandler(async (req, res) => {
    const includeInactive = req.user?.role === 'admin';
    const product = await productService.getProductBySlug(req.params.slug, includeInactive);

    return success(res, product, 'Product retrieved successfully');
  });

  /**
   * Get all products with filters
   * GET /api/v1/products
   */
  getProducts = asyncHandler(async (req, res) => {
    const result = await productService.getProducts(req.query);

    return paginated(res, result.products, result.pagination, result.meta);
  });

  /**
   * Search products by keyword
   * GET /api/v1/products/search
   */
  searchProducts = asyncHandler(async (req, res) => {
    const { q, limit, includeSuggestions } = req.query;
    const result = await productService.searchProducts(q, { limit, includeSuggestions });

    return success(res, result, 'Product search results');
  });

  /**
   * Search products for storefront header search
   * GET /api/v1/products/search
   */
  searchProducts = asyncHandler(async (req, res) => {
    const { query, ...options } = req.query;
    const result = await productService.searchProducts(query, options);

    return success(res, result, 'Product search results retrieved successfully');
  });

  /**
   * Get products by store
   * GET /api/v1/stores/:storeId/products
   */
  getProductsByStore = asyncHandler(async (req, res) => {
    const result = await productService.getProductsByStore(req.params.storeId, req.query);

    return paginated(res, result.products, result.pagination);
  });

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  updateProduct = asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.user.id, req.body);

    return success(res, product, 'Product updated successfully');
  });

  /**
   * Update product status (admin only)
   * PATCH /api/v1/products/:id/status
   */
  updateProductStatus = asyncHandler(async (req, res) => {
    const { status, rejection_reason } = req.body;
    const product = await productService.updateProductStatus(req.params.id, req.user.id, status, rejection_reason);

    return success(res, product, `Product status updated to ${status}`);
  });

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  deleteProduct = asyncHandler(async (req, res) => {
    await productService.deleteProduct(req.params.id, req.user.id);

    return noContent(res);
  });

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  getFeaturedProducts = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    const products = await productService.getFeaturedProducts(limit);

    return success(res, products, 'Featured products retrieved successfully');
  });

  /**
   * Get best-selling products
   * GET /api/v1/products/bestsellers
   */
  getBestSellers = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    const products = await productService.getBestSellers(limit);

    return success(res, products, 'Best-selling products retrieved successfully');
  });

  /**
   * Get random products (for discovery experiences)
   * GET /api/v1/products/random
   */
  getRandomProducts = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 24);
    const products = await productService.getRandomProducts(limit);

    return success(res, products, 'Random products retrieved successfully');
  });
}

module.exports = new ProductController();
