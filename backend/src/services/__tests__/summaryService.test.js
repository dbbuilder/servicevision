const summaryService = require('../summaryService');
const { ChatSession, Lead } = require('../../models');
const emailService = require('../emailService');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models');
jest.mock('../emailService', () => ({
  sendEmail: jest.fn()
}));
jest.mock('../../utils/logger');

describe('Summary Service', () => {
  let mockSession;
  let mockLead;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLead = {
      id: 1,
      email: 'john@techcorp.com',
      name: 'John Doe',
      organizationName: 'TechCorp Solutions',
      phone: '+1-555-0123'
    };

    mockSession = {
      id: 1,
      sessionId: 'test-session-123',
      leadId: 1,
      lead: mockLead,
      conversationHistory: [
        { role: 'user', content: 'We need help with our website' },
        { role: 'assistant', content: 'What specific challenges are you facing?' },
        { role: 'user', content: 'Our website is outdated and we need better SEO' }
      ],
      state: {
        collected: {
          organizationType: 'for-profit',
          businessNeeds: ['website_redesign', 'seo'],
          timeline: '1-3 months',
          budget: '10000-25000'
        }
      },
      identifiedNeeds: ['website_redesign', 'seo', 'marketing_automation'],
      recommendedServices: [
        { service: 'Web Development Package', reason: 'Complete website redesign' },
        { service: 'Digital Marketing Package', reason: 'SEO optimization' }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
  });

  describe('Generate Executive Summary', () => {
    test('should generate comprehensive executive summary', async () => {
      const summary = await summaryService.generateExecutiveSummary(mockSession);

      expect(summary).toHaveProperty('html');
      expect(summary).toHaveProperty('text');
      expect(summary).toHaveProperty('data');
      
      expect(summary.html).toContain('Executive Summary');
      expect(summary.html).toContain('TechCorp Solutions');
      expect(summary.html).toContain('Website Redesign');
      expect(summary.html).toContain('SEO');
      expect(summary.html).toContain('Next Steps');
    });

    test('should include all collected information', async () => {
      const summary = await summaryService.generateExecutiveSummary(mockSession);

      expect(summary.html).toContain('For-Profit Business');
      expect(summary.html).toContain('1 to 3 months');
      expect(summary.html).toContain('$10,000 - $25,000');
      expect(summary.text).toContain('John Doe');
    });

    test('should format budget ranges properly', async () => {
      const testCases = [
        { input: '< 5000', expected: 'Under $5,000' },
        { input: '5000-10000', expected: '$5,000 - $10,000' },
        { input: '50000+', expected: 'Over $50,000' }
      ];

      for (const testCase of testCases) {
        mockSession.state.collected.budget = testCase.input;
        const summary = await summaryService.generateExecutiveSummary(mockSession);
        expect(summary.html).toContain(testCase.expected);
      }
    });

    test('should calculate engagement score', async () => {
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.data.engagementScore).toBeDefined();
      expect(summary.data.engagementScore).toBeGreaterThan(0);
      expect(summary.data.engagementScore).toBeLessThanOrEqual(100);
    });

    test('should determine lead quality', async () => {
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.data.leadQuality).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(summary.data.leadQuality);
    });

    test('should handle nonprofit organizations differently', async () => {
      mockSession.state.collected.organizationType = 'nonprofit';
      mockSession.identifiedNeeds = ['fundraising', 'volunteer_management'];
      
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.html).toContain('nonprofit');
      expect(summary.html).toContain('mission');
      expect(summary.data.isNonprofit).toBe(true);
    });

    test('should include recommended next actions', async () => {
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.data.nextActions).toBeDefined();
      expect(Array.isArray(summary.data.nextActions)).toBe(true);
      expect(summary.data.nextActions.length).toBeGreaterThan(0);
    });

    test('should handle missing data gracefully', async () => {
      mockSession.state.collected = {};
      mockSession.identifiedNeeds = [];
      mockSession.recommendedServices = [];
      
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.html).toContain('Executive Summary');
      expect(summary.html).toContain('To be determined');
      expect(summary.data.isComplete).toBe(false);
    });
  });

  describe('Send Summary Email', () => {
    test('should send summary email to lead', async () => {
      emailService.sendEmail.mockResolvedValue({ success: true });
      
      const result = await summaryService.sendSummaryEmail(mockSession);
      
      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@techcorp.com',
          subject: expect.stringContaining('Executive Summary'),
          html: expect.stringContaining('Executive Summary'),
          text: expect.stringContaining('EXECUTIVE SUMMARY')
        })
      );
    });

    test('should include lead name in email subject', async () => {
      emailService.sendEmail.mockResolvedValue({ success: true });
      
      await summaryService.sendSummaryEmail(mockSession);
      
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('John Doe')
        })
      );
    });

    test('should save summary to session', async () => {
      emailService.sendEmail.mockResolvedValue({ success: true });
      
      await summaryService.sendSummaryEmail(mockSession);
      
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockSession.executiveSummary).toBeDefined();
      expect(mockSession.summaryGeneratedAt).toBeDefined();
    });

    test('should handle email send failure', async () => {
      emailService.sendEmail.mockResolvedValue({ 
        success: false, 
        error: 'Email service unavailable' 
      });
      
      const result = await summaryService.sendSummaryEmail(mockSession);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service unavailable');
    });

    test('should track summary metrics', async () => {
      emailService.sendEmail.mockResolvedValue({ success: true });
      
      await summaryService.sendSummaryEmail(mockSession);
      
      expect(mockSession.summaryEmailSent).toBe(true);
      expect(mockSession.summaryEmailSentAt).toBeDefined();
    });
  });

  describe('Summary Templates', () => {
    test('should use appropriate template for organization type', async () => {
      const templates = summaryService.getTemplates();
      
      expect(templates).toHaveProperty('for-profit');
      expect(templates).toHaveProperty('nonprofit');
      expect(templates).toHaveProperty('government');
      expect(templates).toHaveProperty('default');
    });

    test('should apply for-profit template', async () => {
      mockSession.state.collected.organizationType = 'for-profit';
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.html).toContain('drive your business forward');
      expect(summary.html).toContain('business goals');
    });

    test('should apply nonprofit template', async () => {
      mockSession.state.collected.organizationType = 'nonprofit';
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.html).toContain('mission');
      expect(summary.html).toContain('impact');
    });

    test('should apply government template', async () => {
      mockSession.state.collected.organizationType = 'government';
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.html).toContain('public service needs');
      expect(summary.html).toContain('serving the public');
    });
  });

  describe('Summary Analytics', () => {
    test('should calculate conversation metrics', async () => {
      const metrics = summaryService.calculateConversationMetrics(mockSession);
      
      expect(metrics).toHaveProperty('messageCount');
      expect(metrics).toHaveProperty('duration');
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('completionRate');
    });

    test('should identify key topics discussed', async () => {
      const topics = summaryService.extractKeyTopics(mockSession);
      
      expect(topics).toContain('website');
      expect(topics).toContain('seo');
      expect(Array.isArray(topics)).toBe(true);
    });

    test('should generate actionable insights', async () => {
      const insights = summaryService.generateInsights(mockSession);
      
      expect(insights).toHaveProperty('urgency');
      expect(insights).toHaveProperty('budgetAlignment');
      expect(insights).toHaveProperty('serviceMatch');
      expect(insights).toHaveProperty('followUpPriority');
    });
  });

  describe('Summary Formatting', () => {
    test('should format currency values correctly', () => {
      const formatted = summaryService.formatCurrency(15000);
      expect(formatted).toBe('$15,000');
    });

    test('should format date ranges appropriately', () => {
      const formatted = summaryService.formatTimeline('1-3 months');
      expect(formatted).toBe('1 to 3 months');
    });

    test('should capitalize service names', () => {
      const formatted = summaryService.formatServiceName('website_redesign');
      expect(formatted).toBe('Website Redesign');
    });

    test('should generate both HTML and plain text versions', async () => {
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary.html).toContain('<h1>');
      expect(summary.html).toContain('</div>');
      expect(summary.text).not.toContain('<h1>');
      expect(summary.text).not.toContain('</div>');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing session data', async () => {
      const summary = await summaryService.generateExecutiveSummary(null);
      
      expect(summary.html).toContain('Unable to generate summary');
      expect(summary.data.error).toBe(true);
    });

    test('should handle invalid conversation history', async () => {
      mockSession.conversationHistory = null;
      
      const summary = await summaryService.generateExecutiveSummary(mockSession);
      
      expect(summary).toBeDefined();
      expect(summary.data.messageCount).toBe(0);
    });

    test('should log errors appropriately', async () => {
      mockSession.save = jest.fn().mockRejectedValue(new Error('Database error'));
      
      await summaryService.sendSummaryEmail(mockSession);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error saving summary to session:',
        expect.any(Error)
      );
    });
  });
});