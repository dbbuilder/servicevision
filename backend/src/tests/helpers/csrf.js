// CSRF Test Helper
// Provides utilities for handling CSRF tokens in tests

const request = require('supertest');

/**
 * Get CSRF token from the API
 * @param {Object} app - Express app instance
 * @returns {Promise<{token: string, cookie: string}>}
 */
async function getCsrfToken(app) {
  const response = await request(app)
    .get('/api/csrf-token')
    .expect(200);
  
  const token = response.body.token;
  const cookie = response.headers['set-cookie'][0];
  
  return { token, cookie };
}

/**
 * Make a request with CSRF token
 * @param {Object} app - Express app instance
 * @param {string} method - HTTP method (post, put, delete, etc.)
 * @param {string} url - Request URL
 * @param {Object} data - Request data
 * @returns {Promise<Response>}
 */
async function requestWithCsrf(app, method, url, data = {}) {
  const { token, cookie } = await getCsrfToken(app);
  
  return request(app)
    [method](url)
    .set('Cookie', cookie)
    .set('X-CSRF-Token', token)
    .send(data);
}

module.exports = {
  getCsrfToken,
  requestWithCsrf
};