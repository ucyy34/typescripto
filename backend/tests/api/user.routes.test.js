const request = require('supertest');
const express = require('express');

const ADMIN_ID = '8f1c6f0d-8a23-4f82-b3f6-0beccf2e0549';

jest.mock('../../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: ADMIN_ID, role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));

const mockUserModel = {
  findAll: jest.fn(),
  count: jest.fn(),
  findByPk: jest.fn(),
};

jest.mock('../../src/models', () => ({
  User: mockUserModel,
}));

const userRoutes = require('../../src/routes/user.routes');
const { errorHandler } = require('../../src/middlewares/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/users', userRoutes);
  app.use(errorHandler);
  return app;
};

describe('User routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated users with consistent envelope', async () => {
    const app = buildApp();
    const user = {
      id: '5f7d9da4-5d9d-4d8a-9a92-38a6c6bd2a11',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUserModel.findAll.mockResolvedValue([user]);
    mockUserModel.count.mockResolvedValue(1);

    const response = await request(app).get('/api/v1/users');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Users retrieved successfully',
      data: [user],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    expect(response.body).toHaveProperty('timestamp');
  });

  it('rejects invalid query parameters', async () => {
    const app = buildApp();

    const response = await request(app).get('/api/v1/users').query({ limit: 'invalid' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body).toHaveProperty('errors');
  });

  it('returns 404 when user is not found', async () => {
    const app = buildApp();
    mockUserModel.findByPk.mockResolvedValue(null);

    const userId = '2d3f6216-2b76-423f-8f2c-bb987aa4f8a2';
    const response = await request(app).get(`/api/v1/users/${userId}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('User not found');
  });

  it('prevents administrators from deactivating themselves', async () => {
    const app = buildApp();
    const admin = {
      id: ADMIN_ID,
      email: 'self@example.com',
      is_active: true,
      save: jest.fn(),
    };

    mockUserModel.findByPk.mockResolvedValue(admin);

    const response = await request(app)
      .patch(`/api/v1/users/${admin.id}/status`)
      .send({ is_active: false });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You cannot deactivate your own account');
    expect(admin.save).not.toHaveBeenCalled();
  });

  it('updates user role when valid', async () => {
    const app = buildApp();
    const targetUser = {
      id: '5b09f5c3-4438-4c95-a5eb-5ff23afcc5ec',
      email: 'buyer@example.com',
      role: 'buyer',
      save: jest.fn().mockResolvedValue(),
    };

    mockUserModel.findByPk.mockResolvedValue(targetUser);

    const response = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/role`)
      .send({ role: 'seller' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User role updated successfully');
    expect(response.body.data).toMatchObject({ role: 'seller' });
    expect(targetUser.save).toHaveBeenCalled();
  });
});
