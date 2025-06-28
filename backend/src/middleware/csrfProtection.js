// CSRF Protection Middleware
// Implements double-submit cookie pattern for CSRF protection

const crypto = require('crypto');
const logger = require('../utils/logger');

// Generate a random CSRF token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF protection middleware
const csrfProtection = (options = {}) => {
  const {
    cookieName = '_csrf',
    headerName = 'x-csrf-token',
    paramName = '_csrf',
    excludePaths = ['/health', '/api/webhooks'],
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'strict',
    httpOnly = false, // Must be false for JS to read it
    maxAge = 24 * 60 * 60 * 1000 // 24 hours
  } = options;

  return (req, res, next) => {
    // Skip CSRF check for excluded paths
    const isExcluded = excludePaths.some(path => req.path.startsWith(path));
    if (isExcluded) {
      return next();
    }

    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Generate and set token for subsequent requests
      if (!req.cookies[cookieName]) {
        const token = generateToken();
        res.cookie(cookieName, token, {
          httpOnly,
          secure,
          sameSite,
          maxAge
        });
      }
      return next();
    }

    // For state-changing methods, verify CSRF token
    const cookieToken = req.cookies[cookieName];
    const submittedToken = req.headers[headerName] || 
                          req.body[paramName] || 
                          req.query[paramName];

    if (!cookieToken || !submittedToken) {
      logger.warn('CSRF token missing', {
        ip: req.ip,
        path: req.path,
        hasCookie: !!cookieToken,
        hasSubmitted: !!submittedToken
      });
      return res.status(403).json({
        error: 'CSRF token missing',
        message: 'This request requires a valid CSRF token'
      });
    }

    if (cookieToken !== submittedToken) {
      logger.warn('CSRF token mismatch', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('user-agent')
      });
      return res.status(403).json({
        error: 'CSRF token invalid',
        message: 'The provided CSRF token is invalid'
      });
    }

    // Token is valid, proceed
    next();
  };
};

// Middleware to inject CSRF token into locals for templates
const csrfToken = (req, res, next) => {
  const cookieName = '_csrf';
  let token = req.cookies[cookieName];
  
  if (!token) {
    token = generateToken();
    res.cookie(cookieName, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
  }
  
  // Make token available in response locals
  res.locals.csrfToken = token;
  
  // Also add a convenience method
  req.csrfToken = () => token;
  
  next();
};

module.exports = {
  csrfProtection,
  csrfToken,
  generateToken
};