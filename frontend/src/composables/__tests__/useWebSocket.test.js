import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useWebSocket } from '../useWebSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn()
  }))
}));

// Mock stores
vi.mock('@/stores/chat', () => ({
  useChatStore: vi.fn(() => ({
    currentSessionId: ref('test-session-123'),
    addMessage: vi.fn(),
    updateTypingStatus: vi.fn(),
    setConnectionStatus: vi.fn()
  }))
}));

vi.mock('@/stores/ui', () => ({
  useUIStore: vi.fn(() => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn()
  }))
}));

describe('useWebSocket Composable', () => {
  let mockSocket;
  let websocket;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get mock socket instance
    mockSocket = io();
    
    // Create websocket instance
    websocket = useWebSocket();
  });

  afterEach(() => {
    websocket.disconnect();
  });

  describe('Connection Management', () => {
    test('should connect to WebSocket server', () => {
      websocket.connect();
      
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        })
      );
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    test('should handle connection success', () => {
      websocket.connect();
      
      // Get the connect handler
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      // Trigger connect event
      connectHandler();
      
      expect(websocket.connected.value).toBe(true);
      expect(websocket.connectionError.value).toBeNull();
    });

    test('should authenticate on connection', () => {
      const chatStore = websocket.chatStore;
      chatStore.currentSessionId.value = 'test-session-123';
      
      websocket.connect();
      
      // Trigger connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', {
        sessionId: 'test-session-123'
      });
    });

    test('should handle authentication success', () => {
      websocket.connect();
      
      // Get the authenticated handler
      const authHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'authenticated'
      )[1];
      
      // Trigger authenticated event
      authHandler({ success: true, sessionId: 'test-session-123' });
      
      expect(websocket.authenticated.value).toBe(true);
    });

    test('should handle authentication failure', () => {
      const uiStore = websocket.uiStore;
      websocket.connect();
      
      // Get the auth failed handler
      const authFailHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'authentication_failed'
      )[1];
      
      // Trigger auth failed event
      authFailHandler({ error: 'Invalid session' });
      
      expect(websocket.authenticated.value).toBe(false);
      expect(uiStore.showError).toHaveBeenCalledWith('Authentication failed: Invalid session');
    });

    test('should handle disconnection', () => {
      websocket.connect();
      websocket.connected.value = true;
      
      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      // Trigger disconnect event
      disconnectHandler('transport close');
      
      expect(websocket.connected.value).toBe(false);
      expect(websocket.authenticated.value).toBe(false);
    });

    test('should handle connection errors', () => {
      const uiStore = websocket.uiStore;
      websocket.connect();
      
      // Get the error handler
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];
      
      // Trigger error event
      const error = new Error('Connection failed');
      errorHandler(error);
      
      expect(websocket.connectionError.value).toBe(error.message);
      expect(uiStore.showError).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    test('should send chat message', () => {
      websocket.connect();
      websocket.authenticated.value = true;
      
      const message = 'Hello AI';
      websocket.sendMessage(message);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('chat_message', {
        message,
        timestamp: expect.any(String)
      });
    });

    test('should not send message if not authenticated', () => {
      const uiStore = websocket.uiStore;
      websocket.connect();
      websocket.authenticated.value = false;
      
      websocket.sendMessage('Hello');
      
      expect(mockSocket.emit).not.toHaveBeenCalledWith('chat_message', expect.any(Object));
      expect(uiStore.showWarning).toHaveBeenCalledWith('Not connected to chat server');
    });

    test('should handle incoming chat response', () => {
      const chatStore = websocket.chatStore;
      websocket.connect();
      
      // Get the chat response handler
      const responseHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'chat_response'
      )[1];
      
      // Trigger chat response
      const response = {
        message: 'AI response',
        quickReplies: ['Yes', 'No'],
        completionRate: 0.5,
        isComplete: false
      };
      responseHandler(response);
      
      expect(chatStore.addMessage).toHaveBeenCalledWith({
        content: 'AI response',
        role: 'assistant',
        quickReplies: ['Yes', 'No'],
        timestamp: expect.any(Date)
      });
    });

    test('should handle chat errors', () => {
      const uiStore = websocket.uiStore;
      websocket.connect();
      
      // Get the error handler
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'chat_error'
      )[1];
      
      // Trigger error
      errorHandler({ error: 'Failed to process message', retry: true });
      
      expect(uiStore.showError).toHaveBeenCalledWith('Chat error: Failed to process message');
    });
  });

  describe('Typing Indicators', () => {
    test('should send typing start', () => {
      websocket.connect();
      websocket.authenticated.value = true;
      
      websocket.startTyping();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('typing_start');
    });

    test('should send typing stop', () => {
      websocket.connect();
      websocket.authenticated.value = true;
      
      websocket.stopTyping();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('typing_stop');
    });

    test('should handle incoming typing indicators', () => {
      const chatStore = websocket.chatStore;
      websocket.connect();
      
      // Get the typing handler
      const typingHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'typing_indicator'
      )[1];
      
      // Trigger typing indicator
      typingHandler({ isTyping: true, userId: 'agent-1' });
      
      expect(chatStore.updateTypingStatus).toHaveBeenCalledWith(true);
    });

    test('should debounce typing stop', async () => {
      vi.useFakeTimers();
      
      websocket.connect();
      websocket.authenticated.value = true;
      
      // Call multiple times quickly
      websocket.onUserTyping();
      websocket.onUserTyping();
      websocket.onUserTyping();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('typing_start');
      expect(mockSocket.emit).toHaveBeenCalledTimes(2); // authenticate + typing_start
      
      // Fast forward past debounce delay
      vi.advanceTimersByTime(2000);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('typing_stop');
      
      vi.useRealTimers();
    });
  });

  describe('Session Management', () => {
    test('should request session summary', () => {
      websocket.connect();
      websocket.authenticated.value = true;
      
      websocket.requestSummary();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('request_summary');
    });

    test('should handle session summary response', async () => {
      websocket.connect();
      
      // Get the summary handler
      const summaryHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'session_summary'
      )[1];
      
      // Create promise to test
      const summaryPromise = websocket.requestSummary();
      
      // Trigger summary response
      const summary = {
        summary: 'Executive summary content',
        identifiedNeeds: ['Need 1', 'Need 2'],
        recommendedServices: ['Service 1']
      };
      summaryHandler(summary);
      
      const result = await summaryPromise;
      expect(result).toEqual(summary);
    });

    test('should end session', () => {
      websocket.connect();
      websocket.authenticated.value = true;
      
      websocket.endSession();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('end_session');
    });

    test('should handle session ended event', () => {
      const chatStore = websocket.chatStore;
      websocket.connect();
      
      // Get the session ended handler
      const endedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'session_ended'
      )[1];
      
      // Trigger session ended
      endedHandler({ sessionId: 'test-session-123' });
      
      expect(chatStore.setConnectionStatus).toHaveBeenCalledWith('ended');
    });
  });

  describe('Analytics and Monitoring', () => {
    test('should request analytics', () => {
      websocket.connect();
      websocket.authenticated.value = true;
      
      websocket.requestAnalytics();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('request_analytics');
    });

    test('should handle analytics response', async () => {
      websocket.connect();
      
      // Get the analytics handler
      const analyticsHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'session_analytics'
      )[1];
      
      // Create promise to test
      const analyticsPromise = websocket.requestAnalytics();
      
      // Trigger analytics response
      const analytics = {
        duration: 300000,
        messageCount: 10,
        completionRate: 0.8
      };
      analyticsHandler(analytics);
      
      const result = await analyticsPromise;
      expect(result).toEqual(analytics);
    });

    test('should send ping for connection monitoring', () => {
      websocket.connect();
      websocket.authenticated.value = true;
      
      websocket.ping();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('ping');
    });

    test('should handle pong response', () => {
      websocket.connect();
      
      // Get the pong handler
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];
      
      // Record initial time
      const startTime = Date.now();
      websocket.lastPingTime = startTime;
      
      // Trigger pong
      pongHandler({ timestamp: new Date().toISOString() });
      
      expect(websocket.latency.value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Agent Status', () => {
    test('should handle agent status updates', () => {
      websocket.connect();
      
      // Get the agent status handler
      const statusHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'agent_status'
      )[1];
      
      // Trigger status update
      statusHandler({ status: 'online', timestamp: new Date().toISOString() });
      
      expect(websocket.agentStatus.value).toBe('online');
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limit exceeded', () => {
      const uiStore = websocket.uiStore;
      websocket.connect();
      
      // Get the rate limit handler
      const rateLimitHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'rate_limit_exceeded'
      )[1];
      
      // Trigger rate limit
      rateLimitHandler({ error: 'Too many messages', retryAfter: 60 });
      
      expect(uiStore.showWarning).toHaveBeenCalledWith(
        'Too many messages. Please wait 60 seconds before sending another message.'
      );
    });
  });

  describe('Cleanup', () => {
    test('should disconnect and cleanup on unmount', () => {
      websocket.connect();
      
      websocket.disconnect();
      
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});