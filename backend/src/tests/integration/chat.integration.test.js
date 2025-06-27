const request = require('supertest');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const app = require('../../app');
const { sequelize, ChatSession, Lead, Message } = require('../../models');
const chatService = require('../../services/chatService');
const websocketService = require('../../services/websocketService');
const summaryService = require('../../services/summaryService');

describe('Chat System Integration Tests', () => {
  let server;
  let httpServer;
  let serverSocket;
  let clientSocket;
  let port;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Create HTTP server
    httpServer = app.listen(0); // Random port
    port = httpServer.address().port;
    
    // Initialize WebSocket server
    serverSocket = new Server(httpServer, {
      cors: { origin: '*' }
    });
    
    // Initialize WebSocket service
    websocketService.initialize(serverSocket);
  });

  afterAll(async () => {
    await httpServer.close();
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear database
    await ChatSession.destroy({ where: {} });
    await Lead.destroy({ where: {} });
    await Message.destroy({ where: {} });
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Complete Chat Flow', () => {
    test('should handle new visitor chat session from start to summary', async () => {
      // Step 1: Create initial session via REST API
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({})
        .expect(201);

      const { sessionId } = sessionResponse.body;
      expect(sessionId).toBeDefined();

      // Step 2: Connect WebSocket client
      clientSocket = Client(`http://localhost:${port}`, {
        query: { sessionId }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Step 3: Authenticate
      const authPromise = new Promise((resolve) => {
        clientSocket.on('authenticated', resolve);
      });

      clientSocket.emit('authenticate', { sessionId });
      const authResult = await authPromise;
      expect(authResult.success).toBe(true);

      // Step 4: Get initial message
      const initialMsgPromise = new Promise((resolve) => {
        clientSocket.on('message', resolve);
      });

      clientSocket.emit('start_chat');
      const initialMsg = await initialMsgPromise;
      expect(initialMsg.content).toContain('Welcome to ServiceVision');
      expect(initialMsg.sender).toBe('assistant');

      // Step 5: Send user messages through conversation flow
      const messages = [
        { text: "We're a nonprofit organization", expectedTopic: 'businessNeeds' },
        { text: "We need help with fundraising and donor management", expectedTopic: 'timeline' },
        { text: "We'd like to start in 1-3 months", expectedTopic: 'budget' },
        { text: "Our budget is around $15,000", expectedTopic: 'email' },
        { text: "My email is john@nonprofit.org", expectedTopic: 'closing' }
      ];

      for (const msg of messages) {
        const responsePromise = new Promise((resolve) => {
          clientSocket.once('message', resolve);
        });

        clientSocket.emit('message', { content: msg.text });
        const response = await responsePromise;
        
        expect(response.sender).toBe('assistant');
        expect(response.quickReplies).toBeDefined();
        expect(response.quickReplies.length).toBeGreaterThan(0);
      }

      // Step 6: Verify session state
      const session = await ChatSession.findOne({ where: { sessionId } });
      expect(session).toBeDefined();
      expect(session.state).toBeDefined();
      expect(session.state.collected.organizationType).toBe('nonprofit');
      expect(session.state.collected.email).toBe('john@nonprofit.org');

      // Step 7: Request summary
      const summaryResponse = await request(app)
        .get(`/api/chat/session/${sessionId}/summary`)
        .expect(200);

      expect(summaryResponse.body.summary).toBeDefined();
      expect(summaryResponse.body.summary).toContain('nonprofit');
      expect(summaryResponse.body.summary).toContain('fundraising');
    });

    test('should handle returning visitor with existing lead', async () => {
      // Create existing lead
      const lead = await Lead.create({
        email: 'existing@company.com',
        name: 'Jane Doe',
        organizationName: 'Tech Corp',
        organizationType: 'for-profit'
      });

      // Create session with lead
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({ email: 'existing@company.com' })
        .expect(201);

      const { sessionId } = sessionResponse.body;

      // Connect and authenticate
      clientSocket = Client(`http://localhost:${port}`, {
        query: { sessionId }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      const authPromise = new Promise((resolve) => {
        clientSocket.on('authenticated', resolve);
      });

      clientSocket.emit('authenticate', { sessionId });
      await authPromise;

      // Get personalized greeting
      const greetingPromise = new Promise((resolve) => {
        clientSocket.on('message', resolve);
      });

      clientSocket.emit('start_chat');
      const greeting = await greetingPromise;
      
      expect(greeting.content).toContain('Welcome back, Jane Doe');
      expect(greeting.content).toContain('Tech Corp');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid session ID gracefully', async () => {
      const response = await request(app)
        .get('/api/chat/session/invalid-session-id/summary')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    test('should handle WebSocket disconnection and reconnection', async () => {
      // Create session
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({})
        .expect(201);

      const { sessionId } = sessionResponse.body;

      // First connection
      clientSocket = Client(`http://localhost:${port}`, {
        query: { sessionId }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Send a message
      clientSocket.emit('message', { content: 'Hello' });

      // Disconnect
      clientSocket.disconnect();

      // Reconnect with same session
      clientSocket = Client(`http://localhost:${port}`, {
        query: { sessionId }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Should be able to continue conversation
      const messagePromise = new Promise((resolve) => {
        clientSocket.on('message', resolve);
      });

      clientSocket.emit('message', { content: 'I am back' });
      const response = await messagePromise;
      
      expect(response.sender).toBe('assistant');
    });

    test('should handle rate limiting', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({})
        .expect(201);

      const { sessionId } = sessionResponse.body;

      clientSocket = Client(`http://localhost:${port}`, {
        query: { sessionId }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Send many messages quickly
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(new Promise((resolve) => {
          clientSocket.emit('message', { content: `Message ${i}` });
          clientSocket.once('message', resolve);
          clientSocket.once('rate_limited', () => resolve({ rateLimited: true }));
        }));
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.rateLimited);
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('Message Persistence', () => {
    test('should persist all messages in database', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({})
        .expect(201);

      const { sessionId } = sessionResponse.body;
      
      // Connect and send messages
      clientSocket = Client(`http://localhost:${port}`, {
        query: { sessionId }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Send user message
      const messagePromise = new Promise((resolve) => {
        clientSocket.on('message', resolve);
      });

      clientSocket.emit('message', { content: 'Test message' });
      await messagePromise;

      // Check database
      const session = await ChatSession.findOne({ 
        where: { sessionId },
        include: [{ model: Message, as: 'chatMessages' }]
      });

      expect(session.chatMessages.length).toBeGreaterThan(0);
      
      const userMessage = session.chatMessages.find(m => m.sender === 'user');
      expect(userMessage).toBeDefined();
      expect(userMessage.content).toBe('Test message');
      
      const assistantMessage = session.chatMessages.find(m => m.sender === 'assistant');
      expect(assistantMessage).toBeDefined();
    });

    test('should restore conversation history on reconnect', async () => {
      // Create session with history
      const session = await ChatSession.create({
        sessionId: 'test-session-with-history'
      });

      await Message.bulkCreate([
        {
          chatSessionId: session.sessionId,
          sender: 'user',
          content: 'Previous message 1',
          timestamp: new Date(Date.now() - 10000)
        },
        {
          chatSessionId: session.sessionId,
          sender: 'assistant',
          content: 'Previous response 1',
          timestamp: new Date(Date.now() - 9000)
        }
      ]);

      // Get conversation history via API
      const historyResponse = await request(app)
        .get(`/api/chat/session/test-session-with-history/history`)
        .expect(200);

      expect(historyResponse.body.messages).toHaveLength(2);
      expect(historyResponse.body.messages[0].content).toBe('Previous message 1');
    });
  });

  describe('Lead Qualification', () => {
    test('should track lead qualification through conversation', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({})
        .expect(201);

      const { sessionId } = sessionResponse.body;

      // Complete conversation flow
      const conversationData = {
        organizationType: 'for-profit',
        needs: ['website_development', 'seo'],
        timeline: '1-3 months',
        budget: '25000-50000',
        email: 'qualified@lead.com'
      };

      // Update session state directly (simulating completed conversation)
      await ChatSession.update(
        {
          state: {
            stage: 'closing',
            collected: conversationData,
            pending: {}
          },
          completionRate: 1.0,
          leadQualified: true
        },
        { where: { sessionId } }
      );

      // Check qualification status
      const qualificationResponse = await request(app)
        .get(`/api/chat/session/${sessionId}/qualification`)
        .expect(200);

      expect(qualificationResponse.body.qualified).toBe(true);
      expect(qualificationResponse.body.score).toBeGreaterThan(0.6);
      expect(qualificationResponse.body.readyForSales).toBe(true);
    });
  });

  describe('Summary Generation', () => {
    test('should generate and email executive summary', async () => {
      // Create qualified session
      const session = await ChatSession.create({
        sessionId: 'summary-test-session',
        state: {
          collected: {
            organizationType: 'nonprofit',
            businessNeeds: ['fundraising', 'volunteer_management'],
            timeline: 'immediate',
            budget: '10000-25000',
            email: 'test@nonprofit.org'
          }
        },
        leadQualified: true,
        conversationHistory: [
          { role: 'user', content: 'We need help with fundraising' },
          { role: 'assistant', content: 'I can help with that' }
        ]
      });

      // Create associated lead
      await Lead.create({
        id: 1,
        email: 'test@nonprofit.org',
        name: 'Test Nonprofit',
        organizationName: 'Test Foundation'
      });

      await session.update({ leadId: 1 });

      // Request summary
      const summaryResponse = await request(app)
        .post(`/api/chat/session/summary-test-session/send-summary`)
        .expect(200);

      expect(summaryResponse.body.success).toBe(true);
      expect(summaryResponse.body.message).toContain('Summary sent');
    });
  });

  describe('Quick Reply Integration', () => {
    test('should provide context-appropriate quick replies', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({})
        .expect(201);

      const { sessionId } = sessionResponse.body;

      clientSocket = Client(`http://localhost:${port}`, {
        query: { sessionId }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Get message with quick replies
      const messagePromise = new Promise((resolve) => {
        clientSocket.on('message', resolve);
      });

      clientSocket.emit('message', { content: 'I need help' });
      const response = await messagePromise;

      expect(response.quickReplies).toBeDefined();
      expect(response.quickReplies).toContain('For-profit business');
      expect(response.quickReplies).toContain('Nonprofit organization');

      // Use quick reply
      const quickReplyPromise = new Promise((resolve) => {
        clientSocket.on('message', resolve);
      });

      clientSocket.emit('quick_reply', { 
        reply: 'Nonprofit organization',
        sessionId 
      });

      const quickReplyResponse = await quickReplyPromise;
      expect(quickReplyResponse.quickReplies).toBeDefined();
      
      // Should now show nonprofit-specific options
      const hasNonprofitOption = quickReplyResponse.quickReplies.some(
        r => r.includes('Fundraising') || r.includes('Volunteer')
      );
      expect(hasNonprofitOption).toBe(true);
    });
  });
});