import { describe, test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from '../chat';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('Chat Store', () => {
  let store;

  beforeEach(() => {
    // Create a fresh Pinia instance before each test
    setActivePinia(createPinia());
    store = useChatStore();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should initialize with default values', () => {
      expect(store.isOpen).toBe(false);
      expect(store.messages).toEqual([]);
      expect(store.sessionId).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.quickReplies).toEqual([]);
      expect(store.userEmail).toBeNull();
      expect(store.isQualified).toBe(false);
    });
  });

  describe('Actions', () => {
    describe('openChat', () => {
      test('should open chat and initialize session', async () => {
        const mockResponse = {
          data: {
            sessionId: 'test-session-123',
            welcomeMessage: 'Hello! How can I help you today?'
          }
        };
        axios.post.mockResolvedValue(mockResponse);

        await store.openChat();

        expect(store.isOpen).toBe(true);
        expect(store.sessionId).toBe('test-session-123');
        expect(axios.post).toHaveBeenCalledWith('/api/chat/start');
        expect(store.messages).toHaveLength(1);
        expect(store.messages[0]).toMatchObject({
          id: expect.any(String),
          text: 'Hello! How can I help you today?',
          sender: 'assistant',
          timestamp: expect.any(Date)
        });
      });

      test('should handle session initialization error', async () => {
        axios.post.mockRejectedValue(new Error('Network error'));

        await store.openChat();

        expect(store.isOpen).toBe(true);
        expect(store.sessionId).toMatch(/^local-/); // Fallback to local session
        expect(store.messages).toHaveLength(1);
        expect(store.messages[0].text).toContain('How can I help you');
      });
    });

    describe('closeChat', () => {
      test('should close chat and reset state', () => {
        // Set some state first
        store.isOpen = true;
        store.messages = [{ id: '1', text: 'Test', sender: 'user' }];
        store.quickReplies = ['Reply 1', 'Reply 2'];

        store.closeChat();

        expect(store.isOpen).toBe(false);
        expect(store.messages).toEqual([]);
        expect(store.quickReplies).toEqual([]);
      });

      test('should preserve session ID when closing', () => {
        store.sessionId = 'test-session-123';
        store.closeChat();
        expect(store.sessionId).toBe('test-session-123');
      });
    });

    describe('sendMessage', () => {
      beforeEach(() => {
        store.sessionId = 'test-session-123';
      });

      test('should send user message and receive AI response', async () => {
        const userMessage = 'I need help with AI consulting';
        const mockResponse = {
          data: {
            reply: 'I can definitely help you with AI consulting. What specific area are you interested in?',
            quickReplies: ['Strategy', 'Implementation', 'Training'],
            isQualified: false
          }
        };
        axios.post.mockResolvedValue(mockResponse);

        await store.sendMessage(userMessage);

        // Check user message was added
        expect(store.messages).toContainEqual(
          expect.objectContaining({
            text: userMessage,
            sender: 'user'
          })
        );

        // Check API call
        expect(axios.post).toHaveBeenCalledWith('/api/chat/message', {
          sessionId: 'test-session-123',
          message: userMessage
        });

        // Check AI response was added
        expect(store.messages).toContainEqual(
          expect.objectContaining({
            text: mockResponse.data.reply,
            sender: 'assistant'
          })
        );

        // Check quick replies were set
        expect(store.quickReplies).toEqual(['Strategy', 'Implementation', 'Training']);
      });

      test('should handle email capture flow', async () => {
        const mockResponse = {
          data: {
            reply: 'Great! To continue, I\'ll need your email address.',
            requiresEmail: true,
            quickReplies: []
          }
        };
        axios.post.mockResolvedValue(mockResponse);

        await store.sendMessage('I\'m interested in your services');

        expect(store.messages[store.messages.length - 1]).toMatchObject({
          sender: 'assistant',
          requiresEmail: true
        });
      });

      test('should update qualification status', async () => {
        const mockResponse = {
          data: {
            reply: 'Excellent! Based on our conversation, I think we can really help you.',
            isQualified: true,
            quickReplies: ['Schedule a call', 'Learn more']
          }
        };
        axios.post.mockResolvedValue(mockResponse);

        await store.sendMessage('We have a budget of $50k');

        expect(store.isQualified).toBe(true);
      });

      test('should handle send errors gracefully', async () => {
        axios.post.mockRejectedValue(new Error('Network error'));

        await store.sendMessage('Test message');

        // Should add error message
        expect(store.messages[store.messages.length - 1]).toMatchObject({
          sender: 'assistant',
          text: expect.stringContaining('apologize'),
          isError: true
        });
      });

      test('should prevent sending when loading', async () => {
        store.isLoading = true;
        
        await store.sendMessage('Test message');
        
        expect(axios.post).not.toHaveBeenCalled();
      });

      test('should prevent sending without session', async () => {
        store.sessionId = null;
        
        await store.sendMessage('Test message');
        
        expect(axios.post).not.toHaveBeenCalled();
      });
    });

    describe('submitEmail', () => {
      beforeEach(() => {
        store.sessionId = 'test-session-123';
      });

      test('should submit email and create lead', async () => {
        const email = 'test@example.com';
        const mockResponse = {
          data: {
            success: true,
            leadId: 'lead-123',
            message: 'Thank you! I\'ve saved your contact information.'
          }
        };
        axios.post.mockResolvedValue(mockResponse);

        await store.submitEmail(email);

        expect(store.userEmail).toBe(email);
        expect(axios.post).toHaveBeenCalledWith('/api/leads', {
          sessionId: 'test-session-123',
          email: email
        });

        // Should add confirmation message
        expect(store.messages[store.messages.length - 1]).toMatchObject({
          sender: 'assistant',
          text: expect.stringContaining('Thank you')
        });
      });

      test('should validate email format', async () => {
        await store.submitEmail('invalid-email');

        expect(axios.post).not.toHaveBeenCalled();
        expect(store.messages[store.messages.length - 1]).toMatchObject({
          sender: 'assistant',
          text: expect.stringContaining('valid email'),
          isError: true
        });
      });

      test('should handle email submission error', async () => {
        axios.post.mockRejectedValue(new Error('Server error'));

        await store.submitEmail('test@example.com');

        expect(store.messages[store.messages.length - 1]).toMatchObject({
          sender: 'assistant',
          text: expect.stringContaining('error'),
          isError: true
        });
      });
    });

    describe('selectQuickReply', () => {
      test('should send quick reply as message', async () => {
        store.sessionId = 'test-session-123';
        store.quickReplies = ['Option 1', 'Option 2'];
        
        const mockResponse = {
          data: {
            reply: 'You selected Option 1. Let me help you with that.',
            quickReplies: []
          }
        };
        axios.post.mockResolvedValue(mockResponse);

        await store.selectQuickReply('Option 1');

        expect(store.quickReplies).toEqual([]); // Should clear quick replies
        expect(axios.post).toHaveBeenCalledWith('/api/chat/message', {
          sessionId: 'test-session-123',
          message: 'Option 1'
        });
      });
    });

    describe('addMessage', () => {
      test('should add message with proper structure', () => {
        const text = 'Test message';
        const sender = 'user';

        store.addMessage(text, sender);

        expect(store.messages).toHaveLength(1);
        expect(store.messages[0]).toMatchObject({
          id: expect.any(String),
          text,
          sender,
          timestamp: expect.any(Date)
        });
      });

      test('should generate unique IDs for messages', () => {
        store.addMessage('Message 1', 'user');
        store.addMessage('Message 2', 'assistant');

        expect(store.messages[0].id).not.toBe(store.messages[1].id);
      });
    });
  });

  describe('Getters', () => {
    test('hasActiveSession should return true when sessionId exists', () => {
      expect(store.hasActiveSession).toBe(false);
      
      store.sessionId = 'test-123';
      expect(store.hasActiveSession).toBe(true);
    });

    test('messageCount should return number of messages', () => {
      expect(store.messageCount).toBe(0);
      
      store.addMessage('Test 1', 'user');
      store.addMessage('Test 2', 'assistant');
      
      expect(store.messageCount).toBe(2);
    });

    test('lastMessage should return the most recent message', () => {
      expect(store.lastMessage).toBeNull();
      
      store.addMessage('First', 'user');
      store.addMessage('Second', 'assistant');
      
      expect(store.lastMessage.text).toBe('Second');
    });

    test('isWaitingForEmail should detect email prompt', () => {
      expect(store.isWaitingForEmail).toBe(false);
      
      store.messages.push({
        id: '1',
        sender: 'assistant',
        text: 'Please provide your email',
        requiresEmail: true,
        timestamp: new Date()
      });
      
      expect(store.isWaitingForEmail).toBe(true);
      
      // Should be false after email is provided
      store.userEmail = 'test@example.com';
      expect(store.isWaitingForEmail).toBe(false);
    });
  });

  describe('Persistence', () => {
    test('should save session to localStorage', () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      
      store.sessionId = 'test-123';
      store.userEmail = 'test@example.com';
      store.saveSession();
      
      expect(mockSetItem).toHaveBeenCalledWith(
        'chat_session',
        expect.stringContaining('test-123')
      );
    });

    test('should restore session from localStorage', () => {
      const sessionData = {
        sessionId: 'restored-123',
        userEmail: 'restored@example.com',
        isQualified: true
      };
      
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify(sessionData)
      );
      
      store.restoreSession();
      
      expect(store.sessionId).toBe('restored-123');
      expect(store.userEmail).toBe('restored@example.com');
      expect(store.isQualified).toBe(true);
    });
  });
});