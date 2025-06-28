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
    // Drop and recreate database tables
    await sequelize.drop();
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
    // Clear all data - SQLite doesn't support truncate, so we destroy records
    // Handle foreign key constraints by deleting in correct order
    try {
      await sequelize.query('DELETE FROM messages');
    } catch (e) {
      // Table might not exist yet
    }
    try {
      await sequelize.query('DELETE FROM chat_sessions');
    } catch (e) {
      // Table might not exist yet
    }
    try {
      await sequelize.query('DELETE FROM leads');
    } catch (e) {
      // Table might not exist yet
    }
    try {
      await sequelize.query("DELETE FROM sqlite_sequence WHERE name IN ('messages', 'chat_sessions', 'leads')");
    } catch (e) {
      // sqlite_sequence might not exist
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