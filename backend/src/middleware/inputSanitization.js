// Input Sanitization Middleware
// Sanitizes user input to prevent XSS and injection attacks

const validator = require('validator');
const logger = require('../utils/logger');

// HTML entities to escape
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

// Escape HTML characters
const escapeHtml = (str) => {
  return String(str).replace(/[&<>"'\/]/g, (match) => htmlEntities[match]);
};

// Sanitize string value
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  
  // Trim whitespace
  let sanitized = value.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Escape HTML entities
  sanitized = escapeHtml(sanitized);
  
  // Normalize Unicode
  sanitized = sanitized.normalize('NFC');
  
  return sanitized;
};

// Sanitize object recursively
const sanitizeObject = (obj, seen = new WeakSet()) => {
  if (obj === null || obj === undefined) return obj;
  
  // Check for circular references
  if (typeof obj === 'object') {
    if (seen.has(obj)) {
      throw new Error('Circular reference detected');
    }
    seen.add(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, seen));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value, seen);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

// Validate and sanitize specific field types
const fieldValidators = {
  email: (value) => {
    if (!value || typeof value !== 'string') return null;
    const normalized = validator.normalizeEmail(value.toLowerCase());
    return validator.isEmail(normalized) ? normalized : null;
  },
  
  phone: (value) => {
    if (!value || typeof value !== 'string') return null;
    // Remove all non-numeric characters except + for international
    const cleaned = value.replace(/[^\d+]/g, '');
    return validator.isMobilePhone(cleaned, 'any') ? cleaned : value;
  },
  
  url: (value) => {
    if (!value || typeof value !== 'string') return null;
    // Simple check for localhost URLs
    if (value.match(/^https?:\/\/localhost(:\d+)?(\/.*)?$/)) {
      return value;
    }
    return validator.isURL(value, {
      protocols: ['http', 'https'],
      require_protocol: true
    }) ? value : null;
  },
  
  uuid: (value) => {
    if (!value || typeof value !== 'string') return null;
    return validator.isUUID(value) ? value : null;
  }
};

// Input sanitization middleware
const inputSanitization = (options = {}) => {
  const {
    skipPaths = ['/api/webhooks', '/health'],
    customValidators = {},
    maxDepth = 10,
    stripUnknownProperties = false,
    allowedFields = null
  } = options;

  const allValidators = { ...fieldValidators, ...customValidators };

  return (req, res, next) => {
    // Skip sanitization for excluded paths
    const isExcluded = skipPaths.some(path => req.path.startsWith(path));
    if (isExcluded) {
      return next();
    }

    try {
      // Sanitize query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        req.query = sanitizeObject(req.query);
      }

      // Sanitize request body
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = sanitizeObject(req.body);
        
        // Apply field-specific validators
        for (const [field, validator] of Object.entries(allValidators)) {
          if (req.body[field] !== undefined) {
            const validated = validator(req.body[field]);
            if (validated !== null) {
              req.body[field] = validated;
            }
          }
        }
        
        // Strip unknown properties if configured
        if (stripUnknownProperties && allowedFields) {
          const filtered = {};
          for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
              filtered[field] = req.body[field];
            }
          }
          req.body = filtered;
        }
      }

      // Note: Route parameters (req.params) cannot be sanitized here
      // because Express populates them AFTER middleware runs.
      // Developers should manually sanitize params in route handlers.

      next();
    } catch (error) {
      logger.error('Input sanitization error:', error);
      // Check if it's a circular reference error
      if (error.message && error.message.includes('Circular reference')) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Request contains circular references'
        });
      }
      res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains invalid or malformed data'
      });
    }
  };
};

// SQL injection prevention helpers
const sqlSanitization = {
  // Escape SQL special characters
  escapeSql: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%':
          return '\\' + char;
        default:
          return char;
      }
    });
  },
  
  // Validate order by clause
  validateOrderBy: (value, allowedFields) => {
    if (!value || typeof value !== 'string') return null;
    
    const parts = value.toLowerCase().split(/\s+/);
    const field = parts[0];
    const direction = parts[1] || 'asc';
    
    if (!allowedFields.includes(field)) return null;
    if (!['asc', 'desc'].includes(direction)) return null;
    
    return `${field} ${direction}`;
  }
};

module.exports = {
  inputSanitization,
  sanitizeString,
  sanitizeObject,
  fieldValidators,
  sqlSanitization,
  escapeHtml
};