const request = require('supertest');
const { StatusCodes } = require('http-status-codes');

jest.mock('../config/redis', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    delPattern: jest.fn().mockResolvedValue(0),
  },
  redisClient: { on: jest.fn() },
}));

const createMockProductService = () => ({
  createProduct: jest.fn(),
  getProductById: jest.fn(),
  getProductBySlug: jest.fn(),
  getProducts: jest.fn(),
  getProductsByStore: jest.fn(),
  updateProduct: jest.fn(),
  updateProductStatus: jest.fn(),
  deleteProduct: jest.fn(),
  getFeaturedProducts: jest.fn(),
  getBestSellers: jest.fn(),
  getRandomProducts: jest.fn(),
});

const createMockCategoryService = () => ({
  getAllCategories: jest.fn(),
  getTopLevelCategories: jest.fn(),
  getFeaturedCategories: jest.fn(),
  getCategoryById: jest.fn(),
  getCategoryBySlug: jest.fn(),
  getCategoryVariants: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
});

const createMockStoreService = () => ({
  createStore: jest.fn(),
  getStoreById: jest.fn(),
  getStoreBySlug: jest.fn(),
  getStoreByUserId: jest.fn(),
  getStores: jest.fn(),
  updateStore: jest.fn(),
  updateStoreStatus: jest.fn(),
  deleteStore: jest.fn(),
  getStoreStats: jest.fn(),
});

jest.mock('../services/product.service', () => createMockProductService());
jest.mock('../services/category.service', () => createMockCategoryService());
jest.mock('../services/store.service', () => createMockStoreService());

const { createTestApp } = require('../../tests/helpers/testApp');
const productService = require('../services/product.service');
const categoryService = require('../services/category.service');
const storeService = require('../services/store.service');
const { ApiError } = require('../middlewares/errorHandler');

// Route imports
const productRoutes = require('../routes/product.routes');
const categoryRoutes = require('../routes/category.routes');
const storeRoutes = require('../routes/store.routes');

const buildApp = () => createTestApp({
  routes: [
    ['/api/v1/products', productRoutes],
    ['/api/v1/categories', categoryRoutes],
    ['/api/v1/stores', storeRoutes],
  ],
});

describe('Slug lookup routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/v1/products/slug/:slug', () => {
    it('returns product data for a valid slug', async () => {
      const app = buildApp();
      const product = { id: 'prod-1', title: 'Handcrafted Bowl', slug: 'handcrafted-bowl' };
      productService.getProductBySlug.mockResolvedValue(product);

      const response = await request(app).get('/api/v1/products/slug/handcrafted-bowl');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(product);
      expect(productService.getProductBySlug).toHaveBeenCalledWith('handcrafted-bowl', false);
    });

    it('returns validation error for invalid slug format', async () => {
      const app = buildApp();
      const response = await request(app).get('/api/v1/products/slug/Invalid Slug');

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(productService.getProductBySlug).not.toHaveBeenCalled();
    });

    it('propagates not found errors from the service', async () => {
      const app = buildApp();
      productService.getProductBySlug.mockRejectedValue(
        new ApiError('Product not found', StatusCodes.NOT_FOUND)
      );

      const response = await request(app).get('/api/v1/products/slug/missing-product');

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('GET /api/v1/categories/slug/:slug', () => {
    it('returns category data for a valid slug', async () => {
      const app = buildApp();
      const category = { id: 'cat-1', name: 'Glass Art', slug: 'glass-art' };
      categoryService.getCategoryBySlug.mockResolvedValue(category);

      const response = await request(app).get('/api/v1/categories/slug/glass-art');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(category);
      expect(categoryService.getCategoryBySlug).toHaveBeenCalledWith('glass-art');
    });

    it('returns validation error for malformed category slug', async () => {
      const app = buildApp();
      const response = await request(app).get('/api/v1/categories/slug/Glass Art');

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(categoryService.getCategoryBySlug).not.toHaveBeenCalled();
    });

    it('returns 404 when category is missing', async () => {
      const app = buildApp();
      categoryService.getCategoryBySlug.mockRejectedValue(
        new ApiError('Category not found', StatusCodes.NOT_FOUND)
      );

      const response = await request(app).get('/api/v1/categories/slug/missing-category');

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category not found');
    });
  });

  describe('GET /api/v1/stores/slug/:slug', () => {
    it('returns store data for a valid slug', async () => {
      const app = buildApp();
      const store = { id: 'store-1', name: 'Aurora Crafts', slug: 'aurora-crafts' };
      storeService.getStoreBySlug.mockResolvedValue(store);

      const response = await request(app).get('/api/v1/stores/slug/aurora-crafts');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(store);
      expect(storeService.getStoreBySlug).toHaveBeenCalledWith('aurora-crafts', null);
    });

    it('returns validation error for malformed store slug', async () => {
      const app = buildApp();
      const response = await request(app).get('/api/v1/stores/slug/Aurora Crafts');

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(storeService.getStoreBySlug).not.toHaveBeenCalled();
    });

    it('returns 404 when store is missing', async () => {
      const app = buildApp();
      storeService.getStoreBySlug.mockRejectedValue(
        new ApiError('Store not found', StatusCodes.NOT_FOUND)
      );

      const response = await request(app).get('/api/v1/stores/slug/missing-store');

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Store not found');
    });
  });
});

