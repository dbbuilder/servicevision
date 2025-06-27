// Chat Store
// Manages AI chat widget state and conversations

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import chatApi from '@/services/chatApi'

export const useChatStore = defineStore('chat', () => {
  // State
  const isOpen = ref(false)
  const isMinimized = ref(false)
  const messages = ref([])
  const sessionId = ref(null)
  const leadId = ref(null)
  const isLoading = ref(false)
  const completionRate = ref(0)
  const quickReplies = ref([])
  const email = ref('')
  const organizationName = ref('')
  const hasStarted = ref(false)

  // Computed
  const messageCount = computed(() => messages.value.length)
  const isComplete = computed(() => completionRate.value >= 80)

  // Actions
  function toggleChat() {
    isOpen.value = !isOpen.value
    if (isOpen.value && !hasStarted.value && email.value) {
      startChat()
    }
  }

  function minimizeChat() {
    isMinimized.value = true
  }
  function maximizeChat() {
    isMinimized.value = false
  }

  async function startChat() {
    if (!email.value) {
      return
    }

    isLoading.value = true
    try {
      const response = await chatApi.startChat({
        email: email.value,
        organizationName: organizationName.value
      })

      sessionId.value = response.sessionId
      leadId.value = response.leadId
      hasStarted.value = true

      // Add initial message
      messages.value.push({
        id: Date.now(),
        type: 'assistant',
        content: response.message,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Failed to start chat:', error)
      messages.value.push({
        id: Date.now(),
        type: 'system',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: new Date()
      })
    } finally {
      isLoading.value = false
    }
  }
  async function sendMessage(content) {
    if (!content.trim() || !sessionId.value) return

    // Add user message
    messages.value.push({
      id: Date.now(),
      type: 'user',
      content: content,
      timestamp: new Date()
    })

    isLoading.value = true
    quickReplies.value = []

    try {
      const response = await chatApi.sendMessage({
        sessionId: sessionId.value,
        message: content
      })

      // Add assistant response
      messages.value.push({
        id: Date.now() + 1,
        type: 'assistant',
        content: response.message,
        timestamp: new Date()
      })

      completionRate.value = response.completionRate
      quickReplies.value = response.quickReplies || []

      // Check if chat is complete
      if (response.isComplete) {
        setTimeout(() => {
          getSummary()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      messages.value.push({
        id: Date.now() + 1,
        type: 'system',
        content: 'Sorry, I couldn\'t send your message. Please try again.',
        timestamp: new Date()
      })
    } finally {
      isLoading.value = false
    }
  }
  async function getSummary() {
    if (!sessionId.value) return

    try {
      const response = await chatApi.getSummary(sessionId.value)
      
      messages.value.push({
        id: Date.now(),
        type: 'summary',
        content: response.summary,
        timestamp: new Date()
      })

      // Show Calendly scheduling option
      messages.value.push({
        id: Date.now() + 1,
        type: 'calendly',
        content: 'Ready to take the next step? Schedule your free consultation:',
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Failed to get summary:', error)
    }
  }

  function reset() {
    messages.value = []
    sessionId.value = null
    leadId.value = null
    completionRate.value = 0
    quickReplies.value = []
    hasStarted.value = false
  }

  return {
    // State
    isOpen,
    isMinimized,
    messages,
    sessionId,
    leadId,
    isLoading,
    completionRate,
    quickReplies,
    email,
    organizationName,
    hasStarted,
    
    // Computed
    messageCount,
    isComplete,
    
    // Actions
    toggleChat,
    minimizeChat,
    maximizeChat,
    startChat,
    sendMessage,
    getSummary,
    reset
  }
})