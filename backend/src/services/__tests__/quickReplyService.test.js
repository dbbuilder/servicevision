const quickReplyService = require('../quickReplyService');
const { ChatSession } = require('../../models');
const conversationStateService = require('../conversationStateService');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models');
jest.mock('../conversationStateService');
jest.mock('../../utils/logger');

describe('Quick Reply Service', () => {
  let mockSession;
  let mockState;

  beforeEach(() => {
    jest.clearAllMocks();

    mockState = {
      stage: 'discovery',
      collected: {
        email: 'test@example.com'
      },
      pending: {
        organizationType: true,
        businessNeeds: true,
        timeline: false,
        budget: false
      }
    };

    mockSession = {
      id: 1,
      sessionId: 'test-session-123',
      conversationHistory: [],
      state: mockState
    };
  });

  describe('Generate Quick Replies', () => {
    test('should generate context-aware quick replies', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, 'organizationType');
      
      expect(replies).toBeInstanceOf(Array);
      expect(replies.length).toBeGreaterThan(0);
      expect(replies.length).toBeLessThanOrEqual(5);
    });

    test('should generate organization type options', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, 'organizationType');
      
      expect(replies).toContain('For-profit business');
      expect(replies).toContain('Nonprofit organization');
      expect(replies).toContain('Government agency');
    });

    test('should generate business needs options', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, 'businessNeeds');
      
      expect(replies).toContain('Website Development');
      expect(replies).toContain('Digital Marketing');
      expect(replies).toContain('Business Consulting');
    });

    test('should generate timeline options', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, 'timeline');
      
      expect(replies).toContain('Immediate (< 1 month)');
      expect(replies).toContain('1-3 months');
      expect(replies).toContain('3-6 months');
    });

    test('should generate budget options', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, 'budget');
      
      expect(replies).toContain('Under $10k');
      expect(replies).toContain('$10k - $25k');
      expect(replies).toContain('Over $50k');
    });

    test('should adapt replies based on organization type', () => {
      mockState.collected.organizationType = 'nonprofit';
      const replies = quickReplyService.generateQuickReplies(mockSession, 'businessNeeds');
      
      expect(replies).toContain('Fundraising Support');
      expect(replies).toContain('Volunteer Management');
    });

    test('should provide fallback options', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, 'unknown');
      
      expect(replies).toContain('Tell me more');
      expect(replies).toContain('Schedule a call');
    });
  });

  describe('Dynamic Reply Generation', () => {
    test('should generate replies based on conversation context', () => {
      mockSession.conversationHistory = [
        { role: 'user', content: 'I need help with my website' },
        { role: 'assistant', content: 'What aspects of your website need improvement?' }
      ];
      
      const replies = quickReplyService.generateDynamicReplies(mockSession);
      
      expect(replies).toContain('Complete redesign');
      expect(replies).toContain('Better SEO');
      expect(replies).toContain('Performance issues');
    });

    test('should suggest follow-up actions based on stage', () => {
      mockState.stage = 'qualification';
      mockState.collected.organizationType = 'for-profit';
      mockState.collected.businessNeeds = ['website_redesign'];
      
      const replies = quickReplyService.generateDynamicReplies(mockSession);
      
      expect(replies.some(r => r.includes('timeline') || r.includes('month'))).toBe(true);
    });

    test('should provide completion options when near end', () => {
      mockState.stage = 'closing';
      mockState.pending = {};
      
      const replies = quickReplyService.generateDynamicReplies(mockSession);
      
      expect(replies).toContain('Get my summary');
      expect(replies).toContain('Schedule consultation');
    });
  });

  describe('Smart Suggestions', () => {
    test('should analyze user intent and suggest relevant replies', () => {
      const userMessage = 'Our nonprofit needs better donor management';
      const suggestions = quickReplyService.getSmartSuggestions(userMessage, mockSession);
      
      expect(suggestions).toContain('Donor database setup');
      expect(suggestions).toContain('Automated thank-you emails');
      expect(suggestions).toContain('Donation tracking');
    });

    test('should detect urgency and adjust suggestions', () => {
      const userMessage = 'We need this done ASAP, our current site is broken';
      const suggestions = quickReplyService.getSmartSuggestions(userMessage, mockSession);
      
      expect(suggestions).toContain('Emergency fix needed');
      expect(suggestions).toContain('Temporary solution');
      expect(suggestions).toContain('Full replacement');
    });

    test('should handle budget concerns', () => {
      const userMessage = 'What are your most affordable options?';
      const suggestions = quickReplyService.getSmartSuggestions(userMessage, mockSession);
      
      expect(suggestions).toContain('Basic package');
      expect(suggestions).toContain('Phased approach');
      expect(suggestions).toContain('Payment plans available');
    });
  });

  describe('Reply Validation', () => {
    test('should validate quick reply selection', () => {
      const isValid = quickReplyService.validateReply(
        'For-profit business',
        'organizationType'
      );
      
      expect(isValid).toBe(true);
    });

    test('should reject invalid replies', () => {
      const isValid = quickReplyService.validateReply(
        'Random text',
        'organizationType'
      );
      
      expect(isValid).toBe(false);
    });

    test('should handle custom replies', () => {
      const isValid = quickReplyService.validateReply(
        'Other',
        'organizationType'
      );
      
      expect(isValid).toBe(true);
    });
  });

  describe('Reply Actions', () => {
    test('should map replies to conversation actions', () => {
      const action = quickReplyService.getReplyAction('Schedule a call');
      
      expect(action).toEqual({
        type: 'schedule_call',
        data: {
          source: 'quick_reply'
        }
      });
    });

    test('should handle business need selections', () => {
      const action = quickReplyService.getReplyAction('Website Development');
      
      expect(action).toEqual({
        type: 'select_need',
        data: {
          need: 'website_development'
        }
      });
    });

    test('should handle timeline selections', () => {
      const action = quickReplyService.getReplyAction('1-3 months');
      
      expect(action).toEqual({
        type: 'set_timeline',
        data: {
          timeline: '1-3 months'
        }
      });
    });
  });

  describe('Personalization', () => {
    test('should personalize replies based on user data', () => {
      mockSession.lead = {
        name: 'John Doe',
        organizationName: 'Tech Corp'
      };
      
      const replies = quickReplyService.generatePersonalizedReplies(mockSession);
      
      expect(replies.some(r => r.includes('Tech Corp'))).toBe(true);
    });

    test('should adapt language based on organization type', () => {
      mockState.collected.organizationType = 'nonprofit';
      const replies = quickReplyService.generateQuickReplies(mockSession, 'closing');
      
      expect(replies.some(r => 
        r.includes('mission') || 
        r.includes('impact') || 
        r.includes('community')
      )).toBe(true);
    });
  });

  describe('Reply Limits', () => {
    test('should limit number of quick replies', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, 'businessNeeds');
      
      expect(replies.length).toBeLessThanOrEqual(5);
    });

    test('should prioritize most relevant options', () => {
      mockSession.conversationHistory = [
        { role: 'user', content: 'We need help with online fundraising' }
      ];
      
      const replies = quickReplyService.generateDynamicReplies(mockSession);
      
      // Should prioritize fundraising-related options
      expect(replies[0]).toMatch(/fundrais|donation|donor/i);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing session data', () => {
      const replies = quickReplyService.generateQuickReplies(null, 'organizationType');
      
      expect(replies).toBeInstanceOf(Array);
      expect(replies.length).toBeGreaterThan(0);
    });

    test('should handle invalid topic gracefully', () => {
      const replies = quickReplyService.generateQuickReplies(mockSession, null);
      
      expect(replies).toBeInstanceOf(Array);
      expect(replies).toContain('Tell me more');
    });
  });

  describe('Analytics', () => {
    test('should track quick reply usage', () => {
      const trackingSpy = jest.spyOn(quickReplyService, 'trackReplyUsage');
      
      quickReplyService.handleQuickReplySelection(
        mockSession,
        'Website Development'
      );
      
      expect(trackingSpy).toHaveBeenCalledWith(
        mockSession.sessionId,
        'Website Development'
      );
    });

    test('should analyze reply effectiveness', () => {
      const analytics = quickReplyService.getReplyAnalytics();
      
      expect(analytics).toHaveProperty('mostUsed');
      expect(analytics).toHaveProperty('conversionRate');
      expect(analytics).toHaveProperty('avgRepliesPerSession');
    });
  });
});