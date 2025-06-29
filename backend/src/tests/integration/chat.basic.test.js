const request = require('supertest');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const app = require('../../app');
const { sequelize, ChatSession, Lead, Message } = require('../../models');
const WebSocketService = require('../../services/websocketService');
const { requestWithCsrf } = require('../helpers/csrf');

// Mock OpenAI to avoid API calls in tests
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Thank you for your message. How can I help you with your business today?'
              }
            }
          ]
        })
      }
    }
  }))
}));

describe('Basic Chat Integration Test', () => {
  let httpServer;
  let serverSocket;
  let clientSocket;
  let port;
  let wsService;

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

    // Initialize WebSocket service
    wsService = new WebSocketService(serverSocket);
    wsService.initialize();
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
    // Create session with CSRF
    const response = await requestWithCsrf(app, 'post', '/api/chat/session', {});
    
    expect(response.status).toBe(201);
    const { sessionId } = response.body;
    expect(sessionId).toBeDefined();

    // Verify session in database
    const session = await ChatSession.findOne({ where: { sessionId } });
    expect(session).toBeDefined();
    expect(session.state).toBeDefined();
  });

  test('should handle WebSocket connection with session', (done) => {
    let sessionId;

    // First create a session with CSRF
    requestWithCsrf(app, 'post', '/api/chat/session', {})
      .then(response => {
        expect(response.status).toBe(201);
        sessionId = response.body.sessionId;
        
        // Connect WebSocket client
        clientSocket = Client(`http://localhost:${port}`);

        clientSocket.on('connect', () => {
          // Authenticate after connection
          clientSocket.emit('authenticate', { sessionId });
        });

        clientSocket.on('authenticated', (data) => {
          expect(data.success).toBe(true);
          expect(data.sessionId).toBe(sessionId);
          done();
        });

        clientSocket.on('authentication_failed', (error) => {
          done(new Error(error.error));
        });

        clientSocket.on('connect_error', (error) => {
          done(error);
        });
      })
      .catch(done);
  });

  test('should receive initial message on chat start', (done) => {
    let sessionId;

    requestWithCsrf(app, 'post', '/api/chat/session', {})
      .then(response => {
        expect(response.status).toBe(201);
        sessionId = response.body.sessionId;
        
        clientSocket = Client(`http://localhost:${port}`);

        clientSocket.on('connect', () => {
          clientSocket.emit('authenticate', { sessionId });
        });

        clientSocket.on('authenticated', () => {
          clientSocket.emit('start_chat');
        });

        clientSocket.on('message', (data) => {
          expect(data.content).toBeDefined();
          expect(data.sender).toBe('assistant');
          expect(data.timestamp).toBeDefined();
          done();
        });

        clientSocket.on('error', (error) => {
          done(new Error(error.error));
        });
      })
      .catch(done);
  });

  test('should handle user messages and persist them', (done) => {
    let sessionId;
    let chatSessionId;

    requestWithCsrf(app, 'post', '/api/chat/session', {})
      .then(response => {
        expect(response.status).toBe(201);
        sessionId = response.body.sessionId;
        
        // Get the actual chat session ID from database
        return ChatSession.findOne({ where: { sessionId } });
      })
      .then(session => {
        chatSessionId = session.id;
        
        clientSocket = Client(`http://localhost:${port}`);

        const userMessage = 'Hello, I need help with my business';

        clientSocket.on('connect', () => {
          clientSocket.emit('authenticate', { sessionId });
        });

        clientSocket.on('authenticated', () => {
          // Give the server a moment to process
          setTimeout(() => {
            clientSocket.emit('chat_message', {
              message: userMessage,
              timestamp: new Date()
            });
          }, 100);
        });

        clientSocket.on('message', (data) => {
          // This is the assistant's response
          if (data.sender === 'assistant') {
            // Check if both user and assistant messages were persisted
            Message.findAll({
              where: { chatSessionId }
            })
              .then(messages => {
                expect(messages.length).toBeGreaterThanOrEqual(2);
                const userMsg = messages.find(m => m.content === userMessage);
                expect(userMsg).toBeDefined();
                expect(userMsg.role).toBe('user');
                
                const assistantMsg = messages.find(m => m.role === 'assistant');
                expect(assistantMsg).toBeDefined();
                done();
              })
              .catch(done);
          }
        });

        clientSocket.on('chat_error', (error) => {
          done(new Error(error.error));
        });
      })
      .catch(done);
  });

  test('should update session state on conversation progress', async () => {
    // Create session
    const response = await requestWithCsrf(app, 'post', '/api/chat/session', {});
    expect(response.status).toBe(201);
    
    const { sessionId } = response.body;
    
    // Get initial state
    const initialSession = await ChatSession.findOne({ where: { sessionId } });
    const initialState = initialSession.state;
    
    // Simulate conversation progress
    const updateResponse = await requestWithCsrf(app, 'put', `/api/chat/session/${sessionId}`, {
      state: {
        ...initialState,
        collected: {
          businessName: 'Test Company',
          contactName: 'John Doe'
        }
      }
    });
    expect(updateResponse.status).toBe(200);
    
    // Verify state update
    const updatedSession = await ChatSession.findOne({ where: { sessionId } });
    expect(updatedSession.state.collected.businessName).toBe('Test Company');
    expect(updatedSession.state.collected.contactName).toBe('John Doe');
  });
});