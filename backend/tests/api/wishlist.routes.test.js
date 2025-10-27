const request = require('supertest');
const express = require('express');

const mockWishlistService = {
  getWishlist: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('../../src/services/wishlist.service', () => mockWishlistService);

jest.mock('../../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'user-1', role: 'buyer' };
    next();
  },
  requireBuyer: (req, res, next) => next(),
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

  it('validates wishlist payloads', async () => {
    const app = buildApp();

    const invalid = await request(app).post('/api/v1/wishlist').send({});
    expect(invalid.status).toBe(422);
    expect(mockWishlistService.addItem).not.toHaveBeenCalled();

    mockWishlistService.addItem.mockResolvedValue({ id: 'item-1' });

    const valid = await request(app)
      .post('/api/v1/wishlist')
      .send({ product_id: '7bdff6fd-1e87-4f8e-9d92-2cbf22766b43' });

    expect(valid.status).toBe(201);
    expect(valid.body.success).toBe(true);
    expect(valid.body.message).toBe('Product added to wishlist');
  });

  it('returns wishlist items', async () => {
    const app = buildApp();
    mockWishlistService.getWishlist.mockResolvedValue([{ id: 'item-1' }]);

    const response = await request(app).get('/api/v1/wishlist');

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.message).toBe('Wishlist retrieved successfully');
  });

  it('validates delete params', async () => {
    const app = buildApp();

    const invalid = await request(app).delete('/api/v1/wishlist/not-a-uuid');
    expect(invalid.status).toBe(422);
    expect(mockWishlistService.removeItem).not.toHaveBeenCalled();

    mockWishlistService.removeItem.mockResolvedValue(true);

    const response = await request(app).delete(
      '/api/v1/wishlist/7bdff6fd-1e87-4f8e-9d92-2cbf22766b43'
    );

    expect(response.status).toBe(204);
  });
});
