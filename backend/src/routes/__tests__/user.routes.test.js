const request = require('supertest');
const express = require('express');

jest.mock('../../models', () => {
  const User = {
    findAll: jest.fn(),
    count: jest.fn(),
    findByPk: jest.fn(),
  };

  return { User };
});

jest.mock('../../middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'admin-id', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));

const { User } = require('../../models');
const userRoutes = require('../../routes/user.routes');
const { errorHandler, notFound } = require('../../middlewares/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/users', userRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

describe('User routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns paginated user list with filters', async () => {
    const app = buildApp();
    User.findAll.mockResolvedValue([
      {
        id: 'user-1',
        email: 'buyer@example.com',
        first_name: 'Buyer',
        last_name: 'One',
        role: 'buyer',
        is_active: true,
      },
    ]);
    User.count.mockResolvedValue(2);

    const response = await request(app).get(
      '/api/v1/users?role=buyer&status=active&limit=1&offset=0'
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.users).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({
      total: 2,
      limit: 1,
      offset: 0,
      hasNext: true,
      hasPrev: false,
    });
  });

  test('rejects invalid query filters with 422', async () => {
    const app = buildApp();

    const response = await request(app).get('/api/v1/users?status=pending');

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors[0].field).toBe('status');
  });

  test('returns 404 when user not found', async () => {
    const app = buildApp();
    User.findByPk.mockResolvedValue(null);

    const response = await request(app).get(
      '/api/v1/users/7b29f1f5-769b-4a5f-9c8f-d2f98b942511'
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('User not found');
  });

  test('prevents deactivating the current admin account', async () => {
    const app = buildApp();
    const save = jest.fn().mockResolvedValue();
    User.findByPk.mockResolvedValue({
      id: 'admin-id',
      email: 'admin@example.com',
      is_active: true,
      save,
    });

    const response = await request(app)
      .patch('/api/v1/users/7b29f1f5-769b-4a5f-9c8f-d2f98b942511/status')
      .send({ is_active: false });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You cannot deactivate your own account');
    expect(save).not.toHaveBeenCalled();
  });

  test('updates user status successfully', async () => {
    const app = buildApp();
    const save = jest.fn().mockResolvedValue();
    User.findByPk.mockResolvedValue({
      id: 'user-1',
      email: 'buyer@example.com',
      is_active: false,
      save,
    });

    const response = await request(app)
      .patch('/api/v1/users/7b29f1f5-769b-4a5f-9c8f-d2f98b942511/status')
      .send({ is_active: true });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: 'user-1',
      email: 'buyer@example.com',
      is_active: true,
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  test('surfaces server errors consistently', async () => {
    const app = buildApp();
    User.findAll.mockRejectedValue(new Error('Database unavailable'));

    const response = await request(app).get('/api/v1/users');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Database unavailable');
  });
});
