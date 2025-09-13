// Email Notifications System for Tickedify
// Handles subscription-related email notifications using Mailgun

class EmailNotificationManager {
    constructor() {
        this.mailgun = null;
        this.initialized = false;
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@tickedify.com';
        this.companyName = 'Tickedify';
        
        this.initialize();
    }

    async initialize() {
        try {
            // Only initialize if we have Mailgun credentials
            if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
                console.log('⚠️ Mailgun credentials not found - email notifications disabled');
                return;
            }

            const formData = require('form-data');
            const Mailgun = require('mailgun.js');
            const mailgun = new Mailgun(formData);
            
            this.mailgun = mailgun.client({
                username: 'api',
                key: process.env.MAILGUN_API_KEY
            });
            
            this.domain = process.env.MAILGUN_DOMAIN;
            this.initialized = true;
            
            console.log('✅ Email notification system initialized with Mailgun');
            
        } catch (error) {
            console.error('❌ Failed to initialize email notification system:', error);
        }
    }

    isAvailable() {
        return this.initialized && this.mailgun;
    }

    // Generic email sending method
    async sendEmail(to, subject, htmlContent, textContent = null) {
        if (!this.isAvailable()) {
            console.log('⚠️ Email system not available - email not sent');
            return { success: false, error: 'Email system not initialized' };
        }

        try {
            const emailData = {
                from: this.fromEmail,
                to: to,
                subject: subject,
                html: htmlContent,
                text: textContent || this.htmlToText(htmlContent)
            };

            console.log(`📧 Sending email to ${to}: ${subject}`);
            const result = await this.mailgun.messages.create(this.domain, emailData);
            console.log('✅ Email sent successfully:', result.id);
            
            return { success: true, messageId: result.id };
            
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            return { success: false, error: error.message };
        }
    }

    // Convert HTML to plain text (simple implementation)
    htmlToText(html) {
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
    }

    // Email template generator
    generateEmailTemplate(title, content, buttonText = null, buttonUrl = null) {
        const buttonHtml = buttonText && buttonUrl ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${buttonUrl}" style="
                    background: #007AFF;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 8px;
                    display: inline-block;
                    font-weight: 600;
                ">${buttonText}</a>
            </div>
        ` : '';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h1 style="color: #007AFF; margin: 0; font-size: 24px;">🎯 ${this.companyName}</h1>
            </div>
            
            <h2 style="color: #333; font-size: 20px;">${title}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                ${content}
            </div>
            
            ${buttonHtml}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
                <p>Met vriendelijke groet,<br>Het ${this.companyName} Team</p>
                <p style="font-size: 12px; color: #999;">
                    Je ontvangt deze email omdat je een account hebt bij ${this.companyName}.
                    <br>Voor vragen kun je contact opnemen via support@tickedify.com
                </p>
            </div>
        </body>
        </html>
        `;
    }

    // Specific notification methods
    async sendWelcomeEmail(user) {
        const content = `
            <p>Welkom bij ${this.companyName}, ${user.naam || 'daar'}!</p>
            <p>Je account is succesvol aangemaakt. Je kunt nu aan de slag met de krachtige "Baas Over Je Tijd" methodologie.</p>
            <p><strong>Wat kun je nu doen:</strong></p>
            <ul>
                <li>📥 Taken toevoegen aan je inbox</li>
                <li>🎯 Je Top 3 prioriteiten voor vandaag instellen</li>
                <li>🔄 Herhalende taken configureren</li>
                <li>📧 Email import instellen voor naadloze workflow</li>
            </ul>
        `;
        
        return await this.sendEmail(
            user.email,
            `Welkom bij ${this.companyName}! 🎉`,
            this.generateEmailTemplate('Welkom bij Tickedify!', content, 'Start nu →', 'https://tickedify.com/app')
        );
    }

    async sendBetaEndedEmail(user) {
        const content = `
            <p>Hallo ${user.naam || 'daar'},</p>
            <p>De beta periode van ${this.companyName} is afgelopen. Bedankt voor je waardevolle feedback tijdens de testfase!</p>
            <p>Om door te gaan met ${this.companyName}, kun je nu kiezen uit onze beschikbare plannen:</p>
            <ul>
                <li>🆓 <strong>14 dagen gratis trial</strong> - Probeer alle features zonder creditcard</li>
                <li>💎 <strong>Jaarlijks plan (€60/jaar)</strong> - Beste waarde met 16% korting</li>
                <li>📅 <strong>Maandelijks plan (€6/maand)</strong> - Flexibel opzegbaar</li>
            </ul>
            <p>Je taken en data blijven veilig bewaard tijdens je keuzeproces.</p>
        `;
        
        return await this.sendEmail(
            user.email,
            'Beta periode afgelopen - Kies je plan 🎯',
            this.generateEmailTemplate('Beta periode afgelopen', content, 'Kies je plan →', 'https://tickedify.com/app')
        );
    }

    async sendTrialStartedEmail(user, trialEndsAt) {
        const endDate = new Date(trialEndsAt).toLocaleDateString('nl-NL');
        
        const content = `
            <p>Geweldig, ${user.naam || 'daar'}!</p>
            <p>Je 14-daagse gratis trial is gestart. Je hebt nu toegang tot alle ${this.companyName} features tot <strong>${endDate}</strong>.</p>
            <p><strong>Maak optimaal gebruik van je trial:</strong></p>
            <ul>
                <li>🎯 Probeer de unieke "Baas Over Je Tijd" methodologie</li>
                <li>⚡ Test event-based herhalingen voor complexe workflows</li>
                <li>📋 Gebruik subtaken voor projectmanagement</li>
                <li>🥇 Stel je Top 3 prioriteiten in voor dagelijkse focus</li>
            </ul>
        `;
        
        return await this.sendEmail(
            user.email,
            'Je trial is gestart! Welkom aan boord 🚀',
            this.generateEmailTemplate('Trial gestart', content, 'Open ${this.companyName} →', 'https://tickedify.com/app')
        );
    }

    async sendTrialEndingEmail(user, daysLeft) {
        const content = `
            <p>Hallo ${user.naam || 'daar'},</p>
            <p>Je gratis trial van ${this.companyName} eindigt over <strong>${daysLeft} dagen</strong>.</p>
            <p>Wil je door blijven gaan met je productiviteitsreis? Kies een van onze plannen:</p>
            <ul>
                <li>💎 <strong>Jaarlijks (€60/jaar)</strong> - Beste waarde, €5 per maand</li>
                <li>📅 <strong>Maandelijks (€6/maand)</strong> - Flexibel opzegbaar</li>
            </ul>
            <p>Je taken en data blijven bewaard ongeacht je keuze.</p>
        `;
        
        return await this.sendEmail(
            user.email,
            `Je trial eindigt over ${daysLeft} dagen ⏰`,
            this.generateEmailTemplate('Trial eindigt binnenkort', content, 'Upgrade nu →', 'https://tickedify.com/pricing')
        );
    }

    async sendAccountUpgradeEmail(user, planType) {
        const planName = planType === 'yearly' ? 'Jaarlijks Plan (€60/jaar)' : 'Maandelijks Plan (€6/maand)';
        
        const content = `
            <p>Gefeliciteerd, ${user.naam || 'daar'}!</p>
            <p>Je account is succesvol geupgraded naar het <strong>${planName}</strong>.</p>
            <p>Je hebt nu toegang tot:</p>
            <ul>
                <li>✅ Onbeperkte taken en projecten</li>
                <li>✅ 1GB opslagcapaciteit</li>
                <li>✅ Prioriteit support</li>
                <li>✅ Geavanceerde rapportages</li>
                <li>✅ Export functionaliteit</li>
            </ul>
            <p>Bedankt voor je vertrouwen in ${this.companyName}!</p>
        `;
        
        return await this.sendEmail(
            user.email,
            'Account succesvol geupgraded! 🎉',
            this.generateEmailTemplate('Account geupgraded', content, 'Ga aan de slag →', 'https://tickedify.com/app')
        );
    }
}

module.exports = EmailNotificationManager;