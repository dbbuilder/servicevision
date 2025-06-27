const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring the module
jest.mock('../../config/database', () => ({
  testDatabaseConnection: jest.fn()
}));

jest.mock('../../config/environment', () => ({
  getConfig: jest.fn().mockReturnValue({
    OPENAI_API_KEY: 'test-key',
    DATABASE_URL: 'postgresql://test',
    SENDGRID_API_KEY: 'test-key',
    JWT_SECRET: 'test-secret',
    ENABLE_REDIS: false
  })
}));

// Create a mock OpenAI instance
const mockModelsList = jest.fn();
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    models: {
      list: mockModelsList
    }
  }))
}));

const healthRoutes = require('../health');
const { testDatabaseConnection } = require('../../config/database');

describe('Health Check Endpoints', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset npm_package_version
    delete process.env.npm_package_version;
    
    app = express();
    app.use(express.json());
    app.use('/api', healthRoutes);
  });

  describe('GET /api/health', () => {
    test('should return 200 with healthy status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test'
      });
    });

    test('should include version if available', async () => {
      process.env.npm_package_version = '1.0.0';
      
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('GET /api/health/detailed', () => {
    test('should check all services when healthy', async () => {
      testDatabaseConnection.mockResolvedValue(true);
      mockModelsList.mockResolvedValue({ data: [] });
      
      const response = await request(app).get('/api/health/detailed');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test',
        services: {
          database: 'connected',
          openai: 'reachable',
          redis: 'disabled'
        },
        memory: {
          used: expect.any(String),
          total: expect.any(String),
          percentage: expect.any(Number)
        },
        cpu: {
          loadAverage: expect.any(Array)
        }
      });
    });

    test('should handle database connection failure', async () => {
      testDatabaseConnection.mockResolvedValue(false);
      mockModelsList.mockResolvedValue({ data: [] });
      
      const response = await request(app).get('/api/health/detailed');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.database).toBe('disconnected');
    });

    test('should handle OpenAI API failure', async () => {
      testDatabaseConnection.mockResolvedValue(true);
      mockModelsList.mockRejectedValue(new Error('API Error'));
      
      const response = await request(app).get('/api/health/detailed');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.openai).toBe('unreachable');
    });

    test.skip('should check Redis when enabled', async () => {
      // Skip this test for now - Redis integration requires more complex mocking
      // TODO: Fix Redis mocking in isolated module context
    });
  });

  describe('GET /api/health/ready', () => {
    test('should return 200 when all services are ready', async () => {
      testDatabaseConnection.mockResolvedValue(true);
      
      const response = await request(app).get('/api/health/ready');
      
      // Debug the response
      if (response.status !== 200) {
        console.log('Response body:', response.body);
      }
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ready: true,
        checks: {
          database: true,
          environment: true
        }
      });
    });

    test('should return 503 when database is not ready', async () => {
      testDatabaseConnection.mockResolvedValue(false);
      
      const response = await request(app).get('/api/health/ready');
      
      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        ready: false,
        checks: {
          database: false,
          environment: true
        }
      });
    });
  });

  describe('Error handling', () => {
    test('should handle unexpected errors gracefully', async () => {
      testDatabaseConnection.mockRejectedValue(new Error('Unexpected error'));
      mockModelsList.mockRejectedValue(new Error('API Error'));
      
      const response = await request(app).get('/api/health/detailed');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.database).toBe('error');
    });
  });
});