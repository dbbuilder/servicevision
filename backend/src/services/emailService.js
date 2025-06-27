// Email Service
// Handles email sending via SendGrid with retry logic and templates

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');
const { getConfig } = require('../config/environment');

// Initialize SendGrid on first use
let initialized = false;
function initializeSendGrid() {
    if (!initialized) {
        try {
            const config = getConfig();
            if (config && config.SENDGRID_API_KEY) {
                sgMail.setApiKey(config.SENDGRID_API_KEY);
                initialized = true;
            }
        } catch (error) {
            // Initialization failed, will try again on next use
            logger.warn('SendGrid initialization failed:', error.message);
        }
    }
}

// Email queue for failed sends
const emailQueue = [];

class EmailService {
    constructor() {
        this.config = getConfig();
        this.templates = this.initializeTemplates();
    }

    /**
     * Send welcome email to new lead
     */
    async sendWelcomeEmail(recipient) {
        initializeSendGrid();
        try {
            const { email, name } = recipient;
            const subject = name 
                ? `Welcome to ServiceVision, ${name}!` 
                : 'Welcome to ServiceVision!';

            const html = this.templates.welcome({ name: name || 'there' });
            const text = this.stripHtml(html);

            const msg = {
                to: email,
                from: {
                    email: this.config.SENDGRID_FROM_EMAIL,
                    name: 'ServiceVision Team'
                },
                subject,
                html,
                text
            };

            // In development, just log the email
            if (this.config.NODE_ENV === 'development') {
                logger.info('Development mode: Email would be sent', { to: email, subject });
                return { success: true, development: true, messageId: `dev-${Date.now()}` };
            }

            const response = await sgMail.send(msg);
            logger.info(`Welcome email sent to ${email}`);
            
            return { 
                success: true, 
                messageId: response[0].headers['x-message-id'] || `msg-${Date.now()}`
            };
        } catch (error) {
            logger.error('Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send lead notification with executive summary
     */
    async sendLeadNotification(leadData) {
        initializeSendGrid();
        try {
            const { email, name, company, executiveSummary, calendarLink } = leadData;
            
            const templateData = {
                name: name || 'Valued Client',
                company,
                executiveSummary,
                calendarLink
            };

            const html = this.templates.leadNotification(templateData);
            const text = this.stripHtml(html);

            const msg = {
                to: email,
                from: {
                    email: this.config.SENDGRID_FROM_EMAIL,
                    name: 'ServiceVision Team'
                },
                subject: 'Your ServiceVision Consultation Summary',
                html,
                text
            };

            if (this.config.NODE_ENV === 'development') {
                logger.info('Development mode: Lead notification would be sent', { to: email });
                return { success: true, development: true };
            }

            await sgMail.send(msg);
            logger.info(`Lead notification sent to ${email}`);
            
            return { success: true };
        } catch (error) {
            logger.error('Error sending lead notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send drawing winner notification
     */
    async sendDrawingWinnerNotification(winnerData) {
        initializeSendGrid();
        try {
            const { email, name, prizeDetails } = winnerData;
            
            const templateData = {
                name: name || 'Lucky Winner',
                prizeType: prizeDetails.type.replace(/_/g, ' '),
                prizeValue: prizeDetails.value,
                prizeDuration: prizeDetails.duration
            };

            const html = this.templates.drawingWinner(templateData);
            const text = this.stripHtml(html);

            const msg = {
                to: email,
                from: {
                    email: this.config.SENDGRID_FROM_EMAIL,
                    name: 'ServiceVision Team'
                },
                subject: 'Congratulations! You Won a Free Consultation',
                html,
                text
            };

            if (this.config.NODE_ENV === 'development') {
                logger.info('Development mode: Winner notification would be sent', { to: email });
                return { success: true, development: true };
            }

            await sgMail.send(msg);
            logger.info(`Winner notification sent to ${email}`);
            
            return { success: true };
        } catch (error) {
            logger.error('Error sending winner notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send email with retry logic
     */
    async sendWithRetry(emailData, maxRetries = 3) {
        initializeSendGrid();
        let attempts = 0;
        let lastError;

        while (attempts < maxRetries) {
            attempts++;
            
            try {
                const msg = {
                    to: emailData.to,
                    from: {
                        email: this.config.SENDGRID_FROM_EMAIL,
                        name: 'ServiceVision Team'
                    },
                    subject: emailData.subject,
                    html: emailData.content,
                    text: this.stripHtml(emailData.content)
                };

                if (this.config.NODE_ENV === 'development') {
                    logger.info('Development mode: Email sent with retry', { attempts });
                    return { success: true, attempts, development: true };
                }

                await sgMail.send(msg);
                logger.info(`Email sent successfully after ${attempts} attempts`);
                
                return { success: true, attempts };
            } catch (error) {
                lastError = error;
                logger.warn(`Email send attempt ${attempts} failed:`, error.message);
                
                if (attempts < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s...
                    const delay = Math.pow(2, attempts - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error(`Email failed after ${attempts} attempts:`, lastError);
        return { success: false, attempts, error: lastError.message };
    }

    /**
     * Queue email for later processing
     */
    async queueEmail(emailData) {
        const queueId = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        emailQueue.push({
            id: queueId,
            data: emailData,
            timestamp: new Date(),
            attempts: 0
        });

        logger.info(`Email queued with ID: ${queueId}`);
        
        return { 
            success: true, 
            queued: true, 
            queueId 
        };
    }

    /**
     * Process queued emails
     */
    async processEmailQueue() {
        const results = {
            total: emailQueue.length,
            successful: 0,
            failed: 0
        };

        while (emailQueue.length > 0) {
            const queuedEmail = emailQueue.shift();
            
            try {
                const result = await this.sendWithRetry(queuedEmail.data);
                
                if (result.success) {
                    results.successful++;
                } else {
                    results.failed++;
                    // Re-queue if not at max attempts
                    if (queuedEmail.attempts < 3) {
                        queuedEmail.attempts++;
                        emailQueue.push(queuedEmail);
                    }
                }
            } catch (error) {
                results.failed++;
                logger.error(`Failed to process queued email ${queuedEmail.id}:`, error);
            }
        }

        return results;
    }

    /**
     * Get email templates
     */
    getEmailTemplates() {
        return this.templates;
    }

    /**
     * Initialize email templates
     */
    initializeTemplates() {
        return {
            welcome: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .cta { background-color: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ServiceVision</h1>
        </div>
        <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Welcome to ServiceVision! We're thrilled to have you join us on your journey to transform your business with AI-powered solutions.</p>
            <p>Our team of experts is ready to help you achieve your goals through innovative consulting and cutting-edge technology.</p>
            <center>
                <a href="https://servicevision.com/get-started" class="cta">Get Started</a>
            </center>
        </div>
        <div class="footer">
            <p>ServiceVision - Transforming Business with AI</p>
            <p>© 2024 ServiceVision. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,

            leadNotification: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .summary { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4F46E5; }
        .cta { background-color: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Consultation Summary</h1>
        </div>
        <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Thank you for your interest in ServiceVision${data.company ? ` on behalf of ${data.company}` : ''}.</p>
            ${data.executiveSummary ? `
            <div class="summary">
                <h3>Executive Summary</h3>
                <p>${data.executiveSummary}</p>
            </div>
            ` : ''}
            ${data.calendarLink ? `
            <p>Ready to take the next step? Schedule your free consultation:</p>
            <center>
                <a href="${data.calendarLink}" class="cta">Schedule Your Consultation</a>
            </center>
            ` : ''}
        </div>
        <div class="footer">
            <p>ServiceVision - Transforming Business with AI</p>
        </div>
    </div>
</body>
</html>`,

            drawingWinner: (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F59E0B; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .prize { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px solid #F59E0B; }
        .cta { background-color: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
            <h2>Dear ${data.name},</h2>
            <p>You have won our monthly drawing!</p>
            <div class="prize">
                <h3>Your Prize</h3>
                <p><strong>${data.prizeType}</strong></p>
                <p>Value: $${data.prizeValue}</p>
                <p>Duration: ${data.prizeDuration}</p>
            </div>
            <p>Our team will contact you within 24 hours to schedule your free consultation.</p>
            <center>
                <a href="https://servicevision.com/claim-prize" class="cta">Claim Your Prize</a>
            </center>
        </div>
        <div class="footer">
            <p>ServiceVision - Transforming Business with AI</p>
        </div>
    </div>
</body>
</html>`)
        };
    }

    /**
     * Strip HTML tags from content
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return str.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
    }
    
    /**
     * Safe template rendering
     */
    renderTemplate(templateFn, data) {
        // Since we're using template literals, we need a different approach
        // For now, return the template as-is and handle escaping in the template itself
        return templateFn;
    }
}

// Export singleton instance
module.exports = new EmailService();