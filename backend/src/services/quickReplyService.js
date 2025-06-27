const logger = require('../utils/logger');

class QuickReplyService {
  constructor() {
    this.replyTemplates = this.initializeTemplates();
    this.replyUsage = new Map();
  }

  /**
   * Initialize quick reply templates
   */
  initializeTemplates() {
    return {
      organizationType: [
        'For-profit business',
        'Nonprofit organization',
        'Government agency',
        'Startup',
        'Other'
      ],
      businessNeeds: {
        default: [
          'Website Development',
          'Digital Marketing',
          'Business Consulting',
          'Process Automation',
          'Other needs'
        ],
        nonprofit: [
          'Fundraising Support',
          'Volunteer Management',
          'Donor Database',
          'Website Development',
          'Other needs'
        ],
        government: [
          'Citizen Portal',
          'Process Digitization',
          'Data Management',
          'Website Modernization',
          'Other needs'
        ]
      },
      timeline: [
        'Immediate (< 1 month)',
        '1-3 months',
        '3-6 months',
        'Just exploring',
        'Not sure yet'
      ],
      budget: [
        'Under $10k',
        '$10k - $25k',
        '$25k - $50k',
        'Over $50k',
        'Need guidance'
      ],
      closing: {
        default: [
          'Get my summary',
          'Schedule consultation',
          'See pricing',
          'Start over',
          'Ask a question'
        ],
        nonprofit: [
          'Get my summary',
          'Schedule mission consultation',
          'See nonprofit pricing',
          'Discuss impact goals',
          'Ask a question'
        ]
      },
      default: [
        'Tell me more',
        'Schedule a call',
        'See services',
        'Start over'
      ]
    };
  }

  /**
   * Generate quick replies based on context
   */
  generateQuickReplies(session, topic) {
    try {
      if (!topic) {
        return this.replyTemplates.default;
      }

      const orgType = session?.state?.collected?.organizationType;

      // Handle business needs with organization-specific options
      if (topic === 'businessNeeds' && orgType) {
        const specificReplies = this.replyTemplates.businessNeeds[orgType];
        if (specificReplies) {
          return specificReplies.slice(0, 5);
        }
      }

      // Handle closing with organization-specific options
      if (topic === 'closing' && orgType) {
        const specificReplies = this.replyTemplates.closing[orgType];
        if (specificReplies) {
          return specificReplies.slice(0, 5);
        }
      }

      // Return standard replies for the topic
      const replies = this.replyTemplates[topic];
      if (Array.isArray(replies)) {
        return replies.slice(0, 5);
      } else if (replies?.default) {
        return replies.default.slice(0, 5);
      }

      // Fallback to default
      return this.replyTemplates.default;

    } catch (error) {
      logger.error('Error generating quick replies:', error);
      return this.replyTemplates.default;
    }
  }

  /**
   * Generate dynamic replies based on conversation context
   */
  generateDynamicReplies(session) {
    try {
      const state = session?.state || {};
      const history = session?.conversationHistory || [];
      const lastUserMessage = this.getLastUserMessage(history);

      // Near completion - offer summary options
      if (state.stage === 'closing' || Object.keys(state.pending || {}).length === 0) {
        const orgType = state.collected?.organizationType;
        const closingReplies = this.replyTemplates.closing[orgType] || this.replyTemplates.closing.default;
        return closingReplies.slice(0, 5);
      }

      // Check what information is still needed
      const pending = state.pending || {};
      
      // For qualification stage, check what's needed
      if (state.stage === 'qualification') {
        if (pending.timeline) {
          return this.replyTemplates.timeline.slice(0, 5);
        }
        if (pending.budget) {
          return this.replyTemplates.budget.slice(0, 5);
        }
        // If we have org type and needs, suggest timeline
        if (state.collected?.organizationType && state.collected?.businessNeeds) {
          return this.replyTemplates.timeline.slice(0, 5);
        }
      }
      
      if (pending.timeline) {
        return this.replyTemplates.timeline.slice(0, 5);
      }
      if (pending.budget) {
        return this.replyTemplates.budget.slice(0, 5);
      }

      // Generate context-specific replies
      if (lastUserMessage?.includes('website')) {
        return [
          'Complete redesign',
          'Better SEO',
          'Performance issues',
          'Mobile responsiveness',
          'Other'
        ];
      }

      if (lastUserMessage?.includes('fundrais')) {
        return [
          'Online donations',
          'Donor management',
          'Campaign tracking',
          'Automated receipts',
          'Other'
        ];
      }

      // Default to next logical step
      return this.getNextStepReplies(state);

    } catch (error) {
      logger.error('Error generating dynamic replies:', error);
      return this.replyTemplates.default;
    }
  }

  /**
   * Get smart suggestions based on user input
   */
  getSmartSuggestions(userMessage, session) {
    const message = userMessage.toLowerCase();
    const suggestions = [];

    // Detect nonprofit needs
    if (message.includes('donor') || message.includes('donation')) {
      suggestions.push(
        'Donor database setup',
        'Automated thank-you emails',
        'Donation tracking',
        'Recurring donations',
        'Campaign management'
      );
    }

    // Detect urgency
    if (message.includes('asap') || message.includes('urgent') || message.includes('broken')) {
      suggestions.push(
        'Emergency fix needed',
        'Temporary solution',
        'Full replacement',
        'Immediate consultation',
        'Priority support'
      );
    }

    // Detect budget concerns
    if (message.includes('affordable') || message.includes('cheap') || message.includes('budget')) {
      suggestions.push(
        'Basic package',
        'Phased approach',
        'Payment plans available',
        'See all pricing',
        'Discuss options'
      );
    }

    // Detect technical needs
    if (message.includes('automat') || message.includes('integrat')) {
      suggestions.push(
        'Workflow automation',
        'System integration',
        'API development',
        'Process optimization',
        'Custom solutions'
      );
    }

    // Return top 5 suggestions
    return suggestions.slice(0, 5).length > 0 ? suggestions.slice(0, 5) : this.replyTemplates.default;
  }

