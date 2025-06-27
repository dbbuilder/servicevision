// Lead Routes
// Manages lead information and tracking

const express = require('express');
const router = express.Router();
const { Lead, ChatSession } = require('../models');
const logger = require('../utils/logger');

/**
 * Create a new lead
 * POST /api/leads
 */
router.post('/', async (req, res, next) => {
    try {
        const lead = await Lead.create(req.body);
        logger.info(`New lead created: ${lead.id}`);
        res.status(201).json(lead);
    } catch (error) {
        next(error);
    }
});

/**
 * Get lead by email
 * GET /api/leads/:email
 */
router.get('/:email', async (req, res, next) => {
    try {
        const lead = await Lead.findOne({
            where: { email: req.params.email },
            include: [{
                model: ChatSession,
                as: 'chatSessions'
            }]
        });
        
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        res.json(lead);
    } catch (error) {
        next(error);
    }
});

module.exports = router;