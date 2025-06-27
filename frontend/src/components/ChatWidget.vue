<template>
  <div class="chat-widget">
    <!-- Chat Button (when closed) -->
    <transition name="fade">
      <button
        v-if="!chatStore.isOpen"
        @click="chatStore.toggleChat"
        class="fixed bottom-6 right-6 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-all hover:scale-110 z-50"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
      </button>
    </transition>
    
    <!-- Chat Window -->
    <transition name="slide-up">
      <div
        v-if="chatStore.isOpen"
        class="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50"
        :class="{ 'h-16': chatStore.isMinimized }"
      >
        <!-- Header -->
        <div class="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold">AI Consultant</h3>
              <p class="text-xs text-primary-100">Here to help you succeed</p>
            </div>
          </div>          <div class="flex items-center space-x-2">
            <button @click="chatStore.minimizeChat" class="hover:bg-white/20 rounded p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
              </svg>
            </button>
            <button @click="chatStore.toggleChat" class="hover:bg-white/20 rounded p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Email Collection (if not started) -->
        <div v-if="!chatStore.hasStarted && !chatStore.isMinimized" class="flex-1 p-6 flex flex-col justify-center">
          <div class="text-center">
            <h4 class="text-xl font-semibold text-gray-900 mb-2">Welcome to ServiceVision!</h4>
            <p class="text-gray-600 mb-6">Let's start by getting your email so we can send you a summary of our conversation.</p>
            
            <form @submit.prevent="startChat" class="space-y-4">
              <input
                v-model="chatStore.email"
                type="email"
                placeholder="Your email address"
                required
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <input
                v-model="chatStore.organizationName"
                type="text"
                placeholder="Organization name (optional)"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />              <button type="submit" class="btn-primary w-full">
                Start Consultation
              </button>
            </form>
            
            <p class="text-xs text-gray-500 mt-4">
              By starting a consultation, you agree to our privacy policy and terms of service.
            </p>
          </div>
        </div>
        
        <!-- Chat Messages -->
        <div v-else-if="!chatStore.isMinimized" class="flex-1 overflow-hidden flex flex-col">
          <!-- Progress Bar -->
          <div class="px-4 py-2 bg-gray-50 border-b">
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Consultation Progress</span>
              <span>{{ chatStore.completionRate }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-primary-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${chatStore.completionRate}%` }"
              ></div>
            </div>
          </div>
          
          <!-- Messages Container -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
            <div v-for="message in chatStore.messages" :key="message.id">
              <!-- User Message -->
              <div v-if="message.type === 'user'" class="flex justify-end">
                <div class="max-w-[80%] bg-primary-600 text-white rounded-lg px-4 py-2">
                  {{ message.content }}
                </div>
              </div>              
              <!-- Assistant Message -->
              <div v-else-if="message.type === 'assistant'" class="flex justify-start">
                <div class="max-w-[80%] bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                  {{ message.content }}
                </div>
              </div>
              
              <!-- Summary Message -->
              <div v-else-if="message.type === 'summary'" class="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h5 class="font-semibold text-primary-900 mb-2">Executive Summary</h5>
                <p class="text-gray-700 whitespace-pre-wrap">{{ message.content }}</p>
              </div>
              
              <!-- Calendly Message -->
              <div v-else-if="message.type === 'calendly'" class="text-center">
                <p class="text-gray-600 mb-4">{{ message.content }}</p>
                <button @click="openCalendly" class="btn-primary">
                  Schedule Your Call
                </button>
              </div>
            </div>
            
            <!-- Loading indicator -->
            <div v-if="chatStore.isLoading" class="flex justify-start">
              <div class="bg-gray-100 rounded-lg px-4 py-2">
                <div class="flex space-x-2">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
              </div>
            </div>
          </div>          
          <!-- Quick Replies -->
          <div v-if="chatStore.quickReplies.length > 0" class="px-4 pb-2">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(reply, index) in chatStore.quickReplies"
                :key="index"
                @click="sendQuickReply(reply)"
                class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                {{ reply }}
              </button>
            </div>
          </div>
          
          <!-- Input Area -->
          <form @submit.prevent="sendMessage" class="p-4 border-t">
            <div class="flex space-x-2">
              <input
                v-model="messageInput"
                type="text"
                placeholder="Type your message..."
                class="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                :disabled="chatStore.isLoading"
              />
              <button 
                type="submit" 
                class="bg-primary-600 text-white rounded-lg px-4 py-2 hover:bg-primary-700 transition-colors disabled:opacity-50"
                :disabled="!messageInput.trim() || chatStore.isLoading"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const messageInput = ref('')
const messagesContainer = ref(null)

// Auto-scroll to bottom when new messages arrive
watch(() => chatStore.messages.length, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

async function startChat() {
  await chatStore.startChat()
}

async function sendMessage() {
  if (!messageInput.value.trim() || chatStore.isLoading) return
  
  const message = messageInput.value
  messageInput.value = ''
  await chatStore.sendMessage(message)
}

function sendQuickReply(reply) {
  messageInput.value = reply
  sendMessage()
}

function openCalendly() {
  // Open Calendly in a popup or redirect
  if (window.Calendly) {
    window.Calendly.initPopupWidget({
      url: 'https://calendly.com/servicevision/consultation'
    })
  } else {
    window.open('https://calendly.com/servicevision/consultation', '_blank')
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease-out;
}
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>