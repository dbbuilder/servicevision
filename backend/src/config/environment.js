// Environment Configuration Service
// Centralized environment variable management with validation

const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load .env file if it exists
dotenv.config();

// Required environment variables
const REQUIRED_VARS = [
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'SENDGRID_API_KEY',
  'JWT_SECRET'
];

// Cached config object
let cachedConfig = null;

/**
 * Validates environment configuration
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If validation fails
 */
function validateEnvironment(config) {
  // Skip validation in test environment
  if (config.NODE_ENV === 'test') {
    return;
  }
  
  // Check required variables
  for (const varName of REQUIRED_VARS) {
    if (!config[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate DATABASE_URL format
  if (config.DATABASE_URL && !config.DATABASE_URL.startsWith('postgresql://') && !config.DATABASE_URL.startsWith('postgres://')) {
    throw new Error('Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
  }

  // Validate PORT range
  if (config.PORT && (config.PORT < 1 || config.PORT > 65535)) {
    throw new Error('PORT must be between 1 and 65535');
  }
}

/**
 * Loads and validates environment configuration
 * @returns {Object} Validated configuration object
 */
function loadEnvironmentConfig() {
  const config = {
    // Server configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 3000,
    
    // Database
    DATABASE_URL: process.env.DATABASE_URL || (process.env.NODE_ENV === 'test' ? 'sqlite::memory:' : undefined),
    
    // External services
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || (process.env.NODE_ENV === 'test' ? 'test-key' : undefined),
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || (process.env.NODE_ENV === 'test' ? 'test-key' : undefined),
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'hello@servicevision.com',
    
    // Security
    JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : undefined),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    
    // Session/Redis (optional)
    REDIS_URL: process.env.REDIS_URL || null,
    SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    
    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    
    // Monitoring (optional)
    APP_INSIGHTS_KEY: process.env.APP_INSIGHTS_KEY || null,
    
    // Calendly (optional)
    CALENDLY_WEBHOOK_SECRET: process.env.CALENDLY_WEBHOOK_SECRET || null,
    
    // Feature flags
    ENABLE_REDIS: process.env.ENABLE_REDIS === 'true',
    ENABLE_MONITORING: process.env.ENABLE_MONITORING === 'true',
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  };

  // Validate configuration
  validateEnvironment(config);

  logger.info('Environment configuration loaded successfully', {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PORT,
    ENABLE_REDIS: config.ENABLE_REDIS,
    ENABLE_MONITORING: config.ENABLE_MONITORING
  });

  return config;
}

/**
 * Gets the current configuration (cached)
 * @returns {Object} Configuration object
 */
function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadEnvironmentConfig();
  }
  return cachedConfig;
}

module.exports = {
  loadEnvironmentConfig,
  validateEnvironment,
  getConfig
};