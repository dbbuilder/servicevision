<template>
  <header class="bg-white shadow-sm sticky top-0 z-40">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <router-link to="/" class="flex items-center">
            <span class="text-2xl font-bold text-primary-900">ServiceVision</span>
          </router-link>
        </div>
        
        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <router-link to="/" class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
            Home
          </router-link>
          <router-link to="/services" class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
            Services
          </router-link>
          <router-link to="/about" class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
            About
          </router-link>
          <router-link to="/contact" class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
            Contact
          </router-link>
          <button @click="openChat" class="btn-primary text-sm">
            Start Consultation
          </button>
        </div>
        
        <!-- Mobile menu button -->
        <div class="md:hidden flex items-center">
          <button @click="toggleMobileMenu" class="text-gray-700 hover:text-gray-900">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
    
    <!-- Mobile menu -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div v-if="mobileMenuOpen" class="md:hidden bg-white border-t">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <router-link to="/" class="block text-gray-700 hover:text-primary-600 px-3 py-2 text-base font-medium">
            Home
          </router-link>
          <router-link to="/services" class="block text-gray-700 hover:text-primary-600 px-3 py-2 text-base font-medium">
            Services
          </router-link>
          <router-link to="/about" class="block text-gray-700 hover:text-primary-600 px-3 py-2 text-base font-medium">
            About
          </router-link>
          <router-link to="/contact" class="block text-gray-700 hover:text-primary-600 px-3 py-2 text-base font-medium">
            Contact
          </router-link>
          <button @click="openChat" class="btn-primary w-full text-sm">
            Start Consultation
          </button>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const mobileMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function openChat() {
  chatStore.toggleChat()
  mobileMenuOpen.value = false
}
</script>