// Chat Store
// Manages AI chat widget state and conversations

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

export const useChatStore = defineStore('chat', () => {
  // State
  const isOpen = ref(false);
  const messages = ref([]);
  const sessionId = ref(null);
  const isLoading = ref(false);
  const quickReplies = ref([]);
  const userEmail = ref(null);
  const isQualified = ref(false);

  // Getters
  const hasActiveSession = computed(() => !!sessionId.value);
  const messageCount = computed(() => messages.value.length);
  const lastMessage = computed(() => 
    messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
  );
  const isWaitingForEmail = computed(() => {
    if (userEmail.value) return false;
    const lastMsg = lastMessage.value;
    return !!(lastMsg && lastMsg.requiresEmail === true);
  });

  // Actions
  async function openChat() {
    isOpen.value = true;
    
    if (!sessionId.value) {
      try {
        const response = await axios.post('/api/chat/start');
        sessionId.value = response.data.sessionId;
        
        // Add welcome message
        addMessage(
          response.data.welcomeMessage || 'Hello! How can I help you today?',
          'assistant'
        );
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
        // Fallback to local session
        sessionId.value = `local-${Date.now()}`;
        addMessage(
          'Hello! How can I help you today? I\'m here to learn about your business needs.',
          'assistant'
        );
      }
    }
  }

  function closeChat() {
    isOpen.value = false;
    messages.value = [];
    quickReplies.value = [];
    // Keep session ID for resuming
  }

  function addMessage(text, sender, additionalProps = {}) {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender,
      timestamp: new Date(),
      ...additionalProps
    };
    messages.value.push(message);
    return message;
  }

  async function sendMessage(text) {
    if (!text || !text.trim() || isLoading.value || !sessionId.value) {
      return;
    }

    // Add user message
    addMessage(text, 'user');
    
    // Clear quick replies when user sends a message
    quickReplies.value = [];
    isLoading.value = true;

    try {
      const response = await axios.post('/api/chat/message', {
        sessionId: sessionId.value,
        message: text
      });

      const { reply, quickReplies: newQuickReplies, requiresEmail, isQualified: qualified } = response.data;

      // Add AI response
      addMessage(reply, 'assistant', { requiresEmail });

      // Update state
      if (newQuickReplies) {
        quickReplies.value = newQuickReplies;
      }
      
      if (qualified !== undefined) {
        isQualified.value = qualified;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage(
        'I apologize, but I\'m having trouble processing your message. Please try again.',
        'assistant',
        { isError: true }
      );
    } finally {
      isLoading.value = false;
    }
  }

  async function submitEmail(email) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addMessage(
        'Please provide a valid email address.',
        'assistant',
        { isError: true }
      );
      return;
    }

    isLoading.value = true;

    try {
      const response = await axios.post('/api/leads', {
        sessionId: sessionId.value,
        email
      });

      userEmail.value = email;
      
      addMessage(
        response.data.message || 'Thank you! I\'ve saved your contact information.',
        'assistant'
      );
    } catch (error) {
      console.error('Failed to submit email:', error);
      addMessage(
        'There was an error saving your email. Please try again.',
        'assistant',
        { isError: true }
      );
    } finally {
      isLoading.value = false;
    }
  }

  async function selectQuickReply(reply) {
    quickReplies.value = []; // Clear quick replies immediately
    await sendMessage(reply);
  }

  // Session persistence
  function saveSession() {
    const sessionData = {
      sessionId: sessionId.value,
      userEmail: userEmail.value,
      isQualified: isQualified.value
    };
    localStorage.setItem('chat_session', JSON.stringify(sessionData));
  }

  function restoreSession() {
    try {
      const savedSession = localStorage.getItem('chat_session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        sessionId.value = sessionData.sessionId;
        userEmail.value = sessionData.userEmail;
        isQualified.value = sessionData.isQualified;
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }

  return {
    // State
    isOpen,
    messages,
    sessionId,
    isLoading,
    quickReplies,
    userEmail,
    isQualified,
    
    // Getters
    hasActiveSession,
    messageCount,
    lastMessage,
    isWaitingForEmail,
    
    // Actions
    openChat,
    closeChat,
    sendMessage,
    submitEmail,
    selectQuickReply,
    addMessage,
    saveSession,
    restoreSession
  };
});