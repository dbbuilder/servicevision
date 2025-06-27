const emailService = require('../emailService');
const sgMail = require('@sendgrid/mail');
const { getConfig } = require('../../config/environment');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('@sendgrid/mail');
jest.mock('../../config/environment');
jest.mock('../../utils/logger');

describe('Email Service', () => {
  const mockConfig = {
    SENDGRID_API_KEY: 'test-api-key',
    SENDGRID_FROM_EMAIL: 'test@servicevision.com',
    NODE_ENV: 'test'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockReturnValue(mockConfig);
    sgMail.send.mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'msg-123' } }]);
    
    // Clear the email queue between tests
    emailService.clearQueue();
  });

  describe('initialization', () => {
    test('should set SendGrid API key on initialization', () => {
      // Re-require to trigger initialization
      jest.resetModules();
      
      // Re-apply mocks after reset
      jest.mock('@sendgrid/mail');
      jest.mock('../../config/environment');
      jest.mock('../../utils/logger');
      
      const { getConfig: getConfigMock } = require('../../config/environment');
      const sgMailMock = require('@sendgrid/mail');
      
      getConfigMock.mockReturnValue(mockConfig);
      
      require('../emailService');
      
      expect(sgMailMock.setApiKey).toHaveBeenCalledWith('test-api-key');
    });
  });

  describe('sendWelcomeEmail', () => {
    test('should send welcome email with correct template', async () => {
      const recipient = {
        email: 'user@example.com',
        name: 'John Doe'
      };

      const result = await emailService.sendWelcomeEmail(recipient);

      expect(sgMail.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: {
          email: 'test@servicevision.com',
          name: 'ServiceVision Team'
        },
        subject: 'Welcome to ServiceVision, John Doe!',
        html: expect.stringContaining('Welcome to ServiceVision'),
        text: expect.stringContaining('Welcome to ServiceVision')
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    test('should handle missing name gracefully', async () => {
      const recipient = {
        email: 'user@example.com'
      };

      const result = await emailService.sendWelcomeEmail(recipient);

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Welcome to ServiceVision!'
        })
      );

      expect(result.success).toBe(true);
    });

    test('should handle SendGrid errors', async () => {
      sgMail.send.mockRejectedValue(new Error('SendGrid API Error'));

      const result = await emailService.sendWelcomeEmail({
        email: 'user@example.com',
        name: 'John'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('sendLeadNotification', () => {
    test('should send lead notification with summary', async () => {
      const leadData = {
        email: 'lead@example.com',
        name: 'Jane Smith',
        company: 'Tech Corp',
        executiveSummary: 'Interested in AI solutions for process optimization.'
      };

      const result = await emailService.sendLeadNotification(leadData);

      expect(sgMail.send).toHaveBeenCalledWith({
        to: 'lead@example.com',
        from: {
          email: 'test@servicevision.com',
          name: 'ServiceVision Team'
        },
        subject: 'Your ServiceVision Consultation Summary',
        html: expect.stringContaining('Tech Corp'),
        text: expect.stringContaining('Interested in AI solutions')
      });

      expect(result.success).toBe(true);
    });

    test('should include calendar link when provided', async () => {
      const leadData = {
        email: 'lead@example.com',
        name: 'Jane Smith',
        calendarLink: 'https://calendly.com/servicevision/consultation'
      };

      const result = await emailService.sendLeadNotification(leadData);

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Schedule Your Consultation')
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendDrawingWinnerNotification', () => {
    test('should send winner notification email', async () => {
      const winnerData = {
        email: 'winner@example.com',
        name: 'Lucky Winner',
        prizeDetails: {
          type: 'free_consultation',
          value: 500,
          duration: '1 hour'
        }
      };

      const result = await emailService.sendDrawingWinnerNotification(winnerData);

      expect(sgMail.send).toHaveBeenCalledWith({
        to: 'winner@example.com',
        from: {
          email: 'test@servicevision.com',
          name: 'ServiceVision Team'
        },
        subject: 'Congratulations! You Won a Free Consultation',
        html: expect.stringContaining('Congratulations'),
        html: expect.stringContaining('free consultation'),
        text: expect.stringContaining('You have won')
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendWithRetry', () => {
    test('should retry failed emails up to 3 times', async () => {
      sgMail.send
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce([{ statusCode: 202 }]);

      const emailData = {
        to: 'retry@example.com',
        subject: 'Test Retry',
        content: 'Test content'
      };

      const result = await emailService.sendWithRetry(emailData);

      expect(sgMail.send).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    test('should fail after max retries', async () => {
      sgMail.send.mockRejectedValue(new Error('Permanent failure'));

      const emailData = {
        to: 'fail@example.com',
        subject: 'Test Fail',
        content: 'Test content'
      };

      const result = await emailService.sendWithRetry(emailData, 3);

      expect(sgMail.send).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(logger.error).toHaveBeenCalled();
    });

    test('should wait between retries with exponential backoff', async () => {
      jest.useFakeTimers();
      
      sgMail.send
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'msg-123' } }]);

      const emailData = {
        to: 'backoff@example.com',
        subject: 'Test Backoff',
        content: 'Test content'
      };

      const promise = emailService.sendWithRetry(emailData);
      
      // Wait for all timers to complete
      jest.runAllTimers();
      
      const result = await promise;
      
      // Should have made 2 attempts with delay between them
      expect(sgMail.send).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      
      jest.useRealTimers();
    });
  });

  describe('email templates', () => {
    test('should generate valid HTML templates', async () => {
      const templates = emailService.getEmailTemplates();
      
      expect(templates.welcome).toBeDefined();
      expect(templates.leadNotification).toBeDefined();
      expect(templates.drawingWinner).toBeDefined();
      
      // Verify template structure
      const welcomeHtml = templates.welcome({ name: 'Test User' });
      expect(welcomeHtml).toContain('<!DOCTYPE html>');
      expect(welcomeHtml).toContain('Test User');
    });

    test('should handle template variables safely', async () => {
      const templates = emailService.getEmailTemplates();
      
      // Test with potentially dangerous input
      const maliciousInput = '<script>alert("XSS")</script>';
      const html = templates.welcome({ name: maliciousInput });
      
      // Should escape HTML
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('email queue', () => {
    test('should queue emails when service is unavailable', async () => {
      sgMail.send.mockRejectedValue(new Error('Service Unavailable'));
      
      const result = await emailService.queueEmail({
        to: 'queue@example.com',
        subject: 'Queued Email',
        content: 'This should be queued'
      });
      
      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(result.queueId).toBeDefined();
    });

    test('should process queued emails when service recovers', async () => {
      // First, queue an email
      await emailService.queueEmail({
        to: 'process@example.com',
        subject: 'Process Queue',
        content: 'Process this'
      });
      
      // Mock successful send
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);
      
      // Process queue
      const processed = await emailService.processEmailQueue();
      
      expect(processed.total).toBe(1);
      expect(processed.successful).toBe(1);
      expect(processed.failed).toBe(0);
    });
  });

  describe('development mode', () => {
    test('should log emails instead of sending in development', async () => {
      // Re-require to pick up new config
      jest.resetModules();
      
      // Re-apply mocks after reset
      jest.mock('@sendgrid/mail');
      jest.mock('../../config/environment');
      jest.mock('../../utils/logger');
      
      const { getConfig: getConfigMock } = require('../../config/environment');
      const sgMailMock = require('@sendgrid/mail');
      const loggerMock = require('../../utils/logger');
      
      getConfigMock.mockReturnValue({
        ...mockConfig,
        NODE_ENV: 'development'
      });
      
      sgMailMock.send = jest.fn();
      loggerMock.info = jest.fn();
      
      const devEmailService = require('../emailService');
      
      const result = await devEmailService.sendWelcomeEmail({
        email: 'dev@example.com',
        name: 'Dev User'
      });
      
      expect(sgMailMock.send).not.toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining('Development mode'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.development).toBe(true);
    });
  });
});