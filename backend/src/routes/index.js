// API Routes Index
// Main router that combines all API routes

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Import route modules
const leadRoutes = require('./leads');
const chatRoutes = require('./chat');
const drawingRoutes = require('./drawing');
const webhookRoutes = require('./webhooks');

// Log all API requests
router.use((req, res, next) => {
    logger.http(`${req.method} ${req.originalUrl}`);
    next();
});

// Mount route modules
router.use('/leads', leadRoutes);
router.use('/chat', chatRoutes);
router.use('/drawing', drawingRoutes);
router.use('/webhooks', webhookRoutes);

// API documentation endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'ServiceVision API v1.0',
        endpoints: {
            leads: '/api/leads',
            chat: '/api/chat',
            drawing: '/api/drawing',
            webhooks: '/api/webhooks'
        },
        documentation: '/api/docs',
        health: '/health'
    });
});

module.exports = router;