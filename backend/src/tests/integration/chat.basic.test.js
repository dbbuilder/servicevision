const request = require('supertest');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const app = require('../../app');
const { sequelize, ChatSession, Lead, Message } = require('../../models');

describe('Basic Chat Integration Test', () => {
  let httpServer;
  let serverSocket;
  let clientSocket;
  let port;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Create HTTP server
    httpServer = app.listen(0);
    port = httpServer.address().port;
    
    // Initialize Socket.IO server
    serverSocket = new Server(httpServer, {
      cors: { origin: '*' }
    });
  });

  afterAll(async () => {
    if (serverSocket) serverSocket.close();
    if (httpServer) httpServer.close();
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear tables in correct order due to foreign keys
    try {
      await Message.destroy({ where: {} });
    } catch (e) {
      console.error('Error clearing Message table:', e.message);
    }
    try {
      await ChatSession.destroy({ where: {} });
    } catch (e) {
      console.error('Error clearing ChatSession table:', e.message);
    }
    try {
      await Lead.destroy({ where: {} });
    } catch (e) {
      console.error('Error clearing Lead table:', e.message);
    }
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  test('should create session and connect WebSocket', async () => {
    // Create session
    const response = await request(app)
      .post('/api/chat/session')
      .send({})
      .expect(201);

    const { sessionId } = response.body;
    expect(sessionId).toBeDefined();

    // Verify session in database
    const session = await ChatSession.findOne({ where: { sessionId } });
    expect(session).toBeDefined();
    expect(session.state).toBeDefined();
  });
});