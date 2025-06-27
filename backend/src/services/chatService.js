// Chat Service
// Handles AI chat logic and conversation management

const OpenAI = require('openai');
const logger = require('../utils/logger');

// Initialize OpenAI client with standard API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the AI consultant
const SYSTEM_PROMPT = `You are a friendly and professional AI consultant for ServiceVision, a dual-mission business and technology consulting firm. Your role is to:

1. Understand the visitor's organization type and needs
2. Ask relevant questions to identify their pain points
3. Recommend appropriate ServiceVision services
4. Be conversational but professional
5. Guide them toward scheduling a consultation

ServiceVision offers:
- Business Strategy Consulting (MBA-level guidance)
- Software Development & Design
- Data Analytics & AI Integration
- Cloud Infrastructure Solutions
- Compliance & Security (HIPAA, PCI, GDPR, etc.)

Remember to:
- Be empathetic and understanding
- Ask one question at a time
- Keep responses concise but helpful
- Identify if they're a nonprofit for special consideration
- Collect key information naturally through conversation`;

class ChatService {    /**
     * Get initial greeting message
     */
    async getInitialMessage(lead, chatSession) {
        try {
            const messages = [
                { role: 'system', content: SYSTEM_PROMPT },
                { 
                    role: 'user', 
                    content: `A visitor just started a chat. Their email is ${lead.email}${lead.organizationName ? ` and they work at ${lead.organizationName}` : ''}. Start with a warm greeting and ask about their organization and what brings them to ServiceVision today.`
                }
            ];

            const response = await openai.chat.completions.create({
                messages,
                model: 'gpt-4-turbo-preview',
                temperature: 0.7,
                max_tokens: 200
            });

            const message = response.choices[0].message.content;

            // Save initial conversation
            chatSession.conversationHistory = [
                { role: 'assistant', content: message, timestamp: new Date() }
            ];
            await chatSession.save();

            return message;
        } catch (error) {
            logger.error('Error getting initial message:', error);
            return "Hello! Welcome to ServiceVision. I'm here to help you explore how we can support your organization's goals. Could you tell me a bit about your organization and what challenges you're facing?";
        }
    }
    /**
     * Process a user message and generate response
     */
    async processMessage(chatSession, userMessage) {
        try {
            // Add user message to history
            const conversationHistory = chatSession.conversationHistory || [];
            conversationHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date()
            });

