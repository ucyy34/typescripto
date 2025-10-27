const request = require('supertest');
const express = require('express');

const mockRecommendationService = {
  getRecommendations: jest.fn(),
};

jest.mock('../../src/services/recommendation.service', () => mockRecommendationService);

jest.mock('../../src/middlewares/auth', () => ({
  optionalAuth: (req, res, next) => {
    if (req.headers['x-test-user'] === 'auth') {
      req.user = { id: 'user-1' };
    }
    next();
  },
}));

const recommendationRoutes = require('../../src/routes/recommendation.routes');
const { errorHandler } = require('../../src/middlewares/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/recommendations', recommendationRoutes);
  app.use(errorHandler);
  return app;
};

describe('Recommendation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates query params', async () => {
    const app = buildApp();

    const invalid = await request(app).get('/api/v1/recommendations').query({ limit: 0 });
    expect(invalid.status).toBe(422);
    expect(mockRecommendationService.getRecommendations).not.toHaveBeenCalled();
  });

  it('returns recommended products', async () => {
    const app = buildApp();
    mockRecommendationService.getRecommendations.mockResolvedValue([{ id: 'product-1' }]);

    const sampleIds = [
      '2a902f7e-4c7f-4f7a-8fd8-c5f7f9ba9d11',
      '4c55f31e-1b9d-4d92-8a57-2a0e6e5f9c32',
    ];

    const response = await request(app)
      .get('/api/v1/recommendations')
      .set('x-test-user', 'auth')
      .query({ limit: 4, cartProductIds: sampleIds });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.products).toHaveLength(1);
    expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 4, cartProductIds: sampleIds, userId: 'user-1' })
    );
  });
});
