// Monitoring Middleware Tests

const request = require('supertest');
const express = require('express');
const { performanceMonitoring, errorTracking, healthCheck } = require('../monitoring');

describe('Monitoring Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      app.use(performanceMonitoring());
      
      app.get('/fast', (req, res) => {
        res.json({ status: 'ok' });
      });
      
      app.get('/slow', async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        res.json({ status: 'slow' });
      });
      
      app.get('/error', (req, res) => {
        res.status(500).json({ error: 'Internal error' });
      });
    });

    it('should track metrics', async () => {
      // Make some requests
      await request(app).get('/fast');
      await request(app).get('/fast');
      await request(app).get('/error');
      
      // Get metrics
      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        uptime: expect.any(Number),
        requests: 4, // 3 test requests + 1 metrics request
        errors: 1,
        errorRate: 0.25,
        avgResponseTime: expect.any(Number),
        memory: expect.any(Object),
        timestamp: expect.any(String)
      });
    });

    it('should calculate average response time', async () => {
      // Make multiple requests
      await request(app).get('/fast');
      await request(app).get('/slow');
      
      const response = await request(app).get('/metrics');
      
      expect(response.body.avgResponseTime).toBeGreaterThan(0);
      expect(response.body.avgResponseTime).toBeLessThan(100);
    });
  });

  describe('Error Tracking', () => {
    it('should handle errors properly', async () => {
      app.use((req, res, next) => {
        if (req.path === '/error') {
          throw new Error('Test error');
        }
        next();
      });
      
      app.use(errorTracking());
      
      // Default error handler
      app.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
      });
      
      const response = await request(app)
        .get('/error')
        .set('User-Agent', 'Test-Agent');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Test error');
    });
  });

  describe('Health Check', () => {
    const mockDb = {
      authenticate: jest.fn()
    };
    
    const mockRedis = {
      ping: jest.fn()
    };

    beforeEach(() => {
      app.get('/health', healthCheck(mockDb, mockRedis));
    });

    it('should return healthy when all checks pass', async () => {
      mockDb.authenticate.mockResolvedValue(true);
      mockRedis.ping.mockResolvedValue('PONG');
      
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        checks: {
          database: { status: 'healthy' },
          redis: { status: 'healthy' },
          memory: {
            status: expect.stringMatching(/healthy|warning/),
            heapUsed: expect.any(String),
            heapTotal: expect.any(String)
          }
        }
      });
    });

    it('should return unhealthy when database fails', async () => {
      mockDb.authenticate.mockRejectedValue(new Error('DB connection failed'));
      mockRedis.ping.mockResolvedValue('PONG');
      
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database).toEqual({
        status: 'unhealthy',
        error: 'DB connection failed'
      });
    });

    it('should return degraded when redis fails', async () => {
      mockDb.authenticate.mockResolvedValue(true);
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));
      
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.redis).toEqual({
        status: 'unhealthy',
        error: 'Redis connection failed'
      });
    });

    it('should work without redis', async () => {
      app = express();
      app.get('/health', healthCheck(mockDb, null));
      
      mockDb.authenticate.mockResolvedValue(true);
      
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.checks.redis).toBeUndefined();
    });
  });
});