// Webhook Routes
// Handles external webhooks (Calendly, SendGrid, etc.)

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Calendly webhook
 * POST /api/webhooks/calendly
 */
router.post('/calendly', async (req, res, next) => {
    try {
        logger.info('Calendly webhook received:', req.body);
        // Process Calendly events here
        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
});

/**
 * SendGrid webhook
 * POST /api/webhooks/sendgrid
 */
router.post('/sendgrid', async (req, res, next) => {
    try {
        logger.info('SendGrid webhook received');
        // Process email events here
        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;