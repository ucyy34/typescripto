const request = require('supertest');
const express = require('express');

const mockWishlistService = {
  list: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  sync: jest.fn(),
};

jest.mock('../../src/services/wishlist.service', () => mockWishlistService);

jest.mock('../../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'user-1', role: 'buyer' };
    next();
  },
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

  it('returns wishlist items for authenticated user', async () => {
    const app = buildApp();
    const items = [
      {
        id: 'entry-1',
        product_id: 'product-1',
        product: { id: 'product-1', title: 'Handcrafted Bowl' },
        added_at: new Date().toISOString(),
      },
    ];

    mockWishlistService.list.mockResolvedValue(items);

    const response = await request(app).get('/api/v1/wishlist');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      items,
      totals: { count: 1 },
    });
    expect(mockWishlistService.list).toHaveBeenCalledWith('user-1');
  });

  it('validates payload when adding wishlist item', async () => {
    const app = buildApp();

    let response = await request(app).post('/api/v1/wishlist').send({ product_id: 'not-a-uuid' });
    expect(response.status).toBe(422);
    expect(mockWishlistService.add).not.toHaveBeenCalled();

    const wishlist = [];
    mockWishlistService.add.mockResolvedValue(wishlist);

    response = await request(app)
      .post('/api/v1/wishlist')
      .send({ product_id: 'c1b40c9c-55a2-4dfa-929b-6d8c64c0a517' });

    expect(response.status).toBe(201);
    expect(mockWishlistService.add).toHaveBeenCalledWith(
      'user-1',
      'c1b40c9c-55a2-4dfa-929b-6d8c64c0a517',
      null
    );
  });

  it('requires valid product id when removing item', async () => {
    const app = buildApp();

    let response = await request(app).delete('/api/v1/wishlist/invalid-id');
    expect(response.status).toBe(422);
    expect(mockWishlistService.remove).not.toHaveBeenCalled();

    mockWishlistService.remove.mockResolvedValue([]);

    response = await request(app).delete('/api/v1/wishlist/f3d8cc37-5c57-40ac-88d7-61d519ec5f87');
    expect(response.status).toBe(200);
    expect(mockWishlistService.remove).toHaveBeenCalledWith(
      'user-1',
      'f3d8cc37-5c57-40ac-88d7-61d519ec5f87'
    );
  });

  it('synchronizes wishlist payloads', async () => {
    const app = buildApp();
    mockWishlistService.sync.mockResolvedValue([]);

    const response = await request(app)
      .post('/api/v1/wishlist/sync')
      .send({ items: [{ product_id: 'f1c6e3d6-a0fd-47ef-9a1f-18d388a4f70f' }] });

    expect(response.status).toBe(200);
    expect(mockWishlistService.sync).toHaveBeenCalledWith('user-1', [
      'f1c6e3d6-a0fd-47ef-9a1f-18d388a4f70f',
    ]);
  });
});
