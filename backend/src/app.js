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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test'
    });
});

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