// Email Service
// Handles email sending via SendGrid with retry logic and templates

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');
const { getConfig } = require('../config/environment');

// Initialize SendGrid on module load if possible
try {
    const config = getConfig();
    if (config && config.SENDGRID_API_KEY) {
        sgMail.setApiKey(config.SENDGRID_API_KEY);
    }
} catch (error) {
    // Will retry on first use
}

// Email queue for failed sends
const emailQueue = [];

class EmailService {
    constructor() {
        this.refreshConfig();
        this.initializeSendGrid();
    }

    refreshConfig() {
        this.config = getConfig() || {};
        // Ensure required fields have defaults
        if (!this.config.SENDGRID_FROM_EMAIL) {
            this.config.SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@servicevision.com';
        }
    }

    /**
     * Initialize SendGrid with API key
     */
    initializeSendGrid() {
        if (this.config.SENDGRID_API_KEY) {
            sgMail.setApiKey(this.config.SENDGRID_API_KEY);
        }
    }

    /**
     * Send welcome email to new lead
     */
    async sendWelcomeEmail(recipient) {
        this.refreshConfig();
        try {
            const { email, name } = recipient;
            const subject = name 
                ? `Welcome to ServiceVision, ${name}!` 
                : 'Welcome to ServiceVision!';

            const html = this.getWelcomeTemplate({ name: name || 'there' });
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
        this.refreshConfig();
        try {
            const { email, name, company, executiveSummary, calendarLink } = leadData;
            
            const templateData = {
                name: name || 'Valued Client',
                company,
                executiveSummary,
                calendarLink
            };

            const html = this.getLeadNotificationTemplate(templateData);
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
        this.refreshConfig();
        try {
            const { email, name, prizeDetails } = winnerData;
            
            const templateData = {
                name: name || 'Lucky Winner',
                prizeType: prizeDetails.type.replace(/_/g, ' '),
                prizeValue: prizeDetails.value,
                prizeDuration: prizeDetails.duration
            };

            const html = this.getDrawingWinnerTemplate(templateData);
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
        this.refreshConfig();
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
        return {
            welcome: this.getWelcomeTemplate.bind(this),
            leadNotification: this.getLeadNotificationTemplate.bind(this),
            drawingWinner: this.getDrawingWinnerTemplate.bind(this)
        };
    }

    /**
     * Get welcome email template
     */
    getWelcomeTemplate(data) {
        const safeName = this.escapeHtml(data.name);
        return `
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
            <h2>Hello ${safeName},</h2>
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
</html>`;
    }

    /**
     * Get lead notification template
     */
    getLeadNotificationTemplate(data) {
        const safeName = this.escapeHtml(data.name);
        const safeCompany = data.company ? this.escapeHtml(data.company) : '';
        const safeSummary = data.executiveSummary ? this.escapeHtml(data.executiveSummary) : '';
        const safeCalendarLink = data.calendarLink ? this.escapeHtml(data.calendarLink) : '';
        
        return `
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
            <h2>Hello ${safeName},</h2>
            <p>Thank you for your interest in ServiceVision${safeCompany ? ` on behalf of ${safeCompany}` : ''}.</p>
            ${safeSummary ? `
            <div class="summary">
                <h3>Executive Summary</h3>
                <p>${safeSummary}</p>
            </div>
            ` : ''}
            ${safeCalendarLink ? `
            <p>Ready to take the next step? Schedule your free consultation:</p>
            <center>
                <a href="${safeCalendarLink}" class="cta">Schedule Your Consultation</a>
            </center>
            ` : ''}
        </div>
        <div class="footer">
            <p>ServiceVision - Transforming Business with AI</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get drawing winner template
     */
    getDrawingWinnerTemplate(data) {
        const safeName = this.escapeHtml(data.name);
        const safePrizeType = this.escapeHtml(data.prizeType);
        const safePrizeValue = this.escapeHtml(String(data.prizeValue));
        const safePrizeDuration = this.escapeHtml(data.prizeDuration);
        
        return `
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
            <h2>Dear ${safeName},</h2>
            <p>You have won our monthly drawing!</p>
            <div class="prize">
                <h3>Your Prize</h3>
                <p><strong>${safePrizeType}</strong></p>
                <p>Value: $${safePrizeValue}</p>
                <p>Duration: ${safePrizeDuration}</p>
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
</html>`;
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
        return String(str).replace(/[&<>"'/]/g, (char) => escapeMap[char]);
    }

    /**
     * Send meeting confirmation email
     */
    async sendMeetingConfirmation(data) {
        this.refreshConfig();
        try {
            const { email, name, meetingDate, meetingType } = data;
            
            const html = this.getMeetingConfirmationTemplate({
                name: name || 'Valued Client',
                meetingDate,
                meetingType: meetingType || 'Consultation'
            });
            const text = this.stripHtml(html);

            const msg = {
                to: email,
                from: {
                    email: this.config.SENDGRID_FROM_EMAIL,
                    name: 'ServiceVision Team'
                },
                subject: `Meeting Confirmed - ${meetingType || 'Consultation'}`,
                html,
                text
            };

            if (this.config.NODE_ENV === 'development') {
                logger.info('Development mode: Meeting confirmation would be sent', { to: email });
                return { success: true, development: true };
            }

            await sgMail.send(msg);
            logger.info(`Meeting confirmation sent to ${email}`);
            
            return { success: true };
        } catch (error) {
            logger.error('Error sending meeting confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send meeting cancellation email
     */
    async sendMeetingCancellation(data) {
        this.refreshConfig();
        try {
            const { email, name, reason } = data;
            
            const html = this.getMeetingCancellationTemplate({
                name: name || 'Valued Client',
                reason
            });
            const text = this.stripHtml(html);

            const msg = {
                to: email,
                from: {
                    email: this.config.SENDGRID_FROM_EMAIL,
                    name: 'ServiceVision Team'
                },
                subject: 'Meeting Canceled - ServiceVision',
                html,
                text
            };

            if (this.config.NODE_ENV === 'development') {
                logger.info('Development mode: Meeting cancellation would be sent', { to: email });
                return { success: true, development: true };
            }

            await sgMail.send(msg);
            logger.info(`Meeting cancellation sent to ${email}`);
            
            return { success: true };
        } catch (error) {
            logger.error('Error sending meeting cancellation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get meeting confirmation template
     */
    getMeetingConfirmationTemplate(data) {
        const { name, meetingDate, meetingType } = data;
        const safeName = this.escapeHtml(name);
        const safeMeetingType = this.escapeHtml(meetingType);
        const formattedDate = new Date(meetingDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
        });
        const safeDate = this.escapeHtml(formattedDate);
        
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .meeting-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #10B981; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Meeting Confirmed!</h1>
        </div>
        <div class="content">
            <h2>Hi ${safeName},</h2>
            <p>Your ${safeMeetingType} has been confirmed!</p>
            <div class="meeting-details">
                <h3>Meeting Details</h3>
                <p><strong>Date & Time:</strong> ${safeDate}</p>
                <p><strong>Type:</strong> ${safeMeetingType}</p>
            </div>
            <p>We look forward to speaking with you!</p>
            <p>If you need to reschedule or cancel, please use the link in your Calendly confirmation email.</p>
        </div>
        <div class="footer">
            <p>ServiceVision - Transforming Business with AI</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get meeting cancellation template
     */
    getMeetingCancellationTemplate(data) {
        const { name, reason } = data;
        const safeName = this.escapeHtml(name);
        const safeReason = reason ? this.escapeHtml(reason) : '';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #EF4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .cta { background-color: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Meeting Canceled</h1>
        </div>
        <div class="content">
            <h2>Hi ${safeName},</h2>
            <p>Your meeting has been canceled${safeReason ? ` (Reason: ${safeReason})` : ''}.</p>
            <p>If you'd like to reschedule, we'd love to find another time that works for you.</p>
            <center>
                <a href="https://calendly.com/servicevision" class="cta">Reschedule Meeting</a>
            </center>
            <p>Or simply reply to this email and we'll help you find a new time.</p>
        </div>
        <div class="footer">
            <p>ServiceVision - Transforming Business with AI</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Clear email queue (for testing)
     */
    clearQueue() {
        emailQueue.length = 0;
    }
}

// Export singleton instance
module.exports = new EmailService();