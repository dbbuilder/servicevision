// Monitoring Middleware
// Tracks application health metrics and errors

const logger = require('../utils/logger');

// Performance monitoring
const performanceMonitoring = () => {
  const metrics = {
    requests: 0,
    errors: 0,
    avgResponseTime: 0,
    responseTimes: []
  };

  return (req, res, next) => {
    const startTime = Date.now();
    metrics.requests++;

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      metrics.responseTimes.push(responseTime);
      
      // Keep only last 100 response times
      if (metrics.responseTimes.length > 100) {
        metrics.responseTimes.shift();
      }
      
      // Calculate average
      metrics.avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
      
      // Log slow requests
      if (responseTime > 1000) {
        logger.warn(`Slow request: ${req.method} ${req.originalUrl} took ${responseTime}ms`);
      }
      
      // Track errors
      if (res.statusCode >= 400) {
        metrics.errors++;
      }
      
      originalEnd.apply(res, args);
    };

    // Expose metrics endpoint
    if (req.path === '/metrics' && req.method === 'GET') {
      return res.json({
        uptime: process.uptime(),
        requests: metrics.requests,
        errors: metrics.errors,
        errorRate: metrics.errors / metrics.requests,
        avgResponseTime: Math.round(metrics.avgResponseTime),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Error tracking
const errorTracking = () => {
  return (err, req, res, next) => {
    // Log error details
    logger.error('Application error:', {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Send error to monitoring service (e.g., Sentry, Rollbar)
    if (process.env.SENTRY_DSN) {
      // Sentry integration would go here
    }

    next(err);
  };
};

// Health check endpoint
const healthCheck = (db, redis) => {
  return async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      checks: {}
    };

    // Database check
    try {
      await db.authenticate();
      health.checks.database = { status: 'healthy' };
    } catch (error) {
      health.status = 'unhealthy';
      health.checks.database = { 
        status: 'unhealthy', 
        error: error.message 
      };
    }

    // Redis check
    if (redis) {
      try {
        await redis.ping();
        health.checks.redis = { status: 'healthy' };
      } catch (error) {
        health.status = 'degraded';
        health.checks.redis = { 
          status: 'unhealthy', 
          error: error.message 
        };
      }
    }

    // Memory check
    const memUsage = process.memoryUsage();
    const memLimit = 512 * 1024 * 1024; // 512MB
    health.checks.memory = {
      status: memUsage.heapUsed < memLimit ? 'healthy' : 'warning',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  };
};

module.exports = {
  performanceMonitoring,
  errorTracking,
  healthCheck
};