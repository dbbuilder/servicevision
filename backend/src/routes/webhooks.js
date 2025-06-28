// Webhook Routes
// Handles external webhooks (Calendly, SendGrid, etc.)

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { webhookLimiter } = require('../middleware/rateLimiting');

// Import Calendly webhook handler
const calendlyRouter = require('./calendly');

// Mount Calendly webhooks with rate limiting
router.use('/calendly', webhookLimiter, calendlyRouter);

/**
 * SendGrid webhook
 * POST /api/webhooks/sendgrid
 */
router.post('/sendgrid', webhookLimiter, async (req, res, next) => {
    try {
        logger.info('SendGrid webhook received');
        // Process email events here
        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;