  /**
   * Validate if a reply is valid for the given context
   */
  validateReply(reply, topic) {
    if (!reply || !topic) return false;

    // Allow "Other" as a valid response for any topic
    if (reply === 'Other' || reply.includes('Other')) {
      return true;
    }

    // Check if reply exists in the template for the topic
    const templates = this.replyTemplates[topic];
    if (Array.isArray(templates)) {
      return templates.includes(reply);
    } else if (templates) {
      // Check all sub-arrays for complex templates
      return Object.values(templates).some(arr => 
        Array.isArray(arr) && arr.includes(reply)
      );
    }

    return false;
  }

  /**
   * Get action for a quick reply selection
   */
  getReplyAction(reply) {
    const replyLower = reply.toLowerCase();

    // Schedule actions
    if (replyLower.includes('schedule') || replyLower.includes('call')) {
      return {
        type: 'schedule_call',
        data: { source: 'quick_reply' }
      };
    }

    // Business needs
    if (reply === 'Website Development') {
      return {
        type: 'select_need',
        data: { need: 'website_development' }
      };
    }
    if (reply === 'Digital Marketing') {
      return {
        type: 'select_need',
        data: { need: 'digital_marketing' }
      };
    }
    if (reply === 'Fundraising Support') {
      return {
        type: 'select_need',
        data: { need: 'fundraising' }
      };
    }

    // Timeline
    if (replyLower.includes('month') || replyLower.includes('immediate')) {
      return {
        type: 'set_timeline',
        data: { timeline: reply }
      };
    }

    // Budget
    if (reply.includes('$') || replyLower.includes('under') || replyLower.includes('over')) {
      return {
        type: 'set_budget',
        data: { budget: reply }
      };
    }

    // Summary
    if (replyLower.includes('summary')) {
      return {
        type: 'generate_summary',
        data: { source: 'quick_reply' }
      };
    }

    // Default
    return {
      type: 'continue_conversation',
      data: { reply }
    };
  }

  /**
   * Generate personalized replies
   */
  generatePersonalizedReplies(session) {
    const replies = [];
    const lead = session?.lead;
    const orgName = lead?.organizationName;

    if (orgName) {
      replies.push(`Tell me about ${orgName}'s needs`);
      replies.push(`${orgName}'s current challenges`);
    }

    // Add standard options
    replies.push(...this.replyTemplates.default);

    return replies.slice(0, 5);
  }

  /**
   * Handle quick reply selection
   */
  handleQuickReplySelection(session, reply) {
    // Track usage
    this.trackReplyUsage(session.sessionId, reply);

    // Get and return action
    return this.getReplyAction(reply);
  }

  /**
   * Track reply usage for analytics
   */
  trackReplyUsage(sessionId, reply) {
    const key = `${sessionId}:${reply}`;
    const count = this.replyUsage.get(key) || 0;
    this.replyUsage.set(key, count + 1);

    // Log for analytics
    logger.info('Quick reply selected', {
      sessionId,
      reply,
      count: count + 1
    });
  }

  /**
   * Get reply analytics
   */
  getReplyAnalytics() {
    const analytics = {
      mostUsed: [],
      conversionRate: 0,
      avgRepliesPerSession: 0
    };

    // Calculate most used replies
    const replyCounts = new Map();
    for (const [key, count] of this.replyUsage) {
      const reply = key.split(':')[1];
      replyCounts.set(reply, (replyCounts.get(reply) || 0) + count);
    }

    // Sort by usage
    analytics.mostUsed = Array.from(replyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reply, count]) => ({ reply, count }));

    // Calculate average replies per session
    const sessionReplies = new Map();
    for (const key of this.replyUsage.keys()) {
      const sessionId = key.split(':')[0];
      sessionReplies.set(sessionId, (sessionReplies.get(sessionId) || 0) + 1);
    }

    if (sessionReplies.size > 0) {
      const totalReplies = Array.from(sessionReplies.values()).reduce((a, b) => a + b, 0);
      analytics.avgRepliesPerSession = totalReplies / sessionReplies.size;
    }

    // Estimate conversion rate (sessions with > 3 replies)
    const engagedSessions = Array.from(sessionReplies.values()).filter(count => count > 3).length;
    analytics.conversionRate = sessionReplies.size > 0 
      ? (engagedSessions / sessionReplies.size) * 100 
      : 0;

    return analytics;
  }

  /**
   * Get last user message from history
   */
  getLastUserMessage(history) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        return history[i].content;
      }
    }
    return null;
  }

  /**
   * Get next step replies based on state
   */
  getNextStepReplies(state) {
    const pending = state.pending || {};
    
    if (pending.organizationType) {
      return this.replyTemplates.organizationType.slice(0, 5);
    }
    if (pending.businessNeeds) {
      return this.replyTemplates.businessNeeds.default.slice(0, 5);
    }
    if (pending.timeline) {
      return this.replyTemplates.timeline.slice(0, 5);
    }
    if (pending.budget) {
      return this.replyTemplates.budget.slice(0, 5);
    }

    return this.replyTemplates.default;
  }
}

// Export singleton instance
module.exports = new QuickReplyService();