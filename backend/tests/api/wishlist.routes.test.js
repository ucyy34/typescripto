const request = require('supertest');
const express = require('express');

const AUTH_USER_ID = '11111111-2222-3333-4444-555555555555';

jest.mock('../../src/middlewares/auth', () => ({
  optionalAuth: (req, _res, next) => {
    req.session = req.session || {};
    next();
  },
  authenticate: (req, _res, next) => {
    req.user = { id: AUTH_USER_ID, role: 'buyer' };
    req.session = req.session || {};
    next();
  },
}));

const wishlistService = require('../../src/services/wishlist.service');

jest.mock('../../src/services/wishlist.service', () => ({
  getWishlist: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
  clearWishlist: jest.fn(),
  mergeGuestWishlist: jest.fn(),
  getRecommendations: jest.fn(),
}));

const wishlistRoutes = require('../../src/routes/wishlist.routes');
const { errorHandler } = require('../../src/middlewares/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wishlist', wishlistRoutes);
  app.use(errorHandler);
  return app;
};

describe('Wishlist routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns wishlist items for the current context', async () => {
    const app = buildApp();
    const wishlist = {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      item_count: 2,
      items: [
        { product_id: 'prod-1', added_at: new Date().toISOString() },
        { product_id: 'prod-2', added_at: new Date().toISOString() },
      ],
      updated_at: new Date().toISOString(),
    };

    wishlistService.getWishlist.mockResolvedValue(wishlist);

    const response = await request(app).get('/api/v1/wishlist');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Wishlist retrieved successfully');
    expect(response.body.data).toEqual(wishlist);
    expect(wishlistService.getWishlist).toHaveBeenCalledWith(undefined, expect.any(Object));
  });

  it('validates payload when adding wishlist item', async () => {
    const app = buildApp();

    const response = await request(app).post('/api/v1/wishlist/items').send({});

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(wishlistService.addItem).not.toHaveBeenCalled();
  });

  it('adds wishlist item and returns updated list', async () => {
    const app = buildApp();
    const result = {
      items: [{ product_id: 'prod-123', added_at: new Date().toISOString() }],
      item_count: 1,
    };

    wishlistService.addItem.mockResolvedValue(result);

    const response = await request(app)
      .post('/api/v1/wishlist/items')
      .send({ product_id: '22222222-3333-4444-5555-666666666666' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(result);
    expect(wishlistService.addItem).toHaveBeenCalledWith(undefined, expect.any(Object), '22222222-3333-4444-5555-666666666666');
  });

  it('merges guest wishlist for authenticated users', async () => {
    const app = buildApp();
    const mergedWishlist = {
      id: 'merge-id',
      item_count: 3,
      items: [{ product_id: 'prod-merge', added_at: new Date().toISOString() }],
      updated_at: new Date().toISOString(),
    };

    wishlistService.mergeGuestWishlist.mockResolvedValue(mergedWishlist);

    const response = await request(app).post('/api/v1/wishlist/merge');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mergedWishlist);
    expect(wishlistService.mergeGuestWishlist).toHaveBeenCalledWith(AUTH_USER_ID, expect.any(Object));
  });

  it('returns recommendations using service results', async () => {
    const app = buildApp();
    const recommendations = [
      { id: 'prod-a', title: 'Recommended A' },
      { id: 'prod-b', title: 'Recommended B' },
    ];

    wishlistService.getRecommendations.mockResolvedValue(recommendations);

    const response = await request(app)
      .get('/api/v1/wishlist/recommendations')
      .query({ limit: 4, include_cart: 'false' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ items: recommendations, count: recommendations.length });
    expect(wishlistService.getRecommendations).toHaveBeenCalledWith({
      user: undefined,
      session: expect.any(Object),
      seedProductIds: [],
      limit: 4,
      includeCart: false,
      includeWishlist: true,
    });
  });
});
