const { ChatSession, Lead, Message } = require('../models');
const logger = require('../utils/logger');

class ConversationStateService {
  constructor() {
    // Define conversation stages and valid transitions
    this.stages = {
      greeting: ['discovery'],
      discovery: ['qualification', 'clarification'],
      clarification: ['discovery', 'qualification'],
      qualification: ['scheduling', 'summary'],
      scheduling: ['summary'],
      summary: ['complete'],
      complete: []
    };

    // Required fields for qualification
    this.requiredFields = ['email', 'organizationType', 'businessNeeds', 'timeline'];
    
    // Organization types
    this.organizationTypes = ['for-profit', 'nonprofit', 'enterprise', 'startup', 'government'];
  }

  /**
   * Get initial state for a new session
   */
  getInitialState() {
    return {
      stage: 'greeting',
      context: {
        startTime: new Date(),
        stageHistory: [],
        lastTransition: null
      },
      collected: {},
      pending: {
        organizationType: true,
        businessNeeds: true,
        timeline: true,
        budget: true
      },
      flags: {
        emailVerified: false,
        hasEngaged: false,
        isQualified: false,
        readyForSummary: false
      }
    };
  }

  /**
   * Initialize conversation state for a new session
   */
  initializeState(session) {
    const state = {
      stage: 'greeting',
      context: {
        leadId: session.leadId,
        sessionId: session.sessionId,
        startTime: new Date(),
        stageHistory: [],
        lastTransition: null
      },
      collected: {},
      pending: {
        organizationType: true,
        businessNeeds: true,
        timeline: true,
        budget: true
      },
      flags: {
        emailVerified: false,
        hasEngaged: false,
        isQualified: false,
        readyForSummary: false
      }
    };

    // Pre-populate from lead data if available
    if (session.lead) {
      if (session.lead.email) {
        state.collected.email = session.lead.email;
        state.flags.emailVerified = true;
      }
      if (session.lead.name) {
        state.collected.name = session.lead.name;
      }
      if (session.lead.organizationName) {
        state.collected.organizationName = session.lead.organizationName;
      }
      if (session.lead.organizationType) {
        state.collected.organizationType = session.lead.organizationType;
        state.pending.organizationType = false;
      }
    }

    return state;
  }

  /**
   * Transition to a new conversation stage
   */
  transitionTo(currentState, newStage) {
    const allowedTransitions = this.stages[currentState.stage] || [];
    
    if (!allowedTransitions.includes(newStage)) {
      throw new Error(`Invalid state transition from ${currentState.stage} to ${newStage}`);
    }

    const newState = {
      ...currentState,
      stage: newStage,
      context: {
        ...currentState.context,
        stageHistory: [...(currentState.context.stageHistory || []), currentState.stage],
        lastTransition: new Date()
      }
    };

    // Stage-specific logic
    if (newStage === 'scheduling' && currentState.flags?.isQualified) {
      newState.context.qualifiedAt = new Date();
    }

    return newState;
  }

  /**
   * Update collected information
   */
  updateCollected(state, data) {
    const newState = { ...state };
    
    Object.entries(data).forEach(([key, value]) => {
      // Validate organization type
      if (key === 'organizationType' && !this.organizationTypes.includes(value)) {
        logger.warn(`Invalid organization type: ${value}`);
        return;
      }

      newState.collected[key] = value;
      
      // Mark as no longer pending
      if (newState.pending[key] !== undefined) {
        newState.pending[key] = false;
      }
    });

    // Update flags based on collected data
    if (newState.collected.email && !newState.flags.emailVerified) {
      newState.flags.emailVerified = true;
    }

    return newState;
  }

  /**
   * Calculate completion rate
   */
  getCompletionRate(state) {
    const required = this.requiredFields;
    const collected = required.filter(field => state.collected[field]).length;
    return collected / required.length;
  }

  /**
   * Analyze conversation context
   */
  async analyzeContext(messages, session) {
    try {
      if (!messages || !Array.isArray(messages)) {
        throw new Error('Invalid messages input');
      }

      // Extract user messages
      const userMessages = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');

      // Basic intent detection
      const intent = this.detectIntent(userMessages);
      const topics = this.extractTopics(userMessages);
      const sentiment = this.analyzeSentiment(userMessages);
      const urgency = this.detectUrgency(userMessages);

      return {
        intent,
        topics,
        sentiment,
        urgency,
        clarity: this.calculateClarity(userMessages)
      };
    } catch (error) {
      logger.error('Context analysis error:', error);
      return {
        intent: 'unknown',
        topics: [],
        sentiment: 'neutral',
        urgency: 'medium',
        clarity: 0.5
      };
    }
  }

