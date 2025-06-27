const ConversationStateService = require('../conversationStateService');
const { ChatSession, Lead, Message } = require('../../models');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models');
jest.mock('../../utils/logger');

describe('ConversationStateService', () => {
  let service;
  let mockSession;
  let mockLead;

  beforeEach(() => {
    service = new ConversationStateService();
    
    // Create mock lead
    mockLead = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      organizationName: 'Test Corp',
      organizationType: null
    };

    // Create mock session
    mockSession = {
      id: 1,
      sessionId: 'test-session-123',
      leadId: 1,
      lead: mockLead,
      conversationState: {},
      identifiedNeeds: [],
      recommendedServices: [],
      completionRate: 0,
      save: jest.fn().mockResolvedValue(true)
    };

    jest.clearAllMocks();
  });

  describe('State Initialization', () => {
    test('should initialize conversation state', () => {
      const state = service.initializeState(mockSession);

      expect(state).toEqual({
        stage: 'greeting',
        context: {
          leadId: 1,
          sessionId: 'test-session-123',
          startTime: expect.any(Date)
        },
        collected: {
          email: 'test@example.com',
          name: 'Test User',
          organizationName: 'Test Corp'
        },
        pending: {
          organizationType: true,
          businessNeeds: true,
          timeline: true,
          budget: true
        },
        flags: {
          emailVerified: true,
          hasEngaged: false,
          isQualified: false,
          readyForSummary: false
        }
      });
    });

    test('should handle session without lead data', () => {
      const sessionWithoutLead = {
        ...mockSession,
        lead: null
      };

      const state = service.initializeState(sessionWithoutLead);

      expect(state.collected.email).toBeUndefined();
      expect(state.collected.name).toBeUndefined();
      expect(state.flags.emailVerified).toBe(false);
    });
  });

  describe('State Transitions', () => {
    test('should transition from greeting to discovery', () => {
      const state = service.initializeState(mockSession);
      
      const newState = service.transitionTo(state, 'discovery');

      expect(newState.stage).toBe('discovery');
      expect(newState.context.stageHistory).toContain('greeting');
      expect(newState.context.lastTransition).toBeDefined();
    });

    test('should validate allowed transitions', () => {
      const state = {
        stage: 'greeting',
        context: {}
      };

      // Valid transition
      expect(() => service.transitionTo(state, 'discovery')).not.toThrow();

      // Invalid transition
      expect(() => service.transitionTo(state, 'summary')).toThrow('Invalid state transition');
    });

    test('should handle stage-specific logic during transitions', () => {
      const state = {
        stage: 'qualification',
        flags: { isQualified: true },
        context: {}
      };

      const newState = service.transitionTo(state, 'scheduling');

      expect(newState.stage).toBe('scheduling');
      expect(newState.context.qualifiedAt).toBeDefined();
    });
  });

  describe('Information Collection', () => {
    test('should update collected information', () => {
      const state = service.initializeState(mockSession);

      const updated = service.updateCollected(state, {
        organizationType: 'nonprofit',
        businessNeeds: ['website', 'automation']
      });

      expect(updated.collected.organizationType).toBe('nonprofit');
      expect(updated.collected.businessNeeds).toEqual(['website', 'automation']);
      expect(updated.pending.organizationType).toBe(false);
      expect(updated.pending.businessNeeds).toBe(false);
    });

    test('should validate organization type', () => {
      const state = service.initializeState(mockSession);

      const valid = service.updateCollected(state, {
        organizationType: 'nonprofit'
      });
      expect(valid.collected.organizationType).toBe('nonprofit');

      const invalid = service.updateCollected(state, {
        organizationType: 'invalid-type'
      });
      expect(invalid.collected.organizationType).toBeUndefined();
    });

    test('should calculate completion percentage', () => {
      const state = service.initializeState(mockSession);

      expect(service.getCompletionRate(state)).toBe(0.25); // Only email collected

      const updated = service.updateCollected(state, {
        organizationType: 'for-profit',
        businessNeeds: ['consulting'],
        timeline: '3-6 months'
      });

      expect(service.getCompletionRate(updated)).toBe(0.75); // 3 of 4 collected
    });
  });

  describe('Context Analysis', () => {
    test('should analyze conversation context', async () => {
      const messages = [
        { role: 'user', content: 'We need help with our website' },
        { role: 'assistant', content: 'What kind of website help?' },
        { role: 'user', content: 'Redesign and SEO optimization' }
      ];

      const analysis = await service.analyzeContext(messages, mockSession);

      expect(analysis).toEqual({
        intent: 'website_help',
        topics: ['website', 'redesign', 'seo'],
        sentiment: 'neutral',
        urgency: 'medium',
        clarity: 0.8
      });
    });

    test('should detect urgent requests', async () => {
      const messages = [
        { role: 'user', content: 'We urgently need help! Our site is down!' }
      ];

      const analysis = await service.analyzeContext(messages, mockSession);

      expect(analysis.urgency).toBe('high');
      expect(analysis.intent).toBe('emergency_support');
    });

    test('should identify business needs from context', async () => {
      const messages = [
        { role: 'user', content: 'We want to automate our sales process and improve customer tracking' }
      ];

      const analysis = await service.analyzeContext(messages, mockSession);

      expect(analysis.topics).toContain('automation');
      expect(analysis.topics).toContain('sales');
      expect(analysis.topics).toContain('crm');
    });
  });

  describe('Lead Qualification', () => {
    test('should qualify lead based on criteria', () => {
      const state = {
        collected: {
          organizationType: 'for-profit',
          businessNeeds: ['consulting', 'development'],
          timeline: '1-3 months',
          budget: '10000-50000'
        },
        flags: {}
      };

      const result = service.evaluateQualification(state);

      expect(result.isQualified).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.reasons).toContain('budget_adequate');
      expect(result.reasons).toContain('timeline_urgent');
    });

    test('should not qualify lead with insufficient data', () => {
      const state = {
        collected: {
          organizationType: 'for-profit'
        },
        flags: {}
      };

      const result = service.evaluateQualification(state);

      expect(result.isQualified).toBe(false);
      expect(result.score).toBeLessThan(0.5);
      expect(result.reasons).toContain('incomplete_data');
    });

    test('should identify high-value leads', () => {
      const state = {
        collected: {
          organizationType: 'enterprise',
          businessNeeds: ['consulting', 'development', 'support'],
          timeline: 'immediate',
          budget: '50000+'
        },
        flags: {}
      };

      const result = service.evaluateQualification(state);

      expect(result.isQualified).toBe(true);
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.priority).toBe('high');
    });
  });

  describe('Next Action Determination', () => {
    test('should determine next action based on state', () => {
      const state = {
        stage: 'discovery',
        pending: {
          organizationType: true,
          businessNeeds: false
        },
        flags: {}
      };

      const action = service.determineNextAction(state);

      expect(action.type).toBe('ask_question');
      expect(action.topic).toBe('organizationType');
      expect(action.priority).toBe('high');
    });

    test('should prioritize email collection', () => {
      const state = {
        stage: 'discovery',
        collected: {},
        pending: {
          email: true,
          organizationType: true
        },
        flags: { emailVerified: false }
      };

      const action = service.determineNextAction(state);

      expect(action.type).toBe('collect_email');
      expect(action.priority).toBe('critical');
    });

    test('should trigger summary when ready', () => {
      const state = {
        stage: 'qualification',
        collected: {
          email: 'test@example.com',
          organizationType: 'for-profit',
          businessNeeds: ['consulting'],
          timeline: '1-3 months',
          budget: '10000-50000'
        },
        pending: {},
        flags: {
          isQualified: true,
          readyForSummary: true
        }
      };

      const action = service.determineNextAction(state);

      expect(action.type).toBe('generate_summary');
      expect(action.data).toContain('email');
      expect(action.data).toContain('businessNeeds');
    });
  });

  describe('State Persistence', () => {
    test('should save state to session', async () => {
      const state = service.initializeState(mockSession);
      
      await service.saveState(mockSession, state);

      expect(mockSession.conversationState).toEqual(state);
      expect(mockSession.save).toHaveBeenCalled();
    });

    test('should restore state from session', () => {
      const savedState = {
        stage: 'discovery',
        collected: { email: 'test@example.com' }
      };
      
      mockSession.conversationState = savedState;

      const restored = service.restoreState(mockSession);

      expect(restored).toEqual(savedState);
    });

    test('should handle missing state gracefully', () => {
      mockSession.conversationState = null;

      const restored = service.restoreState(mockSession);

      expect(restored.stage).toBe('greeting');
      expect(restored.context).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    test('should track conversation progress', () => {
      const state = {
        stage: 'qualification',
        collected: {
          email: 'test@example.com',
          organizationType: 'nonprofit',
          businessNeeds: ['website']
        },
        pending: {
          timeline: true,
          budget: true
        },
        context: {
          startTime: new Date(Date.now() - 300000) // 5 minutes ago
        }
      };

      const progress = service.getProgress(state);

      expect(progress.currentStage).toBe('qualification');
      expect(progress.completionRate).toBeCloseTo(0.6, 1);
      expect(progress.duration).toBeGreaterThan(0);
      expect(progress.fieldsCollected).toBe(3);
      expect(progress.fieldsPending).toBe(2);
      expect(progress.nextMilestone).toBe('collect_timeline');
    });
  });

  describe('Service Recommendation', () => {
    test('should recommend services based on needs', () => {
      const state = {
        collected: {
          organizationType: 'for-profit',
          businessNeeds: ['website', 'seo', 'automation']
        }
      };

      const recommendations = service.generateRecommendations(state);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          service: 'web_development',
          priority: 'high'
        })
      );
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          service: 'digital_marketing',
          relevance: expect.any(Number)
        })
      );
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          service: 'process_automation',
          priority: 'medium'
        })
      );
    });

    test('should prioritize nonprofit services', () => {
      const state = {
        collected: {
          organizationType: 'nonprofit',
          businessNeeds: ['fundraising', 'volunteer']
        }
      };

      const recommendations = service.generateRecommendations(state);

      expect(recommendations[0].service).toContain('nonprofit');
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('Error Handling', () => {
    test('should handle analysis errors gracefully', async () => {
      const messages = null; // Invalid input

      const analysis = await service.analyzeContext(messages, mockSession);

      expect(analysis.intent).toBe('unknown');
      expect(analysis.topics).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    test('should handle state save errors', async () => {
      mockSession.save.mockRejectedValue(new Error('Database error'));

      await expect(service.saveState(mockSession, {})).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});