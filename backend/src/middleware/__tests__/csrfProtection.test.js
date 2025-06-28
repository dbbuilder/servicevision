// CSRF Protection Middleware Tests

const request = require('supertest');
const express = require('express');
const { csrfProtection, csrfToken } = require('../csrfProtection');

describe('CSRF Protection Middleware', () => {
  let app;
  let agent;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Cookie parsing middleware (same as in app.js)
    app.use((req, res, next) => {
      req.cookies = {};
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
          const parts = cookie.trim().split('=');
          if (parts.length === 2) {
            req.cookies[parts[0]] = decodeURIComponent(parts[1]);
          }
        });
      }
      
      // Add cookie setting method
      res.cookie = function(name, value, options = {}) {
        let cookie = `${name}=${encodeURIComponent(value)}`;
        
        if (options.maxAge) {
          cookie += `; Max-Age=${options.maxAge / 1000}`;
        }
        if (options.httpOnly) {
          cookie += '; HttpOnly';
        }
        if (options.secure) {
          cookie += '; Secure';
        }
        if (options.sameSite) {
          cookie += `; SameSite=${options.sameSite}`;
        }
        if (options.path) {
          cookie += `; Path=${options.path}`;
        }
        
        const existingCookies = this.getHeader('Set-Cookie') || [];
        const cookies = Array.isArray(existingCookies) ? existingCookies : [existingCookies];
        cookies.push(cookie);
        this.setHeader('Set-Cookie', cookies);
        
        return this;
      };
      
      next();
    });
    
    // Create agent for maintaining cookies between requests
    agent = request.agent(app);
  });

  describe('Basic CSRF Protection', () => {
    beforeEach(() => {
      app.use(csrfProtection());
      app.get('/form', (req, res) => res.json({ message: 'Form page' }));
      app.post('/submit', (req, res) => res.json({ message: 'Form submitted' }));
    });

    it('should allow GET requests without token', async () => {
      const response = await agent.get('/form');
      expect(response.status).toBe(200);
    });

    it('should set CSRF cookie on GET request', async () => {
      const response = await agent.get('/form');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toMatch(/_csrf=/);
    });

    it('should reject POST without CSRF token', async () => {
      const response = await agent.post('/submit').send({ data: 'test' });
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF token missing');
    });

    it('should reject POST with invalid CSRF token', async () => {
      // First GET to get cookie
      const getResponse = await agent.get('/form');
      const cookie = getResponse.headers['set-cookie'][0];
      
      // POST with wrong token
      const response = await agent
        .post('/submit')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'invalid-token')
        .send({ data: 'test' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF token invalid');
    });

    it('should accept POST with valid CSRF token in header', async () => {
      // GET to get CSRF cookie
      const getResponse = await agent.get('/form');
      const cookie = getResponse.headers['set-cookie'][0];
      const tokenMatch = cookie.match(/_csrf=([^;]+)/);
      const token = decodeURIComponent(tokenMatch[1]);
      
      // POST with valid token - manually set cookie
      const response = await agent
        .post('/submit')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ data: 'test' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Form submitted');
    });

    it('should accept POST with valid CSRF token in body', async () => {
      // GET to get CSRF cookie
      const getResponse = await agent.get('/form');
      const cookie = getResponse.headers['set-cookie'][0];
      const tokenMatch = cookie.match(/_csrf=([^;]+)/);
      const token = decodeURIComponent(tokenMatch[1]);
      
      // POST with token in body
      const response = await agent
        .post('/submit')
        .set('Cookie', cookie)
        .send({ data: 'test', _csrf: token });
      
      expect(response.status).toBe(200);
    });

    it('should accept POST with valid CSRF token in query', async () => {
      // GET to get CSRF cookie
      const getResponse = await agent.get('/form');
      const cookie = getResponse.headers['set-cookie'][0];
      const tokenMatch = cookie.match(/_csrf=([^;]+)/);
      const token = decodeURIComponent(tokenMatch[1]);
      
      // POST with token in query
      const response = await agent
        .post(`/submit?_csrf=${encodeURIComponent(token)}`)
        .set('Cookie', cookie)
        .send({ data: 'test' });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Excluded Paths', () => {
    beforeEach(() => {
      app.use(csrfProtection({
        excludePaths: ['/api/webhooks', '/health']
      }));
      app.post('/api/data', (req, res) => res.json({ success: true }));
      app.post('/api/webhooks/calendly', (req, res) => res.json({ received: true }));
      app.get('/health', (req, res) => res.json({ status: 'ok' }));
    });

    it('should enforce CSRF on non-excluded paths', async () => {
      const response = await agent.post('/api/data').send({ test: 'data' });
      expect(response.status).toBe(403);
    });

    it('should skip CSRF check for excluded paths', async () => {
      const response = await agent
        .post('/api/webhooks/calendly')
        .send({ event: 'test' });
      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });
  });

  describe('CSRF Token Helper', () => {
    beforeEach(() => {
      app.use(csrfToken);
      app.get('/token', (req, res) => {
        res.json({ token: req.csrfToken() });
      });
    });

    it('should provide CSRF token via helper', async () => {
      const response = await agent.get('/token');
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should set same token in cookie and helper', async () => {
      const response = await agent.get('/token');
      const cookie = response.headers['set-cookie'][0];
      const cookieTokenMatch = cookie.match(/_csrf=([^;]+)/);
      const cookieToken = decodeURIComponent(cookieTokenMatch[1]);
      
      expect(response.body.token).toBe(cookieToken);
    });

    it('should reuse existing token', async () => {
      const response1 = await agent.get('/token');
      const token1 = response1.body.token;
      
      const response2 = await agent.get('/token');
      const token2 = response2.body.token;
      
      expect(token1).toBe(token2);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom cookie name', async () => {
      app.use(csrfProtection({ cookieName: 'my-csrf' }));
      app.get('/test', (req, res) => res.json({ ok: true }));
      
      const response = await agent.get('/test');
      expect(response.headers['set-cookie'][0]).toMatch(/my-csrf=/);
    });

    it('should use custom header name', async () => {
      app.use(csrfProtection({ headerName: 'csrf-token' }));
      app.get('/form', (req, res) => res.json({ ok: true }));
      app.post('/submit', (req, res) => res.json({ ok: true }));
      
      // Get token
      const getResponse = await agent.get('/form');
      const cookie = getResponse.headers['set-cookie'][0];
      const tokenMatch = cookie.match(/_csrf=([^;]+)/);
      const token = decodeURIComponent(tokenMatch[1]);
      
      // POST with custom header
      const response = await agent
        .post('/submit')
        .set('Cookie', cookie)
        .set('CSRF-Token', token)
        .send({ data: 'test' });
      
      expect(response.status).toBe(200);
    });
  });
});