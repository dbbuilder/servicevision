// Chat API Service
// Handles all chat-related API calls

import axios from 'axios'

const API_BASE = '/api/chat'

export default {
  /**
   * Start a new chat session
   */
  async startChat(data) {
    try {
      const response = await axios.post(`${API_BASE}/start`, data)
      return response.data
    } catch (error) {
      console.error('Chat API error:', error)
      throw error
    }
  },

  /**
   * Send a message in the chat
   */
  async sendMessage(data) {
    try {
      const response = await axios.post(`${API_BASE}/message`, data)
      return response.data
    } catch (error) {
      console.error('Chat API error:', error)
      throw error
    }
  },

  /**
   * Get chat summary
   */
  async getSummary(sessionId) {
    try {
      const response = await axios.get(`${API_BASE}/${sessionId}/summary`)
      return response.data
    } catch (error) {
      console.error('Chat API error:', error)
      throw error
    }
  }
}