            // Build messages for OpenAI
            const messages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...conversationHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];

            const response = await openai.chat.completions.create({
                messages,
                model: 'gpt-4-turbo-preview',
                temperature: 0.7,
                max_tokens: 300,
                tools: [{
                    type: 'function',
                    function: {
                        name: 'update_lead_info',
                        description: 'Update lead information based on conversation',
                        parameters: {
                            type: 'object',
                            properties: {                                organizationType: {
                                    type: 'string',
                                    enum: ['for-profit', 'nonprofit', 'government', 'other']
                                },
                                organizationSize: {
                                    type: 'string',
                                    enum: ['small', 'medium', 'large', 'enterprise']
                                },
                                consultingInterests: {
                                    type: 'array',
                                    items: { type: 'string' }
                                },
                                identifiedNeeds: {
                                    type: 'array',
                                    items: { type: 'string' }
                                }
                            }
                        }
                    }
                }]
            });

            const aiMessage = response.choices[0].message;
            conversationHistory.push({
                role: 'assistant',
                content: aiMessage.content,
                timestamp: new Date()
            });

            // Process tool calls if any
            let identifiedNeeds = chatSession.identifiedNeeds || [];
            let recommendedServices = chatSession.recommendedServices || [];            
            if (aiMessage.tool_calls) {
                for (const toolCall of aiMessage.tool_calls) {
                    if (toolCall.function.name === 'update_lead_info') {
                        const functionData = JSON.parse(toolCall.function.arguments);
                        
                        // Update lead information
                        if (functionData.organizationType) {
                            chatSession.lead.organizationType = functionData.organizationType;
                        }
                        if (functionData.organizationSize) {
                            chatSession.lead.organizationSize = functionData.organizationSize;
                        }
                        if (functionData.consultingInterests) {
                            chatSession.lead.consultingInterests = functionData.consultingInterests;
                        }
                        if (functionData.identifiedNeeds) {
                            identifiedNeeds = [...new Set([...identifiedNeeds, ...functionData.identifiedNeeds])];
                        }
                        
                        await chatSession.lead.save();
                    }
                }
            }

            // Calculate completion rate
            const completionRate = this.calculateCompletionRate(chatSession);
            const isComplete = completionRate >= 80;

            // Generate quick replies
            const quickReplies = this.generateQuickReplies(conversationHistory.length, identifiedNeeds);

            return {
                message: aiMessage.content,
                conversationHistory,
                identifiedNeeds,
                recommendedServices: this.mapNeedsToServices(identifiedNeeds),
                completionRate,
                isComplete,
                quickReplies
            };
        } catch (error) {
            logger.error('Error processing message:', error);
            return {
                message: "I apologize, but I'm having trouble processing your message. Could you please try again?",
                conversationHistory: chatSession.conversationHistory,
                identifiedNeeds: chatSession.identifiedNeeds || [],
                recommendedServices: chatSession.recommendedServices || [],
                completionRate: 0,
                isComplete: false,
                quickReplies: []
            };
        }
    }
    /**
     * Generate executive summary
     */
    async generateExecutiveSummary(chatSession) {
        try {
            const messages = [
                { 
                    role: 'system', 
                    content: 'You are a professional consultant creating an executive summary. Based on the conversation, create a concise summary that includes: 1) Organization overview, 2) Key challenges identified, 3) Recommended ServiceVision services, 4) Proposed next steps. Keep it professional and actionable.'
                },
                {
                    role: 'user',
                    content: `Create an executive summary based on this conversation: ${JSON.stringify(chatSession.conversationHistory)}\n\nOrganization: ${chatSession.lead.organizationName || 'Not specified'}\nType: ${chatSession.lead.organizationType || 'Not specified'}\nIdentified Needs: ${JSON.stringify(chatSession.identifiedNeeds)}`
                }
            ];

            const response = await openai.chat.completions.create({
                messages,
                model: 'gpt-4-turbo-preview',
                temperature: 0.7,
                max_tokens: 500
            });

            return response.choices[0].message.content;
        } catch (error) {
            logger.error('Error generating executive summary:', error);
            return this.generateFallbackSummary(chatSession);
        }
    }
    /**
     * Calculate conversation completion rate
     */
    calculateCompletionRate(chatSession) {
        const factors = {
            hasEmail: 20,
            hasOrgType: 20,
            hasOrgName: 10,
            hasNeeds: 30,
            messageCount: 20
        };

        let score = 0;
        if (chatSession.lead.email) score += factors.hasEmail;
        if (chatSession.lead.organizationType) score += factors.hasOrgType;
        if (chatSession.lead.organizationName) score += factors.hasOrgName;
        if (chatSession.identifiedNeeds && chatSession.identifiedNeeds.length > 0) score += factors.hasNeeds;
        if (chatSession.totalMessages >= 5) score += factors.messageCount;

        return Math.min(score, 100);
    }

    /**
     * Generate quick reply suggestions
     */
    generateQuickReplies(messageCount, identifiedNeeds) {
        if (messageCount < 3) {
            return [
                "We're a small business",
                "We're a nonprofit organization", 
                "Tell me about your services"
            ];
        } else if (messageCount < 6) {
            return [
                "We need help with technology",
                "We're looking for strategic guidance",
                "What's your pricing?"
            ];
        } else {
            return [
                "Schedule a consultation",
                "Get an executive summary",
                "I have more questions"
            ];
        }
    }
    /**
     * Map identified needs to ServiceVision services
     */
    mapNeedsToServices(needs) {
        const serviceMapping = {
            'technology': ['Software Development', 'Cloud Solutions', 'System Integration'],
            'strategy': ['Business Strategy Consulting', 'Product Management', 'Market Research'],
            'data': ['Data Analytics', 'AI/ML Integration', 'Business Intelligence'],
            'compliance': ['HIPAA Compliance', 'GDPR Compliance', 'Security Audits'],
            'nonprofit': ['Nonprofit Consulting', 'Grant Writing Support', 'Impact Measurement']
        };

        const services = new Set();
        needs.forEach(need => {
            const needLower = need.toLowerCase();
            Object.keys(serviceMapping).forEach(key => {
                if (needLower.includes(key)) {
                    serviceMapping[key].forEach(service => services.add(service));
                }
            });
        });

        return Array.from(services);
    }

    /**
     * Generate fallback summary if AI fails
     */
    generateFallbackSummary(chatSession) {
        return `Executive Summary for ${chatSession.lead.organizationName || 'Prospective Client'}

Based on our conversation, we've identified the following:

Organization Type: ${chatSession.lead.organizationType || 'To be determined'}
Key Needs: ${(chatSession.identifiedNeeds || []).join(', ') || 'To be discussed further'}

Recommended Services:
${(chatSession.recommendedServices || ['Full consultation needed to determine optimal services']).map(s => `• ${s}`).join('\n')}

Next Steps:
1. Schedule a complimentary consultation call
2. Discuss specific requirements and timeline
3. Receive a customized proposal

We look forward to partnering with you to achieve your goals.`;
    }
}

module.exports = new ChatService();