  /**
   * Detect user intent from messages
   */
  detectIntent(text) {
    const lowercaseText = text.toLowerCase();

    if (lowercaseText.includes('urgent') || lowercaseText.includes('asap') || lowercaseText.includes('down')) {
      return 'emergency_support';
    }
    if (lowercaseText.includes('website') || lowercaseText.includes('redesign')) {
      return 'website_help';
    }
    if (lowercaseText.includes('automat') || lowercaseText.includes('process')) {
      return 'automation';
    }
    if (lowercaseText.includes('consult') || lowercaseText.includes('advice')) {
      return 'consulting';
    }
    
    return 'general_inquiry';
  }

  /**
   * Extract topics from text
   */
  extractTopics(text) {
    const topics = [];
    const lowercaseText = text.toLowerCase();

    const topicMap = {
      website: ['website', 'site', 'web', 'homepage'],
      redesign: ['redesign', 'refresh', 'update', 'modernize'],
      seo: ['seo', 'search', 'ranking', 'optimization'],
      automation: ['automat', 'workflow', 'process'],
      sales: ['sales', 'revenue', 'conversion'],
      crm: ['customer', 'tracking', 'crm', 'relationship'],
      marketing: ['marketing', 'campaign', 'promotion'],
      development: ['develop', 'build', 'create', 'code']
    };

    Object.entries(topicMap).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        topics.push(topic);
      }
    });

    return [...new Set(topics)];
  }

  /**
   * Analyze sentiment
   */
  analyzeSentiment(text) {
    const positive = ['great', 'excellent', 'love', 'excited', 'wonderful'];
    const negative = ['frustrated', 'angry', 'disappointed', 'problem', 'issue'];
    
    const lowercaseText = text.toLowerCase();
    const positiveCount = positive.filter(word => lowercaseText.includes(word)).length;
    const negativeCount = negative.filter(word => lowercaseText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Detect urgency level
   */
  detectUrgency(text) {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'now', 'emergency', 'down'];
    const lowercaseText = text.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowercaseText.includes(keyword))) {
      return 'high';
    }
    
    const soonKeywords = ['soon', 'quickly', 'fast'];
    if (soonKeywords.some(keyword => lowercaseText.includes(keyword))) {
      return 'medium';
    }
    
    return 'medium';
  }

  /**
   * Calculate message clarity
   */
  calculateClarity(text) {
    if (!text || text.length < 10) return 0.3;
    
    // Simple heuristic based on length and structure
    const hasQuestionMark = text.includes('?');
    const wordCount = text.split(/\s+/).length;
    const avgWordLength = text.length / wordCount;
    
    let clarity = 0.5;
    if (wordCount > 5 && wordCount < 100) clarity += 0.2;
    if (avgWordLength > 3 && avgWordLength < 10) clarity += 0.2;
    if (hasQuestionMark) clarity += 0.1;
    
    return Math.min(clarity, 1.0);
  }

  /**
   * Evaluate lead qualification
   */
  evaluateQualification(state) {
    const result = {
      isQualified: false,
      score: 0,
      reasons: [],
      priority: 'medium'
    };

    // Check data completeness
    const requiredCollected = this.requiredFields.filter(
      field => state.collected[field]
    ).length;
    
    if (requiredCollected < 2) {
      result.reasons.push('incomplete_data');
      result.score = 0.2;
      return result;
    }

    // Scoring based on collected data
    let score = requiredCollected / this.requiredFields.length;

    // Budget scoring
    if (state.collected.budget) {
      const budget = state.collected.budget;
      if (budget === '50000+' || budget.includes('50000')) {
        score += 0.3;
        result.reasons.push('high_budget');
        result.priority = 'high';
      } else if (budget.includes('10000')) {
        score += 0.2;
        result.reasons.push('budget_adequate');
      }
    }

    // Timeline scoring
    if (state.collected.timeline) {
      const timeline = state.collected.timeline.toLowerCase();
      if (timeline.includes('immediate') || timeline.includes('urgent')) {
        score += 0.2;
        result.reasons.push('timeline_urgent');
        result.priority = 'high';
      } else if (timeline.includes('1-3 month')) {
        score += 0.1;
        result.reasons.push('timeline_urgent');
      }
    }

    // Organization type scoring
    if (state.collected.organizationType === 'enterprise') {
      score += 0.2;
      result.priority = 'high';
    }

    // Business needs scoring
    if (state.collected.businessNeeds?.length > 2) {
      score += 0.1;
      result.reasons.push('multiple_needs');
    }

    result.score = Math.min(score, 1.0);
    result.isQualified = result.score > 0.6;

    return result;
  }

  /**
   * Determine next action based on current state
   */
  determineNextAction(state) {
    // Priority 1: Collect email if missing
    if (!state.collected?.email || !state.flags?.emailVerified) {
      return {
        type: 'collect_email',
        priority: 'critical',
        message: 'Please provide your email to continue'
      };
    }

    // Priority 2: Collect required fields
    const missingRequired = this.requiredFields.find(
      field => field !== 'email' && state.pending[field]
    );
    
    if (missingRequired) {
      return {
        type: 'ask_question',
        topic: missingRequired,
        priority: 'high'
      };
    }

    // Priority 3: Generate summary if ready
    if (state.flags?.readyForSummary || 
        (state.flags?.isQualified && this.getCompletionRate(state) > 0.8)) {
      return {
        type: 'generate_summary',
        data: Object.keys(state.collected)
      };
    }

    // Priority 4: Qualify lead
    if (!state.flags?.isQualified && this.getCompletionRate(state) > 0.5) {
      return {
        type: 'evaluate_qualification',
        priority: 'medium'
      };
    }

    // Default: Continue discovery
    return {
      type: 'continue_discovery',
      priority: 'low'
    };
  }

  /**
   * Save state to session
   */
  async saveState(session, state) {
    try {
      const completionRate = this.getCompletionRate(state);
      
      // Debug logging
      console.log('saveState called with session:', {
        id: session.id,
        sessionId: session.sessionId,
        hasDataValues: !!session.dataValues
      });
      
      // Use update method to avoid save issues
      const { ChatSession } = require('../models');
      await ChatSession.update({
        state: state,
        completionRate: completionRate
      }, {
        where: { 
          id: session.id 
        }
      });
      
      // Update the session object for consistency
      session.state = state;
      session.completionRate = completionRate;
    } catch (error) {
      logger.error('Failed to save conversation state:', error);
      console.error('saveState error details:', {
        errorMessage: error.message,
        sessionId: session.id,
        sessionUuid: session.sessionId
      });
      throw error;
    }
  }

  /**
   * Restore state from session
   */
  restoreState(session) {
    if (session.conversationState && Object.keys(session.conversationState).length > 0) {
      return session.conversationState;
    }
    
    return this.initializeState(session);
  }

  /**
   * Get conversation progress
   */
  getProgress(state) {
    const fieldsCollected = Object.values(state.collected || {}).filter(v => v).length;
    const fieldsPending = Object.values(state.pending || {}).filter(v => v).length;
    
    return {
      currentStage: state.stage,
      completionRate: this.getCompletionRate(state),
      duration: state.context?.startTime ? 
        Date.now() - new Date(state.context.startTime).getTime() : 0,
      fieldsCollected,
      fieldsPending,
      nextMilestone: this.getNextMilestone(state)
    };
  }

  /**
   * Get next milestone
   */
  getNextMilestone(state) {
    if (!state.collected?.email) return 'collect_email';
    if (state.pending?.organizationType) return 'identify_organization';
    if (state.pending?.businessNeeds) return 'understand_needs';
    if (state.pending?.timeline) return 'collect_timeline';
    if (!state.flags?.isQualified) return 'qualify_lead';
    return 'generate_summary';
  }

  /**
   * Generate service recommendations
   */
  generateRecommendations(state) {
    const recommendations = [];
    const needs = state.collected?.businessNeeds || [];
    const orgType = state.collected?.organizationType;

    // Service mapping
    const serviceMap = {
      website: { 
        service: 'web_development', 
        priority: 'high',
        relevance: 0.9
      },
      seo: { 
        service: 'digital_marketing', 
        priority: 'medium',
        relevance: 0.8
      },
      automation: { 
        service: 'process_automation', 
        priority: 'medium',
        relevance: 0.85
      },
      consulting: { 
        service: 'business_consulting', 
        priority: 'high',
        relevance: 0.9
      },
      fundraising: { 
        service: 'nonprofit_fundraising', 
        priority: 'high',
        relevance: 0.95
      },
      volunteer: { 
        service: 'nonprofit_management', 
        priority: 'medium',
        relevance: 0.8
      }
    };

    // Add recommendations based on needs
    needs.forEach(need => {
      const needLower = need.toLowerCase();
      Object.entries(serviceMap).forEach(([keyword, service]) => {
        if (needLower.includes(keyword)) {
          recommendations.push(service);
        }
      });
    });

    // Add org-type specific recommendations
    if (orgType === 'nonprofit') {
      recommendations.unshift({
        service: 'nonprofit_consulting',
        priority: 'high',
        relevance: 1.0
      });
    }

    // Remove duplicates and sort by relevance
    const unique = recommendations.reduce((acc, rec) => {
      const existing = acc.find(r => r.service === rec.service);
      if (!existing) acc.push(rec);
      return acc;
    }, []);

    return unique.sort((a, b) => b.relevance - a.relevance);
  }
}

module.exports = ConversationStateService;