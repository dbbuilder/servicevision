const { sequelize, Message, ChatSession, Lead } = require('../index');
const { ValidationError } = require('sequelize');

describe('Message Model', () => {
  let testLead;
  let testSession;

  beforeAll(async () => {
    // Create test lead
    testLead = await Lead.create({
      email: 'test@example.com',
      name: 'Test User',
      organizationName: 'Test Org',
      organizationType: 'for-profit',
      source: 'ai-chat'
    });

    // Create test chat session
    testSession = await ChatSession.create({
      leadId: testLead.id,
      sessionId: 'test-session-123',
      startTime: new Date()
    });
  });

  afterAll(async () => {
    // Clean up
    await Message.destroy({ where: {} });
    await ChatSession.destroy({ where: {} });
    await Lead.destroy({ where: {} });
  });

  describe('Message Creation', () => {
    test('should create a valid message', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'user',
        content: 'Hello, I need help with my business',
        timestamp: new Date()
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.chatSessionId).toBe(testSession.id);
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, I need help with my business');
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    test('should create assistant message with metadata', async () => {
      const metadata = {
        model: 'gpt-4',
        tokens: 150,
        completionTime: 1.2
      };

      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'I can help you with that. What specific area?',
        metadata,
        timestamp: new Date()
      });

      expect(message.role).toBe('assistant');
      expect(message.metadata).toEqual(metadata);
    });

    test('should create system message', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'system',
        content: 'Session started',
        timestamp: new Date()
      });

      expect(message.role).toBe('system');
      expect(message.isSystemMessage).toBe(true);
    });

    test('should require chatSessionId', async () => {
      await expect(Message.create({
        role: 'user',
        content: 'Test message'
      })).rejects.toThrow();
    });

    test('should require role', async () => {
      await expect(Message.create({
        chatSessionId: testSession.id,
        content: 'Test message'
      })).rejects.toThrow();
    });

    test('should require content', async () => {
      await expect(Message.create({
        chatSessionId: testSession.id,
        role: 'user'
      })).rejects.toThrow();
    });

    test('should validate role enum', async () => {
      await expect(Message.create({
        chatSessionId: testSession.id,
        role: 'invalid',
        content: 'Test'
      })).rejects.toThrow();
    });
  });

  describe('Message Properties', () => {
    test('should track delivery status', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'Your request has been processed',
        timestamp: new Date()
      });

      expect(message.isDelivered).toBe(false);
      expect(message.deliveredAt).toBeNull();

      // Mark as delivered
      await message.update({
        isDelivered: true,
        deliveredAt: new Date()
      });

      await message.reload();
      expect(message.isDelivered).toBe(true);
      expect(message.deliveredAt).toBeInstanceOf(Date);
    });

    test('should track read status', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'Please review this information',
        timestamp: new Date()
      });

      expect(message.isRead).toBe(false);
      expect(message.readAt).toBeNull();

      // Mark as read
      await message.markAsRead();

      expect(message.isRead).toBe(true);
      expect(message.readAt).toBeInstanceOf(Date);
    });

    test('should handle quick replies', async () => {
      const quickReplies = ['Yes', 'No', 'Tell me more'];

      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'Would you like to schedule a consultation?',
        quickReplies,
        timestamp: new Date()
      });

      expect(message.quickReplies).toEqual(quickReplies);
      expect(message.hasQuickReplies()).toBe(true);
    });

    test('should handle attachments', async () => {
      const attachments = [
        {
          type: 'document',
          url: 'https://example.com/proposal.pdf',
          name: 'Business Proposal',
          size: 1024000
        }
      ];

      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'I have attached a proposal for your review',
        attachments,
        timestamp: new Date()
      });

      expect(message.attachments).toEqual(attachments);
      expect(message.hasAttachments()).toBe(true);
    });
  });

  describe('Message Associations', () => {
    test('should belong to a chat session', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      const session = await message.getChatSession();
      expect(session).toBeDefined();
      expect(session.id).toBe(testSession.id);
    });

    test('should access lead through chat session', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      const session = await message.getChatSession({
        include: [{ model: Lead, as: 'lead' }]
      });
      
      expect(session.lead).toBeDefined();
      expect(session.lead.email).toBe('test@example.com');
    });
  });

  describe('Message Queries', () => {
    beforeEach(async () => {
      // Clear messages
      await Message.destroy({ where: {} });

      // Create test messages
      await Message.bulkCreate([
        {
          chatSessionId: testSession.id,
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2024-01-27T10:00:00Z')
        },
        {
          chatSessionId: testSession.id,
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date('2024-01-27T10:00:30Z')
        },
        {
          chatSessionId: testSession.id,
          role: 'user',
          content: 'I need help',
          timestamp: new Date('2024-01-27T10:01:00Z')
        },
        {
          chatSessionId: testSession.id,
          role: 'assistant',
          content: 'How can I help?',
          timestamp: new Date('2024-01-27T10:01:30Z'),
          isDelivered: true,
          deliveredAt: new Date('2024-01-27T10:01:31Z')
        }
      ]);
    });

    test('should get messages by session', async () => {
      const messages = await Message.findAll({
        where: { chatSessionId: testSession.id },
        order: [['timestamp', 'ASC']]
      });

      expect(messages).toHaveLength(4);
      expect(messages[0].content).toBe('Hello');
      expect(messages[3].content).toBe('How can I help?');
    });

    test('should get undelivered messages', async () => {
      const undelivered = await Message.findAll({
        where: {
          chatSessionId: testSession.id,
          isDelivered: false
        }
      });

      expect(undelivered).toHaveLength(3);
    });

    test('should get messages by role', async () => {
      const userMessages = await Message.findAll({
        where: {
          chatSessionId: testSession.id,
          role: 'user'
        }
      });

      expect(userMessages).toHaveLength(2);
      expect(userMessages.every(m => m.role === 'user')).toBe(true);
    });

    test('should paginate messages', async () => {
      const page1 = await Message.findAll({
        where: { chatSessionId: testSession.id },
        order: [['timestamp', 'DESC']],
        limit: 2,
        offset: 0
      });

      expect(page1).toHaveLength(2);
      expect(page1[0].content).toBe('How can I help?');

      const page2 = await Message.findAll({
        where: { chatSessionId: testSession.id },
        order: [['timestamp', 'DESC']],
        limit: 2,
        offset: 2
      });

      expect(page2).toHaveLength(2);
      expect(page2[0].content).toBe('Hi there!');
    });
  });

  describe('Message Methods', () => {
    test('should mark message as read', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'Important information',
        timestamp: new Date()
      });

      expect(message.isRead).toBe(false);

      await message.markAsRead();

      expect(message.isRead).toBe(true);
      expect(message.readAt).toBeInstanceOf(Date);
    });

    test('should mark message as delivered', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'Your message',
        timestamp: new Date()
      });

      expect(message.isDelivered).toBe(false);

      await message.markAsDelivered();

      expect(message.isDelivered).toBe(true);
      expect(message.deliveredAt).toBeInstanceOf(Date);
    });

    test('should get conversation context', async () => {
      // Create a conversation
      await Message.destroy({ where: {} });
      
      const messages = [];
      for (let i = 0; i < 10; i++) {
        messages.push({
          chatSessionId: testSession.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(Date.now() + i * 60000)
        });
      }
      
      await Message.bulkCreate(messages);

      // Get middle message
      const middleMessage = await Message.findOne({
        where: { content: 'Message 5' }
      });

      const context = await middleMessage.getConversationContext(2);

      expect(context.before).toHaveLength(2);
      expect(context.after).toHaveLength(2);
      expect(context.before[0].content).toBe('Message 3');
      expect(context.after[1].content).toBe('Message 7');
    });
  });

  describe('Message Validation', () => {
    test('should validate content length', async () => {
      const longContent = 'a'.repeat(10001);

      await expect(Message.create({
        chatSessionId: testSession.id,
        role: 'user',
        content: longContent,
        timestamp: new Date()
      })).rejects.toThrow();
    });

    test('should validate metadata structure', async () => {
      const message = await Message.create({
        chatSessionId: testSession.id,
        role: 'assistant',
        content: 'Test',
        metadata: {
          custom: 'data',
          nested: {
            value: 123
          }
        },
        timestamp: new Date()
      });

      expect(message.metadata.custom).toBe('data');
      expect(message.metadata.nested.value).toBe(123);
    });
  });
});