const request = require('supertest');
const app = require('../../app');
const { sequelize, ChatSession, Lead } = require('../../models');

describe('Simple Chat API Test', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create a new chat session', async () => {
    const response = await request(app)
      .post('/api/chat/session')
      .send({})
      .expect(201);

    expect(response.body.sessionId).toBeDefined();
  });

  test('should get session details', async () => {
    // Create session first
    const createResponse = await request(app)
      .post('/api/chat/session')
      .send({});

    const sessionId = createResponse.body.sessionId;

    // Get session details
    const getResponse = await request(app)
      .get(`/api/chat/session/${sessionId}`)
      .expect(200);

    expect(getResponse.body.sessionId).toBe(sessionId);
    expect(getResponse.body.state).toBeDefined();
  });
});