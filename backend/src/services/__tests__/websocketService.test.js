const WebSocketService = require('../websocketService');
const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const { ChatSession, Lead } = require('../../models');
const chatService = require('../chatService');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models');
jest.mock('../chatService');
jest.mock('../../utils/logger');

describe('WebSocket Service', () => {
  let httpServer;
  let io;
  let serverSocket;
  let clientSocket;
  let websocketService;
  const testPort = 3001;

  beforeEach((done) => {
    // Create HTTP server and Socket.IO instance
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Initialize WebSocket service
    websocketService = new WebSocketService(io);
    websocketService.initialize();

    // Start server
    httpServer.listen(testPort, () => {
      // Connect client
      clientSocket = new Client(`http://localhost:${testPort}`, {
        autoConnect: true,
        reconnection: false
      });

      // Store server socket when client connects
      io.on('connection', (socket) => {
        serverSocket = socket;
      });

      clientSocket.on('connect', done);
    });

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach((done) => {
    // Cleanup
    io.close();
    clientSocket.close();
    httpServer.close(done);
  });

  describe('Connection Management', () => {
    test('should handle client connection', (done) => {
      expect(serverSocket).toBeDefined();
      expect(serverSocket.connected).toBe(true);
      done();
    });

    test('should handle client disconnection', (done) => {
      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });

      clientSocket.disconnect();
    });

    test('should authenticate client with valid session', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        leadId: 1
      };

      ChatSession.findOne.mockResolvedValue(mockSession);

      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });

      clientSocket.on('authenticated', (data) => {
        expect(data.success).toBe(true);
        expect(data.sessionId).toBe('test-session-123');
        done();
      });
    });

    test('should reject authentication with invalid session', (done) => {
      ChatSession.findOne.mockResolvedValue(null);

      clientSocket.emit('authenticate', { sessionId: 'invalid-session' });

      clientSocket.on('authentication_failed', (data) => {
        expect(data.error).toBe('Invalid session');
        done();
      });
    });

    test('should join session room on successful authentication', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        leadId: 1
      };

      ChatSession.findOne.mockResolvedValue(mockSession);

      // Spy on socket join method
      const joinSpy = jest.spyOn(serverSocket, 'join');

      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });

      clientSocket.on('authenticated', () => {
        setTimeout(() => {
          expect(joinSpy).toHaveBeenCalledWith('session:test-session-123');
          done();
        }, 100);
      });
    });
  });

  describe('Message Handling', () => {
    beforeEach((done) => {
      // Authenticate client before message tests
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        leadId: 1,
        totalMessages: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      ChatSession.findOne.mockResolvedValue(mockSession);
      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });
      clientSocket.on('authenticated', done);
    });

    test('should handle incoming chat message', (done) => {
      const mockResponse = {
        message: 'AI response',
        quickReplies: ['Yes', 'No'],
        completionRate: 0.5,
        isComplete: false,
        conversationHistory: [],
        identifiedNeeds: [],
        recommendedServices: []
      };

      chatService.processMessage.mockResolvedValue(mockResponse);

      clientSocket.emit('chat_message', {
        message: 'Hello AI',
        timestamp: new Date().toISOString()
      });

      clientSocket.on('chat_response', (data) => {
        expect(data.message).toBe('AI response');
        expect(data.quickReplies).toEqual(['Yes', 'No']);
        expect(data.completionRate).toBe(0.5);
        expect(data.isComplete).toBe(false);
        done();
      });
    });

    test('should handle typing indicators', (done) => {
      clientSocket.emit('typing_start');

      // Create another client to receive typing events
      const clientSocket2 = new Client(`http://localhost:${testPort}`, {
        autoConnect: true,
        reconnection: false
      });

      clientSocket2.on('connect', () => {
        // Authenticate second client
        ChatSession.findOne.mockResolvedValue({
          id: 1,
          sessionId: 'test-session-123',
          leadId: 1
        });

        clientSocket2.emit('authenticate', { sessionId: 'test-session-123' });

        clientSocket2.on('authenticated', () => {
          clientSocket2.on('typing_indicator', (data) => {
            expect(data.isTyping).toBe(true);
            clientSocket2.close();
            done();
          });

          // Emit typing from first client
          clientSocket.emit('typing_start');
        });
      });
    });

    test('should handle message acknowledgments', (done) => {
      const messageId = 'msg-123';

      clientSocket.emit('message_ack', { messageId });

      clientSocket.on('message_delivered', (data) => {
        expect(data.messageId).toBe(messageId);
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    test('should handle message errors gracefully', (done) => {
      chatService.processMessage.mockRejectedValue(new Error('AI service error'));

      clientSocket.emit('chat_message', {
        message: 'Hello AI',
        timestamp: new Date().toISOString()
      });

      clientSocket.on('chat_error', (data) => {
        expect(data.error).toBe('Failed to process message');
        expect(data.retry).toBe(true);
        done();
      });
    });
  });

  describe('Session Management', () => {
    test('should handle session summary request', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        leadId: 1,
        executiveSummary: null,
        identifiedNeeds: ['Need 1', 'Need 2'],
        recommendedServices: ['Service 1'],
        save: jest.fn().mockResolvedValue(true),
        lead: {
          email: 'test@example.com',
          organizationName: 'Test Org'
        }
      };

      const mockSummary = 'Executive summary content';

      ChatSession.findOne.mockResolvedValue(mockSession);
      chatService.generateExecutiveSummary.mockResolvedValue(mockSummary);

      // Authenticate first
      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });

      clientSocket.on('authenticated', () => {
        clientSocket.emit('request_summary');

        clientSocket.on('session_summary', (data) => {
          expect(data.summary).toBe(mockSummary);
          expect(data.identifiedNeeds).toEqual(['Need 1', 'Need 2']);
          expect(data.recommendedServices).toEqual(['Service 1']);
          done();
        });
      });
    });

    test('should handle session end', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        isComplete: false,
        endTime: null,
        save: jest.fn().mockResolvedValue(true)
      };

      ChatSession.findOne.mockResolvedValue(mockSession);

      // Authenticate first
      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });

      clientSocket.on('authenticated', () => {
        clientSocket.emit('end_session');

        clientSocket.on('session_ended', (data) => {
          expect(data.sessionId).toBe('test-session-123');
          expect(mockSession.save).toHaveBeenCalled();
          expect(mockSession.isComplete).toBe(true);
          expect(mockSession.endTime).toBeDefined();
          done();
        });
      });
    });
  });

  describe('Real-time Features', () => {
    test('should broadcast agent status changes', (done) => {
      websocketService.updateAgentStatus('online');

      clientSocket.on('agent_status', (data) => {
        expect(data.status).toBe('online');
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    test('should handle connection quality monitoring', (done) => {
      clientSocket.emit('ping');

      clientSocket.on('pong', (data) => {
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    test('should handle reconnection with session restoration', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        conversationHistory: [
          { role: 'user', content: 'Previous message' }
        ]
      };

      ChatSession.findOne.mockResolvedValue(mockSession);

      // Simulate reconnection
      clientSocket.disconnect();
      
      setTimeout(() => {
        clientSocket.connect();
        
        clientSocket.on('connect', () => {
          clientSocket.emit('restore_session', { sessionId: 'test-session-123' });
          
          clientSocket.on('session_restored', (data) => {
            expect(data.conversationHistory).toEqual(mockSession.conversationHistory);
            done();
          });
        });
      }, 100);
    });
  });

  describe('Error Handling', () => {
    test('should handle socket errors gracefully', (done) => {
      clientSocket.on('error', (error) => {
        expect(logger.error).toHaveBeenCalledWith(
          'WebSocket error:',
          expect.any(Error)
        );
        done();
      });

      // Trigger an error
      clientSocket.emit('error', new Error('Test error'));
    });

    test('should rate limit excessive messages', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        leadId: 1,
        save: jest.fn()
      };

      ChatSession.findOne.mockResolvedValue(mockSession);

      // Authenticate first
      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });

      clientSocket.on('authenticated', () => {
        let messageCount = 0;
        
        // Send many messages rapidly
        const interval = setInterval(() => {
          clientSocket.emit('chat_message', {
            message: `Message ${messageCount}`,
            timestamp: new Date().toISOString()
          });
          
          messageCount++;
          
          if (messageCount > 10) {
            clearInterval(interval);
          }
        }, 10);

        clientSocket.on('rate_limit_exceeded', (data) => {
          expect(data.error).toBe('Too many messages');
          expect(data.retryAfter).toBeDefined();
          done();
        });
      });
    });
  });

  describe('Analytics and Monitoring', () => {
    test('should track message metrics', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        leadId: 1,
        totalMessages: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockResponse = {
        message: 'AI response',
        conversationHistory: [],
        identifiedNeeds: [],
        recommendedServices: []
      };

      ChatSession.findOne.mockResolvedValue(mockSession);
      chatService.processMessage.mockResolvedValue(mockResponse);

      // Authenticate first
      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });

      clientSocket.on('authenticated', () => {
        clientSocket.emit('chat_message', {
          message: 'Test message',
          timestamp: new Date().toISOString()
        });

        clientSocket.on('chat_response', () => {
          const metrics = websocketService.getMetrics();
          expect(metrics.totalMessages).toBeGreaterThan(0);
          expect(metrics.activeSessions).toBeGreaterThan(0);
          done();
        });
      });
    });

    test('should emit session analytics', (done) => {
      const mockSession = {
        id: 1,
        sessionId: 'test-session-123',
        leadId: 1,
        startTime: new Date(Date.now() - 300000), // 5 minutes ago
        totalMessages: 10,
        completionRate: 0.8
      };

      ChatSession.findOne.mockResolvedValue(mockSession);

      // Authenticate first
      clientSocket.emit('authenticate', { sessionId: 'test-session-123' });

      clientSocket.on('authenticated', () => {
        clientSocket.emit('request_analytics');

        clientSocket.on('session_analytics', (data) => {
          expect(data.duration).toBeGreaterThan(0);
          expect(data.messageCount).toBe(10);
          expect(data.completionRate).toBe(0.8);
          done();
        });
      });
    });
  });
});