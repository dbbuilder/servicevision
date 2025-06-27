// App Store
// Global application state management

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(false)
  const notification = ref(null)
  const user = ref(null)

  // Actions
  function initialize() {
    // Initialize app settings
    console.log('App initialized')
  }

  function showNotification(message, type = 'info', duration = 3000) {
    notification.value = { message, type }
    setTimeout(() => {
      notification.value = null
    }, duration)
  }

  function setLoading(loading) {
    isLoading.value = loading
  }

  return {
    // State
    isLoading,
    notification,
    user,
    
    // Actions
    initialize,
    showNotification,
    setLoading
  }
})