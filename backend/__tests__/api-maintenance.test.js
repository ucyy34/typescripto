const request = require('supertest');
const express = require('express');

// Ensure app loads with test environment defaults
process.env.RATE_LIMIT_DISABLED = 'true';

const app = require('../src/app');
const { errorHandler } = require('../src/middlewares/errorHandler');

describe('API maintenance smoke tests', () => {
  it('returns a healthy response from /health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        services: expect.objectContaining({
          database: expect.stringMatching(/up|down|unknown/),
          redis: expect.stringMatching(/up|down|unknown/),
        }),
        timestamp: expect.any(String),
        environment: expect.any(String),
      })
    );
  });

  it('responds with unauthorized envelope when token is missing', async () => {
    const response = await request(app).get('/api/v1/users');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'No token provided',
      })
    );
  });

  it('returns a consistent 404 response for unknown routes', async () => {
    const response = await request(app).get('/api/v1/definitely-not-real');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Route not found'),
      })
    );
  });
});

describe('Global error handler', () => {
  it('formats 500 errors with a JSON envelope', async () => {
    const errorApp = express();

    errorApp.get('/boom', () => {
      throw new Error('Boom');
    });

    // Register the global error handler as Express would in production
    errorApp.use(errorHandler);

    const response = await request(errorApp).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'Boom',
      })
    );
    expect(response.body).toHaveProperty('timestamp');
  });
});
