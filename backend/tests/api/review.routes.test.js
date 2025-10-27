const request = require('supertest');
const express = require('express');

const mockReviewService = {
  getProductReviews: jest.fn(),
  getStoreReviews: jest.fn(),
  createProductReview: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
  markHelpful: jest.fn(),
  getPendingReviews: jest.fn(),
  approveReview: jest.fn(),
  rejectReview: jest.fn(),
};

jest.mock('../../src/services/review.service', () => mockReviewService);

jest.mock('../../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    const role = req.headers['x-test-role'] || 'buyer';
    req.user = { id: 'user-1', role };
    next();
  },
  requireAdmin: (req, res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  requireSeller: (req, res, next) => next(),
}));

const reviewRoutes = require('../../src/routes/review.routes');
const { errorHandler } = require('../../src/middlewares/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', reviewRoutes);
  app.use(errorHandler);
  return app;
};

describe('Review routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates product review payloads', async () => {
    const app = buildApp();
    const productId = '9d1ea52f-60b5-4b8d-83de-812b0c6b165b';

    const invalidResponse = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .send({ rating: 8 });

    expect(invalidResponse.status).toBe(422);
    expect(invalidResponse.body.success).toBe(false);
    expect(mockReviewService.createProductReview).not.toHaveBeenCalled();

    const review = { id: 'review-1', rating: 5 };
    mockReviewService.createProductReview.mockResolvedValue(review);

    const validResponse = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .send({ rating: 5, comment: 'Great!' });

    expect(validResponse.status).toBe(201);
    expect(validResponse.body.success).toBe(true);
    expect(validResponse.body.message).toBe('Review created successfully');
  });

  it('guards helpful feedback payloads', async () => {
    const app = buildApp();
    const reviewId = '4c94781f-1734-4f6a-8d2b-72bb0a02b4aa';

    const invalidResponse = await request(app)
      .post(`/api/v1/reviews/${reviewId}/helpful`)
      .send({ helpful: 'yes' });

    expect(invalidResponse.status).toBe(422);
    expect(mockReviewService.markHelpful).not.toHaveBeenCalled();

    const review = { id: reviewId, helpful_count: 1 };
    mockReviewService.markHelpful.mockResolvedValue(review);

    const validResponse = await request(app)
      .post(`/api/v1/reviews/${reviewId}/helpful`)
      .send({ helpful: true });

    expect(validResponse.status).toBe(200);
    expect(validResponse.body.success).toBe(true);
    expect(validResponse.body.message).toBe('Review feedback recorded');
  });

  it('returns pending reviews for admins only', async () => {
    const app = buildApp();
    mockReviewService.getPendingReviews.mockResolvedValue({
      reviews: [],
      pagination: { page: 1, limit: 20, total: 0 },
    });

    const response = await request(app)
      .get('/api/v1/admin/reviews/pending')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Pending reviews retrieved successfully');
  });
});
