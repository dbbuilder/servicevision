// Email Service
// Handles email sending via SendGrid

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
    /**
     * Send welcome email with executive summary
     */
    async sendWelcomeEmail(lead, chatSession) {
        try {
            const msg = {
                to: lead.email,
                from: {
                    email: process.env.SENDGRID_FROM_EMAIL,
                    name: process.env.SENDGRID_FROM_NAME
                },
                subject: 'Your ServiceVision Consultation Summary',
                html: this.generateWelcomeEmailHtml(lead, chatSession),
                text: this.generateWelcomeEmailText(lead, chatSession)
            };

            await sgMail.send(msg);
            logger.info(`Welcome email sent to ${lead.email}`);
            return true;
        } catch (error) {
            logger.error('Error sending welcome email:', error);
            throw error;
        }
    }
    /**
     * Generate HTML email content
     */
    generateWelcomeEmailHtml(lead, chatSession) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1a5490; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .summary { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .cta { background-color: #2ecc71; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ServiceVision</h1>
            <p>Your Consultation Summary</p>
        </div>
        <div class="content">
            <h2>Hello ${lead.contactName || 'there'},</h2>
            <p>Thank you for taking the time to chat with our AI consultant. We're excited about the opportunity to help ${lead.organizationName || 'your organization'} achieve its goals.</p>
            
            <div class="summary">
                <h3>Executive Summary</h3>                <p>${chatSession.executiveSummary || 'Based on our conversation, we understand your needs and are prepared to discuss how ServiceVision can help.'}</p>
            </div>
            
            <h3>Next Steps</h3>
            <p>We recommend scheduling a consultation call to discuss your specific needs in detail.</p>
            
            <center>
                <a href="${process.env.CALENDLY_URL || 'https://calendly.com/servicevision'}" class="cta">Schedule Your Free Consultation</a>
            </center>
            
            <p>If you have any questions in the meantime, please don't hesitate to reach out.</p>
        </div>
        <div class="footer">
            <p>ServiceVision - Integrating Business Acumen with Technological Excellence</p>
            <p><a href="https://servicevision.net">servicevision.net</a> | <a href="mailto:info@servicevision.net">info@servicevision.net</a></p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Generate plain text email content
     */
    generateWelcomeEmailText(lead, chatSession) {
        return `ServiceVision Consultation Summary

Hello ${lead.contactName || 'there'},

Thank you for taking the time to chat with our AI consultant. We're excited about the opportunity to help ${lead.organizationName || 'your organization'} achieve its goals.

EXECUTIVE SUMMARY
${chatSession.executiveSummary || 'Based on our conversation, we understand your needs and are prepared to discuss how ServiceVision can help.'}

NEXT STEPS
We recommend scheduling a consultation call to discuss your specific needs in detail.

Schedule Your Free Consultation: ${process.env.CALENDLY_URL || 'https://calendly.com/servicevision'}

If you have any questions in the meantime, please don't hesitate to reach out.

Best regards,
The ServiceVision Team

--
ServiceVision - Integrating Business Acumen with Technological Excellence
servicevision.net | info@servicevision.net`;
    }
}

module.exports = new EmailService();