// Chat Routes
// Handles AI chat interactions

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const chatService = require('../services/chatService');
const summaryService = require('../services/summaryService');
const ConversationStateService = require('../services/conversationStateService');
const conversationStateService = new ConversationStateService();
const { Lead, ChatSession, Message } = require('../models');

/**
 * Create a new chat session
 * POST /api/chat/session
 */
router.post('/session', async (req, res, next) => {
    try {
        const { email } = req.body;
        const sessionId = uuidv4();
        
        // Check for existing lead if email provided
        let lead = null;
        if (email) {
            lead = await Lead.findOne({ where: { email } });
        }
        
        // Create new session
        const chatSession = await ChatSession.create({
            sessionId,
            leadId: lead?.id,
            state: conversationStateService.getInitialState(),
            conversationHistory: [],
            messages: [],
            completionRate: 0
        });
        
        logger.info('Chat session created', { sessionId, hasLead: !!lead });
        
        res.status(201).json({
            sessionId,
            lead: lead ? {
                name: lead.name,
                organizationName: lead.organizationName
            } : null
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
 * Get session details
 * GET /api/chat/session/:sessionId
 */
router.get('/session/:sessionId', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        
        const session = await ChatSession.findOne({
            where: { sessionId },
            include: [{ model: Lead, as: 'lead' }]
        });
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({
            sessionId: session.sessionId,
            state: session.state,
            completionRate: session.completionRate,
            leadQualified: session.leadQualified,
            lead: session.lead
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * Get conversation history
 * GET /api/chat/session/:sessionId/history
 */
router.get('/session/:sessionId/history', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        
        const session = await ChatSession.findOne({
            where: { sessionId },
            include: [{ 
                model: Message, 
                as: 'chatMessages',
                order: [['timestamp', 'ASC']]
            }]
        });
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({
            sessionId: session.sessionId,
            messages: session.chatMessages || []
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * Get executive summary
 * GET /api/chat/session/:sessionId/summary
 */
router.get('/session/:sessionId/summary', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        
        const session = await ChatSession.findOne({
            where: { sessionId },
            include: [{ model: Lead, as: 'lead' }]
        });
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Generate summary
        const summary = await summaryService.generateExecutiveSummary(session);
        
        res.json({
            sessionId: session.sessionId,
            summary: summary.text,
            html: summary.html,
            data: summary.data
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * Send executive summary via email
 * POST /api/chat/session/:sessionId/send-summary
 */
router.post('/session/:sessionId/send-summary', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        
        const session = await ChatSession.findOne({
            where: { sessionId },
            include: [{ model: Lead, as: 'lead' }]
        });
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        if (!session.lead?.email) {
            return res.status(400).json({ error: 'No email address available' });
        }
        
        // Send summary email
        const result = await summaryService.sendSummaryEmail(session);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Summary sent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to send summary'
            });
        }
        
    } catch (error) {
        next(error);
    }
});

/**
 * Get lead qualification status
 * GET /api/chat/session/:sessionId/qualification
 */
router.get('/session/:sessionId/qualification', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        
        const session = await ChatSession.findOne({
            where: { sessionId }
        });
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Evaluate qualification
        const qualification = conversationStateService.evaluateQualification(session.state);
        
        res.json({
            sessionId: session.sessionId,
            qualified: qualification.isQualified,
            score: qualification.score,
            missingInfo: qualification.missingInfo,
            readyForSales: qualification.isQualified && qualification.score > 0.7
        });
        
    } catch (error) {
        next(error);
    }
});

module.exports = router;