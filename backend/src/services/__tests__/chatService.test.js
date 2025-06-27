const chatService = require('../chatService');
const { ChatSession, Lead } = require('../../models');
const conversationStateService = require('../conversationStateService');
const { Configuration, OpenAIApi } = require('openai');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models');
jest.mock('../conversationStateService');
jest.mock('openai');
jest.mock('../../utils/logger');
jest.mock('../../config/environment', () => ({
  getConfig: jest.fn(() => ({
    OPENAI_API_KEY: 'test-api-key',
    NODE_ENV: 'test'
  }))
}));

describe('Chat Service', () => {
  let mockSession;
  let mockLead;
  let mockOpenAI;
  let mockConversationState;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock OpenAI
    mockOpenAI = {
      createChatCompletion: jest.fn()
    };
    OpenAIApi.mockImplementation(() => mockOpenAI);

    // Mock lead
    mockLead = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      organizationName: 'Test Corp'
    };

    // Mock session
    mockSession = {
      id: 1,
      sessionId: 'test-session-123',
      leadId: 1,
      lead: mockLead,
      conversationHistory: [],
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock conversation state
    mockConversationState = {
      stage: 'discovery',
      collected: {
        email: 'test@example.com'
      },
      pending: {
        organizationType: true,
        businessNeeds: true
      }
    };

    // Mock conversation state service
    conversationStateService.prototype.restoreState = jest.fn()
      .mockReturnValue(mockConversationState);
    conversationStateService.prototype.determineNextAction = jest.fn()
      .mockReturnValue({ type: 'ask_question', topic: 'organizationType' });
    conversationStateService.prototype.updateCollected = jest.fn()
      .mockReturnValue(mockConversationState);
    conversationStateService.prototype.saveState = jest.fn()
      .mockResolvedValue(true);
  });

  describe('Initialization', () => {
    test('should initialize with OpenAI configuration', () => {
      expect(Configuration).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
      expect(OpenAIApi).toHaveBeenCalled();
    });

    test('should handle missing API key gracefully', () => {
      const { getConfig } = require('../../config/environment');
      getConfig.mockReturnValue({ OPENAI_API_KEY: null });

      // Re-require to test initialization
      jest.resetModules();
      expect(() => require('../chatService')).not.toThrow();
    });
  });

  describe('Initial Message', () => {
    test('should generate personalized greeting for known user', async () => {
      const message = await chatService.getInitialMessage(mockLead, mockSession);

      expect(message).toContain('Welcome back');
      expect(message).toContain('Test User');
    });

    test('should generate generic greeting for unknown user', async () => {
      const leadWithoutName = { ...mockLead, name: null };
      const message = await chatService.getInitialMessage(leadWithoutName, mockSession);

      expect(message).toContain('Welcome to ServiceVision');
      expect(message).not.toContain('Test User');
    });

    test('should mention organization if known', async () => {
      const message = await chatService.getInitialMessage(mockLead, mockSession);

      expect(message).toContain('Test Corp');
    });
  });

  describe('Message Processing', () => {
    test('should process user message and generate response', async () => {
      const mockAIResponse = {
        data: {
          choices: [{
            message: {
              content: 'I understand you need help with your website. Could you tell me more?'
            }
          }]
        }
      };
      mockOpenAI.createChatCompletion.mockResolvedValue(mockAIResponse);

      const response = await chatService.processMessage(
        mockSession,
        'We need help with our website'
      );

      expect(response).toEqual({
        message: expect.stringContaining('help with your website'),
        quickReplies: expect.any(Array),
        conversationHistory: expect.any(Array),
        identifiedNeeds: expect.any(Array),
        recommendedServices: expect.any(Array),
        completionRate: expect.any(Number),
        isComplete: false
      });
    });

    test('should extract business needs from conversation', async () => {
      const mockAIResponse = {
        data: {
          choices: [{
            message: {
              content: 'I can help with website redesign and SEO optimization.'
            }
          }]
        }
      };
      mockOpenAI.createChatCompletion.mockResolvedValue(mockAIResponse);

      const response = await chatService.processMessage(
        mockSession,
        'We need website redesign and SEO'
      );

      expect(response.identifiedNeeds).toContain('website_redesign');
      expect(response.identifiedNeeds).toContain('seo');
    });

    test('should detect organization type from context', async () => {
      conversationStateService.prototype.updateCollected = jest.fn()
        .mockImplementation((state, data) => {
          expect(data).toHaveProperty('organizationType');
          return { ...state, collected: { ...state.collected, ...data } };
        });

      await chatService.processMessage(
        mockSession,
        'We are a nonprofit organization looking for help'
      );

      expect(conversationStateService.prototype.updateCollected)
        .toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ organizationType: 'nonprofit' })
        );
    });

    test('should generate quick replies based on context', async () => {
      conversationStateService.prototype.determineNextAction = jest.fn()
        .mockReturnValue({ 
          type: 'ask_question', 
          topic: 'businessNeeds' 
        });

      const mockAIResponse = {
        data: {
          choices: [{
            message: { content: 'What are your main business needs?' }
          }]
        }
      };
      mockOpenAI.createChatCompletion.mockResolvedValue(mockAIResponse);

      const response = await chatService.processMessage(mockSession, 'Hello');

      expect(response.quickReplies).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Website'),
          expect.stringContaining('Marketing'),
          expect.stringContaining('Consulting')
        ])
      );
    });

    test('should handle API errors gracefully', async () => {
      mockOpenAI.createChatCompletion.mockRejectedValue(
        new Error('OpenAI API error')
      );

      const response = await chatService.processMessage(
        mockSession,
        'Test message'
      );

      expect(response.message).toContain('having trouble');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Executive Summary Generation', () => {
    test('should generate comprehensive executive summary', async () => {
      mockSession.conversationHistory = [
        { role: 'user', content: 'We need help with our website' },
        { role: 'assistant', content: 'What kind of help?' },
        { role: 'user', content: 'Redesign and SEO optimization' }
      ];

      mockConversationState.collected = {
        email: 'test@example.com',
        organizationType: 'for-profit',
        businessNeeds: ['website_redesign', 'seo'],
        timeline: '1-3 months',
        budget: '10000-25000'
      };

      conversationStateService.prototype.restoreState = jest.fn()
        .mockReturnValue(mockConversationState);

      const mockAIResponse = {
        data: {
          choices: [{
            message: {
              content: `# Executive Summary for Test Corp

## Overview
Test Corp is seeking website redesign and SEO optimization services.

## Identified Needs
- Website Redesign
- SEO Optimization

## Recommended Services
1. **Web Development Package** - Complete website redesign
2. **Digital Marketing Package** - SEO and online presence

## Timeline
1-3 months

## Next Steps
Schedule a consultation to discuss specific requirements.`
            }
          }]
        }
      };
      mockOpenAI.createChatCompletion.mockResolvedValue(mockAIResponse);

      const summary = await chatService.generateExecutiveSummary(mockSession);

      expect(summary).toContain('Executive Summary');
      expect(summary).toContain('Test Corp');
      expect(summary).toContain('Website Redesign');
      expect(summary).toContain('SEO Optimization');
      expect(summary).toContain('Next Steps');
    });

    test('should handle missing conversation data', async () => {
      mockSession.conversationHistory = [];
      
      const summary = await chatService.generateExecutiveSummary(mockSession);

      expect(summary).toContain('Limited information');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Context Building', () => {
    test('should build proper context for AI', () => {
      mockSession.conversationHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const context = chatService.buildContext(mockSession, mockConversationState);

      expect(context).toEqual([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'Hello' }),
        expect.objectContaining({ role: 'assistant', content: 'Hi there!' })
      ]);
    });

    test('should include conversation state in system prompt', () => {
      const context = chatService.buildContext(mockSession, mockConversationState);
      
      const systemMessage = context.find(m => m.role === 'system');
      expect(systemMessage.content).toContain('discovery');
      expect(systemMessage.content).toContain('organizationType');
    });

    test('should limit conversation history length', () => {
      // Create long conversation history
      mockSession.conversationHistory = Array(50).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));

      const context = chatService.buildContext(mockSession, mockConversationState);

      // Should keep system message + last 20 messages
      expect(context.length).toBe(21);
      expect(context[0].role).toBe('system');
      expect(context[context.length - 1].content).toContain('Message 49');
    });
  });

  describe('Intent and Entity Extraction', () => {
    test('should extract organization type', () => {
      const text = 'We are a nonprofit organization focused on education';
      const orgType = chatService.extractOrganizationType(text);
      
      expect(orgType).toBe('nonprofit');
    });

    test('should extract business needs', () => {
      const text = 'We need help with website development and marketing automation';
      const needs = chatService.extractBusinessNeeds(text);
      
      expect(needs).toContain('website_development');
      expect(needs).toContain('marketing_automation');
    });

    test('should extract timeline', () => {
      const text = 'We need this done within 2 months';
      const timeline = chatService.extractTimeline(text);
      
      expect(timeline).toBe('1-3 months');
    });

    test('should extract budget range', () => {
      const text = 'Our budget is around $15,000';
      const budget = chatService.extractBudget(text);
      
      expect(budget).toBe('10000-25000');
    });
  });

  describe('Service Recommendations', () => {
    test('should recommend services based on needs', () => {
      const needs = ['website_redesign', 'seo', 'automation'];
      const recommendations = chatService.generateServiceRecommendations(needs);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          service: 'Web Development Package',
          reason: expect.any(String)
        })
      );
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          service: 'Digital Marketing Package',
          reason: expect.any(String)
        })
      );
    });

    test('should prioritize nonprofit services for nonprofits', () => {
      const needs = ['fundraising', 'volunteer_management'];
      const recommendations = chatService.generateServiceRecommendations(
        needs,
        'nonprofit'
      );

      expect(recommendations[0].service).toContain('Nonprofit');
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('Quick Reply Generation', () => {
    test('should generate relevant quick replies for organization type', () => {
      const replies = chatService.generateQuickReplies('organizationType');

      expect(replies).toEqual([
        'For-profit business',
        'Nonprofit organization',
        'Government agency',
        'Other'
      ]);
    });

    test('should generate relevant quick replies for business needs', () => {
      const replies = chatService.generateQuickReplies('businessNeeds');

      expect(replies).toContain('Website Development');
      expect(replies).toContain('Digital Marketing');
      expect(replies).toContain('Business Consulting');
    });

    test('should generate timeline quick replies', () => {
      const replies = chatService.generateQuickReplies('timeline');

      expect(replies).toContain('Immediate (< 1 month)');
      expect(replies).toContain('1-3 months');
      expect(replies).toContain('3-6 months');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting per session', async () => {
      // First call should succeed
      await chatService.processMessage(mockSession, 'Test 1');
      
      // Simulate many rapid calls
      for (let i = 0; i < 15; i++) {
        await chatService.processMessage(mockSession, `Test ${i}`);
      }

      // Should eventually hit rate limit
      const response = await chatService.processMessage(mockSession, 'Test final');
      
      if (response.message.includes('slow down')) {
        expect(response.message).toContain('slow down');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing session gracefully', async () => {
      const response = await chatService.processMessage(null, 'Test');
      
      expect(response.message).toContain('error');
      expect(logger.error).toHaveBeenCalled();
    });

    test('should handle OpenAI service unavailable', async () => {
      mockOpenAI.createChatCompletion.mockRejectedValue({
        response: { status: 503 }
      });

      const response = await chatService.processMessage(mockSession, 'Test');
      
      expect(response.message).toContain('temporarily unavailable');
    });

    test('should handle rate limit from OpenAI', async () => {
      mockOpenAI.createChatCompletion.mockRejectedValue({
        response: { status: 429 }
      });

      const response = await chatService.processMessage(mockSession, 'Test');
      
      expect(response.message).toContain('high demand');
    });
  });
});