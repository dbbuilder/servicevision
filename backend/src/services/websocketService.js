const { ChatSession, Lead, Message, sequelize } = require('../models');
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

        // Store session info - keep the Sequelize instance for now
        socket.sessionId = sessionId;
        socket.session = session; // Keep as Sequelize instance
        // Ensure we have the database ID - use dataValues if needed
        socket.sessionDbId = session.id || session.dataValues?.id;
        
        if (!socket.sessionDbId) {
          logger.error('Failed to get session database ID', {
            sessionId,
            hasId: !!session.id,
            hasDataValues: !!session.dataValues,
            dataValuesId: session.dataValues?.id
          });
          socket.emit('authentication_failed', { error: 'Session initialization error' });
          return;
        }
        
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
          where: { sessionId },
          include: [{
            model: Message,
            as: 'chatMessages',
            order: [['timestamp', 'ASC']]
          }]
        });

        if (session) {
          socket.sessionId = sessionId;
          socket.session = session;
          this.sessions.set(sessionId, { socket, session });
          socket.join(`session:${sessionId}`);

          // Convert messages to conversation history format
          const conversationHistory = (session.chatMessages || []).map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            quickReplies: msg.quickReplies,
            isDelivered: msg.isDelivered,
            isRead: msg.isRead
          }));

          socket.emit('session_restored', {
            conversationHistory
          });
          
          // Mark unread messages as delivered
          const undeliveredMessages = session.messages.filter(m => !m.isDelivered);
          for (const msg of undeliveredMessages) {
            await msg.markAsDelivered();
          }
        }
      } catch (error) {
        logger.error('Session restore error:', error);
      }
    });
  }

  handleMessages(socket) {
    // Handle start_chat event
    socket.on('start_chat', async () => {
      try {
        if (!socket.sessionId || !socket.session) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const message = await chatService.getInitialMessage(
          socket.session.lead,
          socket.session
        );

        // Send as a message event
        socket.emit('message', {
          id: Date.now(),
          content: message,
          sender: 'assistant',
          timestamp: new Date()
        });

      } catch (error) {
        logger.error('Start chat error:', error);
        socket.emit('error', { error: 'Failed to start chat' });
      }
    });

    // Handle message event (alias for chat_message)
    socket.on('message', async (data) => {
      // Forward to chat_message handler, ensuring compatibility
      const messageData = {
        message: data.content || data.message,
        timestamp: data.timestamp || new Date()
      };
      socket.listeners('chat_message')[0](messageData);
    });

    // Handle quick reply
    socket.on('quick_reply', async (data) => {
      try {
        const { reply } = data;
        // Process quick reply as a message
        socket.listeners('chat_message')[0]({ message: reply, timestamp: new Date() });
      } catch (error) {
        logger.error('Quick reply error:', error);
        socket.emit('error', { error: 'Failed to process quick reply' });
      }
    });

    socket.on('chat_message', async (data) => {
      try {
        // Check authentication
        if (!socket.sessionId || !socket.session) {
          socket.emit('chat_error', { error: 'Not authenticated' });
          return;
        }
        
        // Ensure session has ID
        if (!socket.sessionDbId) {
          logger.error('Session missing database ID', { 
            sessionId: socket.sessionId,
            sessionDbId: socket.sessionDbId,
            hasSession: !!socket.session
          });
          socket.emit('chat_error', { error: 'Session configuration error' });
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
        
        
        // Save user message
        const userMessage = await Message.create({
          chatSessionId: socket.sessionDbId,
          role: 'user',
          content: message,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        });
        
        // Process message with AI
        const response = await chatService.processMessage(
          socket.session,
          message
        );

        // Save assistant response
        const assistantMessage = await Message.create({
          chatSessionId: socket.sessionDbId,
          role: 'assistant',
          content: response.message,
          quickReplies: response.quickReplies || [],
          metadata: {
            completionRate: response.completionRate,
            processingTime: Date.now() - new Date(userMessage.timestamp).getTime()
          },
          timestamp: new Date()
        });

        // Update session - update fields directly using update method to avoid save issues
        try {
          await ChatSession.update({
            totalMessages: sequelize.literal('total_messages + 2'),
            conversationHistory: response.conversationHistory,
            identifiedNeeds: response.identifiedNeeds,
            recommendedServices: response.recommendedServices,
            completionRate: response.completionRate
          }, {
            where: { id: socket.sessionDbId }
          });
        } catch (updateError) {
          logger.error('Failed to update session:', updateError);
        }

        // Update metrics
        this.metrics.totalMessages += 2;

        // Send response with message ID
        socket.emit('message', {
          id: assistantMessage.id,
          content: response.message,
          sender: 'assistant',
          quickReplies: response.quickReplies,
          completionRate: response.completionRate,
          isComplete: response.isComplete,
          timestamp: assistantMessage.timestamp.toISOString()
        });
        
        // Mark assistant message as delivered
        await assistantMessage.markAsDelivered();

      } catch (error) {
        logger.error('Message processing error:', error);
        logger.error('Error stack:', error.stack);
        logger.error('Error details:', {
          message: error.message,
          code: error.code,
          sessionDbId: socket.sessionDbId,
          sessionId: socket.sessionId,
          hasSession: !!socket.session
        });
        socket.emit('chat_error', {
          error: 'Failed to process message',
          retry: true
        });
      }
    });

    socket.on('message_ack', async (data) => {
      const { messageId } = data;
      
      try {
        // Update message delivery status
        const message = await Message.findByPk(messageId);
        if (message) {
          await message.markAsDelivered();
        }
        
        socket.emit('message_delivered', {
          messageId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error acknowledging message:', error);
      }
    });

    socket.on('message_read', async (data) => {
      const { messageId } = data;
      
      try {
        // Update message read status
        const message = await Message.findByPk(messageId);
        if (message) {
          await message.markAsRead();
        }
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
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