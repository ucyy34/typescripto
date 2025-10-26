const { Op } = require('sequelize');

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delPattern: jest.fn(),
};

const mockProduct = {
  findAndCountAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  sequelize: {
    random: jest.fn(() => 'RANDOM()'),
  },
};

const mockStore = {};
const mockCategory = {};
const mockUser = {};
const mockProductVariant = {};

jest.mock('../../src/config/redis', () => ({
  cache: mockCache,
}));

jest.mock('../../src/models', () => ({
  Product: mockProduct,
  Store: mockStore,
  Category: mockCategory,
  User: mockUser,
  ProductVariant: mockProductVariant,
}));

const productService = require('../../src/services/product.service');

describe('ProductService.prepareProductData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes text fields, badges, and SEO values', () => {
    const prepared = productService.prepareProductData({
      title: '  Mystic Talisman  ',
      description: '  Ancient protection stone\n',
      tags: ['amulet', ' protection ', 'amulet'],
      badges: ['handmade', 'eco-friendly', 'forbidden'],
      meta_keywords: undefined,
      seo_title: '',
      seo_description: '',
      short_description: '',
      stock: '0',
      images: [' https://cdn.example.com/image.jpg ', 'https://cdn.example.com/image.jpg'],
    });

    expect(prepared.title).toBe('Mystic Talisman');
    expect(prepared.description).toBe('Ancient protection stone');
    expect(prepared.tags).toEqual(['amulet', 'protection']);
    expect(prepared.badges).toEqual(['handmade', 'eco-friendly']);
    expect(prepared.meta_keywords).toEqual(['amulet', 'protection']);
    expect(prepared.images).toEqual(['https://cdn.example.com/image.jpg']);
    expect(prepared.is_active).toBe(false);
    expect(prepared.seo_title.length).toBeGreaterThan(0);
    expect(prepared.seo_description.length).toBeGreaterThan(0);
    expect(prepared.short_description.length).toBeGreaterThan(0);
  });

  it('reuses existing descriptions when updating', () => {
    const existing = {
      description: 'Existing long description with plenty of detail.',
      short_description: 'Existing short copy',
      title: 'Existing Product',
    };

    const prepared = productService.prepareProductData(
      { seo_title: undefined, seo_description: undefined, tags: ['one'] },
      { isUpdate: true, existingProduct: existing }
    );

    expect(prepared.short_description).toBe('Existing short copy');
    expect(prepared.seo_title).toBe('Existing Product');
    expect(prepared.seo_description).toBe('Existing short copy');
    expect(prepared.meta_keywords).toEqual(['one']);
  });
});

describe('ProductService.getProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(true);
    mockProduct.findAndCountAll.mockReset();
  });

  it('enforces approved, active, and in-stock filters by default', async () => {
    mockProduct.findAndCountAll.mockResolvedValue({ rows: [{ id: '1', stock: 4 }], count: 1 });

    const result = await productService.getProducts({ page: 1, limit: 10 });

    expect(mockProduct.findAndCountAll).toHaveBeenCalledTimes(1);
    const query = mockProduct.findAndCountAll.mock.calls[0][0];

    expect(query.where.status).toBe('approved');
    expect(query.where.is_active).toBe(true);
    expect(query.where.stock[Op.gt]).toBe(0);
    expect(result.products).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('skips restrictive filters when vendor requests all statuses', async () => {
    mockProduct.findAndCountAll.mockResolvedValue({
      rows: [{ id: '2', status: 'pending', is_active: false, stock: 0 }],
      count: 1,
    });

    const result = await productService.getProducts({
      includeAllStatuses: 'true',
      include_inactive: 'true',
      include_out_of_stock: 'true',
    });

    expect(mockProduct.findAndCountAll).toHaveBeenCalledTimes(1);
    const query = mockProduct.findAndCountAll.mock.calls[0][0];

    expect(query.where.status).toBeUndefined();
    expect(query.where.is_active).toBeUndefined();
    expect(query.where.stock).toBeUndefined();
    expect(result.products[0].is_active).toBe(false);
  });

  it('returns cached results when available', async () => {
    const cached = { products: [{ id: 'cached' }], pagination: { page: 1, total: 1, limit: 20 } };
    mockCache.get.mockResolvedValueOnce(cached);

    const result = await productService.getProducts({ page: 1, limit: 20 });

    expect(result).toEqual(cached);
    expect(mockProduct.findAndCountAll).not.toHaveBeenCalled();
  });
});
