<template>
  <div id="app" class="min-h-screen bg-white">
    <!-- Main router view -->
    <RouterView />
    
    <!-- AI Chat Widget (always visible) -->
    <ChatWidget />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import ChatWidget from '@/components/ChatWidget.vue'
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

// Initialize app store
const appStore = useAppStore()

onMounted(() => {
  // Initialize any global app settings
  appStore.initialize()
})
</script>

<style>
/* Smooth transitions between routes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>