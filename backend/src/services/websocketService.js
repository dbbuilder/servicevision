const { ChatSession, Lead } = require('../models');
const chatService = require('./chatService');
const logger = require('../utils/logger');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.sessions = new Map();
    this.rateLimiters = new Map();
    this.metrics = {
      totalMessages: 0,
      activeSessions: 0,
      totalConnections: 0
    };
    this.agentStatus = 'online';
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`New WebSocket connection: ${socket.id}`);
      this.metrics.totalConnections++;

      // Set up event handlers
      this.handleAuthentication(socket);
      this.handleMessages(socket);
      this.handleTyping(socket);
      this.handleSession(socket);
      this.handleAnalytics(socket);
      this.handleConnection(socket);
      this.handleErrors(socket);
    });
  }

  handleAuthentication(socket) {
    socket.on('authenticate', async (data) => {
      try {
        const { sessionId } = data;
        
        // Find the chat session
        const session = await ChatSession.findOne({
          where: { sessionId },
          include: [{
            model: Lead,
            as: 'lead'
          }]
        });

        if (!session) {
          socket.emit('authentication_failed', { error: 'Invalid session' });
          return;
        }

        // Store session info
        socket.sessionId = sessionId;
        socket.session = session;
        this.sessions.set(sessionId, { socket, session });
        this.metrics.activeSessions++;

        // Join session room
        socket.join(`session:${sessionId}`);

        socket.emit('authenticated', {
          success: true,
          sessionId
        });

        logger.info(`Socket ${socket.id} authenticated for session ${sessionId}`);
      } catch (error) {
        logger.error('Authentication error:', error);
        socket.emit('authentication_failed', { error: 'Authentication error' });
      }
    });

    socket.on('restore_session', async (data) => {
      try {
        const { sessionId } = data;
        
        const session = await ChatSession.findOne({
          where: { sessionId }
        });

        if (session) {
          socket.sessionId = sessionId;
          socket.session = session;
          this.sessions.set(sessionId, { socket, session });
          socket.join(`session:${sessionId}`);

          socket.emit('session_restored', {
            conversationHistory: session.conversationHistory || []
          });
        }
      } catch (error) {
        logger.error('Session restore error:', error);
      }
    });
  }

  handleMessages(socket) {
    socket.on('chat_message', async (data) => {
      try {
        // Check authentication
        if (!socket.sessionId || !socket.session) {
          socket.emit('chat_error', { error: 'Not authenticated' });
          return;
        }

        // Rate limiting
        if (this.checkRateLimit(socket.id)) {
          socket.emit('rate_limit_exceeded', {
            error: 'Too many messages',
            retryAfter: 60
          });
          return;
        }

        const { message, timestamp } = data;
        
        // Process message with AI
        const response = await chatService.processMessage(
          socket.session,
          message
        );

        // Update session
        socket.session.totalMessages = (socket.session.totalMessages || 0) + 1;
        socket.session.conversationHistory = response.conversationHistory;
        socket.session.identifiedNeeds = response.identifiedNeeds;
        socket.session.recommendedServices = response.recommendedServices;
        socket.session.completionRate = response.completionRate;
        await socket.session.save();

        // Update metrics
        this.metrics.totalMessages++;

        // Send response
        socket.emit('chat_response', {
          message: response.message,
          quickReplies: response.quickReplies,
          completionRate: response.completionRate,
          isComplete: response.isComplete,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error('Message processing error:', error);
        socket.emit('chat_error', {
          error: 'Failed to process message',
          retry: true
        });
      }
    });

    socket.on('message_ack', (data) => {
      const { messageId } = data;
      socket.emit('message_delivered', {
        messageId,
        timestamp: new Date().toISOString()
      });
    });
  }

  handleTyping(socket) {
    socket.on('typing_start', () => {
      if (socket.sessionId) {
        socket.to(`session:${socket.sessionId}`).emit('typing_indicator', {
          isTyping: true,
          userId: socket.id
        });
      }
    });

    socket.on('typing_stop', () => {
      if (socket.sessionId) {
        socket.to(`session:${socket.sessionId}`).emit('typing_indicator', {
          isTyping: false,
          userId: socket.id
        });
      }
    });
  }

  handleSession(socket) {
    socket.on('request_summary', async () => {
      try {
        if (!socket.session) {
          socket.emit('chat_error', { error: 'No session found' });
          return;
        }

        // Generate summary if needed
        if (!socket.session.executiveSummary) {
          const summary = await chatService.generateExecutiveSummary(socket.session);
          socket.session.executiveSummary = summary;
          socket.session.isComplete = true;
          socket.session.endTime = new Date();
          await socket.session.save();
        }

        socket.emit('session_summary', {
          summary: socket.session.executiveSummary,
          identifiedNeeds: socket.session.identifiedNeeds || [],
          recommendedServices: socket.session.recommendedServices || [],
          lead: socket.session.lead ? {
            email: socket.session.lead.email,
            organizationName: socket.session.lead.organizationName
          } : null
        });
      } catch (error) {
        logger.error('Summary generation error:', error);
        socket.emit('chat_error', { error: 'Failed to generate summary' });
      }
    });

    socket.on('end_session', async () => {
      try {
        if (socket.session) {
          socket.session.isComplete = true;
          socket.session.endTime = new Date();
          await socket.session.save();

          socket.emit('session_ended', {
            sessionId: socket.sessionId
          });

          // Clean up
          this.sessions.delete(socket.sessionId);
          this.metrics.activeSessions--;
        }
      } catch (error) {
        logger.error('Session end error:', error);
      }
    });
  }

  handleAnalytics(socket) {
    socket.on('request_analytics', () => {
      if (!socket.session) {
        return;
      }

      const duration = socket.session.startTime ? 
        Date.now() - new Date(socket.session.startTime).getTime() : 0;

      socket.emit('session_analytics', {
        duration,
        messageCount: socket.session.totalMessages || 0,
        completionRate: socket.session.completionRate || 0,
        identifiedNeeds: (socket.session.identifiedNeeds || []).length,
        recommendedServices: (socket.session.recommendedServices || []).length
      });
    });
  }

  handleConnection(socket) {
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      
      if (socket.sessionId) {
        this.sessions.delete(socket.sessionId);
        this.metrics.activeSessions--;
      }

      // Clean up rate limiter
      this.rateLimiters.delete(socket.id);
    });
  }

  handleErrors(socket) {
    socket.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  }

  checkRateLimit(socketId) {
    const now = Date.now();
    const limit = 10; // 10 messages per minute
    const window = 60000; // 1 minute

    if (!this.rateLimiters.has(socketId)) {
      this.rateLimiters.set(socketId, []);
    }

    const timestamps = this.rateLimiters.get(socketId);
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(ts => now - ts < window);
    
    if (validTimestamps.length >= limit) {
      return true; // Rate limit exceeded
    }

    validTimestamps.push(now);
    this.rateLimiters.set(socketId, validTimestamps);
    
    return false;
  }

  updateAgentStatus(status) {
    this.agentStatus = status;
    this.io.emit('agent_status', {
      status,
      timestamp: new Date().toISOString()
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      connectedClients: this.io.sockets.sockets.size,
      agentStatus: this.agentStatus
    };
  }

  broadcastToSession(sessionId, event, data) {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = WebSocketService;