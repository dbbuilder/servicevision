const emailService = require('./emailService');
const logger = require('../utils/logger');

class SummaryService {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Initialize summary templates for different organization types
   */
  initializeTemplates() {
    return {
      'for-profit': {
        greeting: 'Thank you for exploring how ServiceVision can drive your business forward.',
        focus: 'business objectives and ROI',
        closing: 'We look forward to partnering with you to achieve your business goals.'
      },
      'nonprofit': {
        greeting: 'Thank you for considering ServiceVision to amplify your mission.',
        focus: 'mission impact and community engagement',
        closing: 'We are excited to help you create lasting positive impact in your community.'
      },
      'government': {
        greeting: 'Thank you for exploring ServiceVision for your public service needs.',
        focus: 'constituent services and operational efficiency',
        closing: 'We look forward to supporting your agency in better serving the public.'
      },
      'default': {
        greeting: 'Thank you for your interest in ServiceVision.',
        focus: 'organizational goals and technology solutions',
        closing: 'We look forward to helping you achieve your objectives.'
      }
    };
  }

  /**
   * Generate comprehensive executive summary
   */
  async generateExecutiveSummary(session) {
    try {
      if (!session) {
        return this.generateErrorSummary();
      }

      const collected = session.state?.collected || {};
      const identifiedNeeds = session.identifiedNeeds || [];
      const recommendedServices = session.recommendedServices || [];
      const conversationHistory = session.conversationHistory || [];

      // Calculate metrics and insights
      const metrics = this.calculateConversationMetrics(session);
      const topics = this.extractKeyTopics(session);
      const insights = this.generateInsights(session);
      const leadQuality = this.determineLeadQuality(session);
      const nextActions = this.generateNextActions(session);

      // Get appropriate template
      const template = this.getTemplate(collected.organizationType);

      // Generate HTML summary
      const html = this.generateHTMLSummary({
        session,
        collected,
        identifiedNeeds,
        recommendedServices,
        metrics,
        topics,
        insights,
        leadQuality,
        nextActions,
        template
      });

      // Generate plain text summary
      const text = this.generateTextSummary({
        session,
        collected,
        identifiedNeeds,
        recommendedServices,
        metrics,
        topics,
        insights,
        leadQuality,
        nextActions,
        template
      });

      // Prepare summary data
      const data = {
        generatedAt: new Date(),
        leadId: session.leadId,
        sessionId: session.sessionId,
        organizationType: collected.organizationType || 'unknown',
        isNonprofit: collected.organizationType === 'nonprofit',
        identifiedNeeds,
        recommendedServices,
        budget: collected.budget,
        timeline: collected.timeline,
        engagementScore: this.calculateEngagementScore(metrics),
        leadQuality,
        nextActions,
        messageCount: conversationHistory.length,
        isComplete: this.isConversationComplete(session),
        metrics,
        insights
      };

      return { html, text, data };

    } catch (error) {
      logger.error('Error generating executive summary:', error);
      return this.generateErrorSummary();
    }
  }

