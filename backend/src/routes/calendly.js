const express = require('express');
const crypto = require('crypto');
const { Lead } = require('../models');
const { logger } = require('../utils/logger');
const emailService = require('../services/emailService');

const router = express.Router();

// Verify Calendly webhook signature
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-calendly-hook-signature'];
  
  if (!signature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing webhook signature'
    });
  }

  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('CALENDLY_WEBHOOK_SECRET not configured');
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Webhook validation not configured'
    });
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid webhook signature'
    });
  }

  next();
};

// Extract company and phone from Q&A
const extractQAData = (questionsAndAnswers) => {
  const data = {
    company: null,
    phone: null
  };

  if (!questionsAndAnswers || !Array.isArray(questionsAndAnswers)) {
    return data;
  }

  questionsAndAnswers.forEach(qa => {
    const question = qa.question?.toLowerCase() || '';
    const answer = qa.answer?.trim() || '';

    if (question.includes('company') || question.includes('organization')) {
      data.company = answer;
    } else if (question.includes('phone') || question.includes('number')) {
      data.phone = answer;
    }
  });

  return data;
};

// Process invitee.created event
const processInviteeCreated = async (payload) => {
  const { email, name, scheduled_event, questions_and_answers } = payload;
  
  try {
    // Find or create lead
    let lead = await Lead.findOne({ where: { email } });
    
    if (!lead) {
      // Extract additional data from Q&A
      const qaData = extractQAData(questions_and_answers);
      
      // Create new lead
      lead = await Lead.create({
        email,
        name,
        company: qaData.company,
        phone: qaData.phone,
        source: 'calendly',
        isQualified: true,
        meetingScheduled: true,
        meetingDate: scheduled_event?.start_time,
        lastContactDate: new Date()
      });
      
      logger.info(`Created new lead from Calendly: ${email}`);
    } else {
      // Update existing lead
      const updateData = {
        isQualified: true,
        meetingScheduled: true,
        lastContactDate: new Date()
      };

      if (scheduled_event?.start_time) {
        updateData.meetingDate = scheduled_event.start_time;
      }

      if (scheduled_event?.event_type?.name) {
        updateData.calendlyEventType = scheduled_event.event_type.name;
      }

      await lead.update(updateData);
      
      logger.info(`Updated lead from Calendly: ${email}`);
    }

    // Send confirmation email
    if (scheduled_event?.start_time) {
      try {
        await emailService.sendMeetingConfirmation({
          email,
          name,
          meetingDate: scheduled_event.start_time,
          meetingType: scheduled_event.event_type?.name || 'Consultation'
        });
      } catch (emailError) {
        logger.error('Failed to send meeting confirmation email:', emailError);
        // Don't fail the webhook if email fails
      }
    }

    return { success: true, lead };
  } catch (error) {
    logger.error('Error processing invitee.created:', error);
    throw error;
  }
};

// Process invitee.canceled event
const processInviteeCanceled = async (payload) => {
  const { email, name, canceled_at, cancellation } = payload;
  
  try {
    // Find lead
    const lead = await Lead.findOne({ where: { email } });
    
    if (!lead) {
      logger.warn(`Lead not found for canceled event: ${email}`);
      return { success: true, message: 'Lead not found' };
    }

    // Update lead
    await lead.update({
      meetingScheduled: false,
      meetingCanceled: true,
      meetingCanceledAt: canceled_at,
      cancellationReason: cancellation?.reason
    });

    // Send cancellation email
    try {
      await emailService.sendMeetingCancellation({
        email,
        name,
        reason: cancellation?.reason
      });
    } catch (emailError) {
      logger.error('Failed to send meeting cancellation email:', emailError);
      // Don't fail the webhook if email fails
    }

    logger.info(`Processed meeting cancellation for: ${email}`);
    return { success: true, lead };
  } catch (error) {
    logger.error('Error processing invitee.canceled:', error);
    throw error;
  }
};

// Main webhook handler
router.post('/', verifyWebhookSignature, async (req, res) => {
  const { event, payload } = req.body;
  
  logger.info(`Received Calendly webhook: ${event}`);
  
  try {
    let result;
    
    switch (event) {
      case 'invitee.created':
        result = await processInviteeCreated(payload);
        break;
        
      case 'invitee.canceled':
        result = await processInviteeCanceled(payload);
        break;
        
      default:
        logger.info(`Unhandled Calendly event: ${event}`);
        return res.status(200).json({
          success: true,
          message: 'Event acknowledged but not processed',
          event
        });
    }
    
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    logger.error('Calendly webhook error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process webhook'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'calendly-webhook',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;