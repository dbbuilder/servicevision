const request = require('supertest');
const app = require('../../app');
const { sequelize, ChatSession, Lead } = require('../../models');
const { requestWithCsrf } = require('../helpers/csrf');

describe('Simple Chat API Test', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create a new chat session', async () => {
    const response = await requestWithCsrf(app, 'post', '/api/chat/session', {});
    
    expect(response.status).toBe(201);
    expect(response.body.sessionId).toBeDefined();
  });

  test('should get session details', async () => {
    // Create session first
    const createResponse = await requestWithCsrf(app, 'post', '/api/chat/session', {});
    const sessionId = createResponse.body.sessionId;

    // Get session details - GET requests don't need CSRF
    const getResponse = await request(app)
      .get(`/api/chat/session/${sessionId}`)
      .expect(200);

    expect(getResponse.body.sessionId).toBe(sessionId);
    expect(getResponse.body.state).toBeDefined();
  });
});