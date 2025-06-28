// CSRF Protection Integration Tests

const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../models');

describe('CSRF Protection Integration', () => {
  let agent;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(() => {
    agent = request.agent(app);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('CSRF Token Endpoint', () => {
    it('should provide CSRF token', async () => {
      const response = await agent.get('/api/csrf-token');
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).toMatch(/^[a-f0-9]{64}$/);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reuse existing token on subsequent requests', async () => {
      const response1 = await agent.get('/api/csrf-token');
      const token1 = response1.body.token;
      
      const response2 = await agent.get('/api/csrf-token');
      const token2 = response2.body.token;
      
      expect(token1).toBe(token2);
    });
  });

  describe('Protected Endpoints', () => {
    it('should reject POST to /api/leads without CSRF token', async () => {
      const response = await agent
        .post('/api/leads')
        .send({
          name: 'Test User',
          email: 'test@example.com'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF token missing');
    });

    it('should accept POST to /api/leads with valid CSRF token', async () => {
      // Get CSRF token
      const tokenResponse = await agent.get('/api/csrf-token');
      const token = tokenResponse.body.token;
      const cookie = tokenResponse.headers['set-cookie'][0];
      
      // Make POST with token - manually set cookie
      const response = await request(app)
        .post('/api/leads')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '123-456-7890',
          message: 'Test message'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.email).toBe('test@example.com');
    });

    it('should reject POST with invalid CSRF token', async () => {
      // Get CSRF token to ensure cookie is set
      const tokenResponse = await agent.get('/api/csrf-token');
      const cookie = tokenResponse.headers['set-cookie'][0];
      
      // Try with invalid token
      const response = await request(app)
        .post('/api/leads')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'invalid-token-12345')
        .send({
          name: 'Test User',
          email: 'test@example.com'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF token invalid');
    });
  });

  describe('Excluded Endpoints', () => {
    it('should allow webhook POST without CSRF token', async () => {
      const response = await agent
        .post('/api/webhooks/calendly')
        .send({
          event: 'invitee.created',
          payload: {
            email: 'test@example.com'
          }
        });
      
      // Webhook endpoint returns 401 due to missing signature, but not 403 (CSRF)
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Missing webhook signature');
    });

    it('should allow health check without CSRF token', async () => {
      const response = await agent.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Different Token Submission Methods', () => {
    let token;
    let cookie;

    beforeEach(async () => {
      const tokenResponse = await agent.get('/api/csrf-token');
      token = tokenResponse.body.token;
      cookie = tokenResponse.headers['set-cookie'][0];
    });

    it('should accept token in header', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Header Test',
          email: 'header@example.com',
          phone: '123-456-7890',
          message: 'Test'
        });
      
      expect(response.status).toBe(201);
    });

    it('should accept token in body', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('Cookie', cookie)
        .send({
          name: 'Body Test',
          email: 'body@example.com',
          phone: '123-456-7890',
          message: 'Test',
          _csrf: token
        });
      
      expect(response.status).toBe(201);
    });

    it('should accept token in query parameter', async () => {
      const response = await request(app)
        .post(`/api/leads?_csrf=${encodeURIComponent(token)}`)
        .set('Cookie', cookie)
        .send({
          name: 'Query Test',
          email: 'query@example.com',
          phone: '123-456-7890',
          message: 'Test'
        });
      
      expect(response.status).toBe(201);
    });
  });
});