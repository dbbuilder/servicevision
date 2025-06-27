// WebSocket Composable
// Manages real-time WebSocket connection for chat functionality

import { ref, computed, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { useChatStore } from '@/stores/chat';
import { useUIStore } from '@/stores/ui';

export function useWebSocket() {
  // Stores
  const chatStore = useChatStore();
  const uiStore = useUIStore();

  // Connection state
  const socket = ref(null);
  const connected = ref(false);
  const authenticated = ref(false);
  const connectionError = ref(null);
  const reconnectAttempts = ref(0);
  
  // Metrics
  const latency = ref(0);
  const lastPingTime = ref(0);
  const agentStatus = ref('offline');

  // Typing state
  let typingTimeout = null;
  const isTyping = ref(false);

  // Promise resolvers for request/response patterns
  const pendingRequests = new Map();

  // WebSocket URL
  const wsUrl = computed(() => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return baseUrl.replace(/^http/, 'ws');
  });

  // Connect to WebSocket server
  function connect() {
    if (socket.value?.connected) {
      return;
    }

    socket.value = io(wsUrl.value, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    setupEventHandlers();
    socket.value.connect();
  }

  // Setup all event handlers
  function setupEventHandlers() {
    if (!socket.value) return;

    // Connection events
    socket.value.on('connect', handleConnect);
    socket.value.on('disconnect', handleDisconnect);
    socket.value.on('connect_error', handleConnectError);
    
    // Authentication events
    socket.value.on('authenticated', handleAuthenticated);
    socket.value.on('authentication_failed', handleAuthenticationFailed);
    socket.value.on('session_restored', handleSessionRestored);
    
    // Chat events
    socket.value.on('chat_response', handleChatResponse);
    socket.value.on('chat_error', handleChatError);
    socket.value.on('typing_indicator', handleTypingIndicator);
    socket.value.on('message_delivered', handleMessageDelivered);
    
    // Session events
    socket.value.on('session_summary', handleSessionSummary);
    socket.value.on('session_ended', handleSessionEnded);
    socket.value.on('session_analytics', handleSessionAnalytics);
    
    // System events
    socket.value.on('agent_status', handleAgentStatus);
    socket.value.on('rate_limit_exceeded', handleRateLimitExceeded);
    socket.value.on('pong', handlePong);
  }

  // Connection handlers
  function handleConnect() {
    connected.value = true;
    connectionError.value = null;
    reconnectAttempts.value = 0;
    chatStore.setConnectionStatus('connected');
    
    // Authenticate if we have a session
    if (chatStore.currentSessionId) {
      socket.value.emit('authenticate', {
        sessionId: chatStore.currentSessionId
      });
    }
  }

  function handleDisconnect(reason) {
    connected.value = false;
    authenticated.value = false;
    chatStore.setConnectionStatus('disconnected');
    
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, try to reconnect
      socket.value.connect();
    }
  }

  function handleConnectError(error) {
    connectionError.value = error.message;
    reconnectAttempts.value++;
    uiStore.showError(`Connection error: ${error.message}`);
  }

  // Authentication handlers
  function handleAuthenticated(data) {
    authenticated.value = true;
    chatStore.setConnectionStatus('authenticated');
    uiStore.showSuccess('Connected to chat server');
  }

  function handleAuthenticationFailed(data) {
    authenticated.value = false;
    uiStore.showError(`Authentication failed: ${data.error}`);
  }

  function handleSessionRestored(data) {
    authenticated.value = true;
    if (data.conversationHistory) {
      chatStore.restoreConversation(data.conversationHistory);
    }
  }

  // Chat message handlers
  function handleChatResponse(data) {
    chatStore.addMessage({
      content: data.message,
      role: 'assistant',
      quickReplies: data.quickReplies,
      timestamp: new Date()
    });
    
    if (data.completionRate !== undefined) {
      chatStore.updateCompletionRate(data.completionRate);
    }
    
    if (data.isComplete) {
      chatStore.markSessionComplete();
    }
  }

  function handleChatError(data) {
    uiStore.showError(`Chat error: ${data.error}`);
    
    if (data.retry) {
      // Could implement retry logic here
    }
  }

  function handleTypingIndicator(data) {
    chatStore.updateTypingStatus(data.isTyping);
  }

  function handleMessageDelivered(data) {
    chatStore.markMessageDelivered(data.messageId);
  }

  // Session handlers
  function handleSessionSummary(data) {
    const requestId = 'summary';
    const resolver = pendingRequests.get(requestId);
    if (resolver) {
      resolver(data);
      pendingRequests.delete(requestId);
    }
  }

  function handleSessionEnded(data) {
    chatStore.setConnectionStatus('ended');
    authenticated.value = false;
  }

  function handleSessionAnalytics(data) {
    const requestId = 'analytics';
    const resolver = pendingRequests.get(requestId);
    if (resolver) {
      resolver(data);
      pendingRequests.delete(requestId);
    }
  }

  // System handlers
  function handleAgentStatus(data) {
    agentStatus.value = data.status;
  }

  function handleRateLimitExceeded(data) {
    uiStore.showWarning(
      `Too many messages. Please wait ${data.retryAfter} seconds before sending another message.`
    );
  }

  function handlePong(data) {
    if (lastPingTime.value) {
      latency.value = Date.now() - lastPingTime.value;
    }
  }

  // Public methods
  function sendMessage(message) {
    if (!authenticated.value || !socket.value?.connected) {
      uiStore.showWarning('Not connected to chat server');
      return;
    }

    socket.value.emit('chat_message', {
      message,
      timestamp: new Date().toISOString()
    });
    
    // Add user message to store
    chatStore.addMessage({
      content: message,
      role: 'user',
      timestamp: new Date()
    });
  }

  function startTyping() {
    if (!authenticated.value) return;
    
    if (!isTyping.value) {
      isTyping.value = true;
      socket.value.emit('typing_start');
    }
  }

  function stopTyping() {
    if (!authenticated.value) return;
    
    if (isTyping.value) {
      isTyping.value = false;
      socket.value.emit('typing_stop');
    }
  }

  function onUserTyping() {
    startTyping();
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing
    typingTimeout = setTimeout(() => {
      stopTyping();
    }, 1500);
  }

  function requestSummary() {
    if (!authenticated.value) {
      return Promise.reject(new Error('Not authenticated'));
    }

    return new Promise((resolve) => {
      pendingRequests.set('summary', resolve);
      socket.value.emit('request_summary');
    });
  }

  function requestAnalytics() {
    if (!authenticated.value) {
      return Promise.reject(new Error('Not authenticated'));
    }

    return new Promise((resolve) => {
      pendingRequests.set('analytics', resolve);
      socket.value.emit('request_analytics');
    });
  }

  function endSession() {
    if (!authenticated.value) return;
    
    socket.value.emit('end_session');
  }

  function ping() {
    if (!socket.value?.connected) return;
    
    lastPingTime.value = Date.now();
    socket.value.emit('ping');
  }

  function disconnect() {
    if (socket.value) {
      socket.value.removeAllListeners();
      socket.value.disconnect();
      socket.value = null;
    }
    
    connected.value = false;
    authenticated.value = false;
    
    // Clear typing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    connected,
    authenticated,
    connectionError,
    latency,
    agentStatus,
    
    // Methods
    connect,
    disconnect,
    sendMessage,
    startTyping,
    stopTyping,
    onUserTyping,
    requestSummary,
    requestAnalytics,
    endSession,
    ping,
    
    // Internal (exposed for testing)
    socket,
    reconnectAttempts,
    lastPingTime,
    chatStore,
    uiStore
  };
}