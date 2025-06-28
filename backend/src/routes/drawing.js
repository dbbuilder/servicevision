// Drawing Routes
// Manages drawing entries and winner selection

const express = require('express');
const router = express.Router();
const { DrawingEntry, Lead } = require('../models');
const logger = require('../utils/logger');
const { drawingLimiter } = require('../middleware/rateLimiting');

/**
 * Add drawing entry
 * POST /api/drawing/enter
 */
router.post('/enter', drawingLimiter, async (req, res, next) => {
    try {
        const { leadId, entryType } = req.body;
        const drawingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        const entry = await DrawingEntry.create({
            leadId,
            entryType,
            drawingPeriod
        });
        
        logger.info(`Drawing entry created for lead: ${leadId}`);
        res.status(201).json(entry);
    } catch (error) {
        next(error);
    }
});

module.exports = router;