// ServiceVision Express Application
// Separate app configuration for testing

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');

// Import custom modules
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const { globalLimiter } = require('./middleware/rateLimiting');
const { csrfProtection, csrfToken } = require('./middleware/csrfProtection');
const { inputSanitization } = require('./middleware/inputSanitization');

// Create Express application
const app = express();

// Configure session middleware
app.use(session({
    secret: process.env.JWT_SECRET || 'test-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// Apply middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing (for CSRF tokens)
app.use((req, res, next) => {
    // Simple cookie parser for CSRF
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
                req.cookies[parts[0]] = decodeURIComponent(parts[1]);
            }
        });
    }
    
    // Add cookie setting method
    res.cookie = function(name, value, options = {}) {
        let cookie = `${name}=${encodeURIComponent(value)}`;
        
        if (options.maxAge) {
            cookie += `; Max-Age=${options.maxAge / 1000}`;
        }
        if (options.httpOnly) {
            cookie += '; HttpOnly';
        }
        if (options.secure) {
            cookie += '; Secure';
        }
        if (options.sameSite) {
            cookie += `; SameSite=${options.sameSite}`;
        }
        if (options.path) {
            cookie += `; Path=${options.path}`;
        }
        
        const existingCookies = this.getHeader('Set-Cookie') || [];
        const cookies = Array.isArray(existingCookies) ? existingCookies : [existingCookies];
        cookies.push(cookie);
        this.setHeader('Set-Cookie', cookies);
        
        return this;
    };
    
    next();
});

// Apply global rate limiting
app.use(globalLimiter);

// Apply input sanitization (before body parsing results are used)
app.use(inputSanitization({
    skipPaths: ['/api/webhooks', '/health'],
    customValidators: {
        // Add custom validators for specific fields if needed
    }
}));

// Health check endpoint (no CSRF needed)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test'
    });
});

// CSRF token endpoint
app.get('/api/csrf-token', csrfToken, (req, res) => {
    res.json({ token: req.csrfToken() });
});

// Apply CSRF protection to API routes (excluding webhooks)
app.use(csrfProtection({
    excludePaths: ['/api/webhooks', '/health', '/api/csrf-token']
}));

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

module.exports = app;