  /**
   * Generate HTML formatted summary
   */
  generateHTMLSummary(params) {
    const {
      session,
      collected,
      identifiedNeeds,
      recommendedServices,
      metrics,
      insights,
      leadQuality,
      nextActions,
      template
    } = params;

    const lead = session.lead || {};
    const organizationName = collected.organizationName || lead.organizationName || 'Your Organization';
    const contactName = lead.name || 'Valued Client';

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .highlight { background: #ecf0f1; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0; }
    .section { margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #3498db; }
    .metric-label { font-size: 14px; color: #7f8c8d; }
    .service-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .service-name { font-weight: bold; color: #2c3e50; }
    .next-step { padding: 10px; margin: 5px 0; background: #e8f4f8; border-left: 3px solid #3498db; }
    .quality-indicator { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .quality-high { background: #27ae60; color: white; }
    .quality-medium { background: #f39c12; color: white; }
    .quality-low { background: #e74c3c; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Executive Summary for ${organizationName}</h1>
    
    <div class="highlight">
      <p><strong>Dear ${contactName},</strong></p>
      <p>${template.greeting}</p>
    </div>

    <div class="section">
      <h2>Organization Overview</h2>
      <div class="metric">
        <div class="metric-label">Organization Type</div>
        <div class="metric-value">${this.formatOrganizationType(collected.organizationType)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Timeline</div>
        <div class="metric-value">${this.formatTimeline(collected.timeline)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Budget Range</div>
        <div class="metric-value">${this.formatBudget(collected.budget)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Lead Quality</div>
        <div class="quality-indicator quality-${leadQuality}">${leadQuality.toUpperCase()}</div>
      </div>
    </div>

    <div class="section">
      <h2>Identified Needs</h2>
      ${identifiedNeeds.length > 0 ? `
        <ul>
          ${identifiedNeeds.map(need => `<li>${this.formatServiceName(need)}</li>`).join('')}
        </ul>
      ` : '<p>To be determined based on further discussion.</p>'}
    </div>

    <div class="section">
      <h2>Recommended ServiceVision Solutions</h2>
      ${recommendedServices.length > 0 ? recommendedServices.map(service => `
        <div class="service-item">
          <div class="service-name">${service.service}</div>
          <div>${service.reason}</div>
        </div>
      `).join('') : '<p>We will recommend specific solutions after learning more about your needs.</p>'}
    </div>

    <div class="section">
      <h2>Engagement Insights</h2>
      <div class="highlight">
        <p><strong>Urgency Level:</strong> ${insights.urgency}</p>
        <p><strong>Budget Alignment:</strong> ${insights.budgetAlignment}</p>
        <p><strong>Service Match:</strong> ${insights.serviceMatch}%</p>
        <p><strong>Follow-up Priority:</strong> ${insights.followUpPriority}</p>
      </div>
    </div>

    <div class="section">
      <h2>Recommended Next Steps</h2>
      ${nextActions.map(action => `
        <div class="next-step">${action}</div>
      `).join('')}
    </div>

    <div class="section">
      <p>${template.closing}</p>
      <p>Best regards,<br>
      The ServiceVision Team<br>
      <a href="mailto:info@servicevision.net">info@servicevision.net</a><br>
      <a href="https://servicevision.net">servicevision.net</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate plain text summary
   */
  generateTextSummary(params) {
    const {
      session,
      collected,
      identifiedNeeds,
      recommendedServices,
      nextActions,
      template
    } = params;

    const lead = session.lead || {};
    const organizationName = collected.organizationName || lead.organizationName || 'Your Organization';
    const contactName = lead.name || 'Valued Client';

    return `EXECUTIVE SUMMARY FOR ${organizationName.toUpperCase()}

Dear ${contactName},

${template.greeting}

ORGANIZATION OVERVIEW
--------------------
Organization Type: ${this.formatOrganizationType(collected.organizationType)}
Timeline: ${this.formatTimeline(collected.timeline)}
Budget Range: ${this.formatBudget(collected.budget)}

IDENTIFIED NEEDS
---------------
${identifiedNeeds.length > 0 
  ? identifiedNeeds.map(need => `• ${this.formatServiceName(need)}`).join('\n')
  : 'To be determined based on further discussion.'}

RECOMMENDED SERVICEVISION SOLUTIONS
----------------------------------
${recommendedServices.length > 0 
  ? recommendedServices.map(service => `• ${service.service}: ${service.reason}`).join('\n')
  : 'We will recommend specific solutions after learning more about your needs.'}

RECOMMENDED NEXT STEPS
---------------------
${nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n')}

${template.closing}

Best regards,
The ServiceVision Team
info@servicevision.net
https://servicevision.net`;
  }

  /**
   * Send summary email to lead
   */
  async sendSummaryEmail(session) {
    try {
      const summary = await this.generateExecutiveSummary(session);
      const lead = session.lead;

      if (!lead?.email) {
        throw new Error('Lead email not found');
      }

      const result = await emailService.sendEmail({
        to: lead.email,
        subject: `Executive Summary for ${lead.name || 'Your Consultation'} - ServiceVision`,
        html: summary.html,
        text: summary.text
      });

      if (result.success) {
        // Save summary to session
        session.executiveSummary = summary.data;
        session.summaryGeneratedAt = new Date();
        session.summaryEmailSent = true;
        session.summaryEmailSentAt = new Date();
        
        try {
          await session.save();
        } catch (saveError) {
          logger.error('Error saving summary to session:', saveError);
        }

        logger.info('Executive summary sent successfully', {
          sessionId: session.sessionId,
          leadId: session.leadId,
          email: lead.email
        });
      }

      return result;

    } catch (error) {
      logger.error('Error sending executive summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to send summary email'
      };
    }
  }

  /**
   * Calculate conversation metrics
   */
  calculateConversationMetrics(session) {
    const history = session.conversationHistory || [];
    const startTime = session.createdAt || new Date();
    const endTime = session.updatedAt || new Date();

    return {
      messageCount: history.length,
      duration: Math.round((endTime - startTime) / 1000 / 60), // minutes
      responseTime: this.calculateAverageResponseTime(history),
      completionRate: session.completionRate || 0,
      userMessages: history.filter(m => m.role === 'user').length,
      assistantMessages: history.filter(m => m.role === 'assistant').length
    };
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(history) {
    // Simplified calculation - would need timestamps in real implementation
    return 30; // seconds
  }

  /**
   * Extract key topics from conversation
   */
  extractKeyTopics(session) {
    const history = session.conversationHistory || [];
    const allText = history.map(m => m.content).join(' ').toLowerCase();
    
    const topicKeywords = {
      website: ['website', 'site', 'web', 'online presence'],
      seo: ['seo', 'search', 'ranking', 'google'],
      marketing: ['marketing', 'advertising', 'campaign', 'promotion'],
      automation: ['automation', 'automate', 'workflow', 'efficiency'],
      consulting: ['consulting', 'strategy', 'advice', 'guidance'],
      fundraising: ['fundraising', 'donation', 'donor', 'giving'],
      volunteer: ['volunteer', 'volunteering']
    };

    const topics = [];
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  /**
   * Generate actionable insights
   */
  generateInsights(session) {
    const collected = session.state?.collected || {};
    const needs = session.identifiedNeeds || [];
    
    // Determine urgency
    let urgency = 'Standard';
    if (collected.timeline === 'immediate' || collected.timeline === '< 1 month') {
      urgency = 'High';
    } else if (collected.timeline === '1-3 months') {
      urgency = 'Medium';
    }

    // Budget alignment
    let budgetAlignment = 'To be determined';
    if (collected.budget) {
      const budgetValue = this.parseBudgetValue(collected.budget);
      if (budgetValue >= 25000) {
        budgetAlignment = 'Well-aligned for comprehensive solutions';
      } else if (budgetValue >= 10000) {
        budgetAlignment = 'Suitable for targeted solutions';
      } else {
        budgetAlignment = 'May require phased approach';
      }
    }

    // Service match score
    const serviceMatch = needs.length > 0 ? Math.min(needs.length * 25, 100) : 0;

    // Follow-up priority
    let followUpPriority = 'Standard';
    if (urgency === 'High' && serviceMatch >= 75) {
      followUpPriority = 'Immediate (within 24 hours)';
    } else if (urgency === 'Medium' || serviceMatch >= 50) {
      followUpPriority = 'High (within 48 hours)';
    }

    return {
      urgency,
      budgetAlignment,
      serviceMatch,
      followUpPriority
    };
  }

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(metrics) {
    let score = 0;
    
    // Message count (max 30 points)
    score += Math.min(metrics.messageCount * 3, 30);
    
    // Duration (max 20 points)
    score += Math.min(metrics.duration * 2, 20);
    
    // Completion rate (max 50 points)
    score += metrics.completionRate * 50;
    
    return Math.round(score);
  }

  /**
   * Determine lead quality
   */
  determineLeadQuality(session) {
    const collected = session.state?.collected || {};
    const needs = session.identifiedNeeds || [];
    const metrics = this.calculateConversationMetrics(session);
    
    let score = 0;
    
    // Has budget (30 points)
    if (collected.budget && collected.budget !== 'Not sure yet') {
      score += 30;
    }
    
    // Has timeline (20 points)
    if (collected.timeline && collected.timeline !== 'Just exploring') {
      score += 20;
    }
    
    // Identified needs (20 points)
    score += Math.min(needs.length * 10, 20);
    
    // Engagement (30 points)
    if (metrics.messageCount >= 6) {
      score += 30;
    } else {
      score += metrics.messageCount * 5;
    }
    
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate next actions
   */
  generateNextActions(session) {
    const collected = session.state?.collected || {};
    const quality = this.determineLeadQuality(session);
    const actions = [];

    if (quality === 'high') {
      actions.push('Schedule a consultation call within the next 48 hours');
      actions.push('Prepare a customized proposal based on identified needs');
    } else {
      actions.push('Schedule an exploratory call to better understand your needs');
    }

    if (collected.organizationType === 'nonprofit') {
      actions.push('Share our nonprofit-specific service packages and success stories');
    }

    if (!collected.budget) {
      actions.push('Discuss budget parameters and available financing options');
    }

    actions.push('Send relevant case studies and client testimonials');
    
    if (session.identifiedNeeds?.includes('website_redesign')) {
      actions.push('Conduct a preliminary website audit and share findings');
    }

    return actions;
  }

  /**
   * Check if conversation is complete
   */
  isConversationComplete(session) {
    const collected = session.state?.collected || {};
    const requiredFields = ['organizationType', 'businessNeeds', 'timeline', 'budget', 'email'];
    
    return requiredFields.every(field => collected[field]);
  }

  /**
   * Get template for organization type
   */
  getTemplate(organizationType) {
    return this.templates[organizationType] || this.templates.default;
  }

  /**
   * Get all templates
   */
  getTemplates() {
    return this.templates;
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format budget range
   */
  formatBudget(budget) {
    const budgetMap = {
      '< 5000': 'Under $5,000',
      '5000-10000': '$5,000 - $10,000',
      '10000-25000': '$10,000 - $25,000',
      '25000-50000': '$25,000 - $50,000',
      '50000+': 'Over $50,000'
    };
    
    return budgetMap[budget] || 'To be determined';
  }

  /**
   * Parse budget value
   */
  parseBudgetValue(budget) {
    const budgetValues = {
      '< 5000': 2500,
      '5000-10000': 7500,
      '10000-25000': 17500,
      '25000-50000': 37500,
      '50000+': 75000
    };
    
    return budgetValues[budget] || 0;
  }

  /**
   * Format timeline
   */
  formatTimeline(timeline) {
    if (!timeline) return 'To be determined';
    
    const timelineMap = {
      'immediate': 'Immediate',
      '< 1 month': 'Within 1 month',
      '1-3 months': '1 to 3 months',
      '3-6 months': '3 to 6 months',
      '6+ months': 'Over 6 months'
    };
    
    return timelineMap[timeline] || timeline;
  }

  /**
   * Format service name
   */
  formatServiceName(name) {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format organization type
   */
  formatOrganizationType(type) {
    const typeMap = {
      'for-profit': 'For-Profit Business',
      'nonprofit': 'Nonprofit Organization',
      'government': 'Government Agency',
      'startup': 'Startup',
      'enterprise': 'Enterprise'
    };
    
    return typeMap[type] || 'Organization';
  }

  /**
   * Generate error summary
   */
  generateErrorSummary() {
    return {
      html: '<h1>Unable to generate summary</h1><p>Please try again later.</p>',
      text: 'Unable to generate summary. Please try again later.',
      data: { error: true, generatedAt: new Date() }
    };
  }
}

// Export singleton instance
module.exports = new SummaryService();