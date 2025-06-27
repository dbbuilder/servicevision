// Chat Routes
// Handles AI chat interactions

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const chatService = require('../services/chatService');
const { Lead, ChatSession } = require('../models');

/**
 * Start a new chat session
 * POST /api/chat/start
 */
router.post('/start', async (req, res, next) => {
    try {
        const { email, organizationName } = req.body;
        
        // Validate required fields
        if (!email) {
            return res.status(400).json({
                error: 'Email is required to start a chat session'
            });
        }

        // Find or create lead
        const [lead, created] = await Lead.findOrCreate({
            where: { email },
            defaults: {
                email,
                organizationName,
                source: 'ai-chat'
            }
        });
        
        // Create new chat session
        const sessionId = uuidv4();
        const chatSession = await ChatSession.create({
            leadId: lead.id,
            sessionId,
            startTime: new Date()
        });

        // Initialize chat with AI
        const initialMessage = await chatService.getInitialMessage(lead, chatSession);

        logger.info(`Chat session started: ${sessionId} for lead: ${lead.id}`);

        res.json({
            sessionId,
            leadId: lead.id,
            message: initialMessage,
            isNewLead: created
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Send a message in an existing chat session
 * POST /api/chat/message
 */
router.post('/message', async (req, res, next) => {
    try {
        const { sessionId, message } = req.body;
        
        // Validate required fields
        if (!sessionId || !message) {
            return res.status(400).json({
                error: 'Session ID and message are required'
            });
        }

        // Find the chat session
        const chatSession = await ChatSession.findOne({
            where: { sessionId },
            include: [{
                model: Lead,
                as: 'lead'
            }]
        });

        if (!chatSession) {
            return res.status(404).json({
                error: 'Chat session not found'
            });
        }

        // Process message with AI
        const response = await chatService.processMessage(
            chatSession,
            message
        );

        // Update session
        chatSession.totalMessages += 1;
        chatSession.conversationHistory = response.conversationHistory;
        chatSession.identifiedNeeds = response.identifiedNeeds;        chatSession.recommendedServices = response.recommendedServices;
        chatSession.completionRate = response.completionRate;
        await chatSession.save();

        res.json({
            message: response.message,
            quickReplies: response.quickReplies,
            completionRate: response.completionRate,
            isComplete: response.isComplete
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get executive summary for a chat session
 * GET /api/chat/:sessionId/summary
 */
router.get('/:sessionId/summary', async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const chatSession = await ChatSession.findOne({
            where: { sessionId },
            include: [{
                model: Lead,
                as: 'lead'
            }]
        });

        if (!chatSession) {
            return res.status(404).json({
                error: 'Chat session not found'
            });
        }

        // Generate executive summary if not already created
        if (!chatSession.executiveSummary) {
            const summary = await chatService.generateExecutiveSummary(chatSession);
            chatSession.executiveSummary = summary;
            chatSession.isComplete = true;
            chatSession.endTime = new Date();
            await chatSession.save();
        }

        res.json({
            summary: chatSession.executiveSummary,
            identifiedNeeds: chatSession.identifiedNeeds,
            recommendedServices: chatSession.recommendedServices,
            lead: {
                email: chatSession.lead.email,
                organizationName: chatSession.lead.organizationName,
                organizationType: chatSession.lead.organizationType
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;