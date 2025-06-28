const chatService = require('./chatService');
const quickReplyService = require('./quickReplyService');
const { ChatSession, Message } = require('../models');
const logger = require('../utils/logger');

class ChatWebSocketHandler {
  constructor(io, websocketService) {
    this.io = io;
    this.websocketService = websocketService;
  }

  /**
   * Handle chat-specific WebSocket events
   */
  handleChatEvents(socket) {
    // Handle authentication
    socket.on('authenticate', async (data) => {
      try {
        const { sessionId } = data;
        
        if (!sessionId) {
          socket.emit('auth_error', { error: 'Session ID required' });
          return;
        }

        // Find session
        const session = await ChatSession.findOne({
          where: { sessionId },
          include: ['lead']
        });

        if (!session) {
          socket.emit('auth_error', { error: 'Invalid session' });
          return;
        }

        // Store session info on socket
        socket.sessionId = sessionId;
        socket.chatSession = session;
        socket.join(`session:${sessionId}`);

        socket.emit('authenticated', {
          success: true,
          sessionId,
          lead: session.lead
        });

      } catch (error) {
        logger.error('Authentication error:', error);
        socket.emit('auth_error', { error: 'Authentication failed' });
      }
    });

    // Handle start chat
    socket.on('start_chat', async () => {
      try {
        if (!socket.chatSession) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const message = await chatService.getInitialMessage(
          socket.chatSession.lead,
          socket.chatSession
        );

        // Save message
        await Message.create({
          chatSessionId: socket.sessionId,
          sender: 'assistant',
          content: message,
          timestamp: new Date()
        });

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

    // Handle incoming messages
    socket.on('message', async (data) => {
      try {
        if (!socket.chatSession) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const { content } = data;
        
        // Save user message
        await Message.create({
          chatSessionId: socket.sessionId,
          sender: 'user',
          content,
          timestamp: new Date()
        });

        // Process message
        const response = await chatService.processMessage(
          socket.chatSession,
          content
        );

        // Update session
        socket.chatSession.conversationHistory = response.conversationHistory;
        socket.chatSession.identifiedNeeds = response.identifiedNeeds;
        socket.chatSession.recommendedServices = response.recommendedServices;
        socket.chatSession.completionRate = response.completionRate;
        socket.chatSession.state = response.state || socket.chatSession.state;
        await socket.chatSession.save();

        // Save assistant message
        await Message.create({
          chatSessionId: socket.sessionId,
          sender: 'assistant',
          content: response.message,
          timestamp: new Date()
        });

        // Send response
        socket.emit('message', {
          id: Date.now(),
          content: response.message,
          sender: 'assistant',
          quickReplies: response.quickReplies,
          completionRate: response.completionRate,
          timestamp: new Date()
        });

        // Check for rate limiting
        if (response.message.includes('slow down')) {
          socket.emit('rate_limited', { 
            message: 'Please wait before sending more messages' 
          });
        }

      } catch (error) {
        logger.error('Message handling error:', error);
        socket.emit('error', { error: 'Failed to process message' });
      }
    });

    // Handle quick reply selection
    socket.on('quick_reply', async (data) => {
      try {
        if (!socket.chatSession) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const { reply } = data;
        
        // Process quick reply as a message
        socket.emit('message', { content: reply });

      } catch (error) {
        logger.error('Quick reply error:', error);
        socket.emit('error', { error: 'Failed to process quick reply' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.sessionId) {
        logger.info('Client disconnected from chat', { sessionId: socket.sessionId });
      }
    });
  }
}

module.exports = ChatWebSocketHandler;