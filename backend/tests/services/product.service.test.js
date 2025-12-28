const { Op } = require('sequelize');
const { StatusCodes } = require('http-status-codes');
const { AppError } = require('../../src/utils/AppError');

// Mocks
const mockProduct = {
  findAndCountAll: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
};

const mockStore = {};
const mockCategory = {};
const mockReview = {};
const mockProductVariant = {};

jest.mock('../../src/models', () => ({
  Product: mockProduct,
  Store: mockStore,
  Category: mockCategory,
  Review: mockReview,
  ProductVariant: mockProductVariant,
}));

// Import service (it uses export = new ProductService())
const productService = require('../../src/services/product.service');

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('fetches products with default pagination and filters', async () => {
      const mockRows = [{ id: 'prod-1', title: 'Test Product' }];
      mockProduct.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockRows
      });

      const result = await productService.getProducts({ page: 1, limit: 10 });

      expect(mockProduct.findAndCountAll).toHaveBeenCalledTimes(1);
      const query = mockProduct.findAndCountAll.mock.calls[0][0];

      // Verify default filters (from service implementation)
      expect(query.where.is_active).toBe(true);
      expect(query.where.status).toBe('approved');
      expect(query.limit).toBe(10);
      expect(query.offset).toBe(0);

      expect(result).toEqual({
        products: mockRows,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
    });

    it('filters by category slug', async () => {
      mockProduct.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await productService.getProducts({ category: 'art' });

      const query = mockProduct.findAndCountAll.mock.calls[0][0];
      // Check include for category filtering
      const categoryInclude = query.include.find(inc => inc.as === 'category');
      expect(categoryInclude).toBeDefined();
      expect(categoryInclude.where).toEqual({ slug: 'art' });
      expect(categoryInclude.required).toBe(true);
    });

    it('filters by search query', async () => {
      mockProduct.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await productService.getProducts({ search: 'bowl' });

      const query = mockProduct.findAndCountAll.mock.calls[0][0];
      const orClause = query.where[Op.or];
      expect(orClause).toBeDefined();
      expect(orClause).toHaveLength(2);
      // We can't easily check [Op.iLike] equality because specific symbol usage depends on sequelize version mock
      // But we verify structure exists
    });
  });

  describe('getProductBySlug', () => {
    it('returns product when found and available', async () => {
      const mockProd = {
        id: 'p1',
        slug: 'p1-slug',
        store: { status: 'approved' }
      };
      mockProduct.findOne.mockResolvedValue(mockProd);

      const result = await productService.getProductBySlug('p1-slug');

      expect(mockProduct.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: 'p1-slug', is_active: true, status: 'approved' }
      }));
      expect(result).toBe(mockProd);
    });

    it('throws 404 if product not found', async () => {
      mockProduct.findOne.mockResolvedValue(null);

      await expect(productService.getProductBySlug('missing')).rejects.toThrow('Product not found');
    });

    it('throws 404 if store is not approved', async () => {
      const mockProd = {
        id: 'p1',
        store: { status: 'pending' }
      };
      mockProduct.findOne.mockResolvedValue(mockProd);

      await expect(productService.getProductBySlug('p1-slug')).rejects.toThrow('Store is currently unavailable');
    });
  });

  describe('checkStock', () => {
    it('returns true if stock is sufficient', async () => {
      mockProduct.findByPk.mockResolvedValue({ id: 'p1', stock: 10 });
      const available = await productService.checkStock('p1', 5);
      expect(available).toBe(true);
    });

    it('returns false if stock is insufficient', async () => {
      mockProduct.findByPk.mockResolvedValue({ id: 'p1', stock: 2 });
      const available = await productService.checkStock('p1', 5);
      expect(available).toBe(false);
    });

    it('throws if product not found', async () => {
      mockProduct.findByPk.mockResolvedValue(null);
      await expect(productService.checkStock('p1', 1)).rejects.toThrow('Product not found');
    });
  });
});
