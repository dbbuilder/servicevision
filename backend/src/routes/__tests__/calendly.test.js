const request = require('supertest');
const express = require('express');
const { Lead } = require('../../models');
const { logger } = require('../../utils/logger');
const calendlyRouter = require('../calendly');

// Mock dependencies
jest.mock('../../models');
jest.mock('../../utils/logger');
jest.mock('../../services/emailService');

const emailService = require('../../services/emailService');

describe('Calendly Webhook Handler', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/webhooks/calendly', calendlyRouter);
    
    jest.clearAllMocks();
    logger.error.mockImplementation(() => {});
    logger.info.mockImplementation(() => {});
  });

  describe('POST /webhooks/calendly', () => {
    describe('Webhook Validation', () => {
      test('should reject request without webhook signature', async () => {
        const response = await request(app)
          .post('/webhooks/calendly')
          .send({
            event: 'invitee.created',
            payload: {}
          });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          error: 'Unauthorized',
          message: 'Missing webhook signature'
        });
      });

      test('should reject request with invalid webhook signature', async () => {
        process.env.CALENDLY_WEBHOOK_SECRET = 'test-secret';
        
        const response = await request(app)
          .post('/webhooks/calendly')
          .set('X-Calendly-Hook-Signature', 'invalid-signature')
          .send({
            event: 'invitee.created',
            payload: {}
          });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          error: 'Unauthorized',
          message: 'Invalid webhook signature'
        });
      });

      test('should accept request with valid webhook signature', async () => {
        process.env.CALENDLY_WEBHOOK_SECRET = 'test-secret';
        const crypto = require('crypto');
        
        const payload = {
          event: 'invitee.created',
          payload: {
            email: 'test@example.com',
            name: 'Test User',
            scheduled_event: {
              start_time: '2024-02-01T10:00:00Z',
              end_time: '2024-02-01T11:00:00Z'
            }
          }
        };
        
        const signature = crypto
          .createHmac('sha256', process.env.CALENDLY_WEBHOOK_SECRET)
          .update(JSON.stringify(payload))
          .digest('hex');

        Lead.findOne.mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          update: jest.fn().mockResolvedValue(true)
        });

        const response = await request(app)
          .post('/webhooks/calendly')
          .set('X-Calendly-Hook-Signature', signature)
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Webhook processed successfully'
        });
      });
    });

    describe('Event Processing', () => {
      let validSignature;
      
      beforeEach(() => {
        process.env.CALENDLY_WEBHOOK_SECRET = 'test-secret';
        const crypto = require('crypto');
        
        validSignature = (payload) => {
          return crypto
            .createHmac('sha256', process.env.CALENDLY_WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');
        };
      });

      describe('invitee.created event', () => {
        test('should process invitee.created event successfully', async () => {
          const payload = {
            event: 'invitee.created',
            payload: {
              email: 'test@example.com',
              name: 'Test User',
              scheduled_event: {
                start_time: '2024-02-01T10:00:00Z',
                end_time: '2024-02-01T11:00:00Z',
                event_type: {
                  name: 'Consultation Call'
                }
              },
              questions_and_answers: [
                {
                  question: 'What is your company?',
                  answer: 'Test Corp'
                }
              ]
            }
          };

          const mockLead = {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            isQualified: false,
            update: jest.fn().mockResolvedValue(true)
          };

          Lead.findOne.mockResolvedValue(mockLead);
          emailService.sendMeetingConfirmation = jest.fn().mockResolvedValue({ success: true });

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(200);
          expect(Lead.findOne).toHaveBeenCalledWith({
            where: { email: 'test@example.com' }
          });
          expect(mockLead.update).toHaveBeenCalledWith({
            isQualified: true,
            meetingScheduled: true,
            meetingDate: '2024-02-01T10:00:00Z',
            calendlyEventType: 'Consultation Call',
            lastContactDate: expect.any(Date)
          });
          expect(emailService.sendMeetingConfirmation).toHaveBeenCalledWith({
            email: 'test@example.com',
            name: 'Test User',
            meetingDate: '2024-02-01T10:00:00Z',
            meetingType: 'Consultation Call'
          });
        });

        test('should create new lead if not exists', async () => {
          const payload = {
            event: 'invitee.created',
            payload: {
              email: 'new@example.com',
              name: 'New User',
              scheduled_event: {
                start_time: '2024-02-01T10:00:00Z',
                end_time: '2024-02-01T11:00:00Z'
              },
              questions_and_answers: [
                {
                  question: 'What is your company?',
                  answer: 'New Corp'
                },
                {
                  question: 'Phone number',
                  answer: '555-1234'
                }
              ]
            }
          };

          Lead.findOne.mockResolvedValue(null);
          Lead.create.mockResolvedValue({
            id: 2,
            email: 'new@example.com',
            name: 'New User'
          });

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(200);
          expect(Lead.create).toHaveBeenCalledWith({
            email: 'new@example.com',
            name: 'New User',
            company: 'New Corp',
            phone: '555-1234',
            source: 'calendly',
            isQualified: true,
            meetingScheduled: true,
            meetingDate: '2024-02-01T10:00:00Z',
            lastContactDate: expect.any(Date)
          });
        });

        test('should handle missing scheduled_event gracefully', async () => {
          const payload = {
            event: 'invitee.created',
            payload: {
              email: 'test@example.com',
              name: 'Test User'
            }
          };

          Lead.findOne.mockResolvedValue({
            id: 1,
            email: 'test@example.com',
            update: jest.fn().mockResolvedValue(true)
          });

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(200);
        });
      });

      describe('invitee.canceled event', () => {
        test('should process invitee.canceled event successfully', async () => {
          const payload = {
            event: 'invitee.canceled',
            payload: {
              email: 'test@example.com',
              name: 'Test User',
              canceled_at: '2024-01-30T15:00:00Z',
              cancellation: {
                reason: 'Rescheduling'
              }
            }
          };

          const mockLead = {
            id: 1,
            email: 'test@example.com',
            update: jest.fn().mockResolvedValue(true)
          };

          Lead.findOne.mockResolvedValue(mockLead);
          emailService.sendMeetingCancellation = jest.fn().mockResolvedValue({ success: true });

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(200);
          expect(mockLead.update).toHaveBeenCalledWith({
            meetingScheduled: false,
            meetingCanceled: true,
            meetingCanceledAt: '2024-01-30T15:00:00Z',
            cancellationReason: 'Rescheduling'
          });
          expect(emailService.sendMeetingCancellation).toHaveBeenCalledWith({
            email: 'test@example.com',
            name: 'Test User',
            reason: 'Rescheduling'
          });
        });

        test('should handle canceled event for non-existent lead', async () => {
          const payload = {
            event: 'invitee.canceled',
            payload: {
              email: 'nonexistent@example.com',
              name: 'Test User'
            }
          };

          Lead.findOne.mockResolvedValue(null);

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(200);
          expect(Lead.create).not.toHaveBeenCalled();
        });
      });

      describe('Unsupported Events', () => {
        test('should acknowledge unsupported events', async () => {
          const payload = {
            event: 'routing_form.submission',
            payload: {
              email: 'test@example.com'
            }
          };

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(200);
          expect(response.body).toEqual({
            success: true,
            message: 'Event acknowledged but not processed',
            event: 'routing_form.submission'
          });
        });
      });

      describe('Error Handling', () => {
        test('should handle database errors gracefully', async () => {
          const payload = {
            event: 'invitee.created',
            payload: {
              email: 'test@example.com',
              name: 'Test User'
            }
          };

          Lead.findOne.mockRejectedValue(new Error('Database connection error'));

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(500);
          expect(response.body).toEqual({
            error: 'Internal server error',
            message: 'Failed to process webhook'
          });
          expect(logger.error).toHaveBeenCalledWith(
            'Calendly webhook error:',
            expect.any(Error)
          );
        });

        test('should handle email service errors without failing webhook', async () => {
          const payload = {
            event: 'invitee.created',
            payload: {
              email: 'test@example.com',
              name: 'Test User',
              scheduled_event: {
                start_time: '2024-02-01T10:00:00Z'
              }
            }
          };

          Lead.findOne.mockResolvedValue({
            id: 1,
            update: jest.fn().mockResolvedValue(true)
          });
          
          emailService.sendMeetingConfirmation = jest.fn()
            .mockRejectedValue(new Error('Email service error'));

          const response = await request(app)
            .post('/webhooks/calendly')
            .set('X-Calendly-Hook-Signature', validSignature(payload))
            .send(payload);

          expect(response.status).toBe(200);
          expect(logger.error).toHaveBeenCalledWith(
            'Failed to send meeting confirmation email:',
            expect.any(Error)
          );
        });
      });
    });
  });

  describe('GET /webhooks/calendly/health', () => {
    test('should return health check status', async () => {
      const response = await request(app)
        .get('/webhooks/calendly/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'calendly-webhook',
        timestamp: expect.any(String)
      });
    });
  });
});