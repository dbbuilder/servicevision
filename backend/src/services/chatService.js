const OpenAI = require('openai');
const { getConfig } = require('../config/environment');
const ConversationStateService = require('./conversationStateService');
const logger = require('../utils/logger');

class ChatService {
  constructor() {
    const config = getConfig();
    
    // Initialize OpenAI client
    if (config.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY
      });
    } else {
      logger.warn('OpenAI API key not configured');
      this.openai = null;
    }

    // Initialize conversation state service
    this.stateService = new ConversationStateService();
    
    // Rate limiting
    this.rateLimits = new Map();
    this.RATE_LIMIT_WINDOW = 60000; // 1 minute
    this.MAX_REQUESTS_PER_WINDOW = 10;
  }

  /**
   * Get initial greeting message
   */
  async getInitialMessage(lead, session) {
    let greeting = 'Welcome to ServiceVision! ';

    if (lead?.name) {
      greeting = `Welcome back, ${lead.name}! `;
    }

    if (lead?.organizationName) {
      greeting += `I see you're with ${lead.organizationName}. `;
    }

    greeting += "I'm here to help you explore how ServiceVision can support your organization's goals. What brings you here today?";

    return greeting;
  }

  /**
   * Process a user message and generate response
   */
  async processMessage(session, message) {
    try {
      // Check rate limiting
      if (this.isRateLimited(session.sessionId)) {
        return {
          message: "Please slow down a bit! Let's take a moment before continuing our conversation.",
          quickReplies: [],
          conversationHistory: session.conversationHistory || [],
          identifiedNeeds: session.identifiedNeeds || [],
          recommendedServices: session.recommendedServices || [],
          completionRate: session.completionRate || 0,
          isComplete: false
        };
      }

      // Restore conversation state
      const state = this.stateService.restoreState(session);

      // Extract entities from message
      const extractedData = this.extractEntitiesFromMessage(message);
      
      // Update state with extracted data
      let updatedState = state;
      if (Object.keys(extractedData).length > 0) {
        updatedState = this.stateService.updateCollected(state, extractedData);
      }

      // Update conversation history
      const history = [...(session.conversationHistory || []), {
        role: 'user',
        content: message
      }];

      // Generate AI response
      let aiResponse;
      if (this.openai) {
        aiResponse = await this.generateAIResponse(session, updatedState, message);
      } else {
        aiResponse = this.generateFallbackResponse(updatedState);
      }

      // Add assistant response to history
      history.push({
        role: 'assistant',
        content: aiResponse
      });

      // Extract needs from conversation
      const identifiedNeeds = this.extractBusinessNeeds(
        history.map(h => h.content).join(' ')
      );

      // Generate recommendations
      const recommendedServices = this.generateServiceRecommendations(
        identifiedNeeds,
        updatedState.collected?.organizationType
      );

      // Determine next action
      const nextAction = this.stateService.determineNextAction(updatedState);
      
      // Generate quick replies
      const quickReplies = this.generateQuickReplies(nextAction.topic || nextAction.type);

      // Calculate completion rate
      const completionRate = this.stateService.getCompletionRate(updatedState);

      // Save state
      await this.stateService.saveState(session, updatedState);

      // Track rate limit
      this.trackRequest(session.sessionId);

      return {
        message: aiResponse,
        quickReplies,
        conversationHistory: history,
        identifiedNeeds,
        recommendedServices,
        completionRate,
        isComplete: completionRate === 1.0
      };

    } catch (error) {
      logger.error('Error processing message:', error);
      
      return {
        message: "I'm having trouble processing your message right now. Could you please try rephrasing?",
        quickReplies: ['Start over', 'Contact support'],
        conversationHistory: session.conversationHistory || [],
        identifiedNeeds: session.identifiedNeeds || [],
        recommendedServices: session.recommendedServices || [],
        completionRate: session.completionRate || 0,
        isComplete: false
      };
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(session) {
    try {
      const state = this.stateService.restoreState(session);
      
      // Check if we have enough information
      if (!session.conversationHistory || session.conversationHistory.length < 2) {
        logger.warn('Insufficient conversation data for summary');
        return "Limited information available. Please continue the conversation to receive a comprehensive summary.";
      }

      const summaryContext = this.buildSummaryContext(session, state);

      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: summaryContext,
          temperature: 0.7,
          max_tokens: 800
        });

        return completion.choices[0].message.content;
      } else {
        return this.generateFallbackSummary(session, state);
      }

    } catch (error) {
      logger.error('Error generating executive summary:', error);
      return "Unable to generate summary at this time. Please contact support for assistance.";
    }
  }

  /**
   * Build context for AI
   */
  buildContext(session, state) {
    const systemPrompt = `You are a helpful AI consultant for ServiceVision, a dual-mission consulting firm serving both for-profit and nonprofit organizations. 

Current conversation stage: ${state.stage}
Information needed: ${Object.entries(state.pending || {})
  .filter(([_, needed]) => needed)
  .map(([field, _]) => field)
  .join(', ')}

Be professional, concise, and focus on understanding the client's needs. Ask one question at a time.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (limit to last 20 messages)
    const history = session.conversationHistory || [];
    const recentHistory = history.slice(-20);
    messages.push(...recentHistory);

    return messages;
  }

  /**
   * Build context for summary generation
   */
  buildSummaryContext(session, state) {
    const collected = state.collected || {};
    const needs = session.identifiedNeeds || [];
    const recommendations = session.recommendedServices || [];

    const prompt = `Generate an executive summary for this ServiceVision consultation.

Client Information:
- Organization: ${collected.organizationName || 'Not specified'}
- Type: ${collected.organizationType || 'Not specified'}
- Contact: ${collected.email || 'Not provided'}

Identified Needs:
${needs.map(need => `- ${need.replace(/_/g, ' ')}`).join('\n')}

Timeline: ${collected.timeline || 'Not specified'}
Budget: ${collected.budget || 'Not specified'}

Please create a professional executive summary that includes:
1. Overview of the client's situation
2. Identified needs and pain points
3. Recommended ServiceVision services
4. Proposed timeline
5. Clear next steps

Format the summary with markdown headers.`;

    return [
      { role: 'system', content: prompt },
      ...session.conversationHistory.slice(-10)
    ];
  }

  /**
   * Generate AI response
   */
  async generateAIResponse(session, state, userMessage) {
    const context = this.buildContext(session, state);
    context.push({ role: 'user', content: userMessage });

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: context,
        temperature: 0.8,
        max_tokens: 200
      });

      return completion.choices[0].message.content;
    } catch (error) {
      if (error.response?.status === 429) {
        return "I'm experiencing high demand right now. Please give me a moment and try again.";
      }
      if (error.response?.status === 503) {
        return "The AI service is temporarily unavailable. Please try again in a few moments.";
      }
      throw error;
    }
  }

  /**
   * Generate fallback response without AI
   */
  generateFallbackResponse(state) {
    const nextAction = this.stateService.determineNextAction(state);

    const responses = {
      organizationType: "Could you tell me what type of organization you represent? We work with for-profit businesses, nonprofits, and government agencies.",
      businessNeeds: "What are your main business or technology challenges that you'd like help with?",
      timeline: "What's your timeline for addressing these needs?",
      budget: "Do you have a budget range in mind for this project?",
      collect_email: "To continue, I'll need your email address so we can send you a summary of our conversation.",
      generate_summary: "Great! I have all the information I need. Let me prepare your executive summary.",
      default: "Tell me more about what you're looking for help with."
    };

    return responses[nextAction.topic] || responses[nextAction.type] || responses.default;
  }

  /**
   * Generate fallback summary without AI
   */
  generateFallbackSummary(session, state) {
    const collected = state.collected || {};
    const needs = session.identifiedNeeds || [];

    return `# Executive Summary

## Client Overview
Organization: ${collected.organizationName || 'Not specified'}
Type: ${collected.organizationType || 'Not specified'}
Contact: ${collected.email || 'Not provided'}

## Identified Needs
${needs.map(need => `- ${need.replace(/_/g, ' ')}`).join('\n') || 'To be determined'}

## Recommended Next Steps
1. Schedule a consultation call to discuss your specific requirements
2. Review our service packages
3. Prepare a customized proposal

Please contact us at info@servicevision.net to proceed.`;
  }

  /**
   * Extract entities from message
   */
  extractEntitiesFromMessage(message) {
    const extracted = {};

    // Extract organization type
    const orgType = this.extractOrganizationType(message);
    if (orgType) {
      extracted.organizationType = orgType;
    }

    // Extract timeline
    const timeline = this.extractTimeline(message);
    if (timeline) {
      extracted.timeline = timeline;
    }

    // Extract budget
    const budget = this.extractBudget(message);
    if (budget) {
      extracted.budget = budget;
    }

    return extracted;
  }

  /**
   * Extract organization type
   */
  extractOrganizationType(text) {
    const lowercaseText = text.toLowerCase();
    
    if (lowercaseText.includes('nonprofit') || lowercaseText.includes('non-profit') || 
        lowercaseText.includes('ngo') || lowercaseText.includes('charity')) {
      return 'nonprofit';
    }
    if (lowercaseText.includes('enterprise') || lowercaseText.includes('corporation')) {
      return 'enterprise';
    }
    if (lowercaseText.includes('startup') || lowercaseText.includes('start-up')) {
      return 'startup';
    }
    if (lowercaseText.includes('government') || lowercaseText.includes('agency')) {
      return 'government';
    }
    if (lowercaseText.includes('business') || lowercaseText.includes('company')) {
      return 'for-profit';
    }
    
    return null;
  }

  /**
   * Extract business needs
   */
  extractBusinessNeeds(text) {
    const needs = [];
    const lowercaseText = text.toLowerCase();

    const needsMap = {
      website_redesign: ['website', 'redesign', 'web design'],
      website_development: ['website development', 'web development', 'build website'],
      seo: ['seo', 'search engine', 'google ranking'],
      marketing_automation: ['marketing automation', 'email marketing', 'campaign'],
      business_consulting: ['consulting', 'strategy', 'business advice'],
      process_automation: ['automation', 'workflow', 'efficiency'],
      data_analytics: ['analytics', 'data', 'reporting', 'insights'],
      fundraising: ['fundraising', 'donations', 'donor'],
      volunteer_management: ['volunteer', 'volunteer management']
    };

    Object.entries(needsMap).forEach(([need, keywords]) => {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        needs.push(need);
      }
    });

    return [...new Set(needs)];
  }

  /**
   * Extract timeline
   */
  extractTimeline(text) {
    const lowercaseText = text.toLowerCase();
    
    if (lowercaseText.includes('immediate') || lowercaseText.includes('urgent') || 
        lowercaseText.includes('asap') || lowercaseText.includes('right away')) {
      return 'immediate';
    }
    if (lowercaseText.includes('1 month') || lowercaseText.includes('one month') || 
        lowercaseText.includes('4 weeks')) {
      return '< 1 month';
    }
    if (lowercaseText.includes('2 month') || lowercaseText.includes('two month') || 
        lowercaseText.includes('3 month') || lowercaseText.includes('three month')) {
      return '1-3 months';
    }
    if (lowercaseText.includes('6 month') || lowercaseText.includes('six month')) {
      return '3-6 months';
    }
    
    return null;
  }

  /**
   * Extract budget
   */
  extractBudget(text) {
    const budgetMatch = text.match(/\$?([\d,]+)k?/i);
    if (budgetMatch) {
      let amount = parseInt(budgetMatch[1].replace(',', ''));
      if (text.toLowerCase().includes('k')) {
        amount *= 1000;
      }
      
      if (amount < 5000) return '< 5000';
      if (amount < 10000) return '5000-10000';
      if (amount < 25000) return '10000-25000';
      if (amount < 50000) return '25000-50000';
      return '50000+';
    }
    
    return null;
  }

  /**
   * Generate service recommendations
   */
  generateServiceRecommendations(needs, organizationType) {
    const recommendations = [];
    
    // Service mapping
    const serviceMap = {
      website_redesign: {
        service: 'Web Development Package',
        reason: 'Complete website redesign with modern technologies'
      },
      website_development: {
        service: 'Web Development Package',
        reason: 'Custom website development tailored to your needs'
      },
      seo: {
        service: 'Digital Marketing Package',
        reason: 'SEO optimization and online visibility improvement'
      },
      marketing_automation: {
        service: 'Digital Marketing Package',
        reason: 'Automated marketing campaigns and lead nurturing'
      },
      business_consulting: {
        service: 'Strategic Consulting Package',
        reason: 'Expert guidance on business strategy and growth'
      },
      process_automation: {
        service: 'Business Automation Package',
        reason: 'Streamline operations with custom automation solutions'
      },
      fundraising: {
        service: 'Nonprofit Fundraising Package',
        reason: 'Comprehensive fundraising strategy and tools',
        priority: 'high'
      },
      volunteer_management: {
        service: 'Nonprofit Management Package',
        reason: 'Volunteer coordination and engagement platform'
      }
    };

    // Add recommendations based on needs
    needs.forEach(need => {
      if (serviceMap[need]) {
        const recommendation = { ...serviceMap[need] };
        
        // Prioritize nonprofit services for nonprofits
        if (organizationType === 'nonprofit' && need.includes('fundraising')) {
          recommendation.priority = 'high';
        }
        
        recommendations.push(recommendation);
      }
    });

    // Remove duplicates
    const unique = recommendations.reduce((acc, rec) => {
      if (!acc.find(r => r.service === rec.service)) {
        acc.push(rec);
      }
      return acc;
    }, []);

    return unique;
  }

  /**
   * Generate quick reply options
   */
  generateQuickReplies(topic) {
    const quickReplies = {
      organizationType: [
        'For-profit business',
        'Nonprofit organization',
        'Government agency',
        'Other'
      ],
      businessNeeds: [
        'Website Development',
        'Digital Marketing',
        'Business Consulting',
        'Process Automation',
        'Other needs'
      ],
      timeline: [
        'Immediate (< 1 month)',
        '1-3 months',
        '3-6 months',
        'Just exploring'
      ],
      budget: [
        'Under $10k',
        '$10k - $25k',
        '$25k - $50k',
        'Over $50k',
        'Not sure yet'
      ],
      default: [
        'Tell me more',
        'Schedule a call',
        'See pricing',
        'Start over'
      ]
    };

    return quickReplies[topic] || quickReplies.default;
  }

  /**
   * Check if session is rate limited
   */
  isRateLimited(sessionId) {
    const now = Date.now();
    const requests = this.rateLimits.get(sessionId) || [];
    
    // Remove old requests
    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
    );
    
    return recentRequests.length >= this.MAX_REQUESTS_PER_WINDOW;
  }

  /**
   * Track request for rate limiting
   */
  trackRequest(sessionId) {
    const now = Date.now();
    const requests = this.rateLimits.get(sessionId) || [];
    
    // Remove old requests
    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
    );
    
    recentRequests.push(now);
    this.rateLimits.set(sessionId, recentRequests);
  }
}

// Export singleton instance
module.exports = new ChatService();