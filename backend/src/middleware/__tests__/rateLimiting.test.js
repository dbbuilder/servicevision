// Rate Limiting Middleware Tests

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

// Create test-specific rate limiters with shorter windows
const createTestLimiter = (options) => {
  return rateLimit({
    ...options,
    store: new rateLimit.MemoryStore(), // Use memory store for tests
    windowMs: options.windowMs || 1000, // Default to 1 second for tests
  });
};

describe('Rate Limiting Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
  });

  describe('Global Rate Limiter', () => {
    let testLimiter;
    
    beforeEach(() => {
      testLimiter = createTestLimiter({
        windowMs: 1000, // 1 second
        max: 5, // 5 requests per second for testing
        message: 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.path === '/health'
      });
      app.use(testLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));
      app.get('/health', (req, res) => res.json({ status: 'healthy' }));
    });

    it('should allow requests within limit', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should skip rate limiting for health endpoint', async () => {
      // Make many requests to health endpoint
      const requests = Array(10).fill().map(() => request(app).get('/health'));
      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should block after exceeding limit', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/test');
        expect(response.status).toBe(200);
      }

      // 6th request should be blocked
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Auth Rate Limiter', () => {
    let testAuthLimiter;
    
    beforeEach(() => {
      testAuthLimiter = createTestLimiter({
        windowMs: 1000,
        max: 5,
        skipSuccessfulRequests: true
      });
      app.post('/auth/login', testAuthLimiter, (req, res) => {
        if (req.body.password === 'correct') {
          res.json({ success: true });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
    });

    it('should allow 5 failed attempts', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({ password: 'wrong' });
        expect(response.status).toBe(401);
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'wrong' });
      expect(response.status).toBe(429);
    });

    it('should not count successful requests', async () => {
      // Make 10 successful attempts (more than limit)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({ password: 'correct' });
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Chat Rate Limiter', () => {
    let testChatLimiter;
    
    beforeEach(() => {
      testChatLimiter = createTestLimiter({
        windowMs: 1000,
        max: 5,
        message: 'Chat rate limit exceeded'
      });
      app.post('/chat/message', testChatLimiter, (req, res) => {
        res.json({ message: 'Message received' });
      });
    });

    it('should limit messages per second', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/chat/message')
          .send({ message: 'test' });
        expect(response.status).toBe(200);
      }

      // 6th should be rate limited
      const response = await request(app)
        .post('/chat/message')
        .send({ message: 'test' });
      expect(response.status).toBe(429);
      expect(response.text).toContain('Chat rate limit exceeded');
    });
  });

  describe('Email Rate Limiter', () => {
    let testEmailLimiter;
    
    beforeEach(() => {
      testEmailLimiter = createTestLimiter({
        windowMs: 1000,
        max: 2,
        keyGenerator: (req) => req.body?.email || req.ip
      });
      app.post('/send-email', testEmailLimiter, (req, res) => {
        res.json({ sent: true });
      });
    });

    it('should limit by email address', async () => {
      const email = 'test@example.com';
      
      // Make 2 requests with same email (the limit)
      for (let i = 0; i < 2; i++) {
        const response = await request(app)
          .post('/send-email')
          .send({ email });
        expect(response.status).toBe(200);
      }

      // 3rd should be rate limited
      const response = await request(app)
        .post('/send-email')
        .send({ email });
      expect(response.status).toBe(429);

      // Different email should work
      const response2 = await request(app)
        .post('/send-email')
        .send({ email: 'different@example.com' });
      expect(response2.status).toBe(200);
    });
  });

  describe('Drawing Rate Limiter', () => {
    let testDrawingLimiter;
    
    beforeEach(() => {
      testDrawingLimiter = createTestLimiter({
        windowMs: 1000,
        max: 1,
        message: 'You have already entered the drawing',
        keyGenerator: (req) => req.body?.email || 'anonymous'
      });
      app.post('/drawing/enter', testDrawingLimiter, (req, res) => {
        res.json({ entered: true });
      });
    });

    it('should limit to one entry per email', async () => {
      const email = 'contestant@example.com';
      
      // First entry should succeed
      const response1 = await request(app)
        .post('/drawing/enter')
        .send({ email });
      expect(response1.status).toBe(200);

      // Second entry should be rate limited
      const response2 = await request(app)
        .post('/drawing/enter')
        .send({ email });
      expect(response2.status).toBe(429);
      expect(response2.text).toContain('already entered');
    });
  });
});