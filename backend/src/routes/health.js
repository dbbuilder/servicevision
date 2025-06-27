// Health Check Routes
// Provides endpoints for monitoring application health

const express = require('express');
const router = express.Router();
const os = require('os');
const { testDatabaseConnection } = require('../config/database');
const { getConfig } = require('../config/environment');
const { OpenAI } = require('openai');

// Helper function to format bytes
function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// Basic health check
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  if (process.env.npm_package_version) {
    health.version = process.env.npm_package_version;
  }

  res.json(health);
});

// Detailed health check with service status
router.get('/health/detailed', async (req, res) => {
  try {
    const config = getConfig();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {},
      memory: {},
      cpu: {}
    };

    // Check database connection
    try {
      const dbConnected = await testDatabaseConnection();
      health.services.database = dbConnected ? 'connected' : 'disconnected';
      if (!dbConnected) health.status = 'unhealthy';
    } catch (error) {
      health.services.database = 'error';
      health.status = 'unhealthy';
    }

    // Check OpenAI API
    try {
      const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
      await openai.models.list();
      health.services.openai = 'reachable';
    } catch (error) {
      health.services.openai = 'unreachable';
      health.status = 'unhealthy';
    }

    // Check Redis if enabled
    if (config.ENABLE_REDIS) {
      try {
        const { getRedisClient } = require('../utils/redis');
        const redis = getRedisClient();
        if (redis && redis.isOpen) {
          await redis.ping();
          health.services.redis = 'connected';
        } else {
          health.services.redis = 'disconnected';
          health.status = 'unhealthy';
        }
      } catch (error) {
        health.services.redis = 'error';
        health.status = 'unhealthy';
      }
    } else {
      health.services.redis = 'disabled';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    health.memory = {
      used: formatBytes(usedMem),
      total: formatBytes(totalMem),
      percentage: Math.round((usedMem / totalMem) * 100)
    };

    // CPU info
    health.cpu = {
      loadAverage: os.loadavg()
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check for container orchestration
router.get('/health/ready', async (req, res) => {
  try {
    const checks = {
      database: false,
      environment: false
    };

    // Check database
    try {
      checks.database = await testDatabaseConnection();
    } catch (error) {
      checks.database = false;
    }

    // Check required environment variables
    try {
      const config = getConfig();
      checks.environment = !!(
        config.OPENAI_API_KEY &&
        config.DATABASE_URL &&
        config.SENDGRID_API_KEY &&
        config.JWT_SECRET
      );
    } catch (error) {
      checks.environment = false;
    }

    const ready = Object.values(checks).every(check => check === true);
    const statusCode = ready ? 200 : 503;

    res.status(statusCode).json({
      ready,
      checks
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: 'Readiness check failed'
    });
  }
});

module.exports = router;