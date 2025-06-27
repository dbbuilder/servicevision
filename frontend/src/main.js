// Main entry point for Vue application
// Initializes Vue, Router, and Pinia

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Import global CSS
import './assets/main.css'

// Create Vue application
const app = createApp(App)

// Use Pinia for state management
app.use(createPinia())

// Use Vue Router
app.use(router)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err)
    console.error('Error info:', info)
    // TODO: Send to error tracking service
}

// Mount application
app.mount('#app')