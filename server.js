const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const OpenAI = require('openai');
const app = express();
const PORT = process.env.PORT || 3000;

// Import PostgreSQL session store
const pgSession = require('connect-pg-simple')(session);

// Security headers middleware
app.use((req, res, next) => {
    // Basic security headers (safe for existing apps)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add URL-encoded parsing for Mailgun
app.use(express.static('public'));

// Multer for form-data parsing (Mailgun webhooks)
const upload = multer();

// Multer configuration for file uploads (in-memory storage)
const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size (will be checked by business logic)
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file type check (more detailed validation in storage manager)
    if (!file.mimetype) {
      return cb(new Error('Geen bestandstype gedetecteerd'));
    }
    cb(null, true);
  }
});

// Enhanced request logging with API tracking
const apiStats = new Map();
const errorLogs = [];
const MAX_ERROR_LOGS = 100;

// Import forensic logger
const forensicLogger = require('./forensic-logger');

// Import storage manager for attachments
const { storageManager, STORAGE_CONFIG } = require('./storage-manager');

// GHL Helper Function
async function addContactToGHL(email, name, tags = ['tickedify-beta-tester']) {
    if (!process.env.GHL_API_KEY) {
        console.log('⚠️ GHL not configured, skipping contact sync');
        return null;
    }
    
    try {
        const locationId = process.env.GHL_LOCATION_ID || 'FLRLwGihIMJsxbRS39Kt';
        
        // Search for existing contact
        const searchResponse = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email.toLowerCase().trim())}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            }
        });
        
        let contactId = null;
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.contact && searchData.contact.id) {
                contactId = searchData.contact.id;
                
                // Update existing contact with new tags
                const tagResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Version': '2021-07-28'
                    },
                    body: JSON.stringify({ tags })
                });
                
                if (tagResponse.ok) {
                } else {
                    console.error(`⚠️ GHL: Failed to add tags to existing contact ${contactId}`);
                }
            }
        }
        
        if (!contactId) {
            // Create new contact
            const createResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    firstName: name ? name.split(' ')[0] : '',
                    lastName: name ? name.split(' ').slice(1).join(' ') : '',
                    name: name || email,
                    locationId: locationId,
                    tags: tags,
                    source: 'tickedify-registration'
                })
            });
            
            if (createResponse.ok) {
                const createData = await createResponse.json();
                contactId = createData.contact?.id;
            } else {
                const errorText = await createResponse.text();
                console.error(`⚠️ GHL: Failed to create contact: ${createResponse.status} - ${errorText}`);
            }
        }
        
        return contactId;
        
    } catch (error) {
        console.error('⚠️ GHL integration error:', error.message);
        return null;
    }
}

// ========================================
// SUBSCRIPTION & PAYMENT HELPER FUNCTIONS
// Feature: 011-in-de-app
// ========================================

// Subscription State Machine Constants
const SUBSCRIPTION_STATES = {
  BETA: 'beta',
  BETA_ACTIVE: 'beta_active',
  BETA_EXPIRED: 'beta_expired',
  PENDING_PAYMENT: 'pending_payment',
  TRIALING: 'trialing',
  TRIAL_EXPIRED: 'trial_expired',
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const PLAN_IDS = {
  TRIAL_14: 'trial_14_days',
  MONTHLY_7: 'monthly_7',
  YEARLY_70: 'yearly_70',
  MONTHLY_8: 'monthly_8',
  YEARLY_80: 'yearly_80'
};

// Check if user can access the app based on subscription status
function canAccessApp(user) {
  if (!user || !user.subscription_status) {
    return false;
  }

  const allowedStates = [
    SUBSCRIPTION_STATES.BETA,
    SUBSCRIPTION_STATES.TRIALING,
    SUBSCRIPTION_STATES.ACTIVE
  ];

  return allowedStates.includes(user.subscription_status);
}

// Check if trial has expired
function isTrialExpired(user) {
  // If user has no trial_end_date, they never had a trial
  if (!user.trial_end_date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trialEnd = new Date(user.trial_end_date);
  trialEnd.setHours(0, 0, 0, 0);

  // Return true if trial end date is in the past
  return today > trialEnd;
}

// Validate plan selection (includes No Limit plans: MONTHLY_8 and YEARLY_80)
function validatePlanSelection(planId, currentStatus, hadTrial = false) {
  // Beta users can select trial (only if they never had trial) or paid plans
  if (currentStatus === SUBSCRIPTION_STATES.BETA) {
    // If trying to select trial, check if user already had trial
    if (planId === PLAN_IDS.TRIAL_14 && hadTrial) {
      return false; // User already had trial, cannot select again
    }
    return [PLAN_IDS.TRIAL_14, PLAN_IDS.MONTHLY_7, PLAN_IDS.YEARLY_70, PLAN_IDS.MONTHLY_8, PLAN_IDS.YEARLY_80].includes(planId);
  }

  // Beta-active users (new registration during active beta) can select trial or paid plans
  if (currentStatus === SUBSCRIPTION_STATES.BETA_ACTIVE) {
    // If trying to select trial, check if user already had trial
    if (planId === PLAN_IDS.TRIAL_14 && hadTrial) {
      return false; // User already had trial, cannot select again
    }
    return [PLAN_IDS.TRIAL_14, PLAN_IDS.MONTHLY_7, PLAN_IDS.YEARLY_70, PLAN_IDS.MONTHLY_8, PLAN_IDS.YEARLY_80].includes(planId);
  }

  // Beta-expired users can select trial (if never had trial) or paid plans
  if (currentStatus === SUBSCRIPTION_STATES.BETA_EXPIRED) {
    // If trying to select trial, check if user already had trial
    if (planId === PLAN_IDS.TRIAL_14 && hadTrial) {
      return false; // User already had trial, cannot select again
    }
    return [PLAN_IDS.TRIAL_14, PLAN_IDS.MONTHLY_7, PLAN_IDS.YEARLY_70, PLAN_IDS.MONTHLY_8, PLAN_IDS.YEARLY_80].includes(planId);
  }

  // Pending payment users (new registration during stopped beta) can select trial or paid plans
  if (currentStatus === SUBSCRIPTION_STATES.PENDING_PAYMENT) {
    // If trying to select trial, check if user already had trial
    if (planId === PLAN_IDS.TRIAL_14 && hadTrial) {
      return false; // User already had trial, cannot select again
    }
    return [PLAN_IDS.TRIAL_14, PLAN_IDS.MONTHLY_7, PLAN_IDS.YEARLY_70, PLAN_IDS.MONTHLY_8, PLAN_IDS.YEARLY_80].includes(planId);
  }

  // Trial expired users can only select paid plans
  if (currentStatus === SUBSCRIPTION_STATES.TRIAL_EXPIRED) {
    return [PLAN_IDS.MONTHLY_7, PLAN_IDS.YEARLY_70, PLAN_IDS.MONTHLY_8, PLAN_IDS.YEARLY_80].includes(planId);
  }

  // Trialing users can upgrade to paid plans
  if (currentStatus === SUBSCRIPTION_STATES.TRIALING) {
    return [PLAN_IDS.MONTHLY_7, PLAN_IDS.YEARLY_70, PLAN_IDS.MONTHLY_8, PLAN_IDS.YEARLY_80].includes(planId);
  }

  return false;
}

// Calculate trial end date (14 days from today)
function calculateTrialEndDate() {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return endDate;
}

// Generate cryptographically random login token
function generateLoginToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(30).toString('hex'); // 60 character hex string
}

// Calculate token expiry (10 minutes from now)
function calculateTokenExpiry() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}

// Validate login token
async function validateLoginToken(token, pool) {
  if (!token) {
    return { valid: false, error: 'Geen token opgegeven' };
  }

  try {
    const result = await pool.query(
      `SELECT id, email, login_token_expires, login_token_used
       FROM users
       WHERE login_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Ongeldig token' };
    }

    const user = result.rows[0];

    // Check if token already used
    if (user.login_token_used) {
      return { valid: false, error: 'Token al gebruikt' };
    }

    // Check if token expired
    const now = new Date();
    const expiry = new Date(user.login_token_expires);
    if (now > expiry) {
      return { valid: false, error: 'Token verlopen' };
    }

    // Mark token as used
    await pool.query(
      'UPDATE users SET login_token_used = TRUE WHERE id = $1',
      [user.id]
    );

    return { valid: true, userId: user.id, email: user.email };

  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Fout bij token validatie' };
  }
}

// Check webhook idempotency (prevent duplicate processing)
async function checkWebhookIdempotency(orderId, pool) {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE plugandpay_order_id = $1',
      [orderId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Idempotency check error:', error);
    return false;
  }
}

// Log webhook event for audit trail
async function logWebhookEvent(webhookData, pool) {
  try {
    await pool.query(
      `INSERT INTO payment_webhook_logs
       (user_id, event_type, order_id, email, amount_cents, payload, signature_valid, ip_address, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        webhookData.user_id || null,
        webhookData.event_type,
        webhookData.order_id,
        webhookData.email,
        webhookData.amount_cents,
        JSON.stringify(webhookData.payload),
        webhookData.signature_valid,
        webhookData.ip_address,
        webhookData.error_message || null
      ]
    );
  } catch (error) {
    console.error('Webhook logging error:', error);
    // Non-critical error, don't throw
  }
}

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

// Middleware to require user login for protected routes
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// ========================================
// PASSWORD RESET HELPER FUNCTIONS
// Feature: 058-dan-mag-je (Account Settings Block)
// ========================================

// Generate cryptographically secure random token (64 hex characters)
function generatePasswordResetToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Hash token with SHA-256 for database storage (security best practice)
function hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Send password reset email via Mailgun
async function sendPasswordResetEmail(userEmail, userName, resetToken) {
  try {
    // Check if Mailgun is configured
    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ Mailgun not configured - cannot send password reset email');
      throw new Error('Email service not configured. Please contact support.');
    }

    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);

    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net' // EU region endpoint
    });

    const resetLink = `https://dev.tickedify.com/reset-password?token=${resetToken}`;

    // HTML email template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #007aff 0%, #0051d5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .button { display: inline-block; background: #007aff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { color: #666; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>You requested a password reset for your Tickedify account. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007aff;">${resetLink}</p>
            <div class="warning">
              <strong>⏱ Important:</strong> This link will expire in 24 hours for security reasons.
            </div>
            <div class="footer">
              <p><strong>Didn't request this?</strong> You can safely ignore this email. Your password won't be changed unless you click the link above.</p>
              <p>If you're having trouble, contact support at info@tickedify.com</p>
              <p style="color: #999; font-size: 12px;">Tickedify - Master Your Time</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text fallback
    const textBody = `
Hi ${userName},

You requested a password reset for your Tickedify account.

To reset your password, visit this link:
${resetLink}

This link will expire in 24 hours for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password won't be changed unless you click the link above.

Need help? Contact us at info@tickedify.com

Tickedify - Master Your Time
    `.trim();

    const messageData = {
      from: 'Tickedify <noreply@mg.tickedify.com>',
      to: userEmail,
      subject: 'Reset your Tickedify password',
      text: textBody,
      html: htmlBody
    };

    const result = await mg.messages.create('mg.tickedify.com', messageData);
    console.log(`✅ Password reset email sent to ${userEmail} (ID: ${result.id})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

// Send admin notification email when new customer completes payment
async function sendNewCustomerNotification(customerEmail, customerName, planName) {
  try {
    // Check if Mailgun is configured
    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ Mailgun not configured - cannot send new customer notification');
      throw new Error('Email service not configured');
    }

    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);

    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net' // EU region endpoint
    });

    // HTML email template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #007aff 0%, #0051d5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .info-box { background: #f8f9fa; border-left: 4px solid #007aff; padding: 16px; margin: 20px 0; }
          .info-row { margin: 8px 0; }
          .info-label { font-weight: 600; color: #666; display: inline-block; min-width: 120px; }
          .info-value { color: #333; }
          .footer { color: #666; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          .success-badge { background: #34c759; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 Nieuwe Klant!</h1>
          </div>
          <div class="content">
            <p><span class="success-badge">BETALING SUCCESVOL</span></p>
            <p>Er heeft zich zojuist een nieuwe klant geregistreerd en een abonnement afgenomen op Tickedify.</p>

            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Naam:</span>
                <span class="info-value">${customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${customerEmail}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Abonnement:</span>
                <span class="info-value"><strong>${planName}</strong></span>
              </div>
            </div>

            <div class="footer">
              <p style="color: #999; font-size: 12px;">Tickedify Admin Notificatie</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text fallback
    const textBody = `
NIEUWE KLANT VOOR TICKEDIFY
============================

Er heeft zich zojuist een nieuwe klant geregistreerd en een abonnement afgenomen.

Klant gegevens:
- Naam: ${customerName}
- Email: ${customerEmail}
- Abonnement: ${planName}

Tickedify Admin Notificatie
    `.trim();

    const messageData = {
      from: 'Tickedify <noreply@mg.tickedify.com>',
      to: 'support@tickedify.com',
      subject: 'Nieuwe klant voor Tickedify',
      text: textBody,
      html: htmlBody
    };

    const result = await mg.messages.create('mg.tickedify.com', messageData);
    console.log(`✅ New customer notification sent to support@tickedify.com (Customer: ${customerEmail}, ID: ${result.id})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send new customer notification:', error);
    throw new Error('Failed to send new customer notification');
  }
}

// ========================================
// PLUG&PAY SUBSCRIPTION HELPER FUNCTIONS
// Feature: 057-dan-gaan-we
// ========================================

// Call Plug&Pay API with proper error handling
async function callPlugPayAPI(endpoint, method = 'GET', data = null) {
  const PLUGPAY_API_KEY = process.env.PLUGPAY_API_KEY;
  const PLUGPAY_API_URL = process.env.PLUGPAY_API_URL || 'https://api.plugandpay.com/v1';

  if (!PLUGPAY_API_KEY) {
    throw new Error('PLUGPAY_API_KEY not configured');
  }

  const url = `${PLUGPAY_API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${PLUGPAY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || `Plug&Pay API error: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('Plug&Pay API call failed:', error);
    throw error;
  }
}

// Validate Plug&Pay webhook signature
function validatePlugPayWebhook(signature, payload, secret) {
  const crypto = require('crypto');

  if (!signature || !payload || !secret) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const calculatedSignature = hmac.digest('hex');

  return signature === calculatedSignature;
}

// Check if webhook event already processed (idempotency)
async function isWebhookProcessed(eventId) {
  try {
    const result = await pool.query(
      'SELECT id FROM webhook_events WHERE event_id = $1',
      [eventId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Webhook idempotency check error:', error);
    return false;
  }
}

// Update user subscription from webhook data
async function updateUserSubscriptionFromWebhook(userId, subscriptionData) {
  try {
    await pool.query(
      `UPDATE users SET
        plugpay_subscription_id = $1,
        subscription_status = $2,
        subscription_plan = $3,
        subscription_renewal_date = $4,
        subscription_price = $5,
        subscription_cycle = $6,
        subscription_updated_at = NOW()
      WHERE id = $7`,
      [
        subscriptionData.subscription_id,
        subscriptionData.status,
        subscriptionData.plan,
        subscriptionData.renewal_date,
        subscriptionData.price,
        subscriptionData.cycle,
        userId
      ]
    );
    return true;
  } catch (error) {
    console.error('User subscription update error:', error);
    throw error;
  }
}

// Get plan tier level for upgrade/downgrade logic
async function getPlanTierLevel(planId) {
  try {
    const result = await pool.query(
      'SELECT tier_level FROM subscription_plans WHERE plan_id = $1',
      [planId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].tier_level;
  } catch (error) {
    console.error('Get plan tier level error:', error);
    return null;
  }
}

// Calculate trial days remaining
function calculateTrialDaysRemaining(trialEndDate) {
  if (!trialEndDate) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(trialEndDate);
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// Force test log on startup
if (forensicLogger.enabled) {
    setTimeout(() => {
        forensicLogger.log('SYSTEM', 'STARTUP_TEST', { message: 'Forensic logging system initialized' });
    }, 2000);
}

// Add forensic logging middleware
app.use(forensicLogger.middleware());

app.use((req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Track API usage
    const endpoint = req.method + ' ' + req.route?.path || req.url;
    if (!apiStats.has(endpoint)) {
        apiStats.set(endpoint, { calls: 0, totalTime: 0, errors: 0, lastCalled: null });
    }
    
    res.send = function(data) {
        const responseTime = Date.now() - startTime;
        const stats = apiStats.get(endpoint);
        
        stats.calls++;
        stats.totalTime += responseTime;
        stats.lastCalled = new Date().toISOString();
        
        // Track errors
        if (res.statusCode >= 400) {
            stats.errors++;
            
            // Log error
            errorLogs.unshift({
                timestamp: new Date().toISOString(),
                endpoint: req.url,
                method: req.method,
                statusCode: res.statusCode,
                message: typeof data === 'string' ? data : JSON.stringify(data),
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress
            });
            
            // Keep only recent errors
            if (errorLogs.length > MAX_ERROR_LOGS) {
                errorLogs.splice(MAX_ERROR_LOGS);
            }
        }
        
        return originalSend.call(this, data);
    };

    next();
});

// Redirect registration to waitlist
app.get('/register', (req, res) => {
    res.redirect('/waitlist.html');
});

app.get('/register.html', (req, res) => {
    res.redirect('/waitlist.html');
});

app.post('/register', (req, res) => {
    res.redirect('/waitlist.html');
});

// Redirect root to waitlist
app.get('/', (req, res) => {
    res.redirect('/waitlist.html');
});

// Password reset page route
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

// Test endpoints first
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString(), version: '1.1' });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        env: {
            NODE_ENV: process.env.NODE_ENV || 'unknown',
            PORT: process.env.PORT || 'default',
            has_database_url: !!process.env.DATABASE_URL,
            has_postgres_url: !!process.env.POSTGRES_URL,
            has_postgres_prisma_url: !!process.env.POSTGRES_PRISMA_URL,
            has_postgres_url_non_pooling: !!process.env.POSTGRES_URL_NON_POOLING
        }
    });
});

// OpenAI TTS endpoint for voice mode
app.post('/api/voice/synthesize', async (req, res) => {
    try {
        const { text, voice = 'alloy', speed = 1.0 } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text parameter is required' });
        }

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            return res.status(503).json({
                error: 'OpenAI API key not configured',
                fallback: true,
                message: 'Please add OPENAI_API_KEY to environment variables'
            });
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Valid voices: alloy, echo, fable, onyx, nova, shimmer
        const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
        const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';

        // Call OpenAI TTS API
        const mp3Response = await openai.audio.speech.create({
            model: 'tts-1', // Use tts-1-hd for higher quality (2x cost)
            voice: selectedVoice,
            input: text,
            speed: Math.max(0.25, Math.min(4.0, speed)) // Clamp between 0.25 and 4.0
        });

        // Convert response to buffer
        const buffer = Buffer.from(await mp3Response.arrayBuffer());

        // Set headers for audio streaming
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length,
            'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
        });

        res.send(buffer);

    } catch (error) {
        console.error('OpenAI TTS error:', error);
        res.status(500).json({
            error: 'Failed to synthesize speech',
            message: error.message,
            fallback: true
        });
    }
});

// OpenAI Natural Language Parsing endpoint for Voice Mode POC
app.post('/api/voice/parse-command', async (req, res) => {
    try {
        const { transcript, conversationHistory = [], availableEntities = {} } = req.body;

        if (!transcript || transcript.trim().length === 0) {
            return res.status(400).json({
                error: 'Transcript parameter is required',
                fallback: true,
                message: 'Empty or missing transcript'
            });
        }

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            return res.status(503).json({
                error: 'OpenAI API key not configured',
                fallback: true,
                message: 'Please add OPENAI_API_KEY to environment variables'
            });
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Build system prompt in Dutch
        const systemPrompt = `Je bent een Nederlandse spraakassistent voor Tickedify task management.
Jouw taak is om Nederlandse gesproken commando's te begrijpen en de bedoeling van de gebruiker te extraheren.

BESCHIKBARE ENTITEITEN:
Projecten: ${(availableEntities.projects || []).join(', ') || 'Geen projecten beschikbaar'}
Contexten: ${(availableEntities.contexts || []).join(', ') || 'Geen contexten beschikbaar'}

COMMANDO TYPES:
1. set_property: Eigenschappen instellen (project, context, prioriteit, duur, datum, notitie, subtiel)
2. set_list: Taak doorsturen naar lijst (opvolgen, uitgesteld-wekelijks/maandelijks/etc)
3. edit_title: Taaknaam wijzigen
4. query: Informatie opvragen (lijst projecten/contexten)
5. action: Actie commando (start, volgende, herhaal, opslaan, afvinken, verwijder, stop)
6. create_entity: Nieuw project/context aanmaken

EIGENSCHAPPEN:
- project: Project naam (string)
- context: Context naam (string)
- priority: hoog/gemiddeld/laag
- duration: Duur in minuten (integer)
- date: Verschijndatum YYYY-MM-DD formaat (bijv "2025-11-15")
- notes: Notitie tekst (string)
- subtaken: Boolean (true als taak subtaken heeft)

LIJSTEN (voor set_list intent):
- opvolgen
- uitgesteld-wekelijks
- uitgesteld-maandelijks
- uitgesteld-3maandelijks
- uitgesteld-6maandelijks
- uitgesteld-jaarlijks

ACTIES (voor action intent):
- start: Start inbox verwerking
- next/volgende: Volgende actie
- repeat/herhaal: Herhaal huidige actie
- save/opslaan/done/klaar: Taak opslaan
- complete/afvinken/voltooid: Taak markeren als voltooid
- delete/verwijder: Taak verwijderen
- stop: Voice mode stoppen

VOORBEELDEN:
User: "Datum 15 november" of "Verschijndatum 2025-11-15"
→ intent: set_property, properties: {date: "2025-11-15"}

User: "Notitie: Eerst bellen voor afspraak"
→ intent: set_property, properties: {notes: "Eerst bellen voor afspraak"}

User: "Dit heeft subtaken" of "Markeer met subtaken"
→ intent: set_property, properties: {subtaken: true}

User: "Doorsturen naar opvolgen" of "Naar opvolgen lijst"
→ intent: set_list, lijst: "opvolgen"

User: "Uitstellen tot wekelijks" of "Naar wekelijkse lijst"
→ intent: set_list, lijst: "uitgesteld-wekelijks"

User: "De naam moet zijn: Klant bellen over offerte"
→ intent: edit_title, new_title: "Klant bellen over offerte"

User: "Taak opslaan" of "Sla de taak op"
→ intent: action, action_type: "save"

User: "Taak afvinken" of "Markeer als voltooid"
→ intent: action, action_type: "complete"

Antwoord ALTIJD in het Nederlands. Wees vriendelijk en bevestigend.`;

        // Prepare messages array
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: transcript }
        ];

        // Call GPT-4o-mini with structured outputs
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "voice_command_response",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            intent: {
                                type: "string",
                                enum: ["set_property", "set_list", "edit_title", "query", "action", "create_entity"],
                                description: "Het type commando dat de gebruiker geeft"
                            },
                            properties: {
                                type: "object",
                                properties: {
                                    project: {
                                        type: ["string", "null"],
                                        description: "Project naam"
                                    },
                                    context: {
                                        type: ["string", "null"],
                                        description: "Context naam"
                                    },
                                    duration: {
                                        type: ["number", "null"],
                                        description: "Duur in minuten"
                                    },
                                    priority: {
                                        type: ["string", "null"],
                                        enum: ["hoog", "gemiddeld", "laag", null],
                                        description: "Prioriteit niveau"
                                    },
                                    date: {
                                        type: ["string", "null"],
                                        description: "Verschijndatum in YYYY-MM-DD formaat"
                                    },
                                    notes: {
                                        type: ["string", "null"],
                                        description: "Notitie tekst"
                                    },
                                    subtaken: {
                                        type: ["boolean", "null"],
                                        description: "Of de taak subtaken heeft"
                                    }
                                },
                                required: ["project", "context", "duration", "priority", "date", "notes", "subtaken"],
                                additionalProperties: false
                            },
                            lijst: {
                                type: ["string", "null"],
                                enum: ["opvolgen", "uitgesteld-wekelijks", "uitgesteld-maandelijks", "uitgesteld-3maandelijks", "uitgesteld-6maandelijks", "uitgesteld-jaarlijks", null],
                                description: "Doellijst voor set_list intent"
                            },
                            new_title: {
                                type: ["string", "null"],
                                description: "Nieuwe taaknaam voor edit_title intent"
                            },
                            entities: {
                                type: "object",
                                properties: {
                                    create_project: {
                                        type: ["string", "null"],
                                        description: "Naam van nieuw aan te maken project"
                                    },
                                    create_context: {
                                        type: ["string", "null"],
                                        description: "Naam van nieuw aan te maken context"
                                    }
                                },
                                required: ["create_project", "create_context"],
                                additionalProperties: false
                            },
                            query_type: {
                                type: ["string", "null"],
                                enum: ["list_projects", "list_contexts", null],
                                description: "Type query als intent=query"
                            },
                            action_type: {
                                type: ["string", "null"],
                                enum: ["start", "next", "repeat", "save", "complete", "delete", "stop", null],
                                description: "Type actie als intent=action"
                            },
                            response_message: {
                                type: "string",
                                description: "Nederlandse feedback bericht voor de gebruiker"
                            }
                        },
                        required: ["intent", "properties", "lijst", "new_title", "entities", "query_type", "action_type", "response_message"],
                        additionalProperties: false
                    }
                }
            },
            temperature: 0.3 // Lower temperature for more consistent parsing
        });

        // Parse the response
        const parsed = JSON.parse(response.choices[0].message.content);

        // Return structured response
        res.json({
            success: true,
            ...parsed
        });

    } catch (error) {
        console.error('OpenAI parsing error:', error);
        console.error('Transcript was:', req.body.transcript);
        res.status(500).json({
            success: false,
            error: 'Failed to parse command',
            message: error.message,
            fallback: true
        });
    }
});

// Email import help page (styled HTML)
app.get('/email-import-help', (req, res) => {
    const markdownPath = path.join(__dirname, 'public', 'email-import-help.md');
    const cssPath = path.join(__dirname, 'public', 'email-import-help.css');

    // Read markdown content
    fs.readFile(markdownPath, 'utf8', (err, markdown) => {
        if (err) {
            console.error('Failed to read email-import-help.md:', err);
            return res.status(404).send('Help content not found');
        }

        // Parse markdown to HTML using marked
        const { marked } = require('marked');
        const contentHtml = marked.parse(markdown);

        // Read CSS for inline styles
        fs.readFile(cssPath, 'utf8', (cssErr, css) => {
            if (cssErr) {
                console.error('Failed to read CSS:', cssErr);
                // Continue without CSS if it fails
                css = '';
            }

            // Generate complete HTML page with server-rendered content
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Import Help - Tickedify</title>
  <style>${css}</style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css">
</head>
<body>
  <header role="banner">
    <div class="header-container">
      <h1>Email Import Help</h1>
      <p class="subtitle">Learn how to import tasks via email using the @t syntax</p>
    </div>
  </header>

  <main role="main" id="content">
    ${contentHtml}
  </main>

  <footer role="contentinfo">
    <p>Questions? Email <a href="mailto:jan@tickedify.com">jan@tickedify.com</a></p>
  </footer>

  <!-- Syntax highlighting -->
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
  <script>
    // Apply syntax highlighting to code blocks
    document.addEventListener('DOMContentLoaded', () => {
      Prism.highlightAll();

      // Wrap tables in responsive containers
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-container';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
    });
  </script>
</body>
</html>`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.send(html);
        });
    });
});

// Email import help content API (markdown)
app.get('/api/email-import-help/content', (req, res) => {
    const helpPath = path.join(__dirname, 'public', 'email-import-help.md');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(helpPath, (err) => {
        if (err) {
            console.error('Failed to read email-import-help.md:', err);
            res.status(404).json({ error: 'Help content not found' });
        }
    });
});

// Email import help API (for popup modal in app.js)
app.get('/api/email-import-help', (req, res) => {
    const helpPath = path.join(__dirname, 'public', 'email-import-help.md');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(helpPath, (err) => {
        if (err) {
            console.error('Failed to read email-import-help.md:', err);
            res.status(404).json({ error: 'Help content not found' });
        }
    });
});

// Try to import and initialize database
let db = null;
let pool = null;
let productionPool = null;
let testPool = null;
let getPool = null;
let useTestDatabase = null;
let dbInitialized = false;

// Initialize database immediately
try {
    const dbModule = require('./database');
    db = dbModule.db;
    pool = dbModule.pool;
    productionPool = dbModule.productionPool;
    testPool = dbModule.testPool;
    getPool = dbModule.getPool;
    useTestDatabase = dbModule.useTestDatabase;
    
    // Configure session store immediately with pool
    app.use(session({
        store: new pgSession({
            pool: pool,
            tableName: 'user_sessions',
            createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET || 'tickedify-development-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: 'auto', // Let express-session auto-detect HTTPS
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours (FR-006 requirement)
            sameSite: 'lax' // Better compatibility with modern browsers
        },
        name: 'tickedify.sid' // Custom session name for better identification
    }));
    
    console.log('✅ Session store configured with PostgreSQL');
    
    // Run database initialization
    dbModule.initDatabase().then(() => {
        dbInitialized = true;
        console.log('✅ Database initialization completed');
    }).catch(error => {
        console.error('❌ Database initialization failed:', error);
    });

    // Check Mailgun configuration for outgoing emails
    const mailgunConfigured = !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
    if (!mailgunConfigured) {
        console.warn('⚠️  WARNING: Mailgun not configured - password reset emails will not work');
        console.warn('   Set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables');
    }
} catch (error) {
    console.error('Failed to import database module:', error);
    
    // Fallback to memory store if database module fails to load
    app.use(session({
        secret: process.env.SESSION_SECRET || 'tickedify-development-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: 'auto',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours (FR-006 requirement)
            sameSite: 'lax'
        },
        name: 'tickedify.sid'
    }));
    
    console.log('⚠️ Using fallback memory session store');
}

app.get('/api/db-test', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                status: 'database_module_not_loaded',
                timestamp: new Date().toISOString()
            });
        }
        
        // Test database connection
        const client = await pool.connect();
        client.release();
        
        res.json({ 
            status: 'database_connected',
            initialized: dbInitialized,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database test failed:', error);
        res.status(500).json({ 
            status: 'database_error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Debug endpoint for B2 storage status
app.get('/api/debug/storage-status', async (req, res) => {
    try {
        const status = {
            timestamp: new Date().toISOString(),
            environment_vars: {
                B2_APPLICATION_KEY_ID: !!process.env.B2_APPLICATION_KEY_ID,
                B2_APPLICATION_KEY: !!process.env.B2_APPLICATION_KEY,
                B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || 'not_set'
            },
            storage_manager: {
                exists: !!storageManager,
                initialized: storageManager?.initialized || false,
                b2_available: false
            }
        };
        
        // Test storage manager initialization with detailed bucket testing
        if (storageManager) {
            try {
                // Initialize storage manager (no force reinit to avoid resetting)
                await storageManager.initialize();
                status.storage_manager.initialized = storageManager.initialized;
                status.storage_manager.b2_available = storageManager.isB2Available();
                status.storage_manager.b2_client_exists = !!storageManager.b2Client;
                status.storage_manager.bucket_id = storageManager.bucketId || 'not_set';
                
                // Test B2 operations directly if client exists
                if (storageManager.b2Client) {
                    try {
                        const bucketsResponse = await storageManager.b2Client.listBuckets();
                        status.storage_manager.bucket_test = {
                            list_buckets_success: true,
                            buckets_found: bucketsResponse.data.buckets.length,
                            bucket_names: bucketsResponse.data.buckets.map(b => b.bucketName),
                            target_bucket_exists: bucketsResponse.data.buckets.some(b => b.bucketName === 'tickedify-attachments')
                        };
                    } catch (bucketError) {
                        status.storage_manager.bucket_test = {
                            list_buckets_success: false,
                            error: bucketError.message
                        };
                    }
                }
                
                // Additional B2 info if available
                if (storageManager.b2Client && storageManager.bucketId) {
                    status.storage_manager.b2_status = 'fully_initialized';
                } else if (storageManager.b2Client) {
                    status.storage_manager.b2_status = 'client_only_no_bucket';
                } else {
                    status.storage_manager.b2_status = 'not_initialized';
                }
            } catch (initError) {
                status.storage_manager.initialization_error = initError.message;
                status.storage_manager.b2_status = 'initialization_failed';
                console.error('Initialization error details:', initError);
            }
        }

        res.json(status);
        
    } catch (error) {
        console.error('❌ Storage status test failed:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Simple direct B2 test endpoint
app.get('/api/debug/b2-direct-test', async (req, res) => {
    try {
        const B2 = require('backblaze-b2');
        
        const result = {
            timestamp: new Date().toISOString(),
            env_check: {
                key_id: !!process.env.B2_APPLICATION_KEY_ID,
                key: !!process.env.B2_APPLICATION_KEY,
                bucket_name: process.env.B2_BUCKET_NAME
            },
            steps: []
        };
        
        // Step 1: Create B2 client
        const b2Client = new B2({
            applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
            applicationKey: process.env.B2_APPLICATION_KEY
        });
        result.steps.push('✅ B2 client created');
        
        // Step 2: Authorize
        await b2Client.authorize();
        result.steps.push('✅ B2 authorization successful');
        
        // Step 3: List buckets
        const bucketsResponse = await b2Client.listBuckets();
        result.steps.push(`✅ Listed ${bucketsResponse.data.buckets.length} buckets`);
        
        result.buckets = bucketsResponse.data.buckets.map(b => ({
            name: b.bucketName,
            id: b.bucketId,
            type: b.bucketType
        }));
        
        // Check if target bucket exists
        const targetBucket = bucketsResponse.data.buckets.find(b => b.bucketName === 'tickedify-attachments');
        if (targetBucket) {
            result.target_bucket = {
                found: true,
                id: targetBucket.bucketId,
                type: targetBucket.bucketType
            };
            result.steps.push('✅ Target bucket "tickedify-attachments" found');
        } else {
            result.target_bucket = { found: false };
            result.steps.push('⚠️ Target bucket "tickedify-attachments" not found - will need to create');
        }
        
        result.success = true;
        res.json(result);
        
    } catch (error) {
        console.error('❌ Direct B2 test failed:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString(),
            success: false
        });
    }
});

// Debug endpoint to check bijlage exists
app.get('/api/debug/bijlage/:id', async (req, res) => {
    try {
        const { id: bijlageId } = req.params;

        if (!db) {
            return res.json({ error: 'Database not available', bijlageId });
        }
        
        const bijlage = await db.getBijlage(bijlageId, false);
        
        const result = {
            bijlageId: bijlageId,
            found: !!bijlage,
            bijlage: bijlage,
            timestamp: new Date().toISOString()
        };
        
        // Also check if there are ANY bijlagen in the database
        const allBijlagenQuery = await pool.query('SELECT id, bestandsnaam FROM bijlagen LIMIT 5');
        result.sample_bijlagen = allBijlagenQuery.rows;
        result.total_bijlagen = allBijlagenQuery.rows.length;

        res.json(result);
        
    } catch (error) {
        console.error('❌ Debug bijlage error:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Create default user if not exists
app.post('/api/admin/create-default-user', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const defaultUserId = 'default-user-001';
        const defaultEmail = 'jan@tickedify.com';
        const defaultNaam = 'Jan Buskens';
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [defaultUserId]);
        
        if (existingUser.rows.length > 0) {
            return res.json({ 
                success: true, 
                message: 'Default user already exists',
                userId: defaultUserId
            });
        }
        
        // Create default user
        await pool.query(`
            INSERT INTO users (id, email, naam, wachtwoord_hash, rol, aangemaakt, actief)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
        `, [defaultUserId, defaultEmail, defaultNaam, 'temp-hash', 'admin', true]);
        
        
        res.json({ 
            success: true, 
            message: 'Default user created successfully',
            userId: defaultUserId,
            email: defaultEmail,
            naam: defaultNaam
        });
        
    } catch (error) {
        console.error('Error creating default user:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/init-database', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { initDatabase } = require('./database');
        await initDatabase();
        dbInitialized = true;
        
        res.json({ 
            success: true, 
            message: 'Database initialized successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Manual database initialization failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// TEMP: Make jan@buskens.be admin for Feature 011 testing
app.post('/api/admin/make-jan-admin', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        await pool.query(`UPDATE users SET rol = 'admin' WHERE email = 'jan@buskens.be'`);

        res.json({ success: true, message: 'jan@buskens.be is now admin' });
    } catch (error) {
        console.error('❌ Failed to make jan admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// Database reset endpoint - DANGER: Deletes ALL data
app.post('/api/admin/reset-database', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        
        // Get counts before deletion for confirmation
        const countQueries = [
            { table: 'dagelijkse_planning', query: 'SELECT COUNT(*) as count FROM dagelijkse_planning' },
            { table: 'taken', query: 'SELECT COUNT(*) as count FROM taken' },
            { table: 'projecten', query: 'SELECT COUNT(*) as count FROM projecten' },
            { table: 'contexten', query: 'SELECT COUNT(*) as count FROM contexten' }
        ];
        
        const beforeCounts = {};
        for (const countQuery of countQueries) {
            try {
                const result = await pool.query(countQuery.query);
                beforeCounts[countQuery.table] = parseInt(result.rows[0].count);
            } catch (error) {
                beforeCounts[countQuery.table] = 0;
            }
        }
        
        
        // Delete in correct order (foreign key constraints)
        const deleteQueries = [
            'DELETE FROM dagelijkse_planning',
            'DELETE FROM taken', 
            'DELETE FROM projecten',
            'DELETE FROM contexten'
        ];
        
        const deletionResults = {};
        
        for (const deleteQuery of deleteQueries) {
            try {
                const result = await pool.query(deleteQuery);
                const tableName = deleteQuery.split(' ')[2]; // Extract table name
                deletionResults[tableName] = result.rowCount;
            } catch (error) {
                console.error(`❌ Error deleting from table:`, error);
                throw error;
            }
        }
        
        
        res.json({
            success: true,
            message: 'Database reset completed - ALL data has been deleted',
            timestamp: new Date().toISOString(),
            before_counts: beforeCounts,
            deleted_records: deletionResults,
            warning: 'This action cannot be undone'
        });
        
    } catch (error) {
        console.error('❌ Database reset failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database reset failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Get user's email import code
app.get('/api/user/email-import-code', (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        db.getEmailImportCode(userId).then(code => {
            if (code) {
                res.json({
                    success: true,
                    importCode: code,
                    importEmail: `import+${code}@mg.tickedify.com`,
                    instructions: 'Send emails to this address from any email account'
                });
            } else {
                res.status(500).json({ error: 'Could not generate import code' });
            }
        }).catch(error => {
            console.error('Error getting import code:', error);
            res.status(500).json({ error: 'Database error' });
        });
        
    } catch (error) {
        console.error('Error in email import code endpoint:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate new email import code for user
app.post('/api/user/regenerate-import-code', (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        db.generateEmailImportCode(userId).then(code => {
            if (code) {
                res.json({
                    success: true,
                    importCode: code,
                    importEmail: `import+${code}@mg.tickedify.com`,
                    message: 'New import code generated'
                });
            } else {
                res.status(500).json({ error: 'Could not generate new import code' });
            }
        }).catch(error => {
            console.error('Error generating new import code:', error);
            res.status(500).json({ error: 'Database error' });
        });
        
    } catch (error) {
        console.error('Error in regenerate import code endpoint:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Debug endpoint to check last email import attempts
app.get('/api/debug/last-imports', (req, res) => {
    try {
        // In production, you'd want to secure this endpoint
        const userId = getCurrentUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // For now, just return a message about checking server logs
        res.json({
            message: 'Check server logs for IMPORT_LOG entries',
            hint: 'Look for recipient field with import+code pattern',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Test import code extraction
app.get('/api/debug/test-import-code/:recipient', async (req, res) => {
    try {
        const recipient = req.params.recipient;
        
        const importCodeMatch = recipient.match(/import\+([a-zA-Z0-9]+)@/);
        if (importCodeMatch) {
            const importCode = importCodeMatch[1];
            const user = await db.getUserByImportCode(importCode);
            
            res.json({
                recipient: recipient,
                importCodeFound: true,
                importCode: importCode,
                userFound: !!user,
                user: user ? { id: user.id, email: user.email } : null
            });
        } else {
            res.json({
                recipient: recipient,
                importCodeFound: false,
                message: 'No import code pattern found'
            });
        }
    } catch (error) {
        console.error('Error in test import code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to view message by title
app.get('/api/debug/message/:title', async (req, res) => {
    try {
        const title = req.params.title;
        const result = await pool.query(`
            SELECT * FROM admin_messages
            WHERE title ILIKE $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [`%${title}%`]);

        if (result.rows.length === 0) {
            return res.json({ found: false, message: 'No message found with that title' });
        }

        res.json({ found: true, message: result.rows[0] });
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to get user ID by email address
async function getUserIdByEmail(email) {
    try {
        if (!email) {
            return null;
        }

        // Clean up email address (remove any brackets, spaces, etc.)
        const cleanEmail = email.trim().toLowerCase();

        const result = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = $1 AND actief = TRUE',
            [cleanEmail]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const userId = result.rows[0].id;
        return userId;

    } catch (error) {
        console.error('Error looking up user by email:', error);
        return null;
    }
}

// Email Import System - Mailgun Webhook Handler
app.post('/api/email/import', uploadAttachment.any(), async (req, res) => {
    try {
        // Try multiple field name variations for Mailgun compatibility
        const sender = req.body.sender || req.body.from || req.body.From || '';
        const recipient = req.body.recipient || req.body.to || req.body.To || '';
        const subject = req.body.subject || req.body.Subject || '';
        const bodyPlain = req.body['body-plain'] || req.body.text || req.body.body || '';
        const bodyHtml = req.body['body-html'] || req.body.html || '';
        const strippedText = req.body['stripped-text'] || req.body['stripped-plain'] || bodyPlain;
        
        if (!sender && !subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required email fields (sender, subject)',
                receivedFields: Object.keys(req.body),
                timestamp: new Date().toISOString()
            });
        }

        // Parse email content
        const taskData = parseEmailToTask({
            sender,
            subject,
            body: strippedText || bodyPlain || 'No body content',
            timestamp: new Date().toISOString()
        });
        
        // Get user ID based on import code in recipient address
        let userId = null;
        
        // Try to extract import code from recipient (e.g., import+abc123@mg.tickedify.com)
        if (recipient) {
            const importCodeMatch = recipient.match(/import\+([a-zA-Z0-9]+)@mg\.tickedify\.com/);
            if (importCodeMatch) {
                const importCode = importCodeMatch[1];

                const user = await db.getUserByImportCode(importCode);
                if (user) {
                    userId = user.id;
                } else {
                    return res.status(404).json({
                        success: false,
                        error: `Invalid import code: ${importCode}`,
                        hint: 'Check your personal import email address in Tickedify settings',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        // Fallback to sender email matching if no import code found
        if (!userId) {
            userId = await getUserIdByEmail(sender);
            if (!userId) {
                return res.status(404).json({
                    success: false,
                    error: `No user account found for email address: ${sender}`,
                    hint: 'Use your personal import email address: import+yourcode@mg.tickedify.com (get code from settings)',
                    timestamp: new Date().toISOString()
                });
            }
        }
        if (taskData.projectName) {
            taskData.projectId = await findOrCreateProject(taskData.projectName, userId);
        }
        if (taskData.contextName) {
            taskData.contextId = await findOrCreateContext(taskData.contextName, userId);
        }

        // Create task in database
        if (!pool) {
            throw new Error('Database not available');
        }

        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Convert verschijndatum to proper format for PostgreSQL DATE field
        let verschijndatumForDb = null;
        if (taskData.verschijndatum) {
            // Ensure it's in YYYY-MM-DD format for PostgreSQL DATE type
            const dateMatch = taskData.verschijndatum.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                verschijndatumForDb = dateMatch[1];
            }
        }

        // T013: Update INSERT query to include prioriteit kolom
        const result = await pool.query(`
            INSERT INTO taken (
                id, tekst, opmerkingen, lijst, aangemaakt, project_id, context_id,
                verschijndatum, duur, prioriteit, type, user_id
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            taskId,
            taskData.tekst,
            taskData.opmerkingen || null,
            taskData.lijst || 'inbox',
            taskData.projectId,
            taskData.contextId,
            verschijndatumForDb,
            taskData.duur,
            taskData.prioriteit || null,  // New: normalized priority (High/Medium/Low)
            'taak',
            userId
        ]);

        const createdTask = result.rows[0];

        // T020: Increment total_tasks_created counter (Feature 058 - Account Settings Block)
        await pool.query(
            'UPDATE users SET total_tasks_created = total_tasks_created + 1 WHERE id = $1',
            [userId]
        );

        // Feature 049: Process attachments if requested (T015)
        let attachmentResult = null;

        if (taskData.attachmentConfig?.processAttachments && req.files && req.files.length > 0) {
            try {
                const { targetFilename } = taskData.attachmentConfig;

                // T011: Find matching attachment with smart priority
                const matchedFile = findMatchingAttachment(req.files, targetFilename);

                if (matchedFile) {
                    // T013: Validate file size (FR-011, FR-014)
                    const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB
                    if (matchedFile.size > MAX_FILE_SIZE) {
                        // File too large, skip upload
                    } else {
                        // File size OK, proceed with upload
                        // T014: Upload to B2 via StorageManager
                        const uploadResult = await storageManager.uploadFile(
                            matchedFile,  // Pass entire file object (has buffer, originalname, mimetype, size)
                            taskId,       // Task ID to link attachment to
                            userId        // User ID for storage path
                        );

                        // T014: Insert bijlage record using uploadResult metadata
                        await pool.query(`
                            INSERT INTO bijlagen (
                                id, taak_id, bestandsnaam, bestandsgrootte, mimetype,
                                storage_type, storage_path, user_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        `, [
                            uploadResult.id,            // Use ID from StorageManager (matches B2 filename)
                            uploadResult.taak_id,
                            uploadResult.bestandsnaam,
                            uploadResult.bestandsgrootte,
                            uploadResult.mimetype,
                            uploadResult.storage_type,
                            uploadResult.storage_path,
                            uploadResult.user_id
                        ]);

                        attachmentResult = {
                            processed: true,
                            matched: matchedFile.originalname,
                            bijlage_id: uploadResult.id,
                            size: matchedFile.size
                        };
                    }
                }
            } catch (attachmentError) {
                // T021: Error handling - task creation continues (FR-006, FR-017)
                console.error('❌ Attachment processing error:', attachmentError.message);
                // attachmentResult remains null
            }
        }

        // Track email import in analytics table
        try {
            await pool.query(`
                INSERT INTO email_imports (user_id, email_from, email_subject, task_id)
                VALUES ($1, $2, $3, $4)
            `, [userId, sender, subject, createdTask.id]);
        } catch (trackError) {
            console.error('⚠️ Failed to track email import (non-critical):', trackError.message);
        }

        // Send confirmation (would need Mailgun sending setup)

        res.json({
            success: true,
            message: 'Email imported successfully',
            task: {
                id: createdTask.id,
                tekst: createdTask.tekst,
                lijst: createdTask.lijst,
                project: taskData.projectName,
                context: taskData.contextName
            },
            attachment: attachmentResult, // Feature 049: Attachment info or null
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Email import failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Email import failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function to find or create project
async function findOrCreateProject(projectName, userId = 'default-user-001') {
    if (!projectName || !pool) return null;
    
    try {
        // First try to find existing project (case-insensitive) for this user
        const existingProject = await pool.query(
            'SELECT id FROM projecten WHERE LOWER(naam) = LOWER($1) AND user_id = $2',
            [projectName, userId]
        );
        
        if (existingProject.rows.length > 0) {
            return existingProject.rows[0].id;
        }
        
        // Create new project if not found
        const projectId = 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(
            'INSERT INTO projecten (id, naam, user_id) VALUES ($1, $2, $3)',
            [projectId, projectName, userId]
        );
        
        return projectId;
        
    } catch (error) {
        console.error('❌ Error finding/creating project:', error);
        return null;
    }
}

// Helper function to find or create context
async function findOrCreateContext(contextName, userId = 'default-user-001') {
    if (!contextName || !pool) return null;
    
    try {
        // First try to find existing context (case-insensitive) for this user
        const existingContext = await pool.query(
            'SELECT id FROM contexten WHERE LOWER(naam) = LOWER($1) AND user_id = $2',
            [contextName, userId]
        );
        
        if (existingContext.rows.length > 0) {
            return existingContext.rows[0].id;
        }
        
        // Create new context if not found
        const contextId = 'context_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(
            'INSERT INTO contexten (id, naam, user_id) VALUES ($1, $2, $3)',
            [contextId, contextName, userId]
        );
        
        return contextId;
        
    } catch (error) {
        console.error('❌ Error finding/creating context:', error);
        return null;
    }
}

// Email parsing helper function
// Helper function: Truncate body at --end-- marker (case-insensitive)
// T004: --end-- marker truncation - ALWAYS applied, even without @t
function truncateAtEndMarker(body) {
    const endMarkerRegex = /--end--/i;
    const endIndex = body.search(endMarkerRegex);

    if (endIndex !== -1) {
        return body.substring(0, endIndex).trim();
    }

    return body;
}

// Helper function: Parse defer code from segment
// T007: Defer code parser - df/dw/dm/d3m/d6m/dy mapping
function parseDeferCode(segment) {
    const deferMatch = segment.match(/^(df|dw|dm|d3m|d6m|dy)$/i);
    if (!deferMatch) return null;

    const deferMapping = {
        'df': 'opvolgen',                 // Defer to Follow-up
        'dw': 'uitgesteld-wekelijks',     // Defer to Weekly
        'dm': 'uitgesteld-maandelijks',   // Defer to Monthly
        'd3m': 'uitgesteld-3maandelijks', // Defer to Quarterly
        'd6m': 'uitgesteld-6maandelijks', // Defer to Bi-annual
        'dy': 'uitgesteld-jaarlijks'      // Defer to Yearly
    };

    const code = deferMatch[1].toLowerCase();
    return deferMapping[code] || null;
}

// Helper function: Parse priority code from segment
// T008: Priority code parser - p0-p9+ normalization
function parsePriorityCode(segment) {
    const priorityMatch = segment.match(/^p(\d+)$/i);
    if (!priorityMatch) return null;

    const num = parseInt(priorityMatch[1]);

    // Normalization: p0/p1 → hoog, p2 → gemiddeld, p3/p4+ → laag
    // Database expects lowercase Dutch values
    if (num === 0 || num === 1) return 'hoog';
    if (num === 2) return 'gemiddeld';
    if (num === 3 || num >= 4) return 'laag';

    return null;
}

// Helper function: Parse key-value pairs (p:, c:, d:, t:)
// T009: Key-value parser with validation
function parseKeyValue(segment) {
    const kvMatch = segment.match(/^([pcdt])\s*:\s*(.+)$/i);
    if (!kvMatch) return null;

    const key = kvMatch[1].toLowerCase();
    const value = kvMatch[2].trim();

    if (!value) return null;

    // Validation per key type
    if (key === 'p' || key === 'c') {
        // Project or Context: any non-empty string
        return { key, value };
    }

    if (key === 'd') {
        // Due date: must match ISO format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        return { key, value };
    }

    if (key === 't') {
        // Duration: must be positive integer
        if (!/^\d+$/.test(value)) return null;
        return { key, value: parseInt(value) };
    }

    return null;
}

// Helper function: Parse attachment code from segment (Feature 049)
// T005: Attachment code parser - a:searchterm; syntax
function parseAttachmentCode(segment) {
    // Feature 059: Support a; syntax (without filename) for single attachments
    const attMatch = segment.match(/^a(?:\s*:\s*(.*))?$/i);
    if (!attMatch) return null;

    const filename = attMatch[1] ? attMatch[1].trim() : '';

    // Return null targetFilename when no filename specified
    if (!filename) {
        return {
            processAttachments: true,
            targetFilename: null
        };
    }

    return {
        processAttachments: true,
        targetFilename: filename
    };
}

// Helper function: Find matching attachment with priority (Feature 049)
// T011: Smart filename matching - exact > starts-with > contains
// Priority System:
// 1. Exact match (highest): filename === searchterm
// 2. Starts-with match: filename starts with searchterm
// 3. Contains match (lowest): searchterm appears anywhere in filename
// 4. First match wins when equal priority
function findMatchingAttachment(files, searchTerm) {
    if (!files || files.length === 0) {
        return null;
    }

    // Feature 059: If no search term, return first attachment
    if (!searchTerm || searchTerm.trim() === '') {
        return files[0];
    }

    const term = searchTerm.toLowerCase().trim();

    // Sort files by priority
    const sortedFiles = files.sort((a, b) => {
        const aName = a.originalname.toLowerCase();
        const bName = b.originalname.toLowerCase();

        // Extract filename without extension for exact matching
        const aBase = aName.replace(/\.[^.]+$/, '');
        const bBase = bName.replace(/\.[^.]+$/, '');

        // Exact match wins (including exact match without extension)
        const aExact = (aName === term || aBase === term);
        const bExact = (bName === term || bBase === term);
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;

        // Starts-with wins over contains
        const aStartsWith = aName.startsWith(term);
        const bStartsWith = bName.startsWith(term);
        if (aStartsWith && !bStartsWith) return -1;
        if (bStartsWith && !aStartsWith) return 1;

        // Both contain or neither contain - keep original order
        return 0;
    });

    // Find first file containing term
    return sortedFiles.find(f =>
        f.originalname.toLowerCase().includes(term)
    ) || null;
}

/**
 * Parse email to task with @t instruction syntax support (Feature 048)
 *
 * Supports two parsing modes:
 * 1. @t instruction syntax (NEW - v0.21.6+):
 *    @t p: Project; c: Context; d: 2025-11-03; p1; t: 30; df/dw/dm/d3m/d6m/dy;
 *
 * 2. Legacy parsing (backwards compatible):
 *    Subject: [Project] Task @context #tag
 *    Body: Project: X\nContext: Y\nDuur: 30\nDeadline: 2025-11-03
 *
 * @t Instruction Codes:
 * - p: Project name (auto-creates if not exists)
 * - c: Context name (auto-creates if not exists)
 * - d: Due date (ISO format YYYY-MM-DD)
 * - t: Duration in minutes (positive integer)
 * - p0-p9: Priority (p0/p1→hoog, p2→gemiddeld, p3+→laag)
 * - df/dw/dm/d3m/d6m/dy: Defer codes (ABSOLUTE PRIORITY - ignores all other codes)
 *
 * Special Features:
 * - --end-- marker: Truncates body (case-insensitive, works with/without @t)
 * - Defer absolute priority: When defer code detected, ALL other codes ignored
 * - Error tolerance: Invalid codes silently ignored, task created with valid codes
 * - Duplicate handling: First occurrence wins, duplicates ignored
 * - Windows line endings: Handles both \n and \r\n correctly
 *
 * Bug Fixes History:
 * - v0.21.9: Fixed Windows line endings (\r\n) breaking @t detection
 * - v0.21.10: Fixed defer lijst names (English → Dutch prefixed)
 * - v0.21.11: Fixed priority values (English → Dutch lowercase)
 * - v0.21.12: Removed debug logging after successful testing
 *
 * @param {Object} emailData - { sender, subject, body, timestamp }
 * @returns {Object} taskData - Parsed task data ready for database insertion
 */
function parseEmailToTask(emailData) {
    const { sender, subject, body, timestamp } = emailData;

    // Initialize task data
    const taskData = {
        tekst: subject, // Will be cleaned up later to just task name
        opmerkingen: '', // Will contain the email body content
        lijst: 'inbox',
        projectId: null,
        projectName: null,
        contextId: null,
        contextName: null,
        verschijndatum: null,
        duur: null,
        prioriteit: null,
        originalSender: sender,
        importedAt: timestamp,
        attachmentConfig: null // Feature 049: Attachment processing configuration
    };

    // T014: Error handling wrapper for @t parsing
    // If parsing fails, fall back to standard behavior (backwards compatible)
    let atParsingFailed = false;
    
    // Parse subject line for project, context, and tags
    // Format: [Project] Task title @context #tag
    
    // Extract project from [brackets]
    const projectMatch = subject.match(/\[([^\]]+)\]/);
    if (projectMatch) {
        taskData.projectName = projectMatch[1].trim();
    }

    // Extract context from @mentions
    const contextMatch = subject.match(/@([^\s#\]]+)/);
    if (contextMatch) {
        taskData.contextName = contextMatch[1].trim();
    }

    // Extract tags from #hashtags (for future use)
    const tagMatches = subject.match(/#([^\s@\]]+)/g);
    if (tagMatches) {
        const tags = tagMatches.map(tag => tag.substring(1));
    }
    
    // Clean up task title (remove project, context, tags)
    let cleanTitle = subject
        .replace(/\[[^\]]+\]/g, '') // Remove [project]
        .replace(/@[^\s#\]]+/g, '') // Remove @context
        .replace(/#[^\s@\]]+/g, '') // Remove #tags
        .trim();
    
    if (cleanTitle) {
        taskData.tekst = cleanTitle;
    }
    
    // T004: Apply --end-- marker truncation FIRST (always, even without @t)
    let processedBody = body || '';
    processedBody = truncateAtEndMarker(processedBody);

    // T014 & T015: Wrap @t parsing in try-catch for error handling
    let atInstructionDetected = false;
    let remainingBody = processedBody;

    try {
        // T005: Check for @t trigger in first non-empty line
        const bodyLines = processedBody.split('\n');
        const firstLine = bodyLines.find(line => line.trim().length > 0);

        if (firstLine) {
            // Trim firstLine to remove \r and other whitespace
            const trimmedFirstLine = firstLine.trim();
            const atTriggerMatch = trimmedFirstLine.match(/^@t\s*(.+)$/);

            if (atTriggerMatch) {
                atInstructionDetected = true;
                const instructionContent = atTriggerMatch[1];

                // T006: Split instruction into segments
                const segments = instructionContent.split(';')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);

                // T010: Track seen codes for duplicate detection
                const seenCodes = new Set();
                let deferDetected = false;

                // T012: Process segments - check for defer FIRST
                for (const segment of segments) {
                    // T007: Check for defer code (absolute priority)
                    const deferLijst = parseDeferCode(segment);
                    if (deferLijst) {
                        taskData.lijst = deferLijst;
                        deferDetected = true;
                        break; // Stop processing - defer has absolute priority
                    }
                }

                // If defer detected, ignore all other codes
                if (!deferDetected) {
                    for (const segment of segments) {
                        // T008: Check for priority code
                        const priority = parsePriorityCode(segment);
                        if (priority && !seenCodes.has('priority')) {
                            taskData.prioriteit = priority;
                            seenCodes.add('priority');
                            continue;
                        }

                        // Feature 049: Check for attachment code
                        const attachmentCode = parseAttachmentCode(segment);
                        if (attachmentCode && !seenCodes.has('attachment')) {
                            taskData.attachmentConfig = attachmentCode;
                            seenCodes.add('attachment');
                            continue;
                        }

                        // T009: Check for key-value pairs
                        const keyValue = parseKeyValue(segment);
                        if (keyValue) {
                            const { key, value } = keyValue;

                            if (key === 'p' && !seenCodes.has('project')) {
                                taskData.projectName = value;
                                seenCodes.add('project');
                            } else if (key === 'c' && !seenCodes.has('context')) {
                                taskData.contextName = value;
                                seenCodes.add('context');
                            } else if (key === 'd' && !seenCodes.has('due')) {
                                taskData.verschijndatum = value;
                                seenCodes.add('due');
                            } else if (key === 't' && !seenCodes.has('duration')) {
                                taskData.duur = value;
                                seenCodes.add('duration');
                            }
                        }
                    }
                }

                // T011: Remove @t instruction line from notes
                remainingBody = bodyLines.slice(1).join('\n').trim();
            }
        }
    } catch (error) {
        // T014: Error handling - fall back to standard parsing
        console.error('⚠️ Error parsing @t instruction, falling back to standard mode:', error.message);
        atParsingFailed = true;
        atInstructionDetected = false; // Reset flag to use standard parsing
    }

    // Parse body for structured data (original behavior - backwards compatible)
    if (processedBody && processedBody.length > 10 && !atInstructionDetected) {

        // Look for structured fields in body
        const bodyLinesForParsing = processedBody.split('\n');

        for (const line of bodyLinesForParsing) {
            const trimmedLine = line.trim().toLowerCase();
            
            // Extract duration
            if (trimmedLine.startsWith('duur:')) {
                const duurMatch = line.match(/(\d+)/);
                if (duurMatch) {
                    taskData.duur = parseInt(duurMatch[1]);
                }
            }

            // Extract deadline
            if (trimmedLine.startsWith('deadline:') || trimmedLine.startsWith('datum:')) {
                const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    taskData.verschijndatum = dateMatch[1];
                }
            }

            // Override project if specified in body
            if (trimmedLine.startsWith('project:')) {
                const projectName = line.split(':')[1]?.trim();
                if (projectName) {
                    taskData.projectName = projectName;
                }
            }

            // Override context if specified in body
            if (trimmedLine.startsWith('context:')) {
                const contextName = line.split(':')[1]?.trim();
                if (contextName) {
                    taskData.contextName = contextName;
                }
            }
        }
        
        // Extract body content as opmerkingen, excluding structured fields
        const bodyWithoutStructured = processedBody
            .split('\n')
            .filter(line => {
                const lower = line.trim().toLowerCase();
                return !lower.startsWith('duur:') &&
                       !lower.startsWith('deadline:') &&
                       !lower.startsWith('datum:') &&
                       !lower.startsWith('project:') &&
                       !lower.startsWith('context:') &&
                       line.trim() !== '' &&
                       !line.trim().startsWith('---');
            })
            .join('\n')
            .trim();

        if (bodyWithoutStructured) {
            taskData.opmerkingen = bodyWithoutStructured;
        }
    }

    // If @t was detected, use remainingBody (after @t line removal) as opmerkingen
    if (atInstructionDetected && remainingBody) {
        taskData.opmerkingen = remainingBody;
    }

    return taskData;
}

// Debug endpoint to check all users and their import codes
app.get('/api/debug/users-import-codes', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const result = await pool.query(`
            SELECT id, email, naam, email_import_code, actief 
            FROM users 
            ORDER BY aangemaakt
        `);
        
        res.json({
            success: true,
            userCount: result.rows.length,
            users: result.rows,
            message: 'Alle gebruikers met hun import codes'
        });
        
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check tasks created via email import
app.get('/api/debug/email-imported-tasks', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get tasks created in last 24 hours via email import (those with opmerkingen containing email patterns)
        const result = await pool.query(`
            SELECT t.id, t.tekst, t.lijst, t.user_id, t.aangemaakt, t.opmerkingen, u.email as user_email, u.naam as user_naam
            FROM taken t
            JOIN users u ON t.user_id = u.id
            WHERE t.aangemaakt > NOW() - INTERVAL '24 hours'
            AND (t.opmerkingen LIKE '%Datum:%' OR t.opmerkingen LIKE '%Duur:%' OR t.id LIKE 'task_%')
            ORDER BY t.aangemaakt DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            tasks: result.rows,
            message: 'Recent email imported tasks'
        });
        
    } catch (error) {
        console.error('Debug email imported tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to fix import code for actual user
app.post('/api/debug/fix-user-import-code', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { email } = req.body;
        const targetEmail = email || 'info@BaasOverJeTijd.be';

        // Find the actual user (not default-user-001)
        const result = await pool.query(`
            SELECT id, email, naam, email_import_code
            FROM users
            WHERE email = $1
            AND id != 'default-user-001'
        `, [targetEmail]);

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: `No actual user found with email ${targetEmail}`
            });
        }

        const actualUser = result.rows[0];

        // Generate new import code for actual user
        const newCode = await db.generateEmailImportCode(actualUser.id);

        res.json({
            success: true,
            user: {
                id: actualUser.id,
                email: actualUser.email,
                naam: actualUser.naam,
                oldImportCode: actualUser.email_import_code,
                newImportCode: newCode
            },
            importEmail: `import+${newCode}@mg.tickedify.com`,
            message: 'Import code updated for actual user'
        });

    } catch (error) {
        console.error('Fix import code error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check payment configurations
app.get('/api/debug/payment-configs', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const configs = await pool.query(`
            SELECT plan_id, checkout_url, is_active, updated_at
            FROM payment_configurations
            ORDER BY plan_id
        `);

        res.json({
            success: true,
            configs: configs.rows,
            count: configs.rows.length
        });

    } catch (error) {
        console.error('Payment configs check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to activate all payment configurations
// Debug endpoint to reset user subscription status (for testing)
// Debug endpoint to check beta config and user status
app.get('/api/debug/beta-status', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Email parameter required' });
        }

        // Get beta config
        const betaConfig = await db.getBetaConfig();

        // Get user details
        const userResult = await pool.query(`
            SELECT id, email, naam, account_type, subscription_status,
                   selected_plan, plan_selected_at, had_trial,
                   trial_start_date, trial_end_date
            FROM users
            WHERE email = $1
        `, [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Check if requiresUpgrade would be true
        const requiresUpgrade = !betaConfig.beta_period_active &&
            user.account_type === 'beta' &&
            user.subscription_status !== 'paid' &&
            user.subscription_status !== 'active';

        res.json({
            betaConfig: {
                beta_period_active: betaConfig.beta_period_active,
                beta_ended_at: betaConfig.beta_ended_at
            },
            user: user,
            requiresUpgrade: requiresUpgrade,
            checkDetails: {
                betaPeriodActive: betaConfig.beta_period_active,
                accountType: user.account_type,
                subscriptionStatus: user.subscription_status,
                isPaid: user.subscription_status === 'paid',
                isActive: user.subscription_status === 'active'
            }
        });

    } catch (error) {
        console.error('Beta status check error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debug/reset-subscription', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Get user before update
        const beforeResult = await pool.query(`
            SELECT email, subscription_status, selected_plan, plan_selected_at
            FROM users
            WHERE email = $1
        `, [email]);

        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const before = beforeResult.rows[0];

        // Reset subscription fields
        const afterResult = await pool.query(`
            UPDATE users
            SET subscription_status = 'beta_expired',
                selected_plan = NULL,
                plan_selected_at = NULL
            WHERE email = $1
            RETURNING email, subscription_status, selected_plan, plan_selected_at
        `, [email]);

        const after = afterResult.rows[0];

        res.json({
            success: true,
            message: `Subscription reset for ${email}`,
            before: before,
            after: after
        });

    } catch (error) {
        console.error('Reset subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to manually run subscription column migration
app.post('/api/debug/run-subscription-migration', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }


        // Add subscription-related columns to users table if they don't exist
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS plugandpay_subscription_id VARCHAR(255)
        `);


        res.json({
            success: true,
            message: 'Migration completed successfully',
            columns_added: ['plugandpay_subscription_id']
        });

    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            detail: error.detail
        });
    }
});

// TEMPORARY: Debug endpoint to fix subscription_plan for test accounts
app.get('/api/debug/fix-subscription-plan', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Get current state
        const beforeResult = await pool.query(`
            SELECT email, subscription_plan, subscription_price, subscription_cycle
            FROM users
            WHERE email = 'jan@buskens.be'
        `);

        // Update to monthly_8 plan
        await pool.query(`
            UPDATE users
            SET subscription_plan = 'monthly_8',
                subscription_price = 8.00,
                subscription_cycle = 'monthly'
            WHERE email = 'jan@buskens.be'
        `);

        // Get updated state
        const afterResult = await pool.query(`
            SELECT email, subscription_plan, subscription_price, subscription_cycle
            FROM users
            WHERE email = 'jan@buskens.be'
        `);

        res.json({
            success: true,
            message: 'Updated jan@buskens.be to monthly_8 plan',
            before: beforeResult.rows[0],
            after: afterResult.rows[0]
        });

    } catch (error) {
        console.error('Fix subscription plan error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========================================
// PAGE HELP API - Feature 062
// ========================================

// Default English help content for all eligible pages
// Based on "Baas Over Je Tijd" methodology
const DEFAULT_PAGE_HELP = {
    'inbox': `# Inbox

The **Inbox** is your central collection point for all new tasks, ideas, and to-dos that enter your world.

## Purpose
Capture everything quickly without worrying about organization. The Inbox ensures nothing slips through the cracks while you focus on what matters now.

## How to Use
- **Add tasks instantly** - Don't overthink it, just capture
- **Process regularly** - Review your inbox daily and move tasks to the appropriate lists
- **Keep it empty** - An empty inbox means you're in control of your commitments

## Best Practices
- Process inbox items during your daily planning session
- Ask yourself: "What's the next action?" for each item
- Move tasks to Acties (Actions) when you're ready to work on them
- Use Opvolgen (Follow-up) for tasks waiting on others

**Remember:** The Inbox is temporary storage, not a to-do list. Process it regularly to maintain clarity and control.`,

    'acties': `# Acties (Actions)

Your **Acties** list contains all tasks that are ready to be worked on right now. This is where execution happens.

## Purpose
This is your active work list - tasks that have a clear next action and don't depend on anyone else.

## How to Use
- **Review daily** - Start each day by reviewing your Acties
- **Prioritize** - Use priority levels (High/Medium/Low) to focus on what matters
- **Add context** - Tag tasks with contexts (@email, @phone, @computer) for batch processing
- **Set deadlines** - Add due dates to time-sensitive tasks

## Filters & Organization
- Filter by **Project** to focus on specific initiatives
- Filter by **Context** to work efficiently in batches
- Sort by **Priority** to tackle high-impact items first
- Use **Bulk Actions** to process multiple tasks at once

## Best Practices
- Limit your daily Acties to what's realistically achievable (5-7 key tasks)
- Review weekly to ensure alignment with your goals
- Move completed tasks to Afgewerkt (Completed) to track progress
- Defer tasks that aren't urgent to Uitgesteld (Postponed) lists

**Pro tip:** Your Acties list should energize you, not overwhelm you. Keep it focused and achievable.`,

    'opvolgen': `# Opvolgen (Follow-up)

The **Opvolgen** list is for tasks that are waiting on someone else or require follow-up action.

## Purpose
Track commitments you've delegated or tasks blocked by external dependencies. Never let delegated tasks fall through the cracks.

## How to Use
- **Add waiting tasks** - When you delegate something, add it here immediately
- **Include contact info** - Note who you're waiting on and how to reach them
- **Set review dates** - Schedule when you'll check back on the task
- **Follow up proactively** - Review this list weekly and send reminders when needed

## Examples of Follow-up Tasks
- Waiting for email reply from colleague
- Pending approval from manager
- Awaiting delivery of materials
- Scheduled meeting not yet held

## Best Practices
- Review your Opvolgen list during weekly planning
- Set specific follow-up dates (not "someday")
- Include names and contact methods in task notes
- Move back to Acties when dependencies are resolved

**Remember:** Just because you're waiting doesn't mean you should forget. Active follow-up ensures progress.`,

    'dagelijkse-planning': `# Dagelijkse Planning (Daily Planning)

Your **Daily Planning** calendar view helps you visualize and organize your day with time-blocked tasks.

## Purpose
Transform your task list into a realistic daily schedule. See at a glance what needs to happen and when.

## How to Use
- **Drag tasks** from your lists onto specific time slots
- **Set duration** - Estimate how long each task will take (15/30/60/90/120 minutes)
- **Block time** - Assign tasks to calendar slots throughout your day
- **Adjust as needed** - Move tasks around if priorities shift

## Time Blocking Benefits
- **Realistic planning** - See if you've overcommitted
- **Focus time** - Dedicated blocks for deep work
- **Buffer time** - Schedule breaks between intense tasks
- **Meeting prep** - Allocate time before important meetings

## Best Practices
- Plan your day the night before or first thing in the morning
- Leave 30-40% of your day unscheduled for unexpected tasks
- Group similar tasks (batch email processing, phone calls)
- Include breaks and transition time
- Review at end of day and adjust tomorrow's plan

## Filters & Views
- Filter by **Project** to plan project-specific work sessions
- Use **Week view** to see patterns across multiple days
- Toggle completed tasks to see what's already done

**Pro tip:** A realistic daily plan reduces stress and increases accomplishment. Don't overload your calendar.`,

    'uitgesteld': `# Uitgesteld (Postponed)

The **Uitgesteld** (Postponed) lists help you manage tasks with different time horizons. Tickedify offers 6 postponement intervals to match your planning rhythm.

## The 6 Postponement Intervals

### Weekly (Wekelijks)
**Review:** Every 1-4 weeks
**Perfect for:**
- Tasks you want to tackle "sometime this month"
- Ideas that need incubation time
- Projects waiting for prerequisite completion
- Short-term seasonal tasks

### Monthly (Maandelijks)
**Review:** Every 1-3 months
**Perfect for:**
- Medium-term projects (1-3 month horizon)
- Quarterly goals and initiatives
- Professional development activities
- Home improvement projects

### Quarterly (3-maandelijks)
**Review:** Every 3 months (Jan/Apr/Jul/Oct)
**Perfect for:**
- Quarterly business reviews
- Seasonal activities (spring cleaning, holiday prep)
- Professional development milestones
- Financial check-ins

### Bi-annual (6-maandelijks)
**Review:** Twice a year (Jan/Jul)
**Perfect for:**
- Semi-annual business planning
- Tax preparation activities
- Major home projects
- Health check-ups and reviews
- Vacation planning

### Yearly (Jaarlijks)
**Review:** Once a year (January)
**Perfect for:**
- Annual recurring tasks (birthdays, renewals)
- Yearly goal setting
- Performance reviews
- Major purchases
- Insurance policy renewals

## How to Use Postponed Lists

### Moving Tasks
- **From Inbox/Acties** - When a task isn't urgent but still important
- **Set appearance date** - Choose when you want to see this task again
- **Add context** - Note why you're deferring and what needs to happen first

### Review Strategy
- **Weekly lists** - Check during weekly planning session
- **Monthly lists** - Review first Sunday of the month
- **Quarterly lists** - Review at start of each quarter
- **Bi-annual lists** - Review in January and July
- **Yearly lists** - Comprehensive review each January

### Best Practices
- **Be selective** - Only activate 2-3 tasks per review cycle
- **Add notes** - Explain why you're deferring and what triggers action
- **Be realistic** - Consider your actual capacity and energy
- **Archive outdated** - Remove tasks that are no longer relevant
- **Align with goals** - Connect postponed tasks to bigger objectives

## Benefits of Strategic Postponement

1. **Reduced overwhelm** - Focus on what matters NOW without losing track of future tasks
2. **Better planning** - Match task activation to your actual capacity
3. **Seasonal alignment** - Schedule tasks when they make the most sense
4. **Long-term vision** - Connect daily actions to yearly goals
5. **Intentional focus** - Postponing isn't procrastinating when done strategically

**Pro tip:** The right postponement interval depends on task urgency and your planning rhythm. When in doubt, start with weekly and adjust as needed.

**Remember:** Your Acties list should energize you, not overwhelm you. Use postponed lists to maintain focus while preserving your long-term vision.`,

    'afgewerkt': `# Afgewerkt (Completed)

Your **Afgewerkt** list is a record of all completed tasks - your personal accomplishment archive.

## Purpose
Track what you've achieved, celebrate progress, and gain insights into your productivity patterns.

## How It Works
- Tasks automatically move here when marked complete
- Full history of accomplishments with completion dates
- Searchable archive for reference
- Motivation booster when you need it

## Why Keep Completed Tasks?
- **Track progress** - See how much you've accomplished
- **Find patterns** - Understand your productive rhythms
- **Reference later** - Look up details from past projects
- **Celebrate wins** - Motivation through visible achievement
- **Time estimation** - Learn how long tasks actually take

## Using Your Completed Tasks
- **Filter by date** - See what you did this week, month, or year
- **Filter by project** - Review project accomplishments
- **Search** - Find specific completed tasks quickly
- **Export** - Generate reports of your achievements

## Best Practices
- Review completed tasks weekly to celebrate progress
- Use completion data to improve time estimates
- Archive old tasks periodically to keep list manageable
- Don't delete - your history is valuable

**Pro tip:** On tough days, review your Afgewerkt list. You've accomplished more than you think!`,

    'email-import': `# Email Import

The **Email Import** feature lets you create tasks directly from your email inbox using a simple email-to-task workflow.

## How It Works
Every user has a unique import email address. Simply forward or send emails to this address, and they'll automatically become tasks in your Inbox.

## Finding Your Import Address
1. Click the **Import Email** button on this page
2. Copy your personal import address (format: import+XXXXX@mg.tickedify.com)
3. Add it to your email contacts for easy access

## Basic Usage
**Subject line** becomes the task name:
\`\`\`
Subject: Review quarterly report
Result: Task named "Review quarterly report"
\`\`\`

**Email body** becomes task notes - everything up to your signature.

## Advanced Syntax
Use the **@t instruction syntax** for powerful task creation:

\`\`\`
@t p: Project Name; c: Context; d: 2025-11-15; t: 60; p1;

Task description here.
Multiple lines supported.

--END--
Email signature (ignored)
\`\`\`

### Supported Codes
- **p:** Project name (auto-creates if needed)
- **c:** Context name (auto-creates if needed)
- **d:** Due date (YYYY-MM-DD format)
- **t:** Duration in minutes
- **p0-p9:** Priority (p0/p1=high, p2=medium, p3+=low)
- **df/dw/dm/d3m/d6m/dy:** Defer to follow-up/weekly/monthly/quarterly/bi-annual/yearly

## Best Practices
- Use **--END--** marker to exclude email signatures
- One task per email for clarity
- Use @t syntax for tasks with specific properties
- Keep import address private (unique to you)

## Examples
**Simple task:**
\`\`\`
Subject: Call dentist for appointment
Body: Need to schedule annual cleaning
\`\`\`

**Advanced task with properties:**
\`\`\`
@t p: Health; c: Phone; d: 2025-11-20; t: 15; p1;

Schedule dentist appointment for annual cleaning.
Prefer morning slot if available.

--END--
Sent from my iPhone
\`\`\`

**Pro tip:** Set up email filters to auto-forward certain emails (newsletters, receipts) to your import address for automatic task creation.

For complete syntax details and troubleshooting, visit the full [Email Import Help Guide](/email-import-help).`,

    'projecten': `# Projecten (Projects)

The **Projecten** (Projects) list helps you organize tasks by project or area of responsibility.

## Purpose
Group related tasks together under projects to maintain focus and track progress on multi-step initiatives.

## What is a Project?
In Tickedify, a project is any outcome that requires more than one action step. Examples:
- **Work:** "Launch marketing campaign", "Client X website redesign"
- **Home:** "Kitchen renovation", "Plan summer vacation"
- **Personal:** "Learn Spanish", "Get in shape"

## How to Use Projects

### Creating Projects
- Projects are created automatically when you assign a task to a project name
- No need to pre-create projects - just start using them
- Use clear, outcome-focused names (e.g., "Launch Q1 Product" not "Product stuff")

### Organizing Tasks by Project
1. When creating/editing a task, select or type a project name
2. All tasks with the same project name are grouped together
3. View all tasks for a specific project by clicking on it in the Projects list

### Project Management
- **Add new projects** - Simply assign a task to a new project name
- **Rename projects** - Edit project names to keep them clear and current
- **Archive projects** - Remove completed projects to keep your list focused
- **Project overview** - See all active projects and their task counts

## Best Practices

### Project Naming
- Use specific, measurable outcome language
- Include timeline or version if relevant ("Q1 Marketing", "Website v2.0")
- Keep names concise (3-5 words maximum)
- Use consistent naming patterns across related projects

### Project Organization
- Limit active projects to 5-10 at a time for focus
- One project per distinct outcome (don't combine unrelated work)
- Use contexts within projects for location/tool-based batching
- Review projects weekly to ensure alignment with goals

### When to Use Projects vs. Contexts
- **Use Projects** for outcome-based grouping (what you're working toward)
- **Use Contexts** for tool/location-based batching (where/how you work)
- Example: Task "Call vendor about proposal" → Project: "Office Redesign", Context: "@phone"

## Project Views & Filters
- Click any project to see only its tasks
- Filter Acties list by project to focus work sessions
- Sort by priority within projects to tackle high-impact work first
- Track project completion percentage

**Pro tip:** During weekly review, go through each active project and ensure it has a clear next action in your Acties list.`,

    'prullenbak': `# Prullenbak (Trash)

The **Prullenbak** (Trash) is where deleted tasks are temporarily stored before permanent removal.

## Purpose
Safely remove unwanted tasks while maintaining the ability to recover them if needed.

## How It Works

### Deleting Tasks
When you delete a task from any list:
1. Task is moved to Prullenbak (not permanently deleted)
2. Task remains in Prullenbak for 30 days
3. After 30 days, tasks are automatically purged
4. You can manually empty Prullenbak at any time

### Recovering Tasks
**To restore a deleted task:**
1. Navigate to Prullenbak list
2. Find the task you want to recover
3. Click the restore button (↶)
4. Task returns to its original list

### Permanently Deleting
**To remove tasks permanently:**
- **Single task:** Click permanent delete button (🗑️) on specific task
- **All tasks:** Use "Empty Trash" button to clear entire Prullenbak
- **Warning:** Permanent deletion cannot be undone!

## What Gets Stored in Trash
- Manually deleted tasks from any list
- Completed tasks (optionally - see settings)
- Abandoned recurring task instances
- Tasks removed during bulk operations

## What's NOT in Trash
- Completed tasks moved to Afgewerkt (unless you change settings)
- Tasks that were never saved (draft tasks cancelled)
- Recurring task templates (only instances are deleted)

## Best Practices

### Regular Cleanup
- Review Prullenbak monthly to ensure no important tasks were accidentally deleted
- Empty trash after confirming no needed tasks remain
- Use search to find specific deleted tasks quickly

### Recovery Workflow
If you accidentally deleted a task:
1. Immediately check Prullenbak
2. Use search if you have many deleted tasks
3. Restore the task
4. Review and correct any lost information

### Storage Management
- Prullenbak counts toward your task storage quota
- Empty trash regularly to free up space
- Consider exporting important deleted tasks before purging

## Search & Filters
- **Search deleted tasks** - Find specific tasks by name or project
- **Sort by deletion date** - See recently deleted tasks first
- **Filter by project** - View deleted tasks from specific projects
- **Date range** - Show tasks deleted within a specific timeframe

## Settings & Configuration
- **Auto-purge interval** - Configure how long tasks remain in trash (default: 30 days)
- **Confirm before delete** - Enable warnings before permanent deletion
- **Include in search** - Choose whether to include trash in global search

**Warning:** Once you permanently delete a task or empty the trash, recovery is impossible. Always double-check before purging.

**Pro tip:** Before major cleanup operations, review your Prullenbak to ensure you haven't accidentally deleted anything important during recent bulk actions.`,

    'contextenbeheer': `# Contextenbeheer (Context Management)

**Contextenbeheer** (Context Management) helps you organize and batch tasks by the tools, locations, or mindsets required to complete them.

## Purpose
Group tasks by WHERE or HOW you'll do them, enabling efficient batch processing and context-based workflows.

## What is a Context?
A context describes the environment, tool, or mental state needed for a task. Common contexts:
- **@computer** - Tasks requiring your computer
- **@phone** - Calls to make
- **@email** - Email-related tasks
- **@home** - Tasks you can only do at home
- **@office** - Office-specific work
- **@errands** - Tasks to do while out
- **@waiting** - Tasks blocked by others (similar to Opvolgen)
- **@energy-high** - Deep work requiring focus
- **@energy-low** - Simple tasks for tired moments

## How Contexts Work

### Creating Contexts
- Contexts are created automatically when assigned to tasks
- No need to pre-define - just start using them
- Use **@** prefix by convention (not required, but helpful)

### Assigning Contexts
1. When creating/editing a task, select or type a context
2. Tasks can have ONE context (keep it simple)
3. Choose the MOST limiting factor (e.g., @phone beats @office if you need to call someone at work)

### Using Contexts for Batching
Filter your Acties list by context to:
- **@phone** - Make all calls in one session
- **@computer** - Tackle computer work during deep work blocks
- **@errands** - Complete all errands in one trip
- **@energy-low** - Quick wins when you're tired

## Context Strategy

### Location-Based Contexts
Use when task can ONLY be done in specific place:
- **@home** - Water plants, do laundry
- **@office** - Use office printer, attend in-person meetings
- **@gym** - Workout tasks

### Tool-Based Contexts
Use when specific tool/device is required:
- **@computer** - Write reports, update spreadsheets
- **@phone** - Make calls (can't do this via email)
- **@email** - Send important messages, follow-ups

### Energy-Based Contexts
Use to match tasks to your energy levels:
- **@focus** - Deep work requiring concentration
- **@creative** - Brainstorming, writing, design
- **@admin** - Simple administrative tasks
- **@social** - Tasks requiring people interaction

### Time-Based Contexts
Use for tasks with timing constraints:
- **@5min** - Quick tasks for spare moments
- **@morning** - Tasks best done early
- **@evening** - After-work tasks

## Context Management Features

### View by Context
- Click any context to see all tasks requiring that context
- Filter Acties by context during planning
- See task counts per context

### Context Operations
- **Rename contexts** - Update context names for clarity
- **Merge contexts** - Combine similar contexts
- **Delete contexts** - Remove unused contexts
- **Bulk assign** - Apply context to multiple tasks at once

## Best Practices

### Choosing Contexts
- **Keep it simple** - 5-10 contexts maximum (more = decision fatigue)
- **Be specific** - "@computer" is too broad if you have laptop AND desktop tasks
- **Be consistent** - Use same naming pattern (@location, @tool, @energy)
- **Think limiting factor** - What's the ONE thing preventing you from doing this now?

### Batch Processing
1. **Time block by context** - "1-2pm = @phone calls"
2. **Location-based batching** - Do all @errands in one trip
3. **Energy matching** - @focus tasks in morning, @admin in afternoon
4. **Tool batching** - Open @email context, process all email tasks

### Context vs. Project
**Don't confuse contexts with projects:**
- **Project** = WHAT outcome you're working toward ("Launch website")
- **Context** = WHERE/HOW you'll do the work ("@computer", "@meeting")
- Tasks can have both: "Review website mockups" → Project: Launch Website, Context: @computer

### Common Mistakes
- ❌ Too many contexts (20+ becomes overwhelming)
- ❌ Using contexts as priority flags (use priority field instead)
- ❌ Contexts that are too broad ("@work" - not helpful)
- ❌ Creating contexts for single tasks (just use project instead)

## Advanced Context Use

### Context Hierarchies
Some users create parent-child contexts:
- @home-kitchen, @home-garage, @home-office
- @computer-mac, @computer-windows
- Only do this if you truly need this granularity

### Waiting Contexts
- **@waiting-boss** - Awaiting approval
- **@waiting-vendor** - Waiting on external party
- (Note: Opvolgen list may be better for tracking waiting tasks)

### Agenda Contexts
Create contexts for people you meet regularly:
- **@agenda-manager** - Topics to discuss with manager
- **@agenda-team** - Team meeting items
- Useful for 1-on-1 meetings

**Pro tip:** During daily planning, choose 2-3 contexts you'll have access to that day and filter your Acties list accordingly. This creates a focused, realistic daily plan.

**Remember:** The goal of contexts is to make your work MORE efficient, not to create complex organizational overhead. Start simple and add complexity only if needed.`
};

// Whitelist of eligible page IDs
const ELIGIBLE_PAGES = [
    'inbox',
    'acties',
    'opvolgen',
    'dagelijkse-planning',
    'uitgesteld',
    'afgewerkt',
    'email-import',
    'projecten',
    'prullenbak',
    'contextenbeheer'
];

// Human-readable page names for admin interface
const PAGE_NAMES = {
    'inbox': 'Inbox',
    'acties': 'Acties (Actions)',
    'opvolgen': 'Opvolgen (Follow-up)',
    'dagelijkse-planning': 'Dagelijkse Planning (Daily Planning)',
    'uitgesteld': 'Uitgesteld (Postponed)',
    'afgewerkt': 'Afgewerkt (Completed)',
    'email-import': 'Email Import',
    'projecten': 'Projecten (Projects)',
    'prullenbak': 'Prullenbak (Trash)',
    'contextenbeheer': 'Contextenbeheer (Context Management)'
};

// GET /api/page-help/:pageId - Get help content for specific page
app.get('/api/page-help/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;

        // Validate page ID
        if (!ELIGIBLE_PAGES.includes(pageId)) {
            return res.status(404).json({ error: `Invalid page ID: ${pageId}` });
        }

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Query database for custom content
        const result = await pool.query(
            'SELECT content, modified_at, modified_by FROM page_help WHERE page_id = $1',
            [pageId]
        );

        if (result.rows.length > 0) {
            // Custom content exists
            const row = result.rows[0];
            return res.json({
                pageId: pageId,
                content: row.content,
                isDefault: false,
                modifiedAt: row.modified_at,
                modifiedBy: row.modified_by
            });
        } else {
            // Return default content
            return res.json({
                pageId: pageId,
                content: DEFAULT_PAGE_HELP[pageId],
                isDefault: true,
                modifiedAt: null,
                modifiedBy: null
            });
        }
    } catch (error) {
        console.error('Get page help error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/page-help/:pageId - Update help content (admin only)
app.put('/api/page-help/:pageId', requireAdmin, async (req, res) => {
    try {
        const { pageId } = req.params;
        const { content } = req.body;

        // Validate page ID
        if (!ELIGIBLE_PAGES.includes(pageId)) {
            return res.status(404).json({ error: `Invalid page ID: ${pageId}` });
        }

        // Validate content
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content cannot be empty' });
        }

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Get admin identifier - supports both password-based and user-based admin auth
        let modifiedBy = 'Admin';
        if (req.session.userId) {
            // User-based admin - get their name from database
            try {
                const userResult = await pool.query('SELECT naam FROM users WHERE id = $1', [req.session.userId]);
                modifiedBy = userResult.rows[0]?.naam || 'Admin';
            } catch (error) {
                console.log('Could not fetch user name, using default');
            }
        }
        // For password-based admin (admin2.html), modifiedBy stays 'Admin'

        // UPSERT content
        await pool.query(
            `INSERT INTO page_help (page_id, content, modified_at, modified_by)
             VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
             ON CONFLICT (page_id)
             DO UPDATE SET
                content = EXCLUDED.content,
                modified_at = CURRENT_TIMESTAMP,
                modified_by = EXCLUDED.modified_by`,
            [pageId, content, modifiedBy]
        );

        res.json({
            success: true,
            pageId: pageId,
            message: 'Help content updated successfully'
        });
    } catch (error) {
        console.error('Update page help error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/page-help/:pageId - Delete custom content, revert to default (admin only)
app.delete('/api/page-help/:pageId', requireAdmin, async (req, res) => {
    try {
        const { pageId } = req.params;

        // Validate page ID
        if (!ELIGIBLE_PAGES.includes(pageId)) {
            return res.status(404).json({ error: `Invalid page ID: ${pageId}` });
        }

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Delete custom content (idempotent)
        await pool.query('DELETE FROM page_help WHERE page_id = $1', [pageId]);

        res.json({
            success: true,
            pageId: pageId,
            message: 'Help content deleted, reverted to default'
        });
    } catch (error) {
        console.error('Delete page help error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/page-help - List all page help content (admin only)
app.get('/api/page-help', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Get all custom content from database
        const result = await pool.query(
            'SELECT page_id, content, modified_at, modified_by FROM page_help ORDER BY page_id'
        );

        const customContent = {};
        result.rows.forEach(row => {
            customContent[row.page_id] = row;
        });

        // Build response with all pages
        const pages = ELIGIBLE_PAGES.map(pageId => {
            const isCustom = customContent.hasOwnProperty(pageId);
            const content = isCustom ? customContent[pageId].content : DEFAULT_PAGE_HELP[pageId];

            return {
                pageId: pageId,
                pageName: PAGE_NAMES[pageId],
                hasCustomContent: isCustom,
                contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                modifiedAt: isCustom ? customContent[pageId].modified_at : null,
                modifiedBy: isCustom ? customContent[pageId].modified_by : null
            };
        });

        res.json({ pages });
    } catch (error) {
        console.error('List page help error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint voor huidige gebruiker info inclusief import code
app.get('/api/user/info', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get user info including import code
        const result = await pool.query(`
            SELECT id, email, naam, email_import_code, rol, aangemaakt
            FROM users 
            WHERE id = $1 AND actief = TRUE
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        
        const user = result.rows[0];
        
        // Generate import code if it doesn't exist
        let importCode = user.email_import_code;
        if (!importCode) {
            importCode = await db.generateEmailImportCode(userId);
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol,
                importCode: importCode,
                importEmail: `import+${importCode}@mg.tickedify.com`
            }
        });
        
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Fout bij ophalen gebruiker gegevens' });
    }
});

// Feature 014: Onboarding video endpoints

// GET /api/user/onboarding-status - Check if user has seen onboarding video
app.get('/api/user/onboarding-status', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Niet ingelogd' });
        }

        const seen = await db.hasSeenOnboardingVideo(userId);

        res.json({ seen });
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        res.status(500).json({ error: 'Fout bij ophalen onboarding status' });
    }
});

// PUT /api/user/onboarding-video-seen - Mark onboarding video as seen
app.put('/api/user/onboarding-video-seen', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Niet ingelogd' });
        }

        await db.markOnboardingVideoSeen(userId);

        res.json({ success: true, message: 'Onboarding video gemarkeerd als gezien' });
    } catch (error) {
        console.error('Error marking onboarding video as seen:', error);
        res.status(500).json({ error: 'Fout bij markeren onboarding video' });
    }
});

// GET /api/settings/onboarding-video - Get onboarding video URL (any authenticated user)
app.get('/api/settings/onboarding-video', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Niet ingelogd' });
        }

        const url = await db.getSystemSetting('onboarding_video_url');

        res.json({ url });
    } catch (error) {
        console.error('Error getting onboarding video URL:', error);
        res.status(500).json({ error: 'Fout bij ophalen video URL' });
    }
});

// PUT /api/settings/onboarding-video - Update onboarding video URL (admin only)
app.put('/api/settings/onboarding-video', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Niet ingelogd' });
        }

        // Check if user is admin
        const userResult = await pool.query(
            'SELECT rol FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].rol !== 'admin') {
            return res.status(403).json({ error: 'Geen admin rechten' });
        }

        const { url } = req.body;

        // Validate YouTube URL format (if URL is provided)
        if (url && url.trim() !== '') {
            const youtubePatterns = [
                /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
                /^https?:\/\/youtu\.be\/[\w-]+/,
                /^https?:\/\/(www\.)?youtube-nocookie\.com\/embed\/[\w-]+/
            ];

            const isValid = youtubePatterns.some(pattern => pattern.test(url));

            if (!isValid) {
                return res.status(400).json({ error: 'Ongeldige YouTube URL' });
            }
        }

        // Update setting (null if empty string)
        const finalUrl = (url && url.trim() !== '') ? url : null;
        await db.updateSystemSetting('onboarding_video_url', finalUrl, userId);

        res.json({ success: true, message: 'Onboarding video URL bijgewerkt', url: finalUrl });
    } catch (error) {
        console.error('Error updating onboarding video URL:', error);
        res.status(500).json({ error: 'Fout bij bijwerken video URL' });
    }
});

// API endpoint voor alle gebruikers (voor test dashboard)
app.get('/api/users', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get all active users
        const result = await pool.query(`
            SELECT id, email, naam, rol
            FROM users 
            WHERE actief = TRUE
            ORDER BY naam
        `);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Fout bij ophalen gebruikers' });
    }
});

// Debug endpoint om huidige gebruiker te checken
app.get('/api/debug/current-user', (req, res) => {
    const userId = getCurrentUserId(req);
    const sessionData = req.session || {};

    res.json({
        currentUserId: userId,
        sessionData: {
            id: sessionData.id,
            userId: sessionData.userId,
            cookie: sessionData.cookie
        },
        isAuthenticated: !!sessionData.userId,
        message: 'Current user info based on session'
    });
});

// Debug endpoint to inspect database tables and subscription data
app.get('/api/debug/database-tables', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Get all database tables
        const tablesQuery = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        const tables = tablesQuery.rows.map(r => r.table_name);

        // Get jan@buskens.be user data
        const janUserQuery = await pool.query(`
            SELECT * FROM users WHERE email = 'jan@buskens.be'
        `);

        // Get subscriptions table schema if it exists
        let subscriptionsSchema = null;
        let subscriptionsData = null;
        let allSubscriptions = null;
        if (tables.includes('subscriptions')) {
            // Get schema
            const schemaQuery = await pool.query(`
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'subscriptions'
                ORDER BY ordinal_position
            `);
            subscriptionsSchema = schemaQuery.rows;

            // Get data for jan
            const subscriptionsQuery = await pool.query(`
                SELECT * FROM subscriptions WHERE user_id = $1
            `, [janUserQuery.rows[0]?.id]);
            subscriptionsData = subscriptionsQuery.rows;

            // Get ALL subscriptions to see if table has any data at all
            const allSubsQuery = await pool.query(`SELECT * FROM subscriptions LIMIT 10`);
            allSubscriptions = allSubsQuery.rows;
        }

        res.json({
            tables: tables,
            tables_count: tables.length,
            has_subscriptions_table: tables.includes('subscriptions'),
            subscriptions_schema: subscriptionsSchema,
            jan_user_data: janUserQuery.rows[0] || null,
            jan_subscriptions: subscriptionsData,
            all_subscriptions_sample: allSubscriptions,
            message: 'Database inspection complete'
        });

    } catch (error) {
        console.error('❌ Error inspecting database:', error);
        res.status(500).json({
            error: 'Database error',
            message: error.message
        });
    }
});

// Debug endpoint to check all inbox tasks
app.get('/api/debug/inbox-tasks/:userId?', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = req.params.userId;
        
        let query = `
            SELECT t.id, t.tekst, t.lijst, t.user_id, t.aangemaakt, u.email as user_email, u.naam as user_naam
            FROM taken t
            JOIN users u ON t.user_id = u.id
            WHERE t.lijst = 'inbox' 
            AND t.afgewerkt IS NULL
        `;
        
        const params = [];
        if (userId) {
            query += ' AND t.user_id = $1';
            params.push(userId);
        }
        
        query += ' ORDER BY t.aangemaakt DESC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            count: result.rows.length,
            userId: userId || 'all users',
            tasks: result.rows,
            message: userId ? `Inbox tasks for user ${userId}` : 'All inbox tasks'
        });
        
    } catch (error) {
        console.error('Debug inbox tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// EMERGENCY: Debug endpoint to get ALL tasks for a user (for data recovery)
app.get('/api/emergency/all-user-tasks/:userId?', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = req.params.userId || 'default-user-001';
        
        const query = `
            SELECT t.*, u.email as user_email, u.naam as user_naam
            FROM taken t
            JOIN users u ON t.user_id = u.id
            WHERE t.user_id = $1
            ORDER BY t.aangemaakt DESC
        `;
        
        const result = await pool.query(query, [userId]);
        
        res.json({
            success: true,
            count: result.rows.length,
            userId: userId,
            tasks: result.rows,
            message: `ALL tasks for user ${userId} - EMERGENCY RECOVERY`,
            lists: {
                inbox: result.rows.filter(t => t.lijst === 'inbox').length,
                acties: result.rows.filter(t => t.lijst === 'acties').length,
                afgewerkt: result.rows.filter(t => t.afgewerkt).length,
                other: result.rows.filter(t => t.lijst && t.lijst !== 'inbox' && t.lijst !== 'acties').length
            }
        });
        
    } catch (error) {
        console.error('Emergency user tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint for email parsing (development only)
app.post('/api/email/test', async (req, res) => {
    try {
        const { subject, body, sender } = req.body;
        
        if (!subject) {
            return res.status(400).json({ error: 'Subject is required' });
        }
        
        const taskData = parseEmailToTask({
            sender: sender || 'test@example.com',
            subject,
            body: body || '',
            timestamp: new Date().toISOString()
        });
        
        // Also resolve project and context IDs for complete test
        const userId = 'default-user-001'; // Use same hardcoded userId for consistency
        if (taskData.projectName) {
            taskData.projectId = await findOrCreateProject(taskData.projectName, userId);
        }
        if (taskData.contextName) {
            taskData.contextId = await findOrCreateContext(taskData.contextName, userId);
        }
        
        res.json({
            success: true,
            parsed_task: taskData,
            message: 'Email parsing test completed (with project/context resolution)'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Real import endpoint that actually saves tasks
app.post('/api/email/import-real', async (req, res) => {
    try {
        const { subject, body, sender, targetList } = req.body;
        const userId = getCurrentUserId(req);
        
        if (!subject) {
            return res.status(400).json({ error: 'Subject is required' });
        }
        
        // Validate targetList - default to inbox
        const validLists = ['inbox', 'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 'uitgesteld-3maandelijks', 'uitgesteld-6maandelijks', 'uitgesteld-jaarlijks'];
        const targetListName = validLists.includes(targetList) ? targetList : 'inbox';
        
        // Parse email to task data
        const taskData = parseEmailToTask({
            sender: sender || 'import@tickedify.com',
            subject,
            body: body || '',
            timestamp: new Date().toISOString()
        });
        
        // Resolve project and context IDs
        if (taskData.projectName) {
            taskData.projectId = await findOrCreateProject(taskData.projectName, userId);
        }
        if (taskData.contextName) {
            taskData.contextId = await findOrCreateContext(taskData.contextName, userId);
        }
        
        // Create the actual task
        const task = {
            id: generateId(),
            tekst: taskData.tekst,
            lijst: targetListName,
            aangemaakt: new Date().toISOString(),
            projectId: taskData.projectId || null,
            contextId: taskData.contextId || null,
            verschijndatum: taskData.verschijndatum || null,
            duur: taskData.duur || null,
            opmerkingen: taskData.opmerkingen || null,
            user_id: userId
        };
        
        // Save to database - get current list and add task
        const currentList = await db.getList(targetListName, userId) || [];
        currentList.push(task);
        
        const success = await db.saveList(targetListName, currentList, userId);
        
        if (success) {
            res.json({
                success: true,
                task: task,
                message: 'Task successfully imported to inbox'
            });
        } else {
            res.status(500).json({ error: 'Failed to save task to database' });
        }
        
    } catch (error) {
        console.error('Real import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Notion recurring tasks import endpoint (temporary for Jan)
app.post('/api/import/notion-recurring', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const { taaknaam, project, context, herhalingType, herhalingActief, datum, duur } = req.body;
        
        // Debug logging
        
        if (!taaknaam) {
            return res.status(400).json({ error: 'Taaknaam is verplicht' });
        }
        
        // Parse date safely - handle European DD/MM/YYYY format
        let verschijndatumISO;
        try {
            if (datum && datum.trim() && datum !== '') {
                // Check if it's DD/MM/YYYY format (contains slashes)
                if (datum.includes('/')) {
                    const parts = datum.split('/');
                    if (parts.length === 3) {
                        // Convert DD/MM/YYYY to YYYY-MM-DD
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        const isoDate = `${year}-${month}-${day}`;
                        verschijndatumISO = new Date(isoDate).toISOString();
                    } else {
                        verschijndatumISO = new Date(datum).toISOString();
                    }
                } else {
                    // Assume it's already in ISO format or other standard format
                    verschijndatumISO = new Date(datum).toISOString();
                }
            } else {
                verschijndatumISO = new Date().toISOString();
            }
        } catch (dateError) {
            console.warn('⚠️ Invalid date, using current date:', datum);
            verschijndatumISO = new Date().toISOString();
        }
        
        // Create task object
        const task = {
            id: generateId(),
            tekst: taaknaam,
            lijst: 'acties', // Direct to acties list
            aangemaakt: new Date().toISOString(),
            projectId: null,
            contextId: null,
            verschijndatum: verschijndatumISO,
            duur: duur ? parseInt(duur) : null,
            opmerkingen: null,
            herhalingType: herhalingType || null,
            herhalingActief: herhalingActief || false,
            user_id: userId
        };
        
        // Find or create project if provided
        if (project && project.trim()) {
            task.projectId = await findOrCreateProject(project.trim(), userId);
        }
        
        // Find or create context if provided
        if (context && context.trim()) {
            task.contextId = await findOrCreateContext(context.trim(), userId);
        }
        
        // Get current acties list and add task
        const currentActies = await db.getList('acties', userId) || [];
        currentActies.push(task);
        
        const success = await db.saveList('acties', currentActies, userId);
        
        if (success) {
            res.json({
                success: true,
                task: task,
                message: 'Task successfully imported to acties'
            });
        } else {
            res.status(500).json({ error: 'Failed to save task to database' });
        }
        
    } catch (error) {
        console.error('Notion recurring import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// TIJDELIJKE ENDPOINT: Delete all tasks for logged in user - SUPER SECURE
app.delete('/api/lijst/acties/delete-all', async (req, res) => {
    try {
        // CRITICAL: Must be authenticated - NO fallback to default user
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Authentication required - niet ingelogd' });
        }
        
        const userId = req.session.userId;
        
        // EXTRA SAFETY: Only for specific user (jan@buskens.be)
        const userCheck = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0 || userCheck.rows[0].email !== 'jan@buskens.be') {
            return res.status(403).json({ error: 'Not authorized - alleen voor Jan toegestaan' });
        }
        
        // Delete only acties for this specific user
        const result = await pool.query(
            'DELETE FROM taken WHERE user_id = $1 AND lijst = $2 AND afgewerkt IS NULL',
            [userId, 'acties']
        );
        
        
        res.json({
            success: true,
            deletedCount: result.rowCount,
            message: `${result.rowCount} taken verwijderd uit acties lijst`
        });
        
    } catch (error) {
        console.error('Error in delete all:', error);
        res.status(500).json({ error: 'Server error tijdens verwijderen' });
    }
});

// Debug endpoint to test pattern conversion
app.post('/api/debug/test-pattern', (req, res) => {
    const { pattern } = req.body;
    
    // Simple conversion test (using same logic as frontend)
    const convertedPattern = convertNotionPatternServer(pattern);
    
    res.json({
        input: pattern,
        output: convertedPattern,
        isRecognized: !!convertedPattern
    });
});

function convertNotionPatternServer(notionText) {
    if (!notionText) return null;
    
    const text = notionText.toLowerCase().trim();
    
    // Elke dag
    if (text === 'elke dag' || text === 'dagelijks' || text === 'iedere dag') {
        return 'dagelijks';
    }
    
    // Elke vrijdag  
    if (text === 'elke vrijdag') {
        return 'weekly-1-5';
    }
    
    // Elke week op [dag]
    const weeklyMatch = text.match(/elke week op (\w+)/);
    if (weeklyMatch) {
        const dayMappings = {
            'maandag': '1', 'dinsdag': '2', 'woensdag': '3', 'donderdag': '4', 
            'vrijdag': '5', 'zaterdag': '6', 'zondag': '7'
        };
        const dayNum = dayMappings[weeklyMatch[1]];
        if (dayNum) return `weekly-1-${dayNum}`;
    }
    
    return null;
}

// Authentication middleware
function requireAuth(req, res, next) {
    
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    next();
}

// Optional auth middleware (allows both authenticated and guest access)
function optionalAuth(req, res, next) {
    // For endpoints that can work with or without authentication
    next();
}

// Admin middleware - requires auth + admin account
async function requireAdmin(req, res, next) {

    // OPTION 1: Password-based admin authentication (for admin2.html)
    if (req.session.isAdmin || req.session.adminAuthenticated) {
        return next();
    }

    // OPTION 2: User-based admin authentication (for user accounts with admin role)
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Not authenticated',
            message: 'Please login as admin'
        });
    }

    // Check if user account is admin type
    try {
        const result = await pool.query(
            'SELECT account_type FROM users WHERE id = $1',
            [req.session.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Not authenticated',
                message: 'User not found'
            });
        }

        if (result.rows[0].account_type !== 'admin') {
            return res.status(403).json({
                error: 'Not authorized',
                message: 'Admin access required'
            });
        }

        next();

    } catch (error) {
        console.error('❌ Admin check error:', error);
        return res.status(500).json({
            error: 'Server error',
            message: 'Failed to verify admin status'
        });
    }
}

// Get current user ID from session or fallback to default
function getCurrentUserId(req) {
    if (!req.session.userId) {
        throw new Error('Niet ingelogd - geen geldige sessie');
    }
    return req.session.userId;
}

// T010: Daily cleanup trigger - runs once per day per user (Feature 055)
// Permanently deletes soft-deleted tasks after 30-day retention period
async function runDailyCleanupIfNeeded(userId) {
    try {
        // Environment check: only run cleanup on non-production environments
        const environment = process.env.VERCEL_ENV || 'development';
        if (environment === 'production') {
            // Safety: never run automatic cleanup on production during beta freeze
            return { skipped: true, reason: 'production_environment' };
        }

        // Check if cleanup already ran today for this user
        const userResult = await pool.query(
            'SELECT laatste_cleanup_op FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return { skipped: true, reason: 'user_not_found' };
        }

        const user = userResult.rows[0];
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Skip if cleanup already ran today
        if (user.laatste_cleanup_op === today) {
            return { skipped: true, reason: 'already_ran_today' };
        }

        // Execute cleanup: permanently delete tasks past retention period
        const deleteResult = await pool.query(
            `DELETE FROM taken
             WHERE user_id = $1
             AND verwijderd_op IS NOT NULL
             AND definitief_verwijderen_op < NOW()
             RETURNING id`,
            [userId]
        );

        const deletedCount = deleteResult.rows.length;

        // Update last cleanup date for this user
        await pool.query(
            'UPDATE users SET laatste_cleanup_op = $1 WHERE id = $2',
            [today, userId]
        );


        return {
            success: true,
            deleted_count: deletedCount,
            environment: environment
        };

    } catch (error) {
        console.error('❌ Daily cleanup error:', error);
        // Don't throw - cleanup failure shouldn't block user actions
        return { error: error.message };
    }
}

// Beta subscription middleware - checks if user has access during/after beta period
async function requireActiveSubscription(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        // T010: Run daily cleanup for this user (lazy evaluation, non-blocking)
        runDailyCleanupIfNeeded(req.session.userId).catch(err => {
            console.error('⚠️ Background cleanup failed:', err);
        });

        // Get beta config
        const betaConfig = await db.getBetaConfig();
        
        // During beta period - everyone has access
        if (betaConfig.beta_period_active) {
            return next();
        }
        
        // After beta period - check user subscription
        const userResult = await pool.query('SELECT subscription_status FROM users WHERE id = $1', [req.session.userId]);
        const user = userResult.rows[0];
        
        if (user && (user.subscription_status === 'active' || user.subscription_status === 'trialing')) {
            return next();
        }
        
        // Redirect to upgrade page
        res.redirect('/upgrade');
        
    } catch (error) {
        console.error('❌ Error checking subscription status:', error);
        // On error, allow access (fail open)
        next();
    }
}

// Synchrone B2 cleanup functie met retry logic en gedetailleerde logging
async function cleanupB2Files(bijlagen, taskId = 'unknown') {
    
    if (!bijlagen || bijlagen.length === 0) {
        return { success: true, deleted: 0, failed: 0, errors: [] };
    }
    
    // Check B2 availability before attempting cleanup
    if (!storageManager.isB2Available()) {
        console.warn(`⚠️ B2 not available for cleanup task ${taskId} - skipping ${bijlagen.length} files`);
        return {
            success: false,
            deleted: 0,
            failed: bijlagen.length,
            errors: [{
                error: 'B2 storage not available - missing credentials or configuration',
                category: 'CONFIG_ERROR'
            }],
            configError: true
        };
    }
    
    const deletedFiles = [];
    const failedFiles = [];
    const errors = [];
    
    // Sequential delete with retry logic voor betere betrouwbaarheid
    for (const bijlage of bijlagen) {
        
        let deleteSuccess = false;
        let lastError = null;
        
        // Retry logic - max 2 pogingen
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                await storageManager.deleteFile(bijlage);
                deletedFiles.push(bijlage.bestandsnaam);
                deleteSuccess = true;
                break;
            } catch (error) {
                lastError = error;
                console.error(`❌ Delete attempt ${attempt}/2 failed for ${bijlage.bestandsnaam}:`, error.message);
                
                // Wait 1 second before retry
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        if (!deleteSuccess) {
            console.error(`❌ All delete attempts failed for ${bijlage.bestandsnaam}. Final error:`, lastError?.message || 'Unknown error');
            failedFiles.push(bijlage.bestandsnaam);
            errors.push({
                file: bijlage.bestandsnaam,
                storage_path: bijlage.storage_path,
                error: lastError?.message || 'Unknown error'
            });
        }
    }
    
    const result = {
        success: failedFiles.length === 0,
        deleted: deletedFiles.length,
        failed: failedFiles.length,
        deletedFiles,
        failedFiles,
        errors
    };
    
    
    if (failedFiles.length > 0) {
        console.error(`⚠️ B2 cleanup had failures for task ${taskId}:`, failedFiles);
    }
    
    return result;
}

// T010: Password Strength Validation Function - Feature 017
function validatePasswordStrength(password) {
    const errors = [];

    // Rule 1: Minimum length
    if (!password || password.length < 8) {
        errors.push('Wachtwoord moet minimaal 8 tekens bevatten');
    }

    // Rule 2: Uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push('Wachtwoord moet minimaal 1 hoofdletter bevatten');
    }

    // Rule 3: Digit
    if (!/[0-9]/.test(password)) {
        errors.push('Wachtwoord moet minimaal 1 cijfer bevatten');
    }

    // Rule 4: Special character
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Wachtwoord moet minimaal 1 speciaal teken bevatten');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Authentication API endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, naam, wachtwoord } = req.body;

        // T011: Required fields check
        if (!email || !naam || !wachtwoord) {
            return res.status(400).json({
                success: false,
                error: 'Email, naam en wachtwoord zijn verplicht'
            });
        }

        if (!pool) {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        // T011 & T013: Password strength validation BEFORE email check (prevent timing attacks)
        const passwordValidation = validatePasswordStrength(wachtwoord);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Wachtwoord voldoet niet aan de beveiligingseisen',
                passwordErrors: passwordValidation.errors
            });
        }

        // T013: Email uniqueness check AFTER password validation
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Email adres al in gebruik'
            });
        }
        
        // Check beta status
        const betaConfig = await db.getBetaConfig();
        
        // Determine account type and status
        const accountType = betaConfig.beta_period_active ? 'beta' : 'regular';
        const subscriptionStatus = betaConfig.beta_period_active ? 'beta_active' : 'pending_payment';
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(wachtwoord, saltRounds);
        
        // Create user with beta fields
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(`
            INSERT INTO users (id, email, naam, wachtwoord_hash, rol, aangemaakt, actief, account_type, subscription_status)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8)
        `, [userId, email, naam, hashedPassword, 'user', true, accountType, subscriptionStatus]);
        
        // Generate email import code for new user
        const importCode = await db.generateEmailImportCode(userId);

        // Generate login token for auto-login after payment (non-beta users)
        const loginToken = generateLoginToken();
        const tokenExpiry = calculateTokenExpiry();

        await pool.query(
            `UPDATE users
             SET login_token = $1, login_token_expires = $2, login_token_used = FALSE
             WHERE id = $3`,
            [loginToken, tokenExpiry, userId]
        );

        // Sync to GHL with appropriate tag
        let ghlContactId = null;
        try {
            const tag = betaConfig.beta_period_active ? 'tickedify-beta-tester' : 'tickedify-user-needs-payment';
            ghlContactId = await addContactToGHL(email, naam, [tag]);

            if (ghlContactId) {
                await pool.query('UPDATE users SET ghl_contact_id = $1 WHERE id = $2', [ghlContactId, userId]);
            }
        } catch (ghlError) {
            console.error('⚠️ GHL sync failed during registration:', ghlError.message);
            // Don't fail registration if GHL sync fails
        }

        // If NOT in beta period, create session and redirect to payment
        if (!betaConfig.beta_period_active) {
            // Create session so user stays logged in during payment flow
            req.session.userId = userId;
            req.session.userEmail = email;
            req.session.userNaam = naam;

            // Save session before sending response
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error during non-beta registration:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Fout bij opslaan sessie'
                    });
                }

                return res.json({
                    success: true,
                    requiresPayment: true,
                    message: 'Account aangemaakt. Betaling vereist voor toegang.',
                    redirect: '/subscription.html',
                    user: {
                        id: userId,
                        email,
                        naam,
                        account_type: accountType,
                        subscription_status: subscriptionStatus
                    }
                });
            });

            return; // Prevent continuing to beta flow
        }
        
        // Beta period - start session and give access
        req.session.userId = userId;
        req.session.userEmail = email;
        req.session.userNaam = naam;

        // Explicitly save session before sending response
        req.session.save((err) => {
            if (err) {
                console.error('Session save error during registration:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Fout bij opslaan sessie'
                });
            }


            res.json({
                success: true,
                message: 'Welkom als beta tester! Account succesvol aangemaakt.',
                redirect: '/app',
                user: {
                    id: userId,
                    email,
                    naam,
                    rol: 'user',
                    account_type: accountType,
                    subscription_status: subscriptionStatus,
                    importCode: importCode,
                    importEmail: `import+${importCode}@mg.tickedify.com`
                }
            });
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Fout bij aanmaken account'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, wachtwoord } = req.body;


        if (!email || !wachtwoord) {
            return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
        }
        
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Find user
        const userResult = await pool.query(
            'SELECT id, email, naam, wachtwoord_hash, rol, actief FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
        }
        
        const user = userResult.rows[0];
        
        if (!user.actief) {
            return res.status(401).json({ error: 'Account is gedeactiveerd' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(wachtwoord, user.wachtwoord_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
        }
        
        // Check beta access before creating session
        const betaConfig = await db.getBetaConfig();

        // Get user's account details for beta check
        const userDetailsResult = await pool.query(`
            SELECT account_type, subscription_status, trial_end_date
            FROM users
            WHERE id = $1
        `, [user.id]);

        const userDetails = userDetailsResult.rows[0];


        // Check if trial is expired
        const trialIsExpired = isTrialExpired(userDetails);

        // If beta period is not active and user is beta type without paid/active subscription (or expired trial)
        if (!betaConfig.beta_period_active &&
            userDetails.account_type === 'beta' &&
            userDetails.subscription_status !== 'paid' &&
            userDetails.subscription_status !== 'active' &&
            (userDetails.subscription_status !== 'trialing' || trialIsExpired)) {


            // Create session for subscription selection (limited access)
            req.session.userId = user.id;
            req.session.userEmail = user.email;
            req.session.userNaam = user.naam;
            req.session.requiresUpgrade = true; // Flag for limited access

            // Explicitly save session before sending response
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Fout bij opslaan sessie' });
                }


                return res.json({
                    success: true,
                    requiresUpgrade: true,
                    expiryType: trialIsExpired ? 'trial' : 'beta',
                    message: 'Login succesvol, upgrade vereist voor volledige toegang',
                    user: {
                        id: user.id,
                        email: user.email,
                        naam: user.naam,
                        rol: user.rol
                    }
                });
            });

            // CRITICAL: Return here to prevent continuing to normal login flow
            return;
        }


        // T019: Update last login (Feature 058 - Account Settings Block)
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // Start session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userNaam = user.naam;


        res.json({
            success: true,
            message: 'Succesvol ingelogd',
            user: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Fout bij inloggen' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const userEmail = req.session.userEmail;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Fout bij uitloggen' });
        }
        
        res.json({ success: true, message: 'Succesvol uitgelogd' });
    });
});

// ========================================
// SUBSCRIPTION & PAYMENT API ENDPOINTS
// Feature: 011-in-de-app
// ========================================

// T009: POST /api/subscription/select - User selects subscription plan
app.post('/api/subscription/select', async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.session.userId;


    if (!userId) {
      console.error('❌ Subscription select failed - no userId in session');
      return res.status(401).json({ error: 'Niet ingelogd' });
    }

    if (!planId) {
      console.error('❌ Subscription select failed - no planId provided');
      return res.status(400).json({ error: 'Plan ID is verplicht' });
    }

    // Get user info (including email for confirmation page)
    const userResult = await pool.query('SELECT email, subscription_status, had_trial FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    const user = userResult.rows[0];

    // Validate plan selection
    if (!validatePlanSelection(planId, user.subscription_status, user.had_trial)) {
      // Provide specific error message for trial rejection
      if (planId === PLAN_IDS.TRIAL_14 && user.had_trial) {
        return res.status(400).json({ error: 'Je hebt al eerder een trial gehad. Kies een betaald abonnement.' });
      }
      return res.status(400).json({ error: 'Ongeldige plan selectie voor huidige status' });
    }

    // Handle trial selection (no payment needed)
    if (planId === PLAN_IDS.TRIAL_14) {
      const trialEndDate = calculateTrialEndDate();

      await pool.query(
        `UPDATE users
         SET subscription_status = $1, trial_start_date = CURRENT_DATE, trial_end_date = $2, had_trial = TRUE
         WHERE id = $3`,
        [SUBSCRIPTION_STATES.TRIALING, trialEndDate, userId]
      );


      return res.json({
        success: true,
        trial: true,
        trialEndDate: trialEndDate.toISOString().split('T')[0],
        message: 'Trial geactiveerd! Je hebt 14 dagen om Tickedify uit te proberen.'
      });
    }

    // Handle paid plan selection - get checkout URL
    const configResult = await pool.query(
      'SELECT checkout_url, is_active FROM payment_configurations WHERE plan_id = $1',
      [planId]
    );

    if (configResult.rows.length === 0 || !configResult.rows[0].is_active) {
      return res.status(400).json({ error: 'Plan niet beschikbaar' });
    }

    const checkoutUrl = configResult.rows[0].checkout_url;
    if (!checkoutUrl) {
      return res.status(500).json({ error: 'Checkout URL niet geconfigureerd. Neem contact op met support.' });
    }

    // Generate auto-login token for return flow
    const loginToken = generateLoginToken();
    const tokenExpiry = calculateTokenExpiry();

    await pool.query(
      `UPDATE users
       SET login_token = $1, login_token_expires = $2, login_token_used = FALSE
       WHERE id = $3`,
      [loginToken, tokenExpiry, userId]
    );

    // Build redirect URL with token
    const redirectUrl = `${checkoutUrl}${checkoutUrl.includes('?') ? '&' : '?'}return_token=${loginToken}`;


    res.json({
      success: true,
      paid: true,
      redirectUrl: redirectUrl,
      email: user.email  // Include email for confirmation page
    });

  } catch (error) {
    console.error('Subscription select error:', error);
    res.status(500).json({ error: 'Fout bij plan selectie' });
  }
});

// T010: POST /api/webhooks/plugandpay - Plug&Pay webhook for payment confirmation
app.post('/api/webhooks/plugandpay', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const webhookData = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;


    // API key validation (DISABLED - PlugAndPay doesn't send API key automatically)
    // Based on Minddumper implementation analysis, Plug&Pay does not automatically
    // include API key in webhook payload, so we disable this check for now.
    // Security relies on webhook URL being private and HTTPS only.
    if (webhookData.api_key) {
      const apiKeyValid = webhookData.api_key === process.env.PLUGANDPAY_API_KEY;
      if (!apiKeyValid) {
        console.error('❌ Invalid API key provided in webhook');
      } else {
      }
    } else {
    }

    // Check event type - Plug&Pay uses "webhook_event" field with "contracts.new" value
    const isSubscriptionActive =
      webhookData.webhook_event === 'contracts.new' ||
      webhookData.webhook_event === 'contracts.renewed' ||
      webhookData.webhook_event === 'subscription_started' ||
      webhookData.webhook_event === 'subscription_activated' ||
      webhookData.event === 'subscription_active' ||
      webhookData.event === 'order_payment_completed' ||
      webhookData.status === 'active' ||
      webhookData.status === 'paid';

    if (!isSubscriptionActive) {
      await logWebhookEvent({
        event_type: webhookData.webhook_event || webhookData.event || webhookData.status,
        order_id: webhookData.signup_token || webhookData.contract_id,
        email: webhookData.email || webhookData.customer_email,
        amount_cents: null,
        payload: webhookData,
        signature_valid: true,
        ip_address: ipAddress
      }, pool);
      return res.json({ success: true, message: 'Webhook received but not processed' });
    }

    // Extract data - Plug&Pay uses different field names
    const orderId = webhookData.signup_token || webhookData.contract_id; // Plug&Pay uses signup_token as order reference
    const email = webhookData.email || webhookData.customer_email;

    // Parse the raw JSON to extract amount
    let amountCents = null;
    if (webhookData.raw) {
      try {
        const rawData = JSON.parse(webhookData.raw);
        amountCents = rawData.total ? Math.round(rawData.total * 100) : null;
      } catch (e) {
        console.error('❌ Failed to parse raw data:', e);
      }
    }

    // Map billing_cycle to our plan IDs
    let selectedPlan = null;
    if (webhookData.billing_cycle === 'monthly') {
      selectedPlan = 'monthly_7';
    } else if (webhookData.billing_cycle === 'yearly') {
      selectedPlan = 'yearly_70';
    }

    const subscriptionId = webhookData.contract_id || null; // Plug&Pay uses contract_id as subscription ID


    if (!orderId || !email) {
      console.error('❌ Missing signup_token/contract_id or email in webhook');
      await logWebhookEvent({
        event_type: webhookData.webhook_event,
        order_id: orderId,
        email: email,
        amount_cents: amountCents,
        payload: webhookData,
        signature_valid: true,
        ip_address: ipAddress,
        error_message: 'Missing required fields'
      }, pool);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check idempotency
    const alreadyProcessed = await checkWebhookIdempotency(orderId, pool);
    if (alreadyProcessed) {
      await logWebhookEvent({
        event_type: webhookData.event,
        order_id: orderId,
        email: email,
        amount_cents: amountCents,
        payload: webhookData,
        signature_valid: true,
        ip_address: ipAddress,
        error_message: 'Already processed (idempotent)'
      }, pool);
      return res.json({ success: true, message: 'Already processed' });
    }

    // Find user by email
    const userResult = await pool.query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userResult.rows.length === 0) {
      console.error(`❌ User not found for email ${email}`);
      await logWebhookEvent({
        event_type: webhookData.webhook_event || webhookData.event,
        order_id: orderId,
        email: email,
        amount_cents: amountCents,
        payload: webhookData,
        signature_valid: true,
        ip_address: ipAddress,
        error_message: 'User not found'
      }, pool);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user to active subscription (set both selected_plan AND subscription_tier for consistency)
    await pool.query(
      `UPDATE users
       SET subscription_status = $1,
           payment_confirmed_at = NOW(),
           plugandpay_order_id = $2,
           amount_paid_cents = $3,
           selected_plan = $4,
           subscription_tier = $4,
           plugpay_subscription_id = $5
       WHERE id = $6`,
      [SUBSCRIPTION_STATES.ACTIVE, orderId, amountCents, selectedPlan, subscriptionId, user.id]
    );

    // Log successful webhook
    await logWebhookEvent({
      user_id: user.id,
      event_type: webhookData.webhook_event || webhookData.event,
      order_id: orderId,
      email: email,
      amount_cents: amountCents,
      payload: webhookData,
      signature_valid: true,
      ip_address: ipAddress
    }, pool);

    // Sync to GoHighLevel
    try {
      const subscriptionTags = ['tickedify-paid-customer'];

      // Add subscription-specific tag
      const planTagMap = {
        'trial_14_days': 'Tickedify-Trial',
        'monthly_7': 'Tickedify-Monthly7',
        'monthly_8': 'Tickedify-Monthly8',
        'yearly_70': 'Tickedify-Yearly70',
        'yearly_80': 'Tickedify-Yearly80'
      };

      const planTag = planTagMap[selectedPlan];
      if (planTag) {
        subscriptionTags.push(planTag);
      }

      await addContactToGHL(email, user.email, subscriptionTags);
    } catch (ghlError) {
      console.error('⚠️ GHL sync failed:', ghlError.message);
      // Don't fail webhook if GHL sync fails
    }

    // Send admin notification email about new customer
    try {
      // Get plan name from payment_configurations
      let planName = 'Unknown Plan';
      if (selectedPlan) {
        const planResult = await pool.query(
          'SELECT plan_name FROM payment_configurations WHERE plan_id = $1',
          [selectedPlan]
        );
        if (planResult.rows.length > 0) {
          planName = planResult.rows[0].plan_name;
        }
      }

      // Get user name from database
      const userNameResult = await pool.query('SELECT naam FROM users WHERE id = $1', [user.id]);
      const userName = userNameResult.rows.length > 0 ? userNameResult.rows[0].naam : 'Unknown';

      await sendNewCustomerNotification(email, userName, planName);
    } catch (emailError) {
      console.error('⚠️ Admin notification email failed:', emailError.message);
      // Don't fail webhook if email fails
    }

    res.json({ success: true, message: 'Payment processed successfully' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// T011: GET /api/payment/success - User returns from successful payment
app.get('/api/payment/success', async (req, res) => {
  try {
    const { return_token } = req.query;

    if (!return_token) {
      // No token - show generic success page and redirect to login
      return res.redirect('/payment-success.html?no_token=true');
    }

    // Validate token
    const tokenValidation = await validateLoginToken(return_token, pool);
    if (!tokenValidation.valid) {
      return res.redirect('/payment-success.html?token_error=true');
    }

    // Token valid - auto-login user
    req.session.userId = tokenValidation.userId;
    req.session.userEmail = tokenValidation.email;

    // TEMPORARY DEBUG: Log what's being set in session
    console.log('🔐 PAYMENT SUCCESS - Setting session:', {
        userId: tokenValidation.userId,
        email: tokenValidation.email,
        token: return_token,
        timestamp: new Date().toISOString()
    });

    res.redirect('/app?payment_success=true');

  } catch (error) {
    console.error('Payment success handler error:', error);
    res.redirect('/payment-success.html?error=true');
  }
});

// T012: GET /api/payment/cancelled - User cancelled payment
app.get('/api/payment/cancelled', async (req, res) => {
  try {
    const userId = req.session.userId;

    if (userId) {
      // Logged in - redirect to subscription page
      res.redirect('/subscription.html?cancelled=true');
    } else {
      // Not logged in - redirect to generic cancelled page
      res.redirect('/payment-cancelled.html');
    }

  } catch (error) {
    console.error('Payment cancelled handler error:', error);
    res.redirect('/payment-cancelled.html?error=true');
  }
});

// T013: GET /api/subscription/status - Get current subscription status
app.get('/api/subscription/status', async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Niet ingelogd' });
    }

    const userResult = await pool.query(
      `SELECT subscription_status, trial_start_date, trial_end_date,
              payment_confirmed_at, had_trial, account_type
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    const user = userResult.rows[0];
    const hasAccess = canAccessApp(user);
    const trialExpired = isTrialExpired(user);

    res.json({
      success: true,
      subscription_status: user.subscription_status,
      account_type: user.account_type,
      has_access: hasAccess,
      trial_expired: trialExpired,
      trial_start_date: user.trial_start_date,
      trial_end_date: user.trial_end_date,
      payment_confirmed_at: user.payment_confirmed_at,
      had_trial: user.had_trial
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Fout bij ophalen status' });
  }
});

// T015: GET /api/subscription - Fetch user subscription details
app.get('/api/subscription', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const result = await pool.query(`
      SELECT
        u.subscription_status,
        u.subscription_plan,
        u.subscription_renewal_date,
        u.subscription_price,
        u.subscription_cycle,
        u.trial_end_date,
        u.plugpay_subscription_id,
        p.plan_name,
        p.tier_level,
        p.features
      FROM users u
      LEFT JOIN subscription_plans p ON u.subscription_plan = p.plan_id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const subscription = {
      status: user.subscription_status || 'trial',
      plan: user.subscription_plan,
      plan_name: user.plan_name,
      tier_level: user.tier_level,
      renewal_date: user.subscription_renewal_date,
      price: user.subscription_price,
      cycle: user.subscription_cycle,
      trial_end_date: user.trial_end_date,
      days_remaining: calculateTrialDaysRemaining(user.trial_end_date),
      features: user.features || []
    };

    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ========================================
// ACCOUNT SETTINGS API ENDPOINTS
// Feature: 058-dan-mag-je (Account Settings Block)
// ========================================

// T016: GET /api/account - Fetch authenticated user's account information
app.get('/api/account', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const result = await pool.query(`
      SELECT
        id,
        email as name,
        aangemaakt as created_at,
        last_login,
        total_tasks_created,
        total_tasks_completed
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Format member_since as human-readable (e.g., "June 2024")
    const createdDate = new Date(user.created_at);
    const memberSince = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });

    // Format last_login_relative as human-readable time ago
    let lastLoginRelative = 'Never';
    if (user.last_login) {
      const lastLoginDate = new Date(user.last_login);
      const now = new Date();
      const diffMs = now - lastLoginDate;
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) {
        lastLoginRelative = 'Just now';
      } else if (diffMinutes < 60) {
        lastLoginRelative = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        lastLoginRelative = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        lastLoginRelative = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else {
        lastLoginRelative = lastLoginDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }

    const accountInfo = {
      id: user.id,
      name: user.name,
      created_at: user.created_at,
      member_since: memberSince,
      last_login: user.last_login,
      last_login_relative: lastLoginRelative,
      total_tasks_created: user.total_tasks_created || 0,
      total_tasks_completed: user.total_tasks_completed || 0
    };

    res.json(accountInfo);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to fetch account information' });
  }
});

// T017: POST /api/account/password-reset - Request password reset email
app.post('/api/account/password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const sessionUserId = req.session?.userId;

    let user = null;

    // Check if user is authenticated via session (Change Password from Settings)
    if (sessionUserId) {
      // User is logged in - use session
      const userResult = await pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [sessionUserId]
      );
      user = userResult.rows.length > 0 ? userResult.rows[0] : null;
    }
    // Otherwise, require email parameter (Forgot Password flow)
    else {
      // Validate email format
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required' });
      }

      // Look up user by email
      const userResult = await pool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      user = userResult.rows.length > 0 ? userResult.rows[0] : null;
    }

    // Only process password reset if user exists (but don't reveal this in response)
    if (user) {

      // Rate limiting: Check count of pending tokens in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const tokenCountResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM password_reset_tokens
        WHERE user_id = $1
          AND created_at > $2
          AND used_at IS NULL
      `, [user.id, oneHourAgo]);

      const pendingTokenCount = parseInt(tokenCountResult.rows[0].count);

      if (pendingTokenCount >= 3) {
        // Calculate retry_after_seconds
        const oldestTokenResult = await pool.query(`
          SELECT created_at
          FROM password_reset_tokens
          WHERE user_id = $1
            AND created_at > $2
            AND used_at IS NULL
          ORDER BY created_at ASC
          LIMIT 1
        `, [user.id, oneHourAgo]);

        const oldestTokenTime = new Date(oldestTokenResult.rows[0].created_at);
        const retryAfterMs = (oldestTokenTime.getTime() + 60 * 60 * 1000) - Date.now();
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

        return res.status(429).json({
          error: 'Too many password reset requests. Please try again later.',
          retry_after_seconds: retryAfterSeconds
        });
      }

      // Generate token
      const resetToken = generatePasswordResetToken();
      const tokenHash = hashToken(resetToken);

      // Store token in database (expires in 24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || null;

      await pool.query(`
        INSERT INTO password_reset_tokens
        (user_id, token_hash, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.id, tokenHash, expiresAt, ipAddress, userAgent]);

      // Send email
      await sendPasswordResetEmail(user.email, user.email, resetToken);
    }

    // Return appropriate message based on authentication method
    if (sessionUserId) {
      // User is logged in - can confirm email was sent
      res.json({
        message: 'Password reset email sent. Check your inbox.',
        expires_in_hours: 24
      });
    } else {
      // Public request - don't reveal if email exists (security)
      res.json({
        message: 'If an account exists with that email, you will receive a password reset link.',
        expires_in_hours: 24
      });
    }

  } catch (error) {
    console.error('Password reset request error:', error);

    // Check if error is due to Mailgun not being configured
    if (error.message && error.message.includes('Email service not configured')) {
      return res.status(503).json({
        error: 'Password reset is temporarily unavailable. Please contact support at info@tickedify.com',
        code: 'EMAIL_SERVICE_UNAVAILABLE'
      });
    }

    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// T018: POST /api/account/password-reset/confirm - Confirm password reset with token
app.post('/api/account/password-reset/confirm', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Validate token format (64 hex characters)
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    // Validate password strength (at least 8 characters)
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash token and lookup in database
    const tokenHash = hashToken(token);

    const tokenResult = await pool.query(`
      SELECT
        prt.id as token_id,
        prt.user_id,
        prt.expires_at,
        prt.used_at,
        u.email
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token_hash = $1
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    const tokenData = tokenResult.rows[0];

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return res.status(401).json({ error: 'Reset token has already been used.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password and mark token as used (in transaction)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE users SET wachtwoord_hash = $1 WHERE id = $2',
        [hashedPassword, tokenData.user_id]
      );

      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [tokenData.token_id]
      );

      await client.query('COMMIT');

      console.log(`✅ Password reset successful for user ${tokenData.email}`);

      res.json({
        message: 'Password reset successful. You can now log in with your new password.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ========================================
// DEBUG ENDPOINT - MAILGUN CONFIGURATION TEST
// ========================================

// DEBUG: GET /api/debug/mailgun-test - Test Mailgun configuration
app.get('/api/debug/mailgun-test', requireLogin, async (req, res) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment_variables: {},
      mailgun_client: null,
      test_email_result: null
    };

    // Check environment variables
    diagnostics.environment_variables.MAILGUN_API_KEY = process.env.MAILGUN_API_KEY
      ? `Set (length: ${process.env.MAILGUN_API_KEY.length}, starts with: ${process.env.MAILGUN_API_KEY.substring(0, 10)}...)`
      : 'NOT SET';

    diagnostics.environment_variables.MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN
      ? `Set (${process.env.MAILGUN_DOMAIN})`
      : 'NOT SET';

    // Try to initialize Mailgun client
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      try {
        const formData = require('form-data');
        const Mailgun = require('mailgun.js');
        const mailgun = new Mailgun(formData);

        const mg = mailgun.client({
          username: 'api',
          key: process.env.MAILGUN_API_KEY,
          url: 'https://api.eu.mailgun.net' // EU region endpoint
        });

        diagnostics.mailgun_client = 'Successfully initialized (EU region)';

        // Try to send a test email to the current user
        const userId = req.session.userId;
        const userResult = await pool.query('SELECT email, email as name FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];

          const messageData = {
            from: 'Tickedify <noreply@mg.tickedify.com>',
            to: user.email,
            subject: 'Mailgun Test Email - Tickedify',
            text: 'This is a test email to verify Mailgun configuration. If you receive this, Mailgun is working correctly!',
            html: '<p>This is a test email to verify Mailgun configuration.</p><p>If you receive this, Mailgun is working correctly!</p>'
          };

          try {
            const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
            diagnostics.test_email_result = {
              success: true,
              message: `Test email sent to ${user.email}`,
              mailgun_id: result.id,
              mailgun_message: result.message
            };
          } catch (emailError) {
            diagnostics.test_email_result = {
              success: false,
              error: emailError.message,
              error_details: emailError.details || emailError.stack,
              status: emailError.status || 'unknown'
            };
          }
        }

      } catch (clientError) {
        diagnostics.mailgun_client = {
          error: 'Failed to initialize',
          message: clientError.message,
          stack: clientError.stack
        };
      }
    } else {
      diagnostics.mailgun_client = 'Cannot initialize - environment variables missing';
    }

    res.json(diagnostics);

  } catch (error) {
    console.error('Mailgun test error:', error);
    res.status(500).json({
      error: 'Failed to run Mailgun diagnostics',
      message: error.message,
      stack: error.stack
    });
  }
});

// T014: GET /api/admin/payment-configurations - Admin: Get all payment configurations
app.get('/api/admin/payment-configurations', async (req, res) => {
  try {
    // Check for admin authentication (either password-based or user-based)
    const isAdminPasswordAuth = req.session.isAdmin === true;
    const userId = req.session.userId;

    // Allow access if admin password authenticated
    if (isAdminPasswordAuth) {
    } else if (userId) {
      // Check admin role for user-based authentication
      const userResult = await pool.query('SELECT rol FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0 || userResult.rows[0].rol !== 'admin') {
        return res.status(403).json({ error: 'Admin rechten vereist' });
      }
    } else {
      return res.status(401).json({ error: 'Niet ingelogd' });
    }

    // Get all configurations
    const configsResult = await pool.query(
      `SELECT plan_id, plan_name, checkout_url, is_active, created_at, updated_at
       FROM payment_configurations
       ORDER BY plan_id`
    );

    res.json({
      success: true,
      configurations: configsResult.rows
    });

  } catch (error) {
    console.error('Get payment configurations error:', error);
    res.status(500).json({ error: 'Fout bij ophalen configuraties' });
  }
});

// T015: PUT /api/admin/payment-configurations - Admin: Update checkout URL
app.put('/api/admin/payment-configurations', async (req, res) => {
  try {
    const { plan_id, checkout_url, is_active } = req.body;

    // Check for admin authentication (either password-based or user-based)
    const isAdminPasswordAuth = req.session.isAdmin === true;
    const userId = req.session.userId;

    // Allow access if admin password authenticated
    if (isAdminPasswordAuth) {
    } else if (userId) {
      // Check admin role for user-based authentication
      const userResult = await pool.query('SELECT rol FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0 || userResult.rows[0].rol !== 'admin') {
        return res.status(403).json({ error: 'Admin rechten vereist' });
      }
    } else {
      return res.status(401).json({ error: 'Niet ingelogd' });
    }

    // Validate checkout URL
    if (checkout_url && !checkout_url.startsWith('https://')) {
      return res.status(400).json({ error: 'Checkout URL moet beginnen met https://' });
    }

    // Update configuration
    const updateResult = await pool.query(
      `UPDATE payment_configurations
       SET checkout_url = COALESCE($1, checkout_url),
           is_active = COALESCE($2, is_active)
       WHERE plan_id = $3
       RETURNING *`,
      [checkout_url, is_active, plan_id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan niet gevonden' });
    }

    const adminIdentifier = userId || 'password-auth';

    res.json({
      success: true,
      configuration: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Update payment configuration error:', error);
    res.status(500).json({ error: 'Fout bij updaten configuratie' });
  }
});

// Waitlist API endpoint
app.post('/api/waitlist/signup', async (req, res) => {
    try {
        const { email, firstname, lastname, name } = req.body;
        
        // Basic email validation
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Geldig email adres is verplicht' });
        }
        
        // Get client info for tracking
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];
        const referrer = req.headers.referer || req.headers.referrer;
        
        // Insert into waitlist
        const result = await pool.query(
            'INSERT INTO waitlist (email, ip_address, user_agent, referrer) VALUES ($1, $2, $3, $4) RETURNING id, aangemaakt',
            [email.toLowerCase().trim(), ipAddress, userAgent, referrer]
        );
        
        
        // Add to GoHighLevel if API key is configured
        if (process.env.GHL_API_KEY) {
            try {
                const locationId = process.env.GHL_LOCATION_ID || 'FLRLwGihIMJsxbRS39Kt';
                
                // First, search for existing contact by email
                const searchResponse = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email.toLowerCase().trim())}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Version': '2021-07-28'
                    }
                });

                let contactId = null;
                let isExisting = false;

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.contact && searchData.contact.id) {
                        contactId = searchData.contact.id;
                        isExisting = true;
                    }
                }

                if (!contactId) {
                    // Create new contact
                    const createResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                            'Content-Type': 'application/json',
                            'Version': '2021-07-28'
                        },
                        body: JSON.stringify({
                            email: email.toLowerCase().trim(),
                            firstName: firstname || (name ? name.split(' ')[0] : 'Waitlist'),
                            lastName: lastname || (name ? (name.split(' ').slice(1).join(' ') || 'User') : 'User'), 
                            name: (firstname && lastname) ? `${firstname} ${lastname}` : (name || 'Waitlist User'),
                            locationId: locationId,
                            tags: ['tickedify-waitlist-signup'],
                            source: 'waitlist-signup',
                            customFields: [
                                {
                                    id: 'source',
                                    field_value: 'Tickedify Waitlist'
                                }
                            ]
                        })
                    });

                    if (createResponse.ok) {
                        const createData = await createResponse.json();
                        contactId = createData.contact?.id;
                    } else {
                        const errorText = await createResponse.text();
                        console.error(`⚠️ GoHighLevel create error: ${createResponse.status} - ${errorText}`);
                    }
                } else {
                    // Add tag to existing contact
                    const tagResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                            'Content-Type': 'application/json',
                            'Version': '2021-07-28'
                        },
                        body: JSON.stringify({
                            tags: ['tickedify-waitlist-signup']
                        })
                    });

                    if (tagResponse.ok) {
                    } else {
                        const errorText = await tagResponse.text();
                        console.error(`⚠️ GoHighLevel tag error: ${tagResponse.status} - ${errorText}`);
                    }
                }

            } catch (ghlError) {
                console.error('⚠️ GoHighLevel integration error:', ghlError.message);
                // Don't fail the whole signup if GHL fails
            }
        }
        
        // Get total waitlist count
        const countResult = await pool.query('SELECT COUNT(*) as total FROM waitlist');
        const totalCount = parseInt(countResult.rows[0].total);
        
        res.json({ 
            success: true, 
            message: 'Je staat nu op de wachtlijst!',
            position: totalCount,
            id: result.rows[0].id
        });
        
    } catch (error) {
        console.error('Waitlist signup error:', error);
        
        // Handle duplicate email
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ 
                error: 'Dit email adres staat al op de wachtlijst',
                already_exists: true 
            });
        }
        
        res.status(500).json({ error: 'Er is een fout opgetreden. Probeer het later opnieuw.' });
    }
});

// Get waitlist stats (public endpoint)
app.get('/api/waitlist/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM waitlist');
        const actualCount = parseInt(result.rows[0].total);
        const displayCount = actualCount + 10; // Add 10 for marketing impression
        
        res.json({ 
            total: displayCount,
            message: displayCount === 1 ? '1 persoon' : `${displayCount} mensen`
        });
    } catch (error) {
        console.error('Waitlist stats error:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

// Bijlagen (Attachments) API endpoints
// Upload attachment for a task
app.post('/api/taak/:id/bijlagen', requireAuth, uploadAttachment.single('file'), async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const { id: taakId } = req.params;
        const userId = req.session.userId;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Geen bestand geüpload' });
        }

        // Get user plan type and storage stats
        const planType = await db.getUserPlanType(userId);
        const userStats = await db.getUserStorageStats(userId);

        // Validate file upload
        const validation = storageManager.validateFile(file, planType, userStats);
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.errors[0] || 'Bestand niet toegestaan',
                details: validation.errors
            });
        }

        // Check if task exists and belongs to user (T017: filter soft deleted)
        const existingTaak = await pool.query('SELECT id FROM taken WHERE id = $1 AND user_id = $2 AND verwijderd_op IS NULL', [taakId, userId]);
        if (existingTaak.rows.length === 0) {
            return res.status(404).json({ error: 'Taak niet gevonden' });
        }

        // Check attachment limit based on plan type
        // Unlimited: unlimited attachments
        // Standard & Free: max 1 attachment per task
        if (planType !== 'premium_plus') {
            const existingBijlagen = await db.getBijlagenForTaak(taakId);
            if (existingBijlagen.length >= STORAGE_CONFIG.MAX_ATTACHMENTS_PER_TASK_FREE) {
                const upgradeMessage = planType === 'premium_standard'
                    ? 'Maximum 1 attachment per task for Standard plan. Upgrade to Unlimited for unlimited attachments.'
                    : `Maximum ${STORAGE_CONFIG.MAX_ATTACHMENTS_PER_TASK_FREE} attachment per task for free users. Upgrade to Standard or Unlimited for more storage.`;

                return res.status(400).json({
                    error: upgradeMessage
                });
            }
        }

        // DEBUG: Log file info before upload

        // CRITICAL: Check PNG signature IMMEDIATELY after multer processing
        if (file.buffer && file.buffer.length > 8) {
            const multerBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
        }

        // Upload file using storage manager
        const bijlageData = await storageManager.uploadFile(file, taakId, userId);

        // Save to database
        const savedBijlage = await db.createBijlage(bijlageData);
        
        // If it's a PNG (detect by signature), immediately verify the upload worked correctly
        let uploadVerification = null;
        const isPNGFile = file.buffer && file.buffer.length > 8 &&
                          file.buffer[0] === 0x89 && file.buffer[1] === 0x50 &&
                          file.buffer[2] === 0x4E && file.buffer[3] === 0x47;

        if (isPNGFile) {
            try {
                const fileBuffer = await storageManager.downloadFile(savedBijlage);
                const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
                const firstBytes = buffer.slice(0, 8);
                const hexBytes = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                const expectedPNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                const isValidPNG = expectedPNG.every((byte, index) => firstBytes[index] === byte);

                uploadVerification = {
                    png_signature_valid: isValidPNG,
                    first_8_bytes: hexBytes,
                    expected: '89 50 4e 47 0d 0a 1a 0a'
                };
            } catch (verifyError) {
                console.error('Failed to verify PNG after upload:', verifyError);
                uploadVerification = { error: 'Verification failed' };
            }
        }
        
        res.json({
            success: true,
            bijlage: {
                id: savedBijlage.id,
                taak_id: savedBijlage.taak_id,
                bestandsnaam: savedBijlage.bestandsnaam,
                bestandsgrootte: savedBijlage.bestandsgrootte,
                mimetype: savedBijlage.mimetype,
                geupload: savedBijlage.geupload
            },
            upload_verification: uploadVerification,
            // Include debug info in response so we can see it in frontend
            debug_info: isPNGFile ? {
                multer_signature: file.buffer ? Array.from(file.buffer.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ') : 'no buffer',
                multer_valid: file.buffer && file.buffer.length > 8 ? 
                    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A].every((byte, index) => file.buffer[index] === byte) : false
            } : null
        });

    } catch (error) {
        console.error('❌ Error uploading bijlage:', error);
        console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Return more specific error information for debugging
        let errorMessage = 'Fout bij uploaden bijlage';
        if (error.message && error.message.includes('B2 upload failed')) {
            errorMessage = `B2 storage error: ${error.message}`;
        } else if (error.message && error.message.includes('HTTP request failed')) {
            errorMessage = `Network error: ${error.message}`;
        } else if (error.message && error.message.includes('Raw upload setup failed')) {
            errorMessage = `Upload setup error: ${error.message}`;
        } else if (error.message) {
            errorMessage = `Upload error: ${error.message}`;
        }
        
        res.status(500).json({ 
            error: errorMessage,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get all attachments for a task
app.get('/api/taak/:id/bijlagen', requireAuth, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const { id: taakId } = req.params;
        const userId = req.session.userId;

        // Check if task exists and belongs to user (T017: filter soft deleted)
        const existingTaak = await pool.query('SELECT id FROM taken WHERE id = $1 AND user_id = $2 AND verwijderd_op IS NULL', [taakId, userId]);
        if (existingTaak.rows.length === 0) {
            return res.status(404).json({ error: 'Taak niet gevonden' });
        }

        const bijlagen = await db.getBijlagenForTaak(taakId);
        
        res.json({
            success: true,
            bijlagen: bijlagen
        });

    } catch (error) {
        console.error('❌ Error getting bijlagen:', error);
        res.status(500).json({ error: 'Fout bij ophalen bijlagen' });
    }
});

// Test endpoint to verify route works
app.get('/api/bijlage/:id/test', (req, res) => {
    res.json({ 
        message: 'Test route works!',
        id: req.params.id,
        timestamp: new Date().toISOString()
    });
});

// DEBUG: MIME type test endpoint - allows uploading PNG with different MIME types
app.post('/api/debug/mime-test-upload', requireAuth, uploadAttachment.single('file'), async (req, res) => {
    try {
        const { forceMimeType } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Override MIME type for testing if provided
        if (forceMimeType) {
            file.mimetype = forceMimeType;
        }
        
        const isPNG = file.buffer && file.buffer.length > 8 && 
                      file.buffer[0] === 0x89 && file.buffer[1] === 0x50 && 
                      file.buffer[2] === 0x4E && file.buffer[3] === 0x47;
        
        res.json({
            success: true,
            analysis: {
                original_filename: file.originalname,
                detected_mime_type: file.mimetype,
                is_png_signature: isPNG,
                first_8_bytes: Array.from(file.buffer.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '),
                file_size: file.size,
                test_purpose: forceMimeType ? 'MIME type override test' : 'Normal upload analysis'
            }
        });
        
    } catch (error) {
        console.error('MIME test error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG: PNG binary analysis endpoint
app.get('/api/bijlage/:id/png-debug', requireAuth, async (req, res) => {
    try {
        const { id: bijlageId } = req.params;
        const userId = req.session.userId;
        
        // Get bijlage metadata
        const bijlage = await db.getBijlage(bijlageId);
        if (!bijlage || bijlage.user_id !== userId) {
            return res.status(404).json({ error: 'Bijlage niet gevonden' });
        }

        // Only analyze PNG files
        if (!bijlage.mimetype || bijlage.mimetype !== 'image/png') {
            return res.json({ 
                error: 'Not a PNG file',
                mimetype: bijlage.mimetype,
                filename: bijlage.bestandsnaam 
            });
        }

        // Download from B2 and analyze
        const fileBuffer = await storageManager.downloadFile(bijlage);
        const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
        
        // Analyze first 32 bytes
        const firstBytes = buffer.slice(0, 32);
        const hexBytes = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        
        // Check PNG signature
        const expectedPNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const actualSignature = Array.from(buffer.slice(0, 8));
        const isValidPNG = expectedPNG.every((byte, index) => actualSignature[index] === byte);
        
        res.json({
            filename: bijlage.bestandsnaam,
            mimetype: bijlage.mimetype,
            size: buffer.length,
            storage_type: bijlage.storage_type,
            first_32_bytes_hex: hexBytes,
            png_signature_expected: expectedPNG.map(b => b.toString(16).padStart(2, '0')).join(' '),
            png_signature_actual: actualSignature.map(b => b.toString(16).padStart(2, '0')).join(' '),
            is_valid_png: isValidPNG,
            analysis: {
                has_png_header: isValidPNG,
                file_size_match: buffer.length === bijlage.bestandsgrootte,
                buffer_type: Buffer.isBuffer(fileBuffer) ? 'Buffer' : typeof fileBuffer
            }
        });
        
    } catch (error) {
        console.error('PNG debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG: Test route zonder authentication
app.get('/api/bijlage/:id/download-debug', (req, res) => {
    res.json({ message: 'Debug route werkt!', id: req.params.id });
});

// DEBUG: Test route met authentication
app.get('/api/bijlage/:id/download-auth', requireAuth, (req, res) => {
    res.json({ message: 'Auth debug route werkt!', id: req.params.id, userId: req.session.userId });
});

// Download attachment - step by step restoration
app.get('/api/bijlage/:id/download', requireAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const { id: bijlageId } = req.params;
        const userId = req.session.userId;
        

        // Get attachment info first to determine storage type
        const dbStart = Date.now();
        const bijlage = await db.getBijlage(bijlageId, false);
        
        if (bijlage) {
        }
        
        if (!bijlage) {
            return res.status(404).json({ error: 'Bijlage niet gevonden' });
        }

        // Check if user owns this attachment
        if (bijlage.user_id !== userId) {
            return res.status(403).json({ error: 'Geen toegang tot bijlage' });
        }
        
        if (bijlage.storage_type === 'database') {
            // File stored in database - fetch binary data separately
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers with actual buffer size
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                
                res.end(buffer, 'binary');
            } else {
                return res.status(404).json({ error: 'Bijlage data niet gevonden in database' });
            }
        } else if (bijlage.storage_type === 'backblaze' && bijlage.storage_path) {
            // TEMPORARY BYPASS: Try database first, then B2
            
            // Try to get file from database first (fallback)
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                
                // Ensure we have a Buffer for binary data
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers with actual buffer size
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                
                res.end(buffer, 'binary');
                return;
            }
            
            // File stored in Backblaze B2 (original logic)
            
            try {
                const b2Start = Date.now();
                // Download file from B2 using storage manager
                const fileBuffer = await storageManager.downloadFile(bijlage);
                
                if (!fileBuffer) {
                    return res.status(404).json({ error: 'Bestand niet gevonden in cloud storage' });
                }
                
                
                // Ensure we have a Buffer for binary data
                const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
                
                // DEBUG: Check PNG file signature (first 8 bytes should be: 89 50 4E 47 0D 0A 1A 0A)
                if (bijlage.mimetype === 'image/png' && buffer.length > 8) {
                    const firstBytes = buffer.slice(0, 8);
                    const hexBytes = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    
                    // Check if PNG signature is correct
                    const expectedPNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                    const isValidPNG = expectedPNG.every((byte, index) => firstBytes[index] === byte);
                }
                
                // Set headers with actual buffer size from B2
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                
                res.end(buffer, 'binary');
                
            } catch (b2Error) {
                console.error('❌ Error downloading from B2:', b2Error);
                console.error('❌ B2 Error stack:', b2Error.stack);
                console.error('❌ B2 Error message:', b2Error.message);
                console.error('❌ B2 Error name:', b2Error.name);
                return res.status(500).json({ 
                    error: 'Fout bij downloaden uit cloud storage',
                    debug: `${b2Error.name}: ${b2Error.message}`
                });
            }
        } else if (bijlage.storage_type === 'filesystem' && bijlage.storage_path) {
            // File stored in filesystem (future implementation)
            return res.status(501).json({ error: 'File system storage niet geïmplementeerd' });
        } else {
            // No valid storage found
            return res.status(404).json({ error: 'Bijlage data niet gevonden' });
        }
        
    } catch (error) {
        console.error('❌ Error downloading bijlage:', error);
        res.status(500).json({ error: 'Fout bij downloaden bijlage' });
    }
});

// Preview attachment - same as download but with inline content-disposition
app.get('/api/bijlage/:id/preview', requireAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const { id: bijlageId } = req.params;
        const userId = req.session.userId;
        

        // Get attachment info first to determine storage type
        const dbStart = Date.now();
        const bijlage = await db.getBijlage(bijlageId, false);
        
        if (!bijlage) {
            return res.status(404).json({ error: 'Bijlage niet gevonden' });
        }

        // Check if user owns this attachment
        if (bijlage.user_id !== userId) {
            return res.status(403).json({ error: 'Geen toegang tot bijlage' });
        }

        // Check if file type supports preview
        const isImage = bijlage.mimetype && bijlage.mimetype.startsWith('image/');
        const isPdf = bijlage.mimetype === 'application/pdf';
        
        if (!isImage && !isPdf) {
            return res.status(400).json({ error: 'Bestandstype ondersteunt geen preview' });
        }
        
        if (bijlage.storage_type === 'database') {
            // File stored in database - fetch binary data separately
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers for inline viewing
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                
                res.end(buffer, 'binary');
            } else {
                return res.status(404).json({ error: 'Bijlage data niet gevonden in database' });
            }
        } else if (bijlage.storage_type === 'backblaze' && bijlage.storage_path) {
            // Try database first as fallback, then B2
            
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers for inline viewing
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                
                res.end(buffer, 'binary');
                return;
            }

            // Fallback to B2 download
            try {
                
                const storageStart = Date.now();
                const fileBuffer = await storageManager.downloadFile(bijlage);
                
                if (!fileBuffer) {
                    return res.status(404).json({ error: 'Bijlage niet gevonden in cloud storage' });
                }
                
                
                const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
                
                // Set headers for inline viewing
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                
                res.end(buffer, 'binary');
                
            } catch (b2Error) {
                console.error('❌ Error downloading from B2 for preview:', b2Error);
                return res.status(500).json({ 
                    error: 'Fout bij laden preview uit cloud storage',
                    debug: `${b2Error.name}: ${b2Error.message}`
                });
            }
        } else {
            return res.status(404).json({ error: 'Bijlage data niet gevonden' });
        }
        
    } catch (error) {
        console.error('❌ Error previewing bijlage:', error);
        res.status(500).json({ error: 'Fout bij laden preview' });
    }
});

// Delete attachment
app.delete('/api/bijlage/:id', requireAuth, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const { id: bijlageId } = req.params;
        const userId = req.session.userId;

        // Get attachment info first
        const bijlage = await db.getBijlage(bijlageId);
        
        
        if (!bijlage) {
            return res.status(404).json({ error: 'Bijlage niet gevonden' });
        }

        // Check if user owns this attachment
        if (bijlage.user_id !== userId) {
            return res.status(403).json({ error: 'Geen toegang tot bijlage' });
        }

        // Delete from B2 storage first
        try {
            await storageManager.deleteFile(bijlage);
        } catch (error) {
            console.error(`⚠️ B2 delete failed for ${bijlage.bestandsnaam}:`, error.message);
            // Continue with database deletion even if B2 fails
        }

        // Delete from database
        const success = await db.deleteBijlage(bijlageId, userId);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Fout bij verwijderen bijlage' });
        }

    } catch (error) {
        console.error('❌ Error deleting bijlage:', error);
        res.status(500).json({ error: 'Fout bij verwijderen bijlage' });
    }
});

// Get user storage statistics
app.get('/api/user/storage-stats', requireAuth, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const userId = req.session.userId;

        // CRITICAL FIX: Always recalculate storage usage before returning stats
        // This ensures the user_storage_usage table is always synchronized with actual bijlagen data
        // Fixes the "2MB always showing" bug where cached/stale data was returned
        await db.updateUserStorageUsage(userId);

        const stats = await db.getUserStorageStats(userId);
        const planType = await db.getUserPlanType(userId);
        const isPremium = planType !== 'free';

        // Get user's plan_id for reference
        const userResult = await pool.query('SELECT selected_plan FROM users WHERE id = $1', [userId]);
        const planId = userResult.rows[0]?.selected_plan || null;

        const isPremiumPlus = planType === 'premium_plus';
        const isPremiumStandard = planType === 'premium_standard';

        res.json({
            success: true,
            stats: {
                used_bytes: stats.used_bytes,
                used_formatted: storageManager.formatBytes(stats.used_bytes),
                bijlagen_count: stats.bijlagen_count,
                is_premium: isPremium,
                plan_id: planId,
                plan_type: planType,
                limits: {
                    total_bytes: isPremiumPlus ? null : STORAGE_CONFIG.FREE_TIER_LIMIT,
                    total_formatted: isPremiumPlus ? 'Onbeperkt' : storageManager.formatBytes(STORAGE_CONFIG.FREE_TIER_LIMIT),
                    max_file_size: isPremiumPlus ? null : STORAGE_CONFIG.MAX_FILE_SIZE_FREE,
                    max_file_formatted: isPremiumPlus ? 'Onbeperkt' : storageManager.formatBytes(STORAGE_CONFIG.MAX_FILE_SIZE_FREE),
                    max_attachments_per_task: isPremiumPlus ? null : STORAGE_CONFIG.MAX_ATTACHMENTS_PER_TASK_FREE
                }
            }
        });

    } catch (error) {
        console.error('❌ Error getting storage stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen opslag statistieken' });
    }
});

// Admin endpoint to view waitlist data
app.get('/api/admin/waitlist', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, email, aangemaakt, ip_address, user_agent, referrer 
            FROM waitlist 
            ORDER BY aangemaakt DESC
        `);
        
        res.json({ 
            total: result.rows.length,
            signups: result.rows.map(row => ({
                id: row.id,
                email: row.email,
                signup_date: row.aangemaakt,
                ip_address: row.ip_address,
                user_agent: row.user_agent,
                referrer: row.referrer
            }))
        });
    } catch (error) {
        console.error('Admin waitlist error:', error);
        res.status(500).json({ error: 'Fout bij ophalen waitlist data' });
    }
});

// Debug endpoint to preview waitlist (temporary)
app.get('/api/debug/waitlist-preview', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, email, aangemaakt, ip_address 
            FROM waitlist 
            ORDER BY aangemaakt DESC
            LIMIT 10
        `);
        
        res.json({ 
            total: result.rows.length,
            preview: result.rows.map(row => ({
                id: row.id,
                email: row.email.replace(/(.{2}).*@/, '$1***@'), // Mask email for privacy
                signup_date: row.aangemaakt,
                ip_masked: row.ip_address ? row.ip_address.toString().split('.').slice(0, 2).join('.') + '.***' : null
            }))
        });
    } catch (error) {
        console.error('Debug waitlist preview error:', error);
        res.status(500).json({ error: 'Fout bij preview' });
    }
});

// Test endpoint for GoHighLevel tag functionality
app.post('/api/test/ghl-tag', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!process.env.GHL_API_KEY) {
            return res.status(500).json({ error: 'GoHighLevel API key not configured' });
        }

        const locationId = process.env.GHL_LOCATION_ID || 'FLRLwGihIMJsxbRS39Kt';
        
        
        // First, search for existing contact by email
        const searchResponse = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email.toLowerCase().trim())}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            }
        });

        let contactId = null;
        let isExisting = false;
        let result = { steps: [] };

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.contact && searchData.contact.id) {
                contactId = searchData.contact.id;
                isExisting = true;
                result.steps.push(`✅ Found existing contact: ${contactId}`);
            } else {
                result.steps.push(`⚠️ No existing contact found for ${email}`);
            }
        } else {
            const errorText = await searchResponse.text();
            result.steps.push(`❌ Search failed: ${searchResponse.status} - ${errorText}`);
        }

        if (!contactId) {
            // Create new contact
            const createResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    firstName: name ? name.split(' ')[0] : 'Test',
                    lastName: name ? (name.split(' ').slice(1).join(' ') || 'User') : 'User', 
                    name: name || 'Test User',
                    locationId: locationId,
                    tags: ['tickedify-waitlist-signup'],
                    source: 'test-signup'
                })
            });

            if (createResponse.ok) {
                const createData = await createResponse.json();
                contactId = createData.contact?.id;
                result.steps.push(`✅ New contact created: ${contactId}`);
                result.action = 'created';
            } else {
                const errorText = await createResponse.text();
                result.steps.push(`❌ Create failed: ${createResponse.status} - ${errorText}`);
            }
        } else {
            // Add tag to existing contact
            const tagResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                },
                body: JSON.stringify({
                    tags: ['tickedify-waitlist-signup']
                })
            });

            if (tagResponse.ok) {
                result.steps.push(`✅ Tag 'tickedify-waitlist-signup' added to contact: ${contactId}`);
                result.action = 'tagged';
            } else {
                const errorText = await tagResponse.text();
                result.steps.push(`❌ Tag failed: ${tagResponse.status} - ${errorText}`);
            }
        }

        result.success = true;
        result.contactId = contactId;
        result.email = email;
        
        res.json(result);

    } catch (error) {
        console.error('🧪 GHL test error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
});

app.get('/api/auth/me', async (req, res) => {
    // TEMPORARY DEBUG: Log session contents
    console.log('🔍 AUTH/ME called - Session:', {
        userId: req.session.userId,
        userEmail: req.session.userEmail,
        userNaam: req.session.userNaam,
        sessionID: req.sessionID,
        timestamp: new Date().toISOString()
    });

    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Get user information including beta status
        const userResult = await pool.query(`
            SELECT
                id, email, naam,
                account_type, subscription_status, trial_end_date,
                created_at
            FROM users
            WHERE id = $1
        `, [req.session.userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Get beta configuration
        const betaConfig = await db.getBetaConfig();
        
        // Check if user has access
        let hasAccess = true;
        let accessMessage = null;
        let requiresUpgrade = false;
        let expiryType = null;

        // If beta period is not active and user is beta type
        if (!betaConfig.beta_period_active && user.account_type === 'beta') {
            // Check if trial is expired
            const trialIsExpired = isTrialExpired(user);

            if (user.subscription_status !== 'paid' &&
                user.subscription_status !== 'active' &&
                (user.subscription_status !== 'trialing' || trialIsExpired)) {
                hasAccess = false;
                requiresUpgrade = true;
                expiryType = trialIsExpired ? 'trial' : 'beta';
                accessMessage = trialIsExpired
                    ? 'Je gratis proefperiode is afgelopen. Upgrade naar een betaald abonnement om door te gaan.'
                    : 'De beta periode is afgelopen. Upgrade naar een betaald abonnement om door te gaan.';

            }
        }

        res.json({
            authenticated: true,
            hasAccess: hasAccess,
            requiresUpgrade: requiresUpgrade,
            expiryType: expiryType,
            accessMessage: accessMessage,
            user: {
                id: req.session.userId,
                email: req.session.userEmail,
                naam: req.session.userNaam,
                account_type: user.account_type,
                subscription_status: user.subscription_status
            },
            betaConfig: {
                beta_period_active: betaConfig.beta_period_active,
                beta_ended_at: betaConfig.beta_ended_at
            }
        });
        
    } catch (error) {
        console.error('Error in /api/auth/me:', error);
        // Fallback to basic auth response on error
        res.json({
            authenticated: true,
            hasAccess: true, // Fail open for safety
            user: {
                id: req.session.userId,
                email: req.session.userEmail,
                naam: req.session.userNaam
            }
        });
    }
});

// Old admin users endpoint removed - using consolidated version later in file

app.get('/api/admin/stats', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE actief = true) as active_users,
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NULL) as active_tasks,
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NOT NULL) as completed_tasks,
                (SELECT COUNT(*) FROM projecten) as total_projects,
                (SELECT COUNT(*) FROM contexten) as total_contexts
        `);
        
        // Also check session table
        let sessionCount = 0;
        try {
            const sessionStats = await pool.query('SELECT COUNT(*) as count FROM user_sessions');
            sessionCount = parseInt(sessionStats.rows[0].count) || 0;
        } catch (sessionError) {
        }
        
        const result = stats.rows[0] || {};
        result.active_sessions = sessionCount;
        
        res.json(result);
        
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

// Debug endpoint to check user data
app.get('/api/debug/user-data/:userId', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { userId } = req.params;
        
        // Get all tasks for this user
        const tasks = await pool.query(`
            SELECT lijst, COUNT(*) as count, array_agg(tekst) as sample_tasks
            FROM taken 
            WHERE user_id = $1 AND afgewerkt IS NULL
            GROUP BY lijst
            ORDER BY lijst
        `, [userId]);
        
        // Get projects and contexts
        const projects = await pool.query('SELECT * FROM projecten WHERE user_id = $1', [userId]);
        const contexts = await pool.query('SELECT * FROM contexten WHERE user_id = $1', [userId]);
        
        res.json({
            userId,
            tasks: tasks.rows,
            projects: projects.rows,
            contexts: contexts.rows,
            totalTasks: tasks.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
        });
        
    } catch (error) {
        console.error('Debug user data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to search ALL data in database
app.get('/api/debug/database-search/:searchTerm', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { searchTerm } = req.params;
        
        // Search all tasks
        const allTasks = await pool.query(`
            SELECT id, tekst, lijst, user_id, aangemaakt, project_id, context_id, afgewerkt 
            FROM taken 
            WHERE tekst ILIKE $1 OR id ILIKE $1 OR lijst ILIKE $1
            ORDER BY aangemaakt DESC
        `, [`%${searchTerm}%`]);
        
        // Search all projects  
        const allProjects = await pool.query(`
            SELECT id, naam, user_id, aangemaakt
            FROM projecten 
            WHERE naam ILIKE $1 OR id ILIKE $1
            ORDER BY aangemaakt DESC
        `, [`%${searchTerm}%`]);
        
        // Search all contexts
        const allContexts = await pool.query(`
            SELECT id, naam, user_id, aangemaakt  
            FROM contexten
            WHERE naam ILIKE $1 OR id ILIKE $1
            ORDER BY aangemaakt DESC
        `, [`%${searchTerm}%`]);
        
        res.json({
            searchTerm,
            tasks: allTasks.rows,
            projects: allProjects.rows,
            contexts: allContexts.rows,
            total: allTasks.rows.length + allProjects.rows.length + allContexts.rows.length
        });
        
    } catch (error) {
        console.error('Database search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to show ALL data by user
app.get('/api/debug/all-users-data', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get all data grouped by user
        const tasks = await pool.query(`
            SELECT user_id, lijst, COUNT(*) as count, array_agg(tekst) as sample_tasks
            FROM taken 
            WHERE afgewerkt IS NULL
            GROUP BY user_id, lijst
            ORDER BY user_id, lijst
        `);
        
        const projects = await pool.query(`
            SELECT user_id, COUNT(*) as count, array_agg(naam) as project_names
            FROM projecten
            GROUP BY user_id
            ORDER BY user_id
        `);
        
        const contexts = await pool.query(`
            SELECT user_id, COUNT(*) as count, array_agg(naam) as context_names  
            FROM contexten
            GROUP BY user_id
            ORDER BY user_id
        `);
        
        res.json({
            tasks: tasks.rows,
            projects: projects.rows,
            contexts: contexts.rows
        });
        
    } catch (error) {
        console.error('All users data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Feedback API endpoints
app.post('/api/feedback', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const feedbackData = {
            userId,
            ...req.body
        };
        
        const result = await db.createFeedback(feedbackData);
        
        // Log feedback for monitoring
        
        res.json({ success: true, feedback: result });
    } catch (error) {
        console.error('Error creating feedback:', error);
        res.status(500).json({ error: 'Fout bij opslaan van feedback' });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        // Check if user is admin
        const { pool } = require('./database');
        const userResult = await pool.query(
            'SELECT rol FROM users WHERE id = $1',
            [userId]
        );
        
        const isAdmin = userResult.rows.length > 0 && userResult.rows[0].rol === 'admin';
        
        const feedback = await db.getFeedback(userId, isAdmin);
        res.json({ success: true, feedback, isAdmin });
    } catch (error) {
        console.error('Error getting feedback:', error);
        res.status(500).json({ error: 'Fout bij ophalen van feedback' });
    }
});

app.put('/api/feedback/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = getCurrentUserId(req);
        
        // Check if user is admin
        const { pool } = require('./database');
        const userResult = await pool.query(
            'SELECT rol FROM users WHERE id = $1',
            [userId]
        );
        
        const isAdmin = userResult.rows.length > 0 && userResult.rows[0].rol === 'admin';
        
        const result = await db.updateFeedbackStatus(id, status, userId, isAdmin);
        
        if (!result) {
            return res.status(404).json({ error: 'Feedback niet gevonden of geen toegang' });
        }
        
        res.json({ success: true, feedback: result });
    } catch (error) {
        console.error('Error updating feedback status:', error);
        res.status(500).json({ error: 'Fout bij bijwerken van feedback status' });
    }
});

// B2 Storage debug endpoint - test B2 connectivity and credentials
app.get('/api/debug/b2-status', async (req, res) => {
    try {
        const { storageManager } = require('./storage-manager');
        
        // Test B2 initialization
        await storageManager.initialize();
        
        const status = {
            b2Available: storageManager.isB2Available(),
            bucketName: process.env.B2_BUCKET_NAME || 'not-configured',
            hasKeyId: !!process.env.B2_APPLICATION_KEY_ID,
            hasAppKey: !!process.env.B2_APPLICATION_KEY,
            timestamp: new Date().toISOString()
        };
        
        res.json(status);
    } catch (error) {
        console.error('❌ B2 status check failed:', error);
        res.status(500).json({ 
            error: 'B2 status check failed', 
            message: error.message,
            b2Available: false 
        });
    }
});

// Test B2 cleanup voor specifieke taak (zonder daadwerkelijk verwijderen)
app.get('/api/debug/b2-cleanup-test/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = getCurrentUserId(req);
        
        // Haal bijlagen op voor deze taak
        const bijlagen = await db.getBijlagenForTaak(taskId);
        
        if (!bijlagen || bijlagen.length === 0) {
            return res.json({
                message: 'Geen bijlagen gevonden voor deze taak',
                taskId,
                bijlagenCount: 0
            });
        }
        
        
        // Test B2 cleanup zonder echte verwijdering (dry run)
        const testResult = {
            taskId,
            bijlagenCount: bijlagen.length,
            bijlagen: bijlagen.map(b => ({
                id: b.id,
                bestandsnaam: b.bestandsnaam,
                storage_path: b.storage_path,
                mimetype: b.mimetype
            })),
            wouldAttemptDelete: bijlagen.length,
            timestamp: new Date().toISOString()
        };
        
        res.json(testResult);
    } catch (error) {
        console.error(`❌ B2 cleanup test failed for task ${req.params.taskId}:`, error);
        res.status(500).json({ 
            error: 'B2 cleanup test failed', 
            message: error.message 
        });
    }
});

// Database cleanup endpoint - removes all task data but keeps users
app.post('/api/debug/clean-database', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Count current data before cleanup
        const tasksCount = await pool.query('SELECT COUNT(*) as count FROM taken');
        const projectsCount = await pool.query('SELECT COUNT(*) as count FROM projecten');
        const contextsCount = await pool.query('SELECT COUNT(*) as count FROM contexten');
        const planningCount = await pool.query('SELECT COUNT(*) as count FROM dagelijkse_planning');
        
        // Clean all task-related data (but keep users and sessions)
        await pool.query('DELETE FROM dagelijkse_planning');
        await pool.query('DELETE FROM taken');
        await pool.query('DELETE FROM projecten');
        await pool.query('DELETE FROM contexten');
        
        
        res.json({
            message: 'Database successfully cleaned',
            removed: {
                tasks: parseInt(tasksCount.rows[0].count),
                projects: parseInt(projectsCount.rows[0].count),
                contexts: parseInt(contextsCount.rows[0].count),
                planning: parseInt(planningCount.rows[0].count)
            },
            timestamp: new Date().toISOString(),
            note: 'Users and sessions preserved'
        });
        
    } catch (error) {
        console.error('Database cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Basic API endpoints
app.get('/api/lijsten', async (req, res) => {
    try {
        const lijsten = [
            'inbox', 'acties', 'opvolgen', 'afgewerkte-taken',
            'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 
            'uitgesteld-3maandelijks', 'uitgesteld-6maandelijks', 
            'uitgesteld-jaarlijks', 'projecten-lijst', 'contexten'
        ];
        res.json(lijsten);
    } catch (error) {
        console.error('Error in /api/lijsten:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tellingen', async (req, res) => {
    try {
        if (!db) {
            return res.json({}); // Return empty if database not available
        }

        const userId = getCurrentUserId(req);
        const tellingen = await db.getCounts(userId);
        res.json(tellingen);
    } catch (error) {
        console.error('Error getting counts:', error);
        res.json({});
    }
});

// Sidebar counters endpoint - Feature 022
app.get('/api/counts/sidebar', async (req, res) => {
    try {
        if (!db || !pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Get userId - throw error if not logged in
        let userId;
        try {
            userId = getCurrentUserId(req);
        } catch (error) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Two separate sequential queries (simplest approach)

        // Query 1: Taken counts
        const takenResult = await pool.query(`
            SELECT
                COUNT(CASE WHEN lijst = 'inbox' AND afgewerkt IS NULL THEN 1 END) as inbox,
                COUNT(CASE WHEN lijst = 'acties' AND afgewerkt IS NULL
                    AND (verschijndatum IS NULL OR verschijndatum <= CURRENT_DATE) THEN 1 END) as acties,
                COUNT(CASE WHEN lijst = 'opvolgen' AND afgewerkt IS NULL THEN 1 END) as opvolgen,
                COUNT(CASE WHEN lijst LIKE 'uitgesteld-%' AND afgewerkt IS NULL THEN 1 END) as uitgesteld
            FROM taken
            WHERE user_id = $1
        `, [userId]);

        // Query 2: Projecten count
        const projectenResult = await pool.query(`
            SELECT COUNT(*) as count FROM projecten WHERE user_id = $1
        `, [userId]);

        // Safety check for results
        if (!takenResult || !takenResult.rows || takenResult.rows.length === 0) {
            return res.json({
                inbox: 0,
                acties: 0,
                projecten: 0,
                opvolgen: 0,
                uitgesteld: 0
            });
        }

        // Convert string counts to integers
        const counts = {
            inbox: parseInt(takenResult.rows[0].inbox) || 0,
            acties: parseInt(takenResult.rows[0].acties) || 0,
            projecten: parseInt(projectenResult.rows[0]?.count) || 0,
            opvolgen: parseInt(takenResult.rows[0].opvolgen) || 0,
            uitgesteld: parseInt(takenResult.rows[0].uitgesteld) || 0
        };

        res.json(counts);
    } catch (error) {
        console.error('Error getting sidebar counts:', error);
        // For debugging: include error details in response
        res.status(500).json({
            error: 'Failed to get sidebar counts',
            debug: {
                message: error.message,
                stack: error.stack?.split('\n')[0],
                poolExists: !!pool,
                dbExists: !!db
            }
        });
    }
});

// Search endpoint definitief verwijderd in v0.5.80
app.get('/api/lijst/:naam', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { naam } = req.params;
        const userId = getCurrentUserId(req);

        let data;

        // Special handling for 'afgewerkt' and 'afgewerkte-taken' lijst - read from archive table
        if (naam === 'afgewerkt' || naam === 'afgewerkte-taken') {

            try {
                const result = await pool.query(
                    'SELECT * FROM taken_archief WHERE user_id = $1 ORDER BY afgewerkt DESC, archived_at DESC',
                    [userId]
                );
                data = result.rows;
            } catch (archiveError) {
                console.error(`❌ Error reading from taken_archief:`, archiveError);

                // Fallback to regular table if archive doesn't exist yet (pre-migration)
                data = await db.getList(naam, userId);
            }
        } else {
            // Normal list handling
            data = await db.getList(naam, userId);
        }

        // Add bijlagen counts for task lists (not for projecten-lijst or contexten)
        if (naam !== 'projecten-lijst' && naam !== 'contexten') {
            const taakIds = data.map(item => item.id).filter(id => id);
            if (taakIds.length > 0) {
                const bijlagenCounts = await db.getBijlagenCountsForTaken(taakIds);
                data.forEach(item => {
                    item.bijlagenCount = bijlagenCounts[item.id] || 0;
                });
            } else {
                // Ensure all items have bijlagenCount property
                data.forEach(item => {
                    item.bijlagenCount = 0;
                });
            }
        }

        res.json(data);
    } catch (error) {
        console.error(`Error getting list ${req.params.naam}:`, error);
        res.status(404).json({ error: 'Lijst niet gevonden' });
    }
});

// Debug endpoint to find main user (the one with most tasks)
app.get('/api/debug/find-main-user', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get task count per user
        const taskCounts = await pool.query(`
            SELECT user_id, COUNT(*) as task_count
            FROM taken 
            GROUP BY user_id
            ORDER BY task_count DESC
        `);
        
        // Get all users info
        const users = await pool.query('SELECT id, email, name, created_at FROM users ORDER BY created_at');
        
        res.json({
            taskCountsByUser: taskCounts.rows,
            allUsers: users.rows,
            mainUser: taskCounts.rows[0] // User with most tasks
        });
        
    } catch (error) {
        console.error('Find main user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to find user ID by email
app.get('/api/debug/user-by-email/:email', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { email } = req.params;
        
        // Find user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = result.rows[0];
        
        // Get some task counts for verification
        const taskCounts = await pool.query(`
            SELECT lijst, COUNT(*) as count
            FROM taken 
            WHERE user_id = $1 AND afgewerkt IS NULL
            GROUP BY lijst
            ORDER BY lijst
        `, [user.id]);
        
        res.json({
            user: user,
            taskCounts: taskCounts.rows
        });
        
    } catch (error) {
        console.error('User lookup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check user storage stats by user ID
app.get('/api/debug/user-storage/:userId', async (req, res) => {
    try {
        if (!db || !pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { userId } = req.params;

        // Get storage stats from user_storage_usage table
        const storageResult = await pool.query(`
            SELECT * FROM user_storage_usage WHERE user_id = $1
        `, [userId]);

        // Get all bijlagen for this user
        const bijlagenResult = await pool.query(`
            SELECT id, taak_id, bestandsnaam, bestandsgrootte, mimetype, aangemaakt
            FROM bijlagen
            WHERE user_id = $1
            ORDER BY aangemaakt DESC
        `, [userId]);

        // Calculate actual total from bijlagen
        const actualTotal = bijlagenResult.rows.reduce((sum, b) => sum + parseInt(b.bestandsgrootte || 0), 0);

        // Get user plan info
        const userResult = await pool.query('SELECT email, selected_plan, trial_end_date FROM users WHERE id = $1', [userId]);

        const storageStats = await db.getUserStorageStats(userId);
        const planType = await db.getUserPlanType(userId);

        res.json({
            userId: userId,
            user: userResult.rows[0] || null,
            planType: planType,
            storageUsageTable: storageResult.rows[0] || null,
            bijlagen: {
                count: bijlagenResult.rows.length,
                total_bytes_calculated: actualTotal,
                total_formatted: storageManager.formatBytes(actualTotal),
                files: bijlagenResult.rows
            },
            dbFunctionResult: storageStats,
            formatted: {
                used_formatted: storageManager.formatBytes(storageStats.used_bytes),
                limit_formatted: storageManager.formatBytes(STORAGE_CONFIG.FREE_TIER_LIMIT)
            }
        });

    } catch (error) {
        console.error('User storage lookup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// External API endpoint for adding tasks (for Keyboard Maestro, etc.)
app.post('/api/external/add-task', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // API key authentication with user mapping
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        
        // Map API keys to user IDs (multi-user support)
        const apiKeyToUser = {
            'tickedify-jan-2025': 'user_1750506689312_16hqhim0k',  // Jan's actual user ID from database
            'tickedify-jan-alt-2025': 'jan@buskens.be',            // Jan's alternative account (needs real ID)
            'tickedify-external-2025': 'default-user-001'          // Legacy fallback
        };
        
        const userId = apiKeyToUser[apiKey];
        if (!userId) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        const { tekst, project = '', context = '', lijst = 'inbox' } = req.body;
        
        if (!tekst) {
            return res.status(400).json({ error: 'Task text (tekst) is required' });
        }
        
        // Create task object with unique ID
        const today = new Date().toISOString().split('T')[0];
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task = {
            id: taskId,
            tekst: tekst,  // Database field is 'tekst', not 'beschrijving'
            project: project,
            context: context,
            verschijndatum: today,
            duur: 0,
            deadline: null,
            opmerkingen: '',
            herhalingType: null,
            herhalingWaarde: null,
            herhalingActief: false
        };
        
        // Get current list
        const currentList = await db.getList(lijst, userId);
        
        // Add new task to the list
        const updatedList = [...currentList, task];
        
        // Save updated list
        await db.saveList(lijst, updatedList, userId);
        
        res.json({ 
            success: true, 
            message: `Task added to ${lijst}`,
            task: task 
        });
        
    } catch (error) {
        console.error('External API error:', error);
        res.status(500).json({ 
            error: 'Failed to add task',
            details: error.message,
            stack: error.stack
        });
    }
});

app.post('/api/lijst/:naam', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        const userId = getCurrentUserId(req);
        
        // Temporary: Log the exact data being sent by UI to identify the issue
        if (naam === 'acties' && req.body.some(item => item.herhalingType)) {
        }
        
        const success = await db.saveList(naam, req.body, userId);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Fout bij opslaan' });
        }
    } catch (error) {
        console.error(`Error saving list ${req.params.naam}:`, error);
        res.status(500).json({ error: 'Fout bij opslaan' });
    }
});

// SAFE: Add single task to inbox (for Quick Add)
app.post('/api/taak/add-to-inbox', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = getCurrentUserId(req);
        const { tekst } = req.body;
        
        
        if (!tekst) {
            return res.status(400).json({ error: 'Tekst is required' });
        }
        
        // Get current inbox first
        const currentInbox = await db.getList('inbox', userId);
        
        // Create new task
        const newTask = {
            id: generateId(),
            tekst: tekst,
            aangemaakt: new Date().toISOString()
        };
        
        // Add to current inbox
        const updatedInbox = [...currentInbox, newTask];
        
        // Save updated inbox
        const success = await db.saveList('inbox', updatedInbox, userId);
        
        if (success) {
            res.json({ success: true, taskId: newTask.id });
        } else {
            console.error('❌ SERVER: Failed to save updated inbox');
            res.status(500).json({ error: 'Fout bij opslaan' });
        }
    } catch (error) {
        console.error('Error adding task to inbox:', error);
        res.status(500).json({ error: 'Fout bij opslaan', details: error.message });
    }
});

app.put('/api/taak/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { id } = req.params;
        const userId = getCurrentUserId(req);
        const { completedViaCheckbox, ...updateData } = req.body;


        // Check if this is a completion via checkbox
        if (completedViaCheckbox && updateData.lijst === 'afgewerkt') {

            // First, get the current task to check its status and recurring settings
            const currentTask = await db.getTask(id, userId);
            if (!currentTask) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    code: 'TASK_NOT_FOUND'
                });
            }

            // Check if task is already completed
            if (currentTask.lijst === 'afgewerkt') {
                return res.status(400).json({
                    success: false,
                    error: 'Task is already completed',
                    code: 'INVALID_TASK_STATE',
                    currentState: currentTask.lijst
                });
            }

            // Validate required completion fields
            if (!updateData.afgewerkt) {
                return res.status(400).json({
                    success: false,
                    error: 'Completion timestamp (afgewerkt) is required',
                    code: 'VALIDATION_ERROR'
                });
            }

            // Archive task workflow
            let archivedTaskId = null;
            let newRecurringTaskId = null;
            let archiveWarning = null;

            try {
                // BEGIN TRANSACTION for atomic archiving
                await pool.query('BEGIN');

                // 1. Archive task to taken_archief
                await pool.query(`
                    INSERT INTO taken_archief (
                        id, tekst, aangemaakt, lijst, project_id, verschijndatum,
                        context_id, duur, type, afgewerkt,
                        herhaling_type, herhaling_waarde, herhaling_actief,
                        opmerkingen, user_id, top_prioriteit, prioriteit_datum, prioriteit,
                        archived_at
                    )
                    SELECT
                        id, tekst, aangemaakt, lijst, project_id, verschijndatum,
                        context_id, duur, type, CURRENT_TIMESTAMP,
                        herhaling_type, herhaling_waarde, FALSE,
                        opmerkingen, user_id, top_prioriteit, prioriteit_datum, prioriteit,
                        CURRENT_TIMESTAMP
                    FROM taken WHERE id = $1 AND user_id = $2
                `, [id, userId]);

                // 2. Archive subtaken to subtaken_archief
                const subtakenResult = await pool.query(`
                    INSERT INTO subtaken_archief (
                        id, parent_taak_id, titel, voltooid, volgorde, archived_at
                    )
                    SELECT
                        id, parent_taak_id, titel, voltooid, volgorde, CURRENT_TIMESTAMP
                    FROM subtaken
                    WHERE parent_taak_id = $1
                    RETURNING id
                `, [id]);

                // 3. Handle recurring tasks - create new instance BEFORE deleting
                if (currentTask.herhaling_actief && currentTask.herhaling_type) {

                    try {
                        const recurringResult = await db.createRecurringTask(currentTask);
                        if (recurringResult && recurringResult.success) {
                            newRecurringTaskId = recurringResult.newTask.id;
                        } else {
                        }
                    } catch (recurringError) {
                        console.error(`❌ Error creating recurring task for ${id}:`, recurringError);
                        // Continue with archiving even if recurring fails
                    }
                }

                // 4. Delete from active tables
                await pool.query('DELETE FROM subtaken WHERE parent_taak_id = $1', [id]);
                await pool.query('DELETE FROM taken WHERE id = $1 AND user_id = $2', [id, userId]);

                // COMMIT TRANSACTION
                await pool.query('COMMIT');
                archivedTaskId = id;

                // T021: Increment total_tasks_completed counter (Feature 058 - Account Settings Block)
                await pool.query(
                    'UPDATE users SET total_tasks_completed = total_tasks_completed + 1 WHERE id = $1',
                    [userId]
                );

            } catch (archiveError) {
                // ROLLBACK on any error
                await pool.query('ROLLBACK');
                console.error(`❌ Archive transaction failed for task ${id}, rolling back:`, archiveError);

                // Fallback: Update task to completed status (old behavior)
                archiveWarning = 'Archivering failed - taak gemarkeerd als afgewerkt (wordt later gearchiveerd)';
                const success = await db.updateTask(id, updateData, userId);

                if (!success) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to update task status',
                        code: 'UPDATE_FAILED'
                    });
                }

            }

            // Get updated task for response (only if fallback was used)
            let updatedTask = null;
            if (archiveWarning) {
                updatedTask = await db.getTask(id, userId);
            }

            // Return success response with archive info
            const response = {
                success: true,
                message: archivedTaskId ? 'Taak afgewerkt en gearchiveerd' : 'Taak afgewerkt',
                archived_taak_id: archivedTaskId,
                ...(newRecurringTaskId && { new_recurring_taak_id: newRecurringTaskId }),
                ...(archiveWarning && { warning: archiveWarning }),
                ...(updatedTask && {
                    task: {
                        id: updatedTask.id,
                        tekst: updatedTask.tekst,
                        lijst: updatedTask.lijst,
                        afgewerkt: updatedTask.afgewerkt,
                        herhaling_actief: updatedTask.herhaling_actief
                    }
                })
            };

            return res.json(response);
        } else {
            // Normal task update (existing functionality)
            const success = await db.updateTask(id, req.body, userId);

            if (success) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Taak niet gevonden' });
            }
        }
    } catch (error) {
        console.error(`Error updating task ${id}:`, error);
        res.status(500).json({ error: 'Fout bij updaten', details: error.message });
    }
});

// Unarchive endpoint - restore task from archive back to inbox
app.post('/api/taak/:id/unarchive', async (req, res) => {
    const { id } = req.params;

    try {
        const userId = getCurrentUserId(req);
        // Check if archive tables exist first
        const archiveTablesExist = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'taken_archief'
            )
        `);

        if (!archiveTablesExist.rows[0].exists) {

            // Fallback: Try to update task in regular table
            const success = await db.updateTask(id, { lijst: 'inbox', status: null, afgewerkt: null }, userId);

            if (success) {
                return res.json({
                    success: true,
                    message: 'Taak teruggezet naar inbox',
                    fallback: true
                });
            } else {
                return res.status(404).json({ error: 'Taak niet gevonden' });
            }
        }

        // BEGIN TRANSACTION for atomic unarchive
        await pool.query('BEGIN');

        // 1. Get archived task data
        const archivedTask = await pool.query(
            'SELECT * FROM taken_archief WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (archivedTask.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Taak niet gevonden in archief' });
        }

        const taskData = archivedTask.rows[0];

        // 2. Restore task to taken table with inbox list (use EXACT column names from taken table)
        await pool.query(`
            INSERT INTO taken (
                id, tekst, aangemaakt, lijst, project_id, verschijndatum,
                context_id, duur, type, afgewerkt,
                herhaling_type, herhaling_waarde, herhaling_actief,
                opmerkingen, user_id, top_prioriteit, prioriteit_datum, prioriteit
            ) VALUES (
                $1, $2, $3, 'inbox', $4, $5,
                $6, $7, $8, NULL,
                $9, $10, $11,
                $12, $13, $14, $15, $16
            )
        `, [
            taskData.id,
            taskData.tekst,
            taskData.aangemaakt,
            taskData.project_id,
            taskData.verschijndatum,
            taskData.context_id,
            taskData.duur,
            taskData.type,
            taskData.herhaling_type,
            taskData.herhaling_waarde,
            taskData.herhaling_actief,
            taskData.opmerkingen,
            taskData.user_id,
            taskData.top_prioriteit,
            taskData.prioriteit_datum,
            taskData.prioriteit
        ]);


        // 3. Restore subtaken if any exist in archive
        const archivedSubtaken = await pool.query(
            'SELECT * FROM subtaken_archief WHERE parent_taak_id = $1',
            [id]
        );

        if (archivedSubtaken.rows.length > 0) {

            for (const subtaak of archivedSubtaken.rows) {
                await pool.query(`
                    INSERT INTO subtaken (
                        parent_taak_id, titel, voltooid, volgorde, created_at
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [
                    subtaak.parent_taak_id,
                    subtaak.titel,
                    subtaak.voltooid,
                    subtaak.volgorde,
                    subtaak.created_at || new Date()
                ]);
            }
        }

        // 4. Delete from archive tables
        await pool.query('DELETE FROM subtaken_archief WHERE parent_taak_id = $1', [id]);
        await pool.query('DELETE FROM taken_archief WHERE id = $1 AND user_id = $2', [id, userId]);


        // COMMIT TRANSACTION
        await pool.query('COMMIT');

        res.json({
            success: true,
            message: 'Taak teruggezet naar inbox',
            restored_task_id: id,
            restored_subtaken_count: archivedSubtaken.rows.length
        });

    } catch (error) {
        // ROLLBACK on any error
        try {
            await pool.query('ROLLBACK');
        } catch (rollbackError) {
            // Ignore rollback errors (transaction might not have started)
        }

        console.error(`❌ Unarchive error for task ${id}:`, error);

        // Check if it's an authentication error
        if (error.message && error.message.includes('Niet ingelogd')) {
            return res.status(401).json({ error: 'Niet ingelogd' });
        }

        res.status(500).json({
            error: 'Fout bij terugzetten van taak',
            details: error.message
        });
    }
});

// Delete individual task
app.delete('/api/taak/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        
        // Eerst bijlagen ophalen voor B2 cleanup (voor CASCADE ze verwijdert)
        const bijlagen = await db.getBijlagenForTaak(id);
        if (bijlagen && bijlagen.length > 0) {
        }
        
        const result = await pool.query(
            'DELETE FROM taken WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        
        if (result.rows.length > 0) {
            
            let cleanupResult = { success: true, deleted: 0, failed: 0 };
            
            // Synchrone B2 cleanup met timeout
            if (bijlagen && bijlagen.length > 0) {
                try {
                    // Timeout van 8 seconden voor B2 cleanup
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('B2 cleanup timeout after 8 seconds')), 8000);
                    });
                    
                    cleanupResult = await Promise.race([
                        cleanupB2Files(bijlagen, id),
                        timeoutPromise
                    ]);
                    
                } catch (error) {
                    console.error(`⚠️ B2 cleanup failed for task ${id}:`, error.message);
                    cleanupResult = {
                        success: false,
                        deleted: 0,
                        failed: bijlagen.length,
                        error: error.message,
                        timeout: error.message.includes('timeout')
                    };
                }
            }
            
            // Response met B2 cleanup status
            res.json({ 
                success: true, 
                deleted: id,
                b2Cleanup: cleanupResult
            });
        } else {
            res.status(404).json({ error: 'Taak niet gevonden' });
        }
    } catch (error) {
        console.error(`Error deleting task ${id}:`, error);
        res.status(500).json({ error: 'Fout bij verwijderen', details: error.message });
    }
});

// T004: Soft Delete Endpoint (Feature 055)
app.put('/api/taak/:id/soft-delete', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { id } = req.params;
        const userId = getCurrentUserId(req);

        const result = await pool.query(`
            UPDATE taken
            SET verwijderd_op = NOW(),
                definitief_verwijderen_op = NOW() + INTERVAL '30 days',
                herhaling_actief = false
            WHERE id = $1
              AND user_id = $2
              AND verwijderd_op IS NULL
            RETURNING id, verwijderd_op, definitief_verwijderen_op, herhaling_type
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Taak niet gevonden' });
        }

        const taak = result.rows[0];

        res.json({
            success: true,
            id: taak.id,
            verwijderd_op: taak.verwijderd_op,
            definitief_verwijderen_op: taak.definitief_verwijderen_op,
            herhaling_gestopt: taak.herhaling_type !== null
        });
    } catch (error) {
        console.error(`Error soft deleting task ${id}:`, error);
        res.status(500).json({ error: 'Database fout bij soft delete', details: error.message });
    }
});

// T005: Restore Endpoint (Feature 055)
app.post('/api/taak/:id/restore', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { id } = req.params;
        const userId = getCurrentUserId(req);

        const result = await pool.query(`
            UPDATE taken
            SET verwijderd_op = NULL,
                definitief_verwijderen_op = NULL
            WHERE id = $1
              AND user_id = $2
              AND verwijderd_op IS NOT NULL
            RETURNING *
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Verwijderde taak niet gevonden' });
        }

        res.json({
            success: true,
            id: result.rows[0].id,
            taak: result.rows[0]
        });
    } catch (error) {
        console.error(`Error restoring task ${id}:`, error);
        res.status(500).json({ error: 'Database fout bij restore', details: error.message });
    }
});

// T006: Prullenbak Endpoint (Feature 055)
app.get('/api/prullenbak', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = getCurrentUserId(req);

        const result = await pool.query(`
            SELECT
                *,
                EXTRACT(DAY FROM (definitief_verwijderen_op - NOW())) as dagen_tot_verwijdering
            FROM taken
            WHERE user_id = $1
              AND verwijderd_op IS NOT NULL
            ORDER BY verwijderd_op ASC
        `, [userId]);

        res.json({
            taken: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error(`Error getting prullenbak:`, error);
        res.status(500).json({ error: 'Database fout bij ophalen prullenbak', details: error.message });
    }
});

// T007: Bulk Soft Delete Endpoint (Feature 055)
app.post('/api/bulk/soft-delete', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { ids } = req.body;
        const userId = getCurrentUserId(req);

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array vereist' });
        }

        if (ids.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 taken per bulk operatie' });
        }


        const result = await pool.query(`
            UPDATE taken
            SET verwijderd_op = NOW(),
                definitief_verwijderen_op = NOW() + INTERVAL '30 days',
                herhaling_actief = false
            WHERE id = ANY($1::text[])
              AND user_id = $2
              AND verwijderd_op IS NULL
            RETURNING id
        `, [ids, userId]);

        const deletedIds = result.rows.map(r => r.id);
        const failedIds = ids.filter(id => !deletedIds.includes(id));

        res.json({
            success: true,
            deleted_count: deletedIds.length,
            failed: failedIds.map(id => ({ id, reason: 'Taak niet gevonden of al verwijderd' }))
        });
    } catch (error) {
        console.error(`Error bulk soft deleting:`, error);
        res.status(500).json({ error: 'Database fout bij bulk soft delete', details: error.message });
    }
});

// T008: Bulk Restore Endpoint (Feature 055)
app.post('/api/bulk/restore', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { ids } = req.body;
        const userId = getCurrentUserId(req);

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array vereist' });
        }

        if (ids.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 taken per bulk operatie' });
        }


        const result = await pool.query(`
            UPDATE taken
            SET verwijderd_op = NULL,
                definitief_verwijderen_op = NULL
            WHERE id = ANY($1::text[])
              AND user_id = $2
              AND verwijderd_op IS NOT NULL
            RETURNING id
        `, [ids, userId]);

        const restoredIds = result.rows.map(r => r.id);
        const failedIds = ids.filter(id => !restoredIds.includes(id));

        res.json({
            success: true,
            restored_count: restoredIds.length,
            failed: failedIds.map(id => ({ id, reason: 'Taak niet gevonden' }))
        });
    } catch (error) {
        console.error(`Error bulk restoring:`, error);
        res.status(500).json({ error: 'Database fout bij bulk restore', details: error.message });
    }
});

// T009: Admin Cleanup Stats Endpoint (Feature 055)
app.get('/api/admin/cleanup-stats', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = getCurrentUserId(req);

        // Check admin role
        const userResult = await pool.query('SELECT rol FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || userResult.rows[0].rol !== 'admin') {
            return res.status(403).json({ error: 'Admin rechten vereist' });
        }


        // Total soft deleted
        const totalResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM taken
            WHERE verwijderd_op IS NOT NULL
        `);

        // Ready for cleanup (>30 dagen)
        const cleanupResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM taken
            WHERE verwijderd_op IS NOT NULL
              AND verwijderd_op < NOW() - INTERVAL '30 days'
        `);

        // Per user stats
        const perUserResult = await pool.query(`
            SELECT
                u.id as user_id,
                u.email,
                COUNT(t.id) as soft_deleted_count,
                u.laatste_cleanup_op
            FROM users u
            LEFT JOIN taken t ON t.user_id = u.id AND t.verwijderd_op IS NOT NULL
            GROUP BY u.id, u.email, u.laatste_cleanup_op
            ORDER BY soft_deleted_count DESC
        `);

        res.json({
            total_soft_deleted: parseInt(totalResult.rows[0].count),
            ready_for_cleanup: parseInt(cleanupResult.rows[0].count),
            per_user: perUserResult.rows
        });
    } catch (error) {
        console.error(`Error getting cleanup stats:`, error);
        res.status(500).json({ error: 'Database fout bij ophalen statistieken', details: error.message });
    }
});

// Subtaken API endpoints
// Get all subtaken for a parent task
app.get('/api/subtaken/:parentId', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { parentId } = req.params;

        // Try active table first
        let subtaken = await db.getSubtaken(parentId);

        // If empty, check archive table (for archived parent tasks)
        if (!subtaken || subtaken.length === 0) {

            try {
                const result = await pool.query(
                    'SELECT * FROM subtaken_archief WHERE parent_taak_id = $1 ORDER BY volgorde',
                    [parentId]
                );

                if (result.rows.length > 0) {
                    subtaken = result.rows;
                }
            } catch (archiveError) {
                console.error(`❌ Error reading from subtaken_archief:`, archiveError);
                // Continue with empty subtaken array from active table
            }
        }

        res.json(subtaken || []);
    } catch (error) {
        console.error(`Error getting subtaken for parent ${parentId}:`, error);
        res.status(500).json({ error: 'Fout bij ophalen subtaken', details: error.message });
    }
});

// Create new subtaak
app.post('/api/subtaken', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { parentTaakId, titel, volgorde } = req.body;
        
        if (!parentTaakId || !titel) {
            return res.status(400).json({ error: 'Parent taak ID en titel zijn verplicht' });
        }
        
        const subtaak = await db.createSubtaak(parentTaakId, titel, volgorde);
        res.json(subtaak);
    } catch (error) {
        console.error('Error creating subtaak:', error);
        res.status(500).json({ error: 'Fout bij aanmaken subtaak', details: error.message });
    }
});

// Update subtaak
app.put('/api/subtaken/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        
        const subtaak = await db.updateSubtaak(id, req.body);
        
        if (subtaak) {
            res.json(subtaak);
        } else {
            res.status(404).json({ error: 'Subtaak niet gevonden' });
        }
    } catch (error) {
        console.error(`Error updating subtaak ${id}:`, error);
        res.status(500).json({ error: 'Fout bij updaten subtaak', details: error.message });
    }
});

// Delete subtaak
app.delete('/api/subtaken/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        
        const success = await db.deleteSubtaak(id);
        
        if (success) {
            res.json({ success: true, deleted: id });
        } else {
            res.status(404).json({ error: 'Subtaak niet gevonden' });
        }
    } catch (error) {
        console.error(`Error deleting subtaak ${id}:`, error);
        res.status(500).json({ error: 'Fout bij verwijderen subtaak', details: error.message });
    }
});

// Reorder subtaken for a parent task
app.post('/api/subtaken/:parentId/reorder', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { parentId } = req.params;
        const { subtaakIds } = req.body;
        
        
        if (!Array.isArray(subtaakIds)) {
            return res.status(400).json({ error: 'subtaakIds moet een array zijn' });
        }
        
        const success = await db.reorderSubtaken(parentId, subtaakIds);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Fout bij herordenen subtaken' });
        }
    } catch (error) {
        console.error(`Error reordering subtaken for parent ${parentId}:`, error);
        res.status(500).json({ error: 'Fout bij herordenen subtaken', details: error.message });
    }
});

// Debug endpoint to search for any task by ID
app.get('/api/debug/find-task/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        // T017: Filter soft deleted tasks
        const result = await pool.query('SELECT * FROM taken WHERE id = $1 AND verwijderd_op IS NULL', [id]);
        
        if (result.rows.length > 0) {
            res.json({ found: true, task: result.rows[0] });
        } else {
            res.json({ found: false, id: id });
        }
    } catch (error) {
        console.error('Error searching for task:', error);
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY DEBUG: Check registration flow issue
app.get('/api/debug/check-user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const result = await pool.query(
            'SELECT id, email, naam, subscription_status, trial_end_date, created_at, login_token FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length > 0) {
            res.json({ found: true, user: result.rows[0] });
        } else {
            res.json({ found: false, email });
        }
    } catch (error) {
        console.error('Debug check-user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY DEBUG: Check beta config status
app.get('/api/debug/beta-config', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM beta_config WHERE id = 1');
        if (result.rows.length > 0) {
            res.json({ found: true, config: result.rows[0] });
        } else {
            res.json({ found: false });
        }
    } catch (error) {
        console.error('Debug beta-config error:', error);
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY DEBUG: Check webhook logs
app.get('/api/debug/webhook-logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const result = await pool.query(
            'SELECT * FROM payment_webhook_logs ORDER BY processed_at DESC LIMIT $1',
            [limit]
        );

        res.json({
            found: result.rows.length > 0,
            count: result.rows.length,
            logs: result.rows
        });
    } catch (error) {
        console.error('Debug webhook-logs error:', error);
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY DEBUG: Add missing payment columns to users table
app.post('/api/debug/add-payment-columns', async (req, res) => {
    try {
        // Add missing columns for payment tracking
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS plugandpay_order_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER,
            ADD COLUMN IF NOT EXISTS plugandpay_subscription_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP
        `);

        // Create indexes for performance
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_plugandpay_order_id ON users(plugandpay_order_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_plugandpay_subscription_id ON users(plugandpay_subscription_id)');

        res.json({ success: true, message: 'Payment columns added successfully to users table' });
    } catch (error) {
        console.error('Debug add-payment-columns error:', error);
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY DEBUG: Create webhook logs table
app.post('/api/debug/create-webhook-table', async (req, res) => {
    try {
        // Create table (without foreign key constraint for now)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_webhook_logs (
              id SERIAL PRIMARY KEY,
              user_id INTEGER,
              event_type VARCHAR(100),
              order_id VARCHAR(255),
              email VARCHAR(255),
              amount_cents INTEGER,
              payload JSONB,
              signature_valid BOOLEAN,
              processed_at TIMESTAMP DEFAULT NOW(),
              error_message TEXT,
              ip_address VARCHAR(45)
            )
        `);

        // Create indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON payment_webhook_logs(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON payment_webhook_logs(order_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON payment_webhook_logs(processed_at)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON payment_webhook_logs(event_type)');

        res.json({ success: true, message: 'payment_webhook_logs table created successfully' });
    } catch (error) {
        console.error('Debug create-webhook-table error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test Dashboard Endpoints
const testModule = require('./test-runner');

// Version endpoint voor deployment tracking
app.get('/api/version', (req, res) => {
    // Clear require cache for package.json to get fresh version
    delete require.cache[require.resolve('./package.json')];
    const packageJson = require('./package.json');


    res.json({
        version: packageJson.version,
        commit_hash: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
        deployed_at: new Date().toISOString(),
        code_marker: '0.17.23-FINAL',
        features: ['toast-notifications', 'recurring-tasks', 'test-dashboard', 'smart-date-filtering'],
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve test dashboard (multiple routes for accessibility)
app.get('/admin/tests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

app.get('/test-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

app.get('/tests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

// Run full regression test suite
app.get('/api/test/run-regression', async (req, res) => {
    try {
        const results = await testModule.runFullRegressionTests();
        
        
        res.json(results);
    } catch (error) {
        console.error('❌ Fatal error in regression tests:', error);
        res.status(500).json({
            error: 'Fatal error in regression tests',
            details: error.message,
            total_tests: 0,
            passed: 0,
            failed: 1,
            duration_ms: 0,
            cleanup_successful: false
        });
    }
});

// Run specific test categories
app.get('/api/test/run-database', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runDatabaseIntegrityTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Database tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-api', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runApiEndpointTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ API tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-recurring', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runRecurringTaskTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Recurring tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-business', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runBusinessLogicTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Business logic tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-taskCompletionAPI', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runTaskCompletionAPITests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();

        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;

        res.json(summary);
    } catch (error) {
        console.error('❌ Task completion API tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-recurringTaskAPI', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runRecurringTaskAPITests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();

        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;

        res.json(summary);
    } catch (error) {
        console.error('❌ Recurring task API tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-errorHandlingAPI', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runErrorHandlingAPITests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();

        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;

        res.json(summary);
    } catch (error) {
        console.error('❌ Error handling API tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-uiIntegration', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runUIIntegrationTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();

        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;

        res.json(summary);
    } catch (error) {
        console.error('❌ UI integration tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Performance Tests API endpoint
app.get('/api/test/run-performance', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runPerformanceTests(testRunner);

        const summary = {
            passed: testRunner.testResults.filter(r => r.passed).length,
            failed: testRunner.testResults.filter(r => !r.passed).length,
            total: testRunner.testResults.length,
            results: testRunner.testResults,
            cleanup_successful: true,
            test_data_created: Object.values(testRunner.createdRecords).flat().length
        };

        await testRunner.cleanup();

        res.json(summary);
    } catch (error) {
        console.error('❌ Performance tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint for new customer email notification
app.get('/api/test/new-customer-email', async (req, res) => {
    try {
        const testCustomerEmail = 'test.customer@example.com';
        const testCustomerName = 'Test Klant';
        const testPlanName = 'Maandelijks €7';

        await sendNewCustomerNotification(testCustomerEmail, testCustomerName, testPlanName);

        res.json({
            success: true,
            message: 'Test email sent successfully',
            details: {
                to: 'support@tickedify.com',
                customer_email: testCustomerEmail,
                customer_name: testCustomerName,
                plan_name: testPlanName
            }
        });
    } catch (error) {
        console.error('❌ Test email failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Clean project names from planning items
app.post('/api/dagelijkse-planning/clean-project-names', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = getCurrentUserId(req);
        const cleanedCount = await db.cleanPlanningProjectNames(userId);
        
        res.json({ 
            success: true, 
            message: `Successfully cleaned ${cleanedCount} planning items`,
            cleanedCount: cleanedCount
        });
    } catch (error) {
        console.error('Error cleaning planning project names:', error);
        res.status(500).json({ error: 'Fout bij opschonen planning project namen' });
    }
});

// Dagelijkse Planning API endpoints
app.get('/api/dagelijkse-planning/:datum', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { datum } = req.params;
        const userId = getCurrentUserId(req);
        
        // Log API request
        await forensicLogger.log('PLANNING', 'API_GET_PLANNING_REQUEST', {
            datum: datum,
            userId: userId,
            endpoint: '/api/dagelijkse-planning/:datum',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        const planning = await db.getDagelijksePlanning(datum, userId);
        
        // Log successful response
        await forensicLogger.log('PLANNING', 'API_GET_PLANNING_SUCCESS', {
            datum: datum,
            userId: userId,
            planningItemsReturned: planning.length,
            endpoint: '/api/dagelijkse-planning/:datum',
            responseTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        res.json(planning);
    } catch (error) {
        console.error('Error getting dagelijkse planning:', error);
        
        // Log API error
        await forensicLogger.log('PLANNING', 'API_GET_PLANNING_ERROR', {
            datum: req.params.datum,
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/dagelijkse-planning/:datum',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'api_error'
        });
        
        res.status(500).json({ error: 'Fout bij ophalen dagelijkse planning' });
    }
});

app.post('/api/dagelijkse-planning', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = getCurrentUserId(req);
        
        // Log API request
        await forensicLogger.log('PLANNING', 'API_ADD_PLANNING_REQUEST', {
            planningData: req.body,
            userId: userId,
            endpoint: '/api/dagelijkse-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        const planningId = await db.addToDagelijksePlanning(req.body, userId);
        
        // Log successful response
        await forensicLogger.log('PLANNING', 'API_ADD_PLANNING_SUCCESS', {
            planningId: planningId,
            planningData: req.body,
            userId: userId,
            endpoint: '/api/dagelijkse-planning',
            responseTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        res.json({ success: true, id: planningId });
    } catch (error) {
        console.error('Error adding to dagelijkse planning:', error);
        
        // Log API error
        await forensicLogger.log('PLANNING', 'API_ADD_PLANNING_ERROR', {
            planningData: req.body,
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/dagelijkse-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'api_error'
        });
        
        res.status(500).json({ error: 'Fout bij toevoegen aan dagelijkse planning' });
    }
});

app.put('/api/dagelijkse-planning/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        const success = await db.updateDagelijksePlanning(id, req.body, userId);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error updating dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij updaten dagelijkse planning' });
    }
});

app.put('/api/dagelijkse-planning/:id/reorder', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const { targetUur, targetPosition } = req.body;
        const userId = getCurrentUserId(req);
        const success = await db.reorderDagelijksePlanning(id, targetUur, targetPosition, userId);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error reordering dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij herordenen dagelijkse planning' });
    }
});

app.delete('/api/dagelijkse-planning/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        
        // Log API request - CRITICAL for debugging planning disappearance
        await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_REQUEST', {
            planningId: id,
            userId: userId,
            endpoint: '/api/dagelijkse-planning/:id',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call',
            severity: 'CRITICAL' // Mark as critical for forensic analysis
        });
        
        const success = await db.deleteDagelijksePlanning(id, userId);
        
        if (success) {
            // Log successful deletion
            await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_SUCCESS', {
                planningId: id,
                userId: userId,
                endpoint: '/api/dagelijkse-planning/:id',
                responseTimestamp: new Date().toISOString(),
                triggeredBy: 'api_call',
                severity: 'CRITICAL'
            });
            
            res.json({ success: true });
        } else {
            // Log planning item not found
            await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_NOT_FOUND', {
                planningId: id,
                userId: userId,
                endpoint: '/api/dagelijkse-planning/:id',
                responseTimestamp: new Date().toISOString(),
                triggeredBy: 'api_call',
                severity: 'WARNING'
            });
            
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error deleting dagelijkse planning:', error);
        
        // Log API error - CRITICAL for debugging
        await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_ERROR', {
            planningId: req.params.id,
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/dagelijkse-planning/:id',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'api_error',
            severity: 'CRITICAL'
        });
        
        res.status(500).json({ error: 'Fout bij verwijderen dagelijkse planning' });
    }
});

app.get('/api/ingeplande-acties/:datum', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { datum } = req.params;
        const ingeplandeActies = await db.getIngeplandeActies(datum);
        res.json(ingeplandeActies);
    } catch (error) {
        console.error('Error getting ingeplande acties:', error);
        res.status(500).json({ error: 'Fout bij ophalen ingeplande acties' });
    }
});

// Emergency cleanup endpoint
app.post('/api/test/emergency-cleanup', async (req, res) => {
    try {
        
        // Delete all test records (by ID pattern and by test names)
        const deletedTasks = await pool.query("DELETE FROM taken WHERE id LIKE 'test_%' OR tekst IN ('Completion test', 'Test taak', 'Database CRUD Test', 'Updated Test Task', 'Rollback Test', 'FK Test Task', 'Dagelijkse test taak', 'Completion workflow test', 'List management test', 'Project context test', 'Email versturen naar klanten', 'Vergadering voorbereiden', 'Factuur email versturen', 'Taak voor vandaag', 'Taak voor morgen') RETURNING id");
        const deletedProjects = await pool.query("DELETE FROM projecten WHERE id LIKE 'test_project_%' OR naam IN ('Test Project', 'FK Test Project') RETURNING id");
        const deletedContexts = await pool.query("DELETE FROM contexten WHERE id LIKE 'test_context_%' OR naam IN ('Test Context', 'FK Test Context') RETURNING id");
        
        const totalDeleted = deletedTasks.rows.length + deletedProjects.rows.length + deletedContexts.rows.length;
        
        res.json({ 
            success: true, 
            message: `Emergency cleanup completed successfully - ${totalDeleted} records deleted`,
            deleted: {
                tasks: deletedTasks.rows.length,
                projects: deletedProjects.rows.length, 
                contexts: deletedContexts.rows.length,
                total: totalDeleted
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Emergency cleanup failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint to add missing recurring columns (GET for easy access)
app.get('/api/admin/add-recurring-columns', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        
        // Add columns one by one to avoid conflicts
        const columns = [
            { name: 'herhaling_type', type: 'VARCHAR(30)' },
            { name: 'herhaling_waarde', type: 'INTEGER' },
            { name: 'herhaling_actief', type: 'BOOLEAN DEFAULT FALSE' }
        ];
        
        const results = [];
        
        for (const col of columns) {
            try {
                await pool.query(`ALTER TABLE taken ADD COLUMN ${col.name} ${col.type}`);
                results.push({ column: col.name, status: 'added' });
            } catch (colError) {
                if (colError.message.includes('already exists')) {
                    results.push({ column: col.name, status: 'already_exists' });
                } else {
                    results.push({ column: col.name, status: 'error', error: colError.message });
                }
            }
        }
        
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('❌ Failed to add recurring columns:', error);
        res.status(500).json({ error: 'Failed to add columns', details: error.message });
    }
});

// Debug endpoint to list all tasks in a specific list
app.get('/api/debug/lijst/:naam', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        // T017: Filter soft deleted tasks
        const result = await pool.query('SELECT * FROM taken WHERE lijst = $1 AND afgewerkt IS NULL AND verwijderd_op IS NULL ORDER BY aangemaakt DESC', [naam]);
        
        res.json({
            lijst: naam,
            count: result.rows.length,
            tasks: result.rows
        });
    } catch (error) {
        console.error(`Error getting debug list ${req.params.naam}:`, error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Debug endpoint to check task details
app.get('/api/taak/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        
        // Use same pool as database module to avoid connection issues
        // T015: Filter soft deleted tasks from individual task lookup
        const { pool: dbPool } = require('./database');
        const result = await dbPool.query('SELECT * FROM taken WHERE id = $1 AND verwijderd_op IS NULL', [id]);
        
        if (result.rows.length > 0) {
            const task = result.rows[0];
            
            // Convert database column names to frontend property names
            if (task.project_id !== undefined) {
                task.projectId = task.project_id;
                delete task.project_id;
            }
            if (task.context_id !== undefined) {
                task.contextId = task.context_id;
                delete task.context_id;
            }
            if (task.herhaling_type !== undefined) {
                task.herhalingType = task.herhaling_type;
                delete task.herhaling_type;
            }
            if (task.herhaling_waarde !== undefined) {
                task.herhalingWaarde = task.herhaling_waarde;
                delete task.herhaling_waarde;
            }
            if (task.herhaling_actief !== undefined) {
                task.herhalingActief = task.herhaling_actief;
                delete task.herhaling_actief;
            }
            
            res.json(task);
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error(`🐛 DEBUG: Error getting task ${req.params.id}:`, error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/taak/recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { originalTask, nextDate } = req.body;
        const userId = getCurrentUserId(req);
        
        const taskId = await db.createRecurringTask(originalTask, nextDate, userId);
        if (taskId) {
            // Debug: immediately check what's in acties list after creation
            setTimeout(async () => {
                try {
                    const actiesTasks = await db.getList('acties', userId);
                    const newTask = actiesTasks.find(t => t.id === taskId);
                    if (newTask) {
                    } else {
                    }
                } catch (error) {
                }
            }, 1000);
            
            res.json({ success: true, taskId });
        } else {
            console.error('❌ createRecurringTask returned null or false');
            res.status(500).json({ error: 'Fout bij aanmaken herhalende taak - createRecurringTask failed' });
        }
    } catch (error) {
        console.error('Error creating recurring task:', error);
        res.status(500).json({ error: 'Fout bij aanmaken herhalende taak' });
    }
});

// Priority management endpoints
app.put('/api/taak/:id/prioriteit', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const { prioriteit, datum } = req.body; // prioriteit: 1-3 of null, datum: YYYY-MM-DD
        const userId = getCurrentUserId(req);
        
        
        const { pool } = require('./database');
        
        if (prioriteit === null || prioriteit === undefined) {
            // Remove priority
            await pool.query(`
                UPDATE taken 
                SET top_prioriteit = NULL, prioriteit_datum = NULL 
                WHERE id = $1 AND user_id = $2
            `, [id, userId]);
        } else {
            // Validate: max 3 priorities per date
            const existingCount = await pool.query(`
                SELECT COUNT(*) as count 
                FROM taken 
                WHERE top_prioriteit IS NOT NULL 
                AND prioriteit_datum = $1 
                AND user_id = $2
                AND id != $3
            `, [datum, userId, id]);
            
            const currentCount = parseInt(existingCount.rows[0].count);
            
            if (currentCount >= 3) {
                return res.status(400).json({ 
                    error: 'Maximum 3 prioriteiten per dag bereikt',
                    currentCount: currentCount 
                });
            }
            
            // Set priority
            await pool.query(`
                UPDATE taken 
                SET top_prioriteit = $1, prioriteit_datum = $2 
                WHERE id = $3 AND user_id = $4
            `, [prioriteit, datum, id, userId]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error setting task priority:', error);
        res.status(500).json({ error: 'Fout bij instellen prioriteit' });
    }
});

app.get('/api/prioriteiten/:datum', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { datum } = req.params; // YYYY-MM-DD
        const userId = getCurrentUserId(req);
        
        const { pool } = require('./database');
        const result = await pool.query(`
            SELECT * FROM taken 
            WHERE prioriteit_datum = $1 AND user_id = $2 AND top_prioriteit IS NOT NULL
            ORDER BY top_prioriteit
        `, [datum, userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting priorities:', error);
        res.status(500).json({ error: 'Fout bij ophalen prioriteiten' });
    }
});

app.post('/api/prioriteiten/reorder', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { prioriteiten } = req.body; // Array of {id, prioriteit}
        const userId = getCurrentUserId(req);
        
        const { pool } = require('./database');
        
        // Update priorities in transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const item of prioriteiten) {
                await client.query(`
                    UPDATE taken 
                    SET top_prioriteit = $1 
                    WHERE id = $2 AND user_id = $3
                `, [item.prioriteit, item.id, userId]);
            }
            
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error reordering priorities:', error);
        res.status(500).json({ error: 'Fout bij herordenen prioriteiten' });
    }
});

// Debug endpoint to check all tasks for 16/06
app.get('/api/debug/june16', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pool } = require('./database');
        const result = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt, aangemaakt
            FROM taken 
            WHERE verschijndatum::date = '2025-06-16'
            ORDER BY aangemaakt DESC
        `);
        
        // Also check recent tasks regardless of date
        const recentResult = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt, aangemaakt
            FROM taken 
            WHERE aangemaakt > NOW() - INTERVAL '1 hour'
            ORDER BY aangemaakt DESC
        `);
        
        res.json({ 
            june16_count: result.rows.length, 
            june16_tasks: result.rows,
            recent_count: recentResult.rows.length,
            recent_tasks: recentResult.rows
        });
    } catch (error) {
        console.error('Debug june16 error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Temporary debug endpoint to check what's actually in acties
app.get('/api/debug/acties', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pool } = require('./database');
        const result = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt 
            FROM taken 
            WHERE lijst = 'acties' AND afgewerkt IS NULL 
            ORDER BY verschijndatum DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Debug acties error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Simple test endpoint to check if new endpoints work
app.get('/api/debug/test-simple', (req, res) => {
    res.json({ 
        message: 'Simple test endpoint works!', 
        timestamp: new Date().toISOString(),
        server: 'tickedify'
    });
});

// Direct working implementation test
app.get('/api/debug/test-second-wednesday', (req, res) => {
    // Test pattern: monthly-weekday-second-3-1
    // Base date: 2025-06-17
    // Expected: 2025-07-09 (second Wednesday of July)
    
    const baseDate = '2025-06-17';
    const date = new Date(baseDate);
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1); // July 2025
    nextMonth.setDate(1); // July 1st
    
    let wednesdayCount = 0;
    while (wednesdayCount < 2) {
        if (nextMonth.getDay() === 3) { // Wednesday
            wednesdayCount++;
            if (wednesdayCount === 2) {
                break; // Found second Wednesday
            }
        }
        nextMonth.setDate(nextMonth.getDate() + 1);
    }
    
    const result = nextMonth.toISOString().split('T')[0];
    
    res.json({
        baseDate,
        pattern: 'monthly-weekday-second-3-1',
        result,
        expected: '2025-07-09',
        matches: result === '2025-07-09',
        message: `Working implementation gives: ${result}`
    });
});

// Test Nederlandse werkdag patronen direct
app.get('/api/debug/test-dutch-workdays', (req, res) => {
    const baseDate = '2025-06-17'; // Tuesday
    const date = new Date(baseDate);
    
    // Test eerste-werkdag-maand (first workday of next month = July)
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1); // July 2025
    nextMonth.setDate(1); // July 1st
    while (nextMonth.getDay() === 0 || nextMonth.getDay() === 6) {
        nextMonth.setDate(nextMonth.getDate() + 1);
    }
    const eersteWerkdag = nextMonth.toISOString().split('T')[0];
    
    // Test laatste-werkdag-maand (last workday of next month = July)  
    const lastMonth = new Date(date);
    lastMonth.setMonth(date.getMonth() + 2); // August
    lastMonth.setDate(0); // Last day of July
    while (lastMonth.getDay() === 0 || lastMonth.getDay() === 6) {
        lastMonth.setDate(lastMonth.getDate() - 1);
    }
    const laatsteWerkdag = lastMonth.toISOString().split('T')[0];
    
    res.json({
        baseDate,
        tests: {
            'eerste-werkdag-maand': {
                result: eersteWerkdag,
                calculation: 'First workday of July 2025'
            },
            'laatste-werkdag-maand': {
                result: laatsteWerkdag,
                calculation: 'Last workday of July 2025'
            }
        }
    });
});

// Quick test for monthly-weekday pattern  
app.get('/api/debug/quick-monthly-test', (req, res) => {
    // Direct test - what are the Wednesdays in July 2025?
    const july2025 = [];
    for (let day = 1; day <= 31; day++) {
        const date = new Date(2025, 6, day); // July = month 6 (0-indexed)
        if (date.getDay() === 3) { // Wednesday
            july2025.push(date.toISOString().split('T')[0]);
        }
    }
    
    res.json({
        allWednesdaysInJuly2025: july2025,
        firstWednesday: july2025[0],
        secondWednesday: july2025[1],
        thirdWednesday: july2025[2],
        fourthWednesday: july2025[3],
        calculation: `Second Wednesday of July 2025 is ${july2025[1]}`
    });
});

// Debug endpoint to test saveList with recurring data
app.post('/api/debug/test-save-recurring', async (req, res) => {
    try {
        const testData = [{
            id: "debug-test-" + Date.now(),
            tekst: "Debug test recurring",
            aangemaakt: "2025-06-17T12:16:42.232Z",
            projectId: "ghhnv0pdlmbvaix7s",
            verschijndatum: "2025-06-17",
            contextId: "95dfadbz9mbvaj0nt",
            duur: 30,
            type: "actie",
            herhalingType: "monthly-weekday-first-workday-1",
            herhalingActief: true
        }];
        
        
        if (!db) {
            return res.json({ error: 'Database not available', success: false });
        }
        
        const success = await db.saveList('acties', testData);
        
        res.json({ 
            success, 
            message: success ? 'Save successful' : 'Save failed',
            testData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('🔍 DEBUG ENDPOINT ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Alternative: Add single action without loading existing list
app.post('/api/debug/add-single-action', async (req, res) => {
    try {
        if (!db) {
            return res.json({ error: 'Database not available', success: false });
        }
        
        const actionData = req.body;
        
        const userId = getCurrentUserId(req);
        
        // First check if task already exists for this user (T017: filter soft deleted)
        const existingCheck = await pool.query('SELECT * FROM taken WHERE id = $1 AND user_id = $2 AND verwijderd_op IS NULL', [actionData.id, userId]);

        let result;
        if (existingCheck.rows.length > 0) {

            // UPDATE existing task instead of DELETE+INSERT
            // This preserves bijlagen due to CASCADE DELETE on foreign key
            result = await pool.query(`
                UPDATE taken
                SET
                    lijst = $1,
                    tekst = $2,
                    opmerkingen = $3,
                    project_id = $4,
                    verschijndatum = $5,
                    context_id = $6,
                    duur = $7,
                    type = $8,
                    herhaling_type = $9,
                    herhaling_waarde = $10,
                    herhaling_actief = $11,
                    prioriteit = $12
                WHERE id = $13 AND user_id = $14
                RETURNING id
            `, [
                'acties',
                actionData.tekst,
                actionData.opmerkingen || null,
                actionData.projectId || null,
                actionData.verschijndatum || null,
                actionData.contextId || null,
                actionData.duur || null,
                actionData.type || null,
                actionData.herhalingType || null,
                actionData.herhalingWaarde || null,
                actionData.herhalingActief === true || actionData.herhalingActief === 'true',
                actionData.prioriteit || null,
                actionData.id,
                userId
            ]);

        } else {

            // Insert new action (direct action creation, not from inbox)
            result = await pool.query(`
                INSERT INTO taken (id, tekst, opmerkingen, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, prioriteit, afgewerkt, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id
            `, [
                actionData.id,
                actionData.tekst,
                actionData.opmerkingen || null,
                actionData.aangemaakt,
                'acties',
                actionData.projectId || null,
                actionData.verschijndatum || null,
                actionData.contextId || null,
                actionData.duur || null,
                actionData.type || null,
                actionData.herhalingType || null,
                actionData.herhalingWaarde || null,
                actionData.herhalingActief === true || actionData.herhalingActief === 'true',
                actionData.prioriteit || null,
                null,
                userId
            ]);

        }

        // T020: Increment total_tasks_created counter (Feature 058 - Account Settings Block)
        await pool.query(
            'UPDATE users SET total_tasks_created = total_tasks_created + 1 WHERE id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'Action added successfully',
            insertedId: result.rows[0].id,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('🔧 SINGLE ACTION ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Force database migration endpoint
app.post('/api/debug/force-migration', async (req, res) => {
    try {
        if (!pool) {
            return res.json({ error: 'Database pool not available', success: false });
        }
        
        
        // Force migrate the column size
        await pool.query(`ALTER TABLE taken ALTER COLUMN herhaling_type TYPE VARCHAR(50)`);
        
        
        res.json({ 
            success: true, 
            message: 'Migration completed successfully',
            migration: 'herhaling_type VARCHAR(30) -> VARCHAR(50)',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ FORCE MIGRATION ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Debug endpoint voor subscription data check
app.get('/api/debug/subscription-data', async (req, res) => {
    try {
        const emails = ['info@baasoverjetijd.be', 'jan@buskens.be'];
        const result = await pool.query(`
            SELECT
                email,
                subscription_plan,
                subscription_status,
                account_type,
                subscription_price,
                subscription_cycle
            FROM users
            WHERE email = ANY($1::text[])
        `, [emails]);

        res.json({
            success: true,
            users: result.rows,
            subscription_plans_defined: [
                'trial_14_days',
                'monthly_7',
                'yearly_70',
                'monthly_8',
                'yearly_80'
            ]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to test getUserPlanType function
app.get('/api/debug/plan-type', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const planType = await db.getUserPlanType(userId);

        // Also get raw database data
        const userResult = await pool.query(`
            SELECT
                email,
                subscription_plan,
                selected_plan,
                trial_end_date,
                subscription_status
            FROM users
            WHERE id = $1
        `, [userId]);

        res.json({
            success: true,
            userId: userId,
            planType: planType,
            rawData: userResult.rows[0],
            expectedPremiumPlus: ['monthly_8', 'yearly_80'],
            expectedPremiumStandard: ['monthly_7', 'yearly_70']
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to update subscription plan
app.get('/api/debug/update-subscription/:email/:newPlan', async (req, res) => {
    try {
        const { email, newPlan } = req.params;

        // Validate plan
        const validPlans = ['trial_14_days', 'monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'];
        if (!validPlans.includes(newPlan)) {
            return res.status(400).json({
                error: 'Invalid plan',
                validPlans: validPlans
            });
        }

        // Update subscription_plan
        const result = await pool.query(`
            UPDATE users
            SET subscription_plan = $1,
                plan_selected_at = NOW()
            WHERE email = $2
            RETURNING id, email, subscription_plan, subscription_status
        `, [newPlan, email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `Updated ${email} to plan ${newPlan}`,
            user: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Raw JSON test for debugging
app.get('/api/debug/raw-test/:pattern/:baseDate', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { pattern, baseDate } = req.params;
    
    // Just test if monthly-weekday logic reaches the calculation
    let reached = [];
    
    if (pattern.startsWith('monthly-weekday-')) {
        reached.push('monthly-weekday check passed');
        const parts = pattern.split('-');
        if (parts.length === 5) {
            reached.push('parts length check passed');
            const position = parts[2];
            const targetDay = parseInt(parts[3]);
            const interval = parseInt(parts[4]);
            
            const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
            // Allow 'workday' as special case for targetDay
            const isValidTargetDay = parts[3] === 'workday' || (!isNaN(targetDay) && targetDay >= 1 && targetDay <= 7);
            if (validPositions.includes(position) && 
                isValidTargetDay && 
                !isNaN(interval) && interval > 0) {
                reached.push('validation passed');
                
                const date = new Date(baseDate);
                const nextDateObj = new Date(date);
                nextDateObj.setMonth(date.getMonth() + interval);
                
                // Special handling for workday patterns
                if (parts[3] === 'workday') {
                    reached.push('workday pattern detected');
                    
                    if (position === 'first') {
                        // First workday of month
                        nextDateObj.setDate(1);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                        }
                    } else if (position === 'last') {
                        // Last workday of month
                        const targetMonth = nextDateObj.getMonth();
                        nextDateObj.setMonth(targetMonth + 1);
                        nextDateObj.setDate(0); // Last day of target month
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    }
                } else {
                    // Normal weekday patterns
                    const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                    
                    if (position === 'last') {
                        // Find last occurrence of weekday in month
                        const targetMonth = nextDateObj.getMonth();
                        nextDateObj.setMonth(targetMonth + 1);
                        nextDateObj.setDate(0); // Last day of target month
                        while (nextDateObj.getDay() !== jsTargetDay) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    } else {
                        // Find nth occurrence of weekday in month (first, second, third, fourth)
                        const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                        const occurrenceNumber = positionNumbers[position];
                        
                        nextDateObj.setDate(1); // Start at beginning of month
                        let occurrenceCount = 0;
                        
                        // Find the nth occurrence of the target weekday
                        while (occurrenceCount < occurrenceNumber) {
                            if (nextDateObj.getDay() === jsTargetDay) {
                                occurrenceCount++;
                                if (occurrenceCount === occurrenceNumber) {
                                    break; // Found the nth occurrence
                                }
                            }
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                            
                            // Safety check: if we've gone beyond the month, this occurrence doesn't exist
                            if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                res.write(JSON.stringify({
                                    success: false,
                                    reached: [...reached, 'occurrence does not exist in month']
                                }));
                                res.end();
                                return;
                            }
                        }
                    }
                }
                
                reached.push('calculation completed');
                
                const nextDate = nextDateObj.toISOString().split('T')[0];
                
                res.write(JSON.stringify({
                    success: true,
                    nextDate,
                    reached
                }));
                res.end();
                return;
            } else {
                reached.push('validation failed');
            }
        } else {
            reached.push('parts length check failed');
        }
    } else {
        reached.push('monthly-weekday check failed');
    }
    
    res.write(JSON.stringify({
        success: false,
        reached
    }));
    res.end();
});

// Test pattern parsing
app.get('/api/debug/parse-pattern/:pattern', (req, res) => {
    const { pattern } = req.params;
    const parts = pattern.split('-');
    
    let validationDetails = {};
    
    if (pattern.startsWith('monthly-weekday-') && parts.length === 5) {
        const position = parts[2];
        const targetDay = parseInt(parts[3]);
        const interval = parseInt(parts[4]);
        
        const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
        validationDetails = {
            position,
            targetDay,
            interval,
            positionValid: validPositions.includes(position),
            targetDayValid: !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7,
            intervalValid: !isNaN(interval) && interval > 0,
            overallValid: validPositions.includes(position) && 
                         !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7 && 
                         !isNaN(interval) && interval > 0
        };
    }
    
    res.json({
        pattern,
        parts,
        partCount: parts.length,
        startsWithChecks: {
            'daily-': pattern.startsWith('daily-'),
            'weekly-': pattern.startsWith('weekly-'),
            'monthly-day-': pattern.startsWith('monthly-day-'),
            'yearly-': pattern.startsWith('yearly-'),
            'monthly-weekday-': pattern.startsWith('monthly-weekday-'),
            'yearly-special-': pattern.startsWith('yearly-special-'),
            'nederlandse-werkdag': ['eerste-werkdag-maand', 'laatste-werkdag-maand', 'eerste-werkdag-jaar', 'laatste-werkdag-jaar'].includes(pattern)
        },
        validationDetails
    });
});

// Test if weekly-1-4 works correctly
app.get('/api/debug/test-weekly-simple', (req, res) => {
    const pattern = 'weekly-1-4';
    const baseDate = '2025-06-17';
    const date = new Date(baseDate);
    
    // Manual calculation step by step
    const steps = [];
    steps.push(`Input: ${pattern} + ${baseDate}`);
    steps.push(`Base date object: ${date.toDateString()}`);
    steps.push(`Base day of week: ${date.getDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]})`);
    
    const parts = pattern.split('-');
    const interval = parseInt(parts[1]); // 1
    const targetDay = parseInt(parts[2]); // 4 (Thursday)
    steps.push(`Parsed: interval=${interval}, targetDay=${targetDay}`);
    
    const jsTargetDay = targetDay === 7 ? 0 : targetDay; // 4
    steps.push(`JS target day: ${jsTargetDay} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][jsTargetDay]})`);
    
    const currentDay = date.getDay(); // 2 (Tuesday)
    let daysToAdd = jsTargetDay - currentDay; // 4-2 = 2
    steps.push(`Days to add initially: ${daysToAdd}`);
    
    if (daysToAdd <= 0) {
        daysToAdd += 7;
        steps.push(`Adjusted days to add: ${daysToAdd}`);
    }
    
    const nextOccurrence = new Date(date);
    nextOccurrence.setDate(date.getDate() + daysToAdd);
    steps.push(`After adding days: ${nextOccurrence.toDateString()}`);
    
    if (interval > 1) {
        const extraWeeks = (interval - 1) * 7;
        nextOccurrence.setDate(nextOccurrence.getDate() + extraWeeks);
        steps.push(`After adding ${extraWeeks} extra days: ${nextOccurrence.toDateString()}`);
    }
    
    const result = nextOccurrence.toISOString().split('T')[0];
    steps.push(`Final result: ${result}`);
    
    res.json({
        pattern,
        baseDate,
        expected: '2025-06-19',
        result,
        correct: result === '2025-06-19',
        steps
    });
});

// Debug endpoint for detailed weekly calculation
app.get('/api/debug/weekly-calc/:pattern/:baseDate', (req, res) => {
    const { pattern, baseDate } = req.params;
    const date = new Date(baseDate);
    
    if (pattern.startsWith('weekly-')) {
        const parts = pattern.split('-');
        const interval = parseInt(parts[1]);
        const targetDay = parseInt(parts[2]);
        const jsTargetDay = targetDay === 7 ? 0 : targetDay;
        const currentDay = date.getDay();
        let daysToAdd = jsTargetDay - currentDay;
        
        const originalDaysToAdd = daysToAdd;
        if (daysToAdd <= 0) {
            daysToAdd += 7;
        }
        
        const nextOccurrence = new Date(date);
        nextOccurrence.setDate(date.getDate() + daysToAdd);
        
        const beforeInterval = nextOccurrence.toISOString().split('T')[0];
        
        // Add interval weeks
        if (interval > 1) {
            nextOccurrence.setDate(nextOccurrence.getDate() + (interval - 1) * 7);
        }
        
        const result = nextOccurrence.toISOString().split('T')[0];
        
        res.json({
            pattern,
            baseDate,
            baseDateObj: date.toDateString(),
            baseDayOfWeek: currentDay,
            targetDay,
            jsTargetDay,
            originalDaysToAdd,
            adjustedDaysToAdd: daysToAdd,
            beforeInterval,
            interval,
            extraWeeks: interval > 1 ? (interval - 1) : 0,
            finalResult: result
        });
    } else {
        res.json({ error: 'Not a weekly pattern' });
    }
});

// GET version of test-recurring for easier testing (date calculation only)
app.get('/api/debug/test-recurring/:pattern/:baseDate', async (req, res) => {
    try {
        const { pattern, baseDate } = req.params;
        
        if (!pattern || !baseDate) {
            return res.status(400).json({ error: 'Pattern and baseDate are required' });
        }
        
        
        // Test date calculation logic directly (simulate frontend logic)
        let nextDate = null;
        const date = new Date(baseDate);
        
        // Handle simple Dutch patterns first
        if (pattern === 'dagelijks') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 1);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'werkdagen') {
            // Find next weekday (Monday to Friday)
            const nextDateObj = new Date(date);
            do {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            } while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6); // Skip weekends
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'wekelijks') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 7);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'maandelijks') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 1);
            
            // Handle months with fewer days (e.g., day 31 in February)
            if (nextDateObj.getDate() !== originalDay) {
                // Set to last day of target month if original day doesn't exist
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'jaarlijks') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            const originalMonth = date.getMonth();
            
            // Handle leap year issues BEFORE setting the year
            if (originalMonth === 1 && originalDay === 29) {
                // Feb 29 case - check if next year is leap year
                const nextYear = date.getFullYear() + 1;
                const isNextYearLeap = (nextYear % 4 === 0 && nextYear % 100 !== 0) || (nextYear % 400 === 0);
                
                if (!isNextYearLeap) {
                    // Next year is not leap year, use Feb 28
                    nextDateObj.setFullYear(nextYear);
                    nextDateObj.setMonth(1); // February
                    nextDateObj.setDate(28);
                } else {
                    // Next year is leap year, use Feb 29
                    nextDateObj.setFullYear(nextYear);
                }
            } else {
                // Normal case - just add one year
                nextDateObj.setFullYear(date.getFullYear() + 1);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'om-de-dag') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 2);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '2-weken') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 14);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '3-weken') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 21);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '2-maanden') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 2);
            
            // Handle months with fewer days
            if (nextDateObj.getDate() !== originalDay) {
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '3-maanden') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 3);
            
            // Handle months with fewer days
            if (nextDateObj.getDate() !== originalDay) {
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '6-maanden') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 6);
            
            // Handle months with fewer days
            if (nextDateObj.getDate() !== originalDay) {
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].includes(pattern)) {
            // Specific weekdays
            const weekdays = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
            const targetDay = weekdays.indexOf(pattern);
            const currentDay = date.getDay();
            let daysToAdd = targetDay - currentDay;
            
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }
            
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + daysToAdd);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-dag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1);
            nextDateObj.setDate(1);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-dag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 2);
            nextDateObj.setDate(0); // Last day of previous month
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-werkdag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1);
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1); // FIX: Changed +2 to +1
            nextDateObj.setDate(0); // Last day of next month
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-dag-jaar') {
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(0); // January
            nextDateObj.setDate(1);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-dag-jaar') {
            const nextDateObj = new Date(date);
            const currentMonth = date.getMonth() + 1; // Convert to 1-based
            const currentDay = date.getDate();
            
            // Check if December 31 hasn't passed yet this year
            if (currentMonth < 12 || (currentMonth === 12 && currentDay < 31)) {
                // Use current year
                nextDateObj.setMonth(11); // December
                nextDateObj.setDate(31);
            } else {
                // Use next year
                nextDateObj.setFullYear(date.getFullYear() + 1);
                nextDateObj.setMonth(11); // December
                nextDateObj.setDate(31);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-werkdag-jaar') {
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(0); // January
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-jaar') {
            const nextDateObj = new Date(date);
            const currentMonth = date.getMonth() + 1; // Convert to 1-based
            const currentDay = date.getDate();
            
            // Find last workday of this year first
            const thisYearLastWorkday = new Date(date.getFullYear(), 11, 31); // Dec 31 this year
            while (thisYearLastWorkday.getDay() === 0 || thisYearLastWorkday.getDay() === 6) {
                thisYearLastWorkday.setDate(thisYearLastWorkday.getDate() - 1);
            }
            
            // Check if this year's last workday hasn't passed yet
            const lastWorkdayThisYear = thisYearLastWorkday.getDate();
            if (currentMonth < 12 || (currentMonth === 12 && currentDay < lastWorkdayThisYear)) {
                // Use this year's last workday
                nextDate = thisYearLastWorkday.toISOString().split('T')[0];
            } else {
                // Use next year's last workday
                nextDateObj.setFullYear(date.getFullYear() + 1);
                nextDateObj.setMonth(11); // December
                nextDateObj.setDate(31);
                while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                    nextDateObj.setDate(nextDateObj.getDate() - 1);
                }
                nextDate = nextDateObj.toISOString().split('T')[0];
            }
        } else if (pattern.startsWith('eerste-') && pattern.endsWith('-maand')) {
            // Handle eerste-weekdag-maand patterns
            const weekdayName = pattern.replace('eerste-', '').replace('-maand', '');
            const weekdays = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
            const targetWeekday = weekdays.indexOf(weekdayName);
            
            if (targetWeekday !== -1) {
                const nextDateObj = new Date(date);
                nextDateObj.setMonth(date.getMonth() + 1);
                nextDateObj.setDate(1);
                
                // Find the first occurrence of the target weekday in the month
                while (nextDateObj.getDay() !== targetWeekday) {
                    nextDateObj.setDate(nextDateObj.getDate() + 1);
                }
                
                nextDate = nextDateObj.toISOString().split('T')[0];
            }
        } else if (pattern.startsWith('laatste-') && pattern.endsWith('-maand')) {
            // Handle laatste-weekdag-maand patterns
            const weekdayName = pattern.replace('laatste-', '').replace('-maand', '');
            const weekdays = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
            const targetWeekday = weekdays.indexOf(weekdayName);
            
            if (targetWeekday !== -1) {
                const nextDateObj = new Date(date);
                nextDateObj.setMonth(date.getMonth() + 2);
                nextDateObj.setDate(0); // Last day of the next month
                
                // Go backwards to find the last occurrence of the target weekday
                while (nextDateObj.getDay() !== targetWeekday) {
                    nextDateObj.setDate(nextDateObj.getDate() - 1);
                }
                
                nextDate = nextDateObj.toISOString().split('T')[0];
            }
        } else if (pattern.startsWith('daily-')) {
            // Pattern: daily-interval (e.g., daily-3 = every 3 days)
            const parts = pattern.split('-');
            if (parts.length === 2) {
                const interval = parseInt(parts[1]);
                if (!isNaN(interval) && interval > 0) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setDate(date.getDate() + interval);
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('weekly-')) {
            // Pattern: weekly-interval-day (e.g., weekly-1-4 = every week on Thursday)
            const parts = pattern.split('-');
            if (parts.length === 3) {
                const interval = parseInt(parts[1]);
                const targetDay = parseInt(parts[2]);
                
                // Normal logic
                const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                const currentDay = date.getDay();
                let daysToAdd = jsTargetDay - currentDay;
                
                if (daysToAdd <= 0) {
                    daysToAdd += 7;
                }
                
                const nextOccurrence = new Date(date);
                nextOccurrence.setDate(date.getDate() + daysToAdd);
                
                // Add interval weeks
                if (interval > 1) {
                    nextOccurrence.setDate(nextOccurrence.getDate() + (interval - 1) * 7);
                }
                
                nextDate = nextOccurrence.toISOString().split('T')[0];
            }
        } else if (pattern.startsWith('monthly-day-')) {
            // Pattern: monthly-day-daynum-interval (e.g., monthly-day-15-2 = day 15 every 2 months)
            const parts = pattern.split('-');
            if (parts.length === 4) {
                const dayNum = parseInt(parts[2]);
                const interval = parseInt(parts[3]);
                if (!isNaN(dayNum) && !isNaN(interval) && dayNum >= 1 && dayNum <= 31) {
                    const nextDateObj = new Date(date);
                    
                    // Check if the target day exists in the current month and hasn't passed yet
                    const currentDay = date.getDate();
                    const testCurrentMonth = new Date(date.getFullYear(), date.getMonth(), dayNum);
                    
                    if (dayNum > currentDay && testCurrentMonth.getDate() === dayNum) {
                        // Target day exists in current month and hasn't passed yet
                        nextDateObj.setDate(dayNum);
                    } else {
                        // Move to next interval month
                        nextDateObj.setMonth(date.getMonth() + interval);
                        nextDateObj.setDate(dayNum);
                        
                        // Handle months with fewer days
                        if (nextDateObj.getDate() !== dayNum) {
                            nextDateObj.setDate(0); // Last day of month
                        }
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('yearly-special-')) {
            // Pattern: yearly-special-type-interval (e.g., yearly-special-first-workday-1)
            const parts = pattern.split('-');
            if (parts.length >= 4) {
                const specialType = parts.slice(2, -1).join('-'); // Everything except 'yearly', 'special' and interval
                const interval = parseInt(parts[parts.length - 1]);
                
                if (!isNaN(interval) && interval > 0) {
                    const nextDateObj = new Date(date);
                    
                    if (specialType === 'first-workday') {
                        // First workday of the year - always next year for interval 1
                        nextDateObj.setFullYear(date.getFullYear() + interval);
                        nextDateObj.setMonth(0); // January
                        nextDateObj.setDate(1);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                        }
                    } else if (specialType === 'last-workday') {
                        // Last workday of the year - check current year first for interval 1
                        const currentMonth = date.getMonth() + 1; // Convert to 1-based
                        const currentDay = date.getDate();
                        
                        if (interval === 1) {
                            // Find last workday of this year first
                            const thisYearLastWorkday = new Date(date.getFullYear(), 11, 31); // Dec 31 this year
                            while (thisYearLastWorkday.getDay() === 0 || thisYearLastWorkday.getDay() === 6) {
                                thisYearLastWorkday.setDate(thisYearLastWorkday.getDate() - 1);
                            }
                            
                            // Check if this year's last workday hasn't passed yet
                            const lastWorkdayThisYear = thisYearLastWorkday.getDate();
                            if (currentMonth < 12 || (currentMonth === 12 && currentDay < lastWorkdayThisYear)) {
                                // Use this year's last workday
                                nextDate = thisYearLastWorkday.toISOString().split('T')[0];
                            } else {
                                // Use next year's last workday
                                nextDateObj.setFullYear(date.getFullYear() + interval);
                                nextDateObj.setMonth(11); // December
                                nextDateObj.setDate(31);
                                while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                    nextDateObj.setDate(nextDateObj.getDate() - 1);
                                }
                                nextDate = nextDateObj.toISOString().split('T')[0];
                            }
                        } else {
                            // For intervals > 1, always use future years
                            nextDateObj.setFullYear(date.getFullYear() + interval);
                            nextDateObj.setMonth(11); // December
                            nextDateObj.setDate(31);
                            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                nextDateObj.setDate(nextDateObj.getDate() - 1);
                            }
                            nextDate = nextDateObj.toISOString().split('T')[0];
                        }
                    }
                    
                    // Set nextDate if not already set (for first-workday case)
                    if (!nextDate) {
                        nextDate = nextDateObj.toISOString().split('T')[0];
                    }
                }
            }
        } else if (pattern.startsWith('yearly-')) {
            // Pattern: yearly-day-month-interval (e.g., yearly-25-12-1 = Dec 25 every year)
            const parts = pattern.split('-');
            if (parts.length === 4) {
                const day = parseInt(parts[1]);
                const month = parseInt(parts[2]);
                const interval = parseInt(parts[3]);
                if (!isNaN(day) && !isNaN(month) && !isNaN(interval) && 
                    day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    const nextDateObj = new Date(date);
                    
                    // Check if the target date exists in the current year and hasn't passed yet
                    const currentYear = date.getFullYear();
                    const currentMonth = date.getMonth() + 1; // Convert to 1-based
                    const currentDay = date.getDate();
                    
                    const testCurrentYear = new Date(currentYear, month - 1, day);
                    const targetHasPassed = (month < currentMonth) || 
                                           (month === currentMonth && day <= currentDay);
                    
                    // Special handling for Feb 29 in non-leap years
                    const isFeb29 = (month === 2 && day === 29);
                    const isCurrentYearLeap = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
                    
                    if (!targetHasPassed && (testCurrentYear.getDate() === day || (isFeb29 && !isCurrentYearLeap))) {
                        // Target date exists in current year (or Feb 29 becomes Feb 28 in non-leap year)
                        nextDateObj.setMonth(month - 1); // JavaScript months are 0-based
                        if (isFeb29 && !isCurrentYearLeap) {
                            nextDateObj.setDate(28); // Feb 29 becomes Feb 28 in non-leap year
                        } else {
                            nextDateObj.setDate(day);
                        }
                    } else {
                        // Move to next interval year
                        nextDateObj.setFullYear(date.getFullYear() + interval);
                        nextDateObj.setMonth(month - 1); // JavaScript months are 0-based
                        nextDateObj.setDate(day);
                        
                        // Handle leap year issues
                        if (nextDateObj.getDate() !== day) {
                            nextDateObj.setDate(0); // Last day of previous month
                        }
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('monthly-weekday-')) {
            // Pattern: monthly-weekday-position-day-interval (e.g., monthly-weekday-second-3-1 = second Wednesday every month)
            // Special case: monthly-weekday-first-workday-1 = first workday of every month
            const parts = pattern.split('-');
            if (parts.length === 5) {
                const position = parts[2]; // 'first', 'second', 'third', 'fourth', 'last'
                const targetDay = parts[3]; // 1=Monday, ..., 7=Sunday, or 'workday'
                const interval = parseInt(parts[4]);
                
                const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
                const isValidDay = (!isNaN(parseInt(targetDay)) && parseInt(targetDay) >= 1 && parseInt(targetDay) <= 7) || targetDay === 'workday';
                
                if (validPositions.includes(position) && isValidDay && !isNaN(interval) && interval > 0) {
                    
                    // Special handling for workday patterns
                    if (targetDay === 'workday') {
                        const nextDateObj = new Date(date);
                        nextDateObj.setMonth(date.getMonth() + interval);
                        
                        if (position === 'first') {
                            // First workday of month
                            nextDateObj.setDate(1);
                            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                nextDateObj.setDate(nextDateObj.getDate() + 1);
                            }
                        } else if (position === 'last') {
                            // Last workday of month
                            // nextDateObj already has correct target month from line 7938 (+ interval)
                            // To get last day, we need to go to NEXT month, then setDate(0)
                            nextDateObj.setMonth(nextDateObj.getMonth() + 1);
                            nextDateObj.setDate(0); // Last day of target month
                            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                nextDateObj.setDate(nextDateObj.getDate() - 1);
                            }
                        }
                        
                        nextDate = nextDateObj.toISOString().split('T')[0];
                    } else {
                        // Regular weekday patterns (existing logic)
                        const numericTargetDay = parseInt(targetDay);
                        const jsTargetDay = numericTargetDay === 7 ? 0 : numericTargetDay; // Convert to JS day numbering
                        const nextDateObj = new Date(date);
                        nextDateObj.setMonth(date.getMonth() + interval);
                        
                        if (position === 'last') {
                            // Find last occurrence of weekday in month
                            const targetMonth = nextDateObj.getMonth();
                            nextDateObj.setMonth(targetMonth + 1);
                            nextDateObj.setDate(0); // Last day of target month
                            while (nextDateObj.getDay() !== jsTargetDay) {
                                nextDateObj.setDate(nextDateObj.getDate() - 1);
                            }
                            nextDate = nextDateObj.toISOString().split('T')[0];
                        } else {
                            // Find nth occurrence of weekday in month (first, second, third, fourth)
                            const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                            const occurrenceNumber = positionNumbers[position];
                            
                            nextDateObj.setDate(1); // Start at beginning of month
                            let occurrenceCount = 0;
                            
                            // Find the nth occurrence of the target weekday
                            while (occurrenceCount < occurrenceNumber) {
                                if (nextDateObj.getDay() === jsTargetDay) {
                                    occurrenceCount++;
                                    if (occurrenceCount === occurrenceNumber) {
                                        // Found the nth occurrence, set nextDate
                                        nextDate = nextDateObj.toISOString().split('T')[0];
                                        break;
                                    }
                                }
                                nextDateObj.setDate(nextDateObj.getDate() + 1);
                                
                                // Safety check: if we've gone beyond the month, this occurrence doesn't exist
                                if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                    nextDate = null; // This occurrence doesn't exist in this month
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } else if (pattern === 'eerste-werkdag-maand') {
            // First workday of next month
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1);
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-maand') {
            // Last workday of next month
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 2);
            nextDateObj.setDate(0); // Last day of next month
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-werkdag-jaar') {
            // First workday of next year
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(0); // January
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-jaar') {
            // Last workday of next year
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(11); // December
            nextDateObj.setDate(31);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        }
        
        // For test endpoint, we skip the "ensure future date" logic
        // so tests can get exact calculations regardless of current date
        
        // Special debug for monthly-weekday patterns
        let monthlyWeekdayDebug = null;
        if (pattern.startsWith('monthly-weekday-')) {
            const parts = pattern.split('-');
            const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
            monthlyWeekdayDebug = {
                parts,
                partsLength: parts.length,
                position: parts[2],
                targetDay: parseInt(parts[3]),
                interval: parseInt(parts[4]),
                positionCheck: validPositions.includes(parts[2]),
                targetDayCheck: !isNaN(parseInt(parts[3])) && parseInt(parts[3]) >= 1 && parseInt(parts[3]) <= 7,
                intervalCheck: !isNaN(parseInt(parts[4])) && parseInt(parts[4]) > 0
            };
        }
        
        res.json({
            pattern,
            baseDate,
            nextDate,
            success: !!nextDate,
            message: nextDate ? `Next occurrence: ${nextDate}` : 'Failed to calculate next date',
            calculation: nextDate ? `${baseDate} + ${pattern} = ${nextDate}` : 'Pattern not recognized',
            debug: {
                patternStartsWith: {
                    'daily-': pattern.startsWith('daily-'),
                    'weekly-': pattern.startsWith('weekly-'),
                    'monthly-day-': pattern.startsWith('monthly-day-'),
                    'yearly-': pattern.startsWith('yearly-'),
                    'monthly-weekday-': pattern.startsWith('monthly-weekday-'),
                    'yearly-special-': pattern.startsWith('yearly-special-'),
                    'nederlandse-werkdag': ['eerste-werkdag-maand', 'laatste-werkdag-maand', 'eerste-werkdag-jaar', 'laatste-werkdag-jaar'].includes(pattern)
                },
                monthlyWeekday: monthlyWeekdayDebug
            }
        });
        
    } catch (error) {
        console.error('Test recurring error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Test endpoint for complex recurring patterns
app.post('/api/debug/test-recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pattern, baseDate, expectedDays } = req.body;
        
        if (!pattern || !baseDate) {
            return res.status(400).json({ error: 'Pattern and baseDate are required' });
        }
        
        // Test the pattern by creating a test task and marking it complete
        const { pool, createRecurringTask } = require('./database');
        
        // Create test task
        const testTask = {
            tekst: `TEST: ${pattern}`,
            verschijndatum: baseDate,
            lijst: 'acties',
            project_id: null,
            context_id: 1, // Assuming context 1 exists
            duur: 30,
            herhaling_type: pattern,
            herhaling_actief: true
        };
        
        
        const insertResult = await pool.query(`
            INSERT INTO taken (tekst, verschijndatum, lijst, project_id, context_id, duur, herhaling_type, herhaling_actief)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [testTask.tekst, testTask.verschijndatum, testTask.lijst, testTask.project_id, testTask.context_id, testTask.duur, testTask.herhaling_type, testTask.herhaling_actief]);
        
        const taskId = insertResult.rows[0].id;
        
        // Now test creating the next recurring task
        const nextDate = await createRecurringTask(testTask, baseDate);
        
        let results = [];
        if (nextDate) {
            // Verify the next task was created
            const verifyResult = await pool.query(`
                SELECT id, tekst, verschijndatum, herhaling_type, herhaling_actief
                FROM taken 
                WHERE tekst = $1 AND verschijndatum = $2 AND lijst = 'acties'
            `, [testTask.tekst, nextDate]);
            
            results = verifyResult.rows;
        }
        
        // Clean up test tasks
        await pool.query('DELETE FROM taken WHERE tekst LIKE $1', [`TEST: ${pattern}%`]);
        
        res.json({
            pattern,
            baseDate,
            nextDate,
            success: !!nextDate,
            createdTasks: results,
            message: nextDate ? `Next occurrence: ${nextDate}` : 'Failed to calculate next date'
        });
        
    } catch (error) {
        console.error('Test recurring error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Batch test endpoint for multiple patterns
app.post('/api/debug/batch-test-recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { patterns, baseDate } = req.body;
        
        if (!patterns || !Array.isArray(patterns) || !baseDate) {
            return res.status(400).json({ error: 'Patterns array and baseDate are required' });
        }
        
        const results = [];
        
        for (const pattern of patterns) {
            try {
                const response = await fetch(`http://localhost:${PORT}/api/debug/test-recurring`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pattern, baseDate })
                });
                
                const result = await response.json();
                results.push(result);
                
            } catch (error) {
                results.push({
                    pattern,
                    baseDate,
                    success: false,
                    error: error.message
                });
            }
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        res.json({
            baseDate,
            totalPatterns: patterns.length,
            results,
            summary: {
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            }
        });
        
    } catch (error) {
        console.error('Batch test recurring error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Debug endpoint to view all tasks
app.get('/api/debug/all-tasks', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = 'default-user-001';
        const result = await pool.query(`
            SELECT id, tekst, lijst, afgewerkt IS NOT NULL as completed 
            FROM taken 
            WHERE user_id = $1 
            ORDER BY lijst, tekst
        `, [userId]);
        
        res.json({
            success: true,
            total: result.rows.length,
            tasks: result.rows
        });
        
    } catch (error) {
        console.error('All tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/all-subtaken', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = getCurrentUserId(req);
        
        // Get all subtaken with their parent task info
        const result = await pool.query(`
            SELECT 
                s.id as subtaak_id,
                s.parent_taak_id,
                s.titel as subtaak_titel,
                s.voltooid,
                s.volgorde,
                s.created_at as subtaak_created,
                t.tekst as parent_taak_tekst,
                t.lijst as parent_lijst,
                t.aangemaakt as parent_created,
                t.user_id
            FROM subtaken s
            LEFT JOIN taken t ON s.parent_taak_id = t.id
            WHERE t.user_id = $1 OR t.user_id IS NULL
            ORDER BY s.created_at DESC
        `, [userId]);
        
        res.json({
            success: true,
            totalSubtaken: result.rows.length,
            subtaken: result.rows
        });
    } catch (error) {
        console.error('Error fetching all subtaken:', error);
        res.status(500).json({ error: 'Database query failed', details: error.message });
    }
});

app.get('/api/debug/search-subtaken/:searchTerm', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { searchTerm } = req.params;
        const userId = getCurrentUserId(req);
        
        // Search for subtaken by title
        const result = await pool.query(`
            SELECT 
                s.id as subtaak_id,
                s.parent_taak_id,
                s.titel as subtaak_titel,
                s.voltooid,
                s.volgorde,
                s.created_at as subtaak_created,
                t.tekst as parent_taak_tekst,
                t.lijst as parent_lijst,
                t.aangemaakt as parent_created,
                t.user_id
            FROM subtaken s
            LEFT JOIN taken t ON s.parent_taak_id = t.id
            WHERE (t.user_id = $1 OR t.user_id IS NULL)
              AND s.titel ILIKE $2
            ORDER BY s.created_at DESC
        `, [userId, `%${searchTerm}%`]);
        
        res.json({
            success: true,
            searchTerm: searchTerm,
            totalFound: result.rows.length,
            subtaken: result.rows
        });
    } catch (error) {
        console.error('Error searching subtaken:', error);
        res.status(500).json({ error: 'Database query failed', details: error.message });
    }
});

// Debug endpoint to force refresh user data (clear any server-side caching)
app.get('/api/debug/force-refresh/:userId', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = req.params.userId;
        
        // Get fresh data directly from database
        const result = await pool.query(`
            SELECT id, tekst, lijst, afgewerkt IS NOT NULL as completed
            FROM taken 
            WHERE user_id = $1 
            AND afgewerkt IS NULL
            ORDER BY lijst, tekst
        `, [userId]);
        
        res.json({
            success: true,
            userId: userId,
            freshData: true,
            tasks: result.rows,
            total: result.rows.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Force refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to force clean up 'Thuis' endings with verification
app.get('/api/debug/force-clean-thuis', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get all tasks that contain 'Thuis' (more aggressive search)
            const result = await client.query(`
                SELECT t.id, t.tekst, t.lijst, t.user_id, u.email 
                FROM taken t
                JOIN users u ON t.user_id = u.id
                WHERE (t.tekst LIKE '%Thuis%' OR t.tekst LIKE '%thuis%')
                AND t.afgewerkt IS NULL
            `);
            
            const tasksToUpdate = result.rows;
            let updatedCount = 0;
            const updateResults = [];
            
            for (const task of tasksToUpdate) {
                const originalText = task.tekst;
                // More aggressive cleanup - remove 'Thuis' or 'thuis' anywhere it appears
                let cleanedText = originalText
                    .replace(/\s*[Tt]huis\s*,/g, ',') // Remove 'Thuis,' 
                    .replace(/\s*[Tt]huis\s*$/g, '') // Remove 'Thuis' at end
                    .replace(/\s*[Tt]huis\s+/g, ' ') // Remove 'Thuis ' in middle
                    .replace(/\s+/g, ' ') // Normalize multiple spaces
                    .replace(/\s+$/, '') // Remove trailing whitespace
                    .trim();
                
                if (cleanedText !== originalText && cleanedText.length > 0) {
                    // Update the task
                    const updateResult = await client.query(`
                        UPDATE taken 
                        SET tekst = $1 
                        WHERE id = $2
                        RETURNING id, tekst
                    `, [cleanedText, task.id]);
                    
                    updateResults.push({
                        id: task.id,
                        original: originalText,
                        updated: updateResult.rows[0].tekst,
                        success: true
                    });
                    
                    updatedCount++;
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                found: tasksToUpdate.length,
                updated: updatedCount,
                updateResults: updateResults
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Force clean Thuis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to clean up 'Thuis' endings
app.get('/api/debug/clean-thuis', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get all tasks for ALL users that end with 'Thuis'
        const result = await pool.query(`
            SELECT t.id, t.tekst, t.lijst, t.user_id, u.email 
            FROM taken t
            JOIN users u ON t.user_id = u.id
            WHERE t.tekst LIKE '%Thuis'
            AND t.afgewerkt IS NULL
        `);
        
        const tasksToUpdate = result.rows;
        let updatedCount = 0;
        
        for (const task of tasksToUpdate) {
            const originalText = task.tekst;
            const cleanedText = originalText.replace(/\s*Thuis\s*$/, '').trim();
            
            if (cleanedText !== originalText && cleanedText.length > 0) {
                
                const updateResult = await pool.query(`
                    UPDATE taken 
                    SET tekst = $1 
                    WHERE id = $2
                    RETURNING tekst
                `, [cleanedText, task.id]);
                
                updatedCount++;
            }
        }
        
        res.json({
            success: true,
            found: tasksToUpdate.length,
            updated: updatedCount,
            tasks: tasksToUpdate.map(t => ({
                id: t.id,
                user_email: t.email,
                lijst: t.lijst,
                original: t.tekst,
                cleaned: t.tekst.replace(/\s*Thuis\s*$/, '').trim()
            }))
        });
        
    } catch (error) {
        console.error('Clean Thuis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint for mind dump table
app.get('/api/debug/mind-dump-table', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: 'Database pool not available' });
        }

        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'mind_dump_preferences'
        `);
        
        const tableExists = tableCheck.rows.length > 0;
        
        let tableData = [];
        if (tableExists) {
            const dataResult = await pool.query('SELECT * FROM mind_dump_preferences LIMIT 5');
            tableData = dataResult.rows;
        }

        res.json({
            tableExists,
            tableData,
            userId: req.session.user.id
        });
    } catch (error) {
        console.error('Debug mind dump table error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mind dump preferences endpoints (BEFORE 404 handler!)
app.get('/api/mind-dump/preferences', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            console.error('Mind dump GET: Database pool not available');
            return res.status(500).json({ error: 'Database not available' });
        }

        const userId = req.session.user.id;
        
        // First ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mind_dump_preferences (
                user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                preferences JSONB NOT NULL DEFAULT '{}',
                custom_words JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const result = await pool.query(
            'SELECT preferences, custom_words FROM mind_dump_preferences WHERE user_id = $1',
            [userId]
        );

        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            res.json({
                preferences: row.preferences || {},
                customWords: row.custom_words || []
            });
        } else {
            // Return empty for new users
            res.json({
                preferences: {},
                customWords: []
            });
        }
    } catch (error) {
        console.error('Error loading mind dump preferences:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.post('/api/mind-dump/preferences', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: 'Database pool not available' });
        }

        const userId = req.session.user.id;
        const { preferences, customWords } = req.body;

        // First ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mind_dump_preferences (
                user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                preferences JSONB NOT NULL DEFAULT '{}',
                custom_words JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Upsert preferences
        await pool.query(`
            INSERT INTO mind_dump_preferences (user_id, preferences, custom_words, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET 
                preferences = EXCLUDED.preferences,
                custom_words = EXCLUDED.custom_words,
                updated_at = NOW()
        `, [userId, JSON.stringify(preferences), JSON.stringify(customWords)]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving mind dump preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========================================
// ADMIN API ENDPOINTS
// ========================================

// Admin Users Statistics
app.get('/api/admin/users', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Total users
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const total = parseInt(totalResult.rows[0].count);

        // Active users (logged in last 30 days)
        const activeResult = await pool.query(`
            SELECT COUNT(*) as count FROM users 
            WHERE laatste_login > NOW() - INTERVAL '30 days'
        `);
        const active = parseInt(activeResult.rows[0].count);

        // New users today
        const newTodayResult = await pool.query(`
            SELECT COUNT(*) as count FROM users 
            WHERE DATE(aangemaakt) = CURRENT_DATE
        `);
        const newToday = parseInt(newTodayResult.rows[0].count);

        // Recent users with task counts (more detailed info for table)
        const recentResult = await pool.query(`
            SELECT u.id, u.naam, u.email, u.aangemaakt, u.laatste_login, 
                   COUNT(t.id) as task_count,
                   COUNT(CASE WHEN t.afgewerkt IS NULL THEN 1 END) as active_tasks,
                   COUNT(CASE WHEN t.afgewerkt IS NOT NULL THEN 1 END) as completed_tasks
            FROM users u
            LEFT JOIN taken t ON u.id = t.user_id
            GROUP BY u.id, u.naam, u.email, u.aangemaakt, u.laatste_login
            ORDER BY u.laatste_login DESC NULLS LAST, u.aangemaakt DESC
            LIMIT 20
        `);

        res.json({
            total,
            active,
            newToday,
            recent: recentResult.rows.map(user => ({
                ...user,
                name: user.naam, // Add name field for consistency
                created_at: user.aangemaakt, // Add created_at field for consistency
                last_login: user.laatste_login, // Add last_login field for consistency
                task_count: parseInt(user.task_count),
                active_tasks: parseInt(user.active_tasks),
                completed_tasks: parseInt(user.completed_tasks)
            }))
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Tasks Statistics
app.get('/api/admin/tasks', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Total tasks
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM taken');
        const total = parseInt(totalResult.rows[0].count);

        // Completed tasks (tasks with afgewerkt timestamp)
        const completedResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken WHERE afgewerkt IS NOT NULL
        `);
        const completed = parseInt(completedResult.rows[0].count);

        // Recurring tasks
        const recurringResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken WHERE herhaling_actief = true
        `);
        const recurring = parseInt(recurringResult.rows[0].count);

        // Tasks by list
        const byListResult = await pool.query(`
            SELECT lijst as list_name, COUNT(*) as count
            FROM taken
            GROUP BY lijst
            ORDER BY count DESC
        `);

        res.json({
            total,
            completed,
            recurring,
            byList: byListResult.rows
        });
    } catch (error) {
        console.error('Admin tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin System Statistics
app.get('/api/admin/system', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Database size estimation
        const sizeResult = await pool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                   pg_database_size(current_database()) as size_bytes
        `);

        // Total records across all tables
        const tablesResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);

        let totalRecords = 0;
        const tableDetails = [];
        for (const table of tablesResult.rows) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
                const count = parseInt(countResult.rows[0].count);
                totalRecords += count;
                tableDetails.push({ table_name: table.table_name, count });
            } catch (error) {
            }
        }

        // Daily growth (tasks created today)
        const dailyGrowthResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken WHERE DATE(aangemaakt) = CURRENT_DATE
        `);
        const dailyGrowth = parseInt(dailyGrowthResult.rows[0].count);

        res.json({
            dbSize: sizeResult.rows[0].size_bytes,
            totalRecords,
            dailyGrowth,
            tables: tableDetails
        });
    } catch (error) {
        console.error('Admin system error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Insights
app.get('/api/admin/insights', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Average tasks per day (last 30 days)
        const tasksPerDayResult = await pool.query(`
            SELECT AVG(daily_count) as avg_tasks
            FROM (
                SELECT DATE(aangemaakt) as date, COUNT(*) as daily_count
                FROM taken
                WHERE aangemaakt > NOW() - INTERVAL '30 days'
                GROUP BY DATE(aangemaakt)
            ) daily_stats
        `);
        const tasksPerDay = Math.round(tasksPerDayResult.rows[0].avg_tasks || 0);

        // Completion rate
        const completionResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NOT NULL) * 100.0 / 
                NULLIF((SELECT COUNT(*) FROM taken), 0) as completion_rate
        `);
        const completionRate = Math.round(completionResult.rows[0].completion_rate || 0);

        // Productivity score (tasks completed per active user)
        const productivityResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NOT NULL) * 1.0 /
                NULLIF((SELECT COUNT(*) FROM users WHERE laatste_login > NOW() - INTERVAL '30 days'), 0) as productivity
        `);
        const productivityScore = Math.round(productivityResult.rows[0].productivity || 0);

        res.json({
            tasksPerDay,
            completionRate,
            productivityScore
        });
    } catch (error) {
        console.error('Admin insights error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Monitoring
app.get('/api/admin/monitoring', async (req, res) => {
    try {
        const status = pool ? 'Healthy' : 'Database Error';
        const uptime = process.uptime();
        const uptimeStr = Math.floor(uptime / 3600) + 'h ' + Math.floor((uptime % 3600) / 60) + 'm';

        // Real error count from tracked errors
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        const errors24h = errorLogs.filter(error => 
            new Date(error.timestamp).getTime() > twentyFourHoursAgo
        ).length;

        res.json({
            status,
            uptime: uptimeStr,
            errors24h,
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
        });
    } catch (error) {
        console.error('Admin monitoring error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Popular Projects
app.get('/api/admin/projects', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        const result = await pool.query(`
            SELECT naam as name, 
                   0 as task_count,
                   0 as user_count,
                   0 as completion_rate
            FROM projecten 
            ORDER BY naam
            LIMIT 20
        `);

        res.json({
            popular: result.rows.map(row => ({
                ...row,
                completion_rate: Math.round(row.completion_rate)
            }))
        });
    } catch (error) {
        console.error('Admin projects error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Popular Contexts
app.get('/api/admin/contexts', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        const result = await pool.query(`
            SELECT naam as name,
                   0 as task_count,
                   0 as user_count,
                   0 as avg_duration
            FROM contexten 
            ORDER BY naam
            LIMIT 20
        `);

        res.json({
            popular: result.rows.map(row => ({
                ...row,
                avg_duration: Math.round(row.avg_duration)
            }))
        });
    } catch (error) {
        console.error('Admin contexts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Error Logs (real-time from server tracking)
app.get('/api/admin/errors', async (req, res) => {
    try {
        res.json({
            recent: errorLogs.map(error => ({
                timestamp: error.timestamp,
                endpoint: error.endpoint,
                message: `${error.statusCode}: ${error.message.substring(0, 100)}`,
                user_email: null, // Could be enhanced to track actual user
                method: error.method,
                statusCode: error.statusCode
            }))
        });
    } catch (error) {
        console.error('Admin errors error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin API Usage Statistics (real-time from server tracking)
app.get('/api/admin/api-usage', async (req, res) => {
    try {
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        
        const endpoints = Array.from(apiStats.entries())
            .map(([endpoint, stats]) => ({
                endpoint: endpoint.replace(/GET |POST |PUT |DELETE /, ''),
                calls_24h: stats.calls, // For now all calls (could filter by time)
                avg_response_time: stats.calls > 0 ? Math.round(stats.totalTime / stats.calls) : 0,
                error_count: stats.errors,
                last_called: stats.lastCalled
            }))
            .filter(stat => stat.calls_24h > 0)
            .sort((a, b) => b.calls_24h - a.calls_24h)
            .slice(0, 20); // Top 20 endpoints

        res.json({
            endpoints,
            totalRequests: Array.from(apiStats.values()).reduce((sum, stat) => sum + stat.calls, 0),
            totalErrors: Array.from(apiStats.values()).reduce((sum, stat) => sum + stat.errors, 0)
        });
    } catch (error) {
        console.error('Admin API usage error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Email Statistics
app.get('/api/admin/email-stats', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Total email imports (tasks with opmerkingen suggesting email origin)
        const totalResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken 
            WHERE opmerkingen LIKE '%Email import%' 
               OR opmerkingen LIKE '%Datum:%' 
               OR opmerkingen LIKE '%Duur:%'
        `);
        const total = parseInt(totalResult.rows[0].count);

        // This week
        const thisWeekResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken 
            WHERE (opmerkingen LIKE '%Email import%' 
                   OR opmerkingen LIKE '%Datum:%' 
                   OR opmerkingen LIKE '%Duur:%')
              AND aangemaakt > NOW() - INTERVAL '7 days'
        `);
        const thisWeek = parseInt(thisWeekResult.rows[0].count);

        // Success rate (assuming 98% for now, in production track actual failures)
        const successRate = 98;

        res.json({
            total,
            thisWeek,
            successRate
        });
    } catch (error) {
        console.error('Admin email stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Export Data
app.get('/api/admin/export', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Get comprehensive data for CSV export
        const users = await pool.query(`
            SELECT u.id, u.naam, u.email, u.aangemaakt, u.laatste_login,
                   COUNT(t.id) as total_tasks,
                   COUNT(CASE WHEN t.afgewerkt IS NOT NULL THEN 1 END) as completed_tasks
            FROM users u
            LEFT JOIN taken t ON u.id = t.user_id
            GROUP BY u.id, u.naam, u.email, u.aangemaakt, u.laatste_login
            ORDER BY u.aangemaakt DESC
        `);

        // Convert to CSV
        const csvHeaders = ['User ID', 'Name', 'Email', 'Registered', 'Last Login', 'Total Tasks', 'Completed Tasks'];
        let csvContent = csvHeaders.join(',') + '\n';

        users.rows.forEach(user => {
            const row = [
                user.id,
                `"${user.naam}"`,
                user.email,
                user.aangemaakt,
                user.laatste_login || '',
                user.total_tasks,
                user.completed_tasks
            ];
            csvContent += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tickedify-export.csv');
        res.send(csvContent);
    } catch (error) {
        console.error('Admin export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint voor admin data onderzoek
app.get('/api/admin/debug', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Alle unieke lijst waarden
        const lijstResult = await pool.query('SELECT DISTINCT lijst, COUNT(*) as count FROM taken GROUP BY lijst ORDER BY count DESC');
        
        // Sample taken om te zien wat erin staat
        const sampleResult = await pool.query('SELECT id, tekst, lijst, afgewerkt FROM taken LIMIT 10');
        
        // Check database schema voor taken tabel
        const schemaResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'taken' 
            ORDER BY ordinal_position
        `);

        res.json({
            lijstWaarden: lijstResult.rows,
            sampleTaken: sampleResult.rows,
            databaseSchema: schemaResult.rows
        });
    } catch (error) {
        console.error('Admin debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Maintenance
app.post('/api/admin/maintenance', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Perform maintenance tasks
        let cleanedCount = 0;

        // Clean up orphaned records (example: tasks without users)
        const cleanupResult = await pool.query(`
            DELETE FROM taken WHERE user_id NOT IN (SELECT id FROM users)
        `);
        cleanedCount += cleanupResult.rowCount || 0;

        // Update database statistics
        await pool.query('ANALYZE');

        res.json({
            success: true,
            message: `Onderhoud voltooid. ${cleanedCount} onnodige records verwijderd.`
        });
    } catch (error) {
        console.error('Admin maintenance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Authentication Endpoint
app.post('/api/admin/auth', async (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD || 'tefhi5-kudgIr-girjot'; // fallback to current password
        
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        
        if (password === adminPassword) {
            // Set admin session flag
            req.session.isAdmin = true;
            req.session.adminAuthenticated = true; // Also set this for consistency
            req.session.adminLoginTime = new Date().toISOString();
            
            res.json({ 
                success: true, 
                message: 'Admin authentication successful',
                loginTime: req.session.adminLoginTime
            });
        } else {
            res.status(401).json({ error: 'Invalid admin password' });
        }
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Admin Session Check Endpoint
app.get('/api/admin/session', (req, res) => {
    if (req.session && req.session.isAdmin) {
        const loginTime = req.session.adminLoginTime;
        const sessionAge = new Date() - new Date(loginTime);

        res.json({
            authenticated: true,
            isAdmin: true,
            loginTime: loginTime,
            sessionAge: sessionAge
        });
    } else {
        res.status(401).json({
            authenticated: false,
            message: 'No active admin session'
        });
    }
});

// Admin Logout Endpoint
app.post('/api/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    req.session.adminLoginTime = null;
    res.json({ success: true, message: 'Logged out successfully' });
});

// Admin Feedback Endpoints
app.get('/api/admin/feedback', async (req, res) => {
    try {
        // Check admin authentication
        if (!req.session.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }


        // Get all feedback with user information
        const feedback = await pool.query(`
            SELECT 
                f.*,
                u.naam as gebruiker_naam,
                u.email as gebruiker_email
            FROM feedback f
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.aangemaakt DESC
        `);


        res.json({
            success: true,
            feedback: feedback.rows || []
        });
    } catch (error) {
        console.error('Error fetching admin feedback:', error);
        res.status(500).json({ 
            error: 'Database error',
            message: error.message 
        });
    }
});

app.get('/api/admin/feedback/stats', async (req, res) => {
    try {
        // Check admin authentication
        if (!req.session.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }


        // Get feedback statistics
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE type = 'bug') as bugs,
                COUNT(*) FILTER (WHERE type = 'feature') as features,
                COUNT(*) FILTER (WHERE status = 'nieuw') as nieuw,
                COUNT(*) FILTER (WHERE status = 'bekeken') as bekeken,
                COUNT(*) FILTER (WHERE status = 'in_behandeling') as in_behandeling,
                COUNT(*) FILTER (WHERE status = 'opgelost') as opgelost,
                COUNT(*) as totaal
            FROM feedback
        `);


        res.json({
            success: true,
            stats: stats.rows[0] || {
                bugs: 0,
                features: 0,
                nieuw: 0,
                bekeken: 0,
                in_behandeling: 0,
                opgelost: 0,
                totaal: 0
            }
        });
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        res.status(500).json({ 
            error: 'Database error',
            message: error.message 
        });
    }
});

app.put('/api/admin/feedback/:id', async (req, res) => {
    try {
        // Check admin authentication
        if (!req.session.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['nieuw', 'bekeken', 'in_behandeling', 'opgelost'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status',
                valid: validStatuses 
            });
        }

        // Update feedback status
        const result = await pool.query(`
            UPDATE feedback 
            SET status = $1, bijgewerkt = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({
            success: true,
            feedback: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating feedback:', error);
        res.status(500).json({ 
            error: 'Database error',
            message: error.message 
        });
    }
});

// Debug endpoint voor feedback (tijdelijk)
app.get('/api/debug/feedback-count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM feedback');
        const feedbackSummary = await pool.query(`
            SELECT type, status, COUNT(*) as count 
            FROM feedback 
            GROUP BY type, status
        `);
        res.json({
            total: result.rows[0].total,
            summary: feedbackSummary.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tijdelijke debug endpoint zonder auth
app.get('/api/debug/feedback-test', async (req, res) => {
    try {
        // Test stats query
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE type = 'bug') as bugs,
                COUNT(*) FILTER (WHERE type = 'feature') as features,
                COUNT(*) FILTER (WHERE status = 'nieuw') as nieuw,
                COUNT(*) FILTER (WHERE status = 'bekeken') as bekeken,
                COUNT(*) FILTER (WHERE status = 'in_behandeling') as in_behandeling,
                COUNT(*) FILTER (WHERE status = 'opgelost') as opgelost,
                COUNT(*) as totaal
            FROM feedback
        `);

        // Test feedback list query
        const feedback = await pool.query(`
            SELECT 
                f.*,
                u.naam as gebruiker_naam,
                u.email as gebruiker_email
            FROM feedback f
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.aangemaakt DESC
            LIMIT 10
        `);

        res.json({
            stats: stats.rows[0],
            feedback_count: feedback.rows.length,
            sample_feedback: feedback.rows
        });
    } catch (error) {
        console.error('Debug feedback test error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

// ===== ADMIN DASHBOARD V2 STATISTICS ENDPOINTS =====

// GET /api/admin2/stats/growth - User growth data for chart (last 30 days)
app.get('/api/admin2/stats/growth', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Query voor user growth per dag (laatste 30 dagen)
        const growthQuery = `
            SELECT
                DATE(created_at) as date,
                COUNT(*) as new_users
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;

        const result = await pool.query(growthQuery);

        // Bereken cumulative count
        let cumulative = 0;

        // Haal eerst het totaal aantal users vóór de 30-dagen periode
        const baseCountQuery = `
            SELECT COUNT(*) as count
            FROM users
            WHERE created_at < NOW() - INTERVAL '30 days'
        `;
        const baseResult = await pool.query(baseCountQuery);
        cumulative = parseInt(baseResult.rows[0].count || 0);

        // Map de resultaten en voeg cumulative toe
        const data = result.rows.map(row => {
            cumulative += parseInt(row.new_users);
            return {
                date: row.date,
                new_users: parseInt(row.new_users),
                cumulative: cumulative
            };
        });

        res.json({
            period: '30d',
            data: data
        });

    } catch (error) {
        console.error('Error fetching growth statistics:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch statistics'
        });
    }
});

// ===== BETA MANAGEMENT ADMIN ENDPOINTS =====

app.get('/api/admin/beta/status', async (req, res) => {
    try {
        const betaConfig = await db.getBetaConfig();
        
        // Get beta user statistics
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_beta_users,
                COUNT(CASE WHEN subscription_status = 'beta_active' THEN 1 END) as active_beta_users,
                COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_beta_users,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
            FROM users 
            WHERE account_type = 'beta'
        `);
        
        const stats = result.rows[0];
        
        res.json({
            success: true,
            betaConfig,
            statistics: {
                totalBetaUsers: parseInt(stats.total_beta_users),
                activeBetaUsers: parseInt(stats.active_beta_users),
                expiredBetaUsers: parseInt(stats.expired_beta_users),
                newThisWeek: parseInt(stats.new_this_week)
            }
        });
    } catch (error) {
        console.error('Error getting beta status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/beta/toggle', async (req, res) => {
    try {
        const { active } = req.body;
        
        // Update beta config
        const updatedConfig = await db.updateBetaConfig(active);
        
        // If ending beta period, update all active beta users to beta_expired
        if (!active) {
            await pool.query(`
                UPDATE users
                SET subscription_status = 'beta_expired'
                WHERE account_type = 'beta' AND subscription_status = 'beta_active'
            `);
        }
        
        res.json({
            success: true,
            message: active ? 'Beta periode geactiveerd' : 'Beta periode beëindigd',
            config: updatedConfig
        });
    } catch (error) {
        console.error('Error toggling beta status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/beta/users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                email,
                naam,
                account_type,
                subscription_status,
                ghl_contact_id,
                created_at,
                laatste_login as last_activity
            FROM users 
            WHERE account_type = 'beta'
            ORDER BY created_at DESC
            LIMIT 50
        `);
        
        res.json({
            success: true,
            users: result.rows
        });
    } catch (error) {
        console.error('Error getting beta users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all users (both beta and regular) for admin management
app.get('/api/admin/all-users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                email,
                naam,
                account_type,
                subscription_status,
                selected_plan,
                plan_selected_at,
                selection_source,
                ghl_contact_id,
                created_at,
                laatste_login as last_activity,
                (SELECT COUNT(*) FROM taken WHERE user_id = users.id) as task_count
            FROM users
            ORDER BY laatste_login DESC NULLS LAST, created_at DESC
            LIMIT 100
        `);
        
        res.json({
            success: true,
            users: result.rows
        });
    } catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user account type
app.put('/api/admin/user/:id/account-type', async (req, res) => {
    try {
        const userId = req.params.id;
        const { account_type } = req.body;
        
        // Validate account type
        if (!account_type || !['beta', 'regular'].includes(account_type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid account type. Must be "beta" or "regular"' 
            });
        }
        
        // Get current user data
        const currentUserResult = await pool.query(
            'SELECT email, account_type, subscription_status FROM users WHERE id = $1',
            [userId]
        );
        
        if (currentUserResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const currentUser = currentUserResult.rows[0];
        let newSubscriptionStatus;
        
        // Determine new subscription status based on account type
        if (account_type === 'regular') {
            newSubscriptionStatus = 'active';
        } else if (account_type === 'beta') {
            // Check if beta period is active to set correct status
            const betaConfig = await db.getBetaConfig();
            newSubscriptionStatus = betaConfig.beta_period_active ? 'beta_active' : 'beta_expired';
        }
        
        // Update user account type and subscription status
        await pool.query(`
            UPDATE users 
            SET account_type = $1, 
                subscription_status = $2
            WHERE id = $3
        `, [account_type, newSubscriptionStatus, userId]);
        
        
        res.json({
            success: true,
            message: `User account type updated from ${currentUser.account_type} to ${account_type}`,
            user: {
                id: userId,
                email: currentUser.email,
                account_type: account_type,
                subscription_status: newSubscriptionStatus
            }
        });
        
    } catch (error) {
        console.error('Error updating user account type:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Force beta database migration endpoint
app.get('/api/admin/force-beta-migration', async (req, res) => {
    try {
        
        // Add beta columns to users table if they don't exist
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'regular',
            ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS ghl_contact_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        
        // Create beta_config table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS beta_config (
                id INTEGER PRIMARY KEY DEFAULT 1,
                beta_period_active BOOLEAN DEFAULT TRUE,
                beta_ended_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert default beta config if not exists
        await pool.query(`
            INSERT INTO beta_config (id, beta_period_active, created_at, updated_at)
            VALUES (1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING
        `);

        // Add subscription-related columns to users table if they don't exist
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS plugandpay_subscription_id VARCHAR(255)
        `);

        // Set existing users to beta type if they were created recently (assuming they are beta testers)
        await pool.query(`
            UPDATE users 
            SET account_type = 'beta', 
                subscription_status = 'beta_active'
            WHERE account_type IS NULL OR account_type = 'regular'
        `);
        
        // Also reset any expired users back to active if beta period is active
        const betaConfig = await db.getBetaConfig();
        if (betaConfig.beta_period_active) {
            await pool.query(`
                UPDATE users
                SET subscription_status = 'beta_active'
                WHERE account_type = 'beta' AND (subscription_status = 'expired' OR subscription_status = 'beta_expired')
            `);
        }
        
        res.json({
            success: true,
            message: 'Beta migration completed successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Beta migration error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Migration endpoint: Fix expired status to beta_expired
app.get('/api/admin/migrate-expired-to-beta-expired', async (req, res) => {
    try {

        // Update all beta users with 'expired' status to 'beta_expired'
        const result = await pool.query(`
            UPDATE users
            SET subscription_status = 'beta_expired'
            WHERE account_type = 'beta' AND subscription_status = 'expired'
            RETURNING id, email, subscription_status
        `);


        res.json({
            success: true,
            message: `Successfully migrated ${result.rows.length} users`,
            updated_users: result.rows,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Migration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug endpoint to update trial end date (for testing expired trials)
app.post('/api/debug/update-trial-end-date', async (req, res) => {
    try {
        const { email, trial_end_date } = req.body;

        if (!email || !trial_end_date) {
            return res.status(400).json({ error: 'Email and trial_end_date are required' });
        }

        const result = await pool.query(`
            UPDATE users
            SET trial_end_date = $1
            WHERE email = $2
            RETURNING id, email, subscription_status, trial_start_date, trial_end_date
        `, [trial_end_date, email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Trial end date updated',
            user: result.rows[0],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error updating trial end date:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check users table schema
app.get('/api/debug/users-schema', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);

        res.json({
            table: 'users',
            columns: result.rows,
            column_count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching users schema:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check user subscription status
app.get('/api/debug/user-subscription-status', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email parameter required' });
        }

        const result = await pool.query(`
            SELECT
                id,
                email,
                naam,
                account_type,
                subscription_status,
                had_trial,
                trial_start_date,
                trial_end_date,
                created_at,
                laatste_login
            FROM users
            WHERE email = $1
        `, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Check what validatePlanSelection would return
        const validationResults = {
            trial_14_days: validatePlanSelection('trial_14_days', user.subscription_status, user.had_trial),
            monthly_7: validatePlanSelection('monthly_7', user.subscription_status, user.had_trial),
            monthly_8: validatePlanSelection('monthly_8', user.subscription_status, user.had_trial),
            yearly_70: validatePlanSelection('yearly_70', user.subscription_status, user.had_trial),
            yearly_80: validatePlanSelection('yearly_80', user.subscription_status, user.had_trial)
        };

        res.json({
            user: user,
            validation: validationResults,
            subscription_states_enum: SUBSCRIPTION_STATES,
            plan_ids_enum: PLAN_IDS
        });

    } catch (error) {
        console.error('Error checking user subscription status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test users cleanup endpoints
app.get('/api/admin/test-users', async (req, res) => {
    try {
        // Check for admin authentication via session or basic check
        if (!req.session.isAdmin) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        
        // Get all users with their related data counts for preview
        const result = await pool.query(`
            SELECT 
                u.id,
                u.email,
                u.naam,
                u.created_at,
                u.account_type,
                u.subscription_status,
                u.ghl_contact_id,
                u.laatste_login,
                (SELECT COUNT(*) FROM taken WHERE user_id = u.id) as task_count,
                (SELECT COUNT(*) FROM projecten WHERE user_id = u.id) as project_count,
                (SELECT COUNT(*) FROM contexten WHERE user_id = u.id) as context_count
            FROM users u
            ORDER BY u.created_at DESC
        `);
        
        // Filter for potential test users based on email patterns
        const testUsers = result.rows.filter(user => {
            const email = (user.email || '').toLowerCase();
            return (
                email.startsWith('test') ||
                email.startsWith('demo') ||
                email.includes('@test.') ||
                email.includes('@example.') ||
                email.includes('@demo.') ||
                email.includes('foo@') ||
                email.includes('bar@') ||
                email.startsWith('example')
            );
        });
        
        res.json({
            success: true,
            users: testUsers,
            total: testUsers.length
        });
        
    } catch (error) {
        console.error('Error getting test users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/delete-test-users', async (req, res) => {
    try {
        // Check for admin authentication
        if (!req.session.isAdmin) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        
        const { userIds } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'No user IDs provided' });
        }
        
        
        let deletedCount = 0;
        const results = [];
        
        // Use transaction for safety
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const userId of userIds) {
                try {
                    // Get user info for logging
                    const userResult = await client.query('SELECT email, naam FROM users WHERE id = $1', [userId]);
                    const user = userResult.rows[0];
                    
                    if (!user) {
                        results.push({ userId, status: 'not_found', error: 'User not found' });
                        continue;
                    }
                    
                    
                    // First check what data this user has
                    const dataCheck = await client.query(`
                        SELECT 
                            (SELECT COUNT(*) FROM taken WHERE user_id = $1) as tasks,
                            (SELECT COUNT(*) FROM projecten WHERE user_id = $1) as projects,
                            (SELECT COUNT(*) FROM contexten WHERE user_id = $1) as contexts,
                            (SELECT COUNT(*) FROM dagelijkse_planning WHERE user_id = $1) as planning,
                            (SELECT COUNT(*) FROM feedback WHERE user_id = $1) as feedback
                    `, [userId]);
                    
                    const counts = dataCheck.rows[0];
                    
                    // Delete all related data first (in correct order to avoid FK violations)
                    
                    // 1. Delete subtaken (depends on taken)
                    const subtakenDeleted = await client.query('DELETE FROM subtaken WHERE parent_taak_id IN (SELECT id FROM taken WHERE user_id = $1)', [userId]);
                    
                    // 2. Delete bijlagen (depends on taken)  
                    const bijlagenDeleted = await client.query('DELETE FROM bijlagen WHERE taak_id IN (SELECT id FROM taken WHERE user_id = $1)', [userId]);
                    
                    // 3. Delete dagelijkse_planning (references taken)
                    const planningDeleted = await client.query('DELETE FROM dagelijkse_planning WHERE user_id = $1', [userId]);
                    
                    // 4. Delete taken (references projecten/contexten)
                    const takenDeleted = await client.query('DELETE FROM taken WHERE user_id = $1', [userId]);
                    
                    // 5. Delete projecten 
                    const projectenDeleted = await client.query('DELETE FROM projecten WHERE user_id = $1', [userId]);
                    
                    // 6. Delete contexten
                    const contextenDeleted = await client.query('DELETE FROM contexten WHERE user_id = $1', [userId]);
                    
                    // 7. Delete feedback
                    const feedbackDeleted = await client.query('DELETE FROM feedback WHERE user_id = $1', [userId]);
                    
                    // 8. Delete mind_dump_preferences if exists
                    try {
                        const mindDumpDeleted = await client.query('DELETE FROM mind_dump_preferences WHERE user_id = $1', [userId]);
                    } catch (mindDumpError) {
                    }
                    
                    // 9. Finally delete the user
                    const deleteResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);
                    
                    if (deleteResult.rowCount > 0) {
                        deletedCount++;
                        results.push({ 
                            userId, 
                            email: user.email,
                            status: 'deleted',
                            originalCounts: counts,
                            deletedCounts: {
                                subtaken: subtakenDeleted.rowCount,
                                bijlagen: bijlagenDeleted.rowCount,
                                planning: planningDeleted.rowCount,
                                taken: takenDeleted.rowCount,
                                projecten: projectenDeleted.rowCount,
                                contexten: contextenDeleted.rowCount,
                                feedback: feedbackDeleted.rowCount
                            }
                        });
                    } else {
                        results.push({ 
                            userId, 
                            email: user.email,
                            status: 'failed', 
                            error: 'User delete failed after cleaning related data',
                            originalCounts: counts
                        });
                    }
                    
                } catch (userError) {
                    console.error(`❌ Error deleting user ${userId}:`, userError);
                    results.push({ 
                        userId, 
                        status: 'error', 
                        error: userError.message 
                    });
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                deleted: deletedCount,
                total: userIds.length,
                message: `${deletedCount}/${userIds.length} test users deleted successfully`,
                results: results
            });
            
        } catch (transactionError) {
            await client.query('ROLLBACK');
            throw transactionError;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error deleting test users:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/admin/user-data/:userId', async (req, res) => {
    try {
        // Check for admin authentication
        if (!req.session.isAdmin) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        
        const { userId } = req.params;
        
        // Get detailed user data preview
        const userResult = await pool.query(`
            SELECT 
                id, email, naam, created_at, laatste_login,
                account_type, subscription_status, ghl_contact_id
            FROM users 
            WHERE id = $1
        `, [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Get related data counts
        const [tasksResult, projectsResult, contextsResult] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM taken WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*) FROM projecten WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*) FROM contexten WHERE user_id = $1', [userId])
        ]);
        
        const dataPreview = {
            user: user,
            relatedData: {
                tasks: parseInt(tasksResult.rows[0].count),
                projects: parseInt(projectsResult.rows[0].count),
                contexts: parseInt(contextsResult.rows[0].count)
            }
        };
        
        res.json({
            success: true,
            data: dataPreview
        });
        
    } catch (error) {
        console.error('Error getting user data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Migrate database constraints to enable CASCADE DELETE
app.get('/api/admin/migrate-cascade-delete', async (req, res) => {
    try {
        // Check for admin authentication
        if (!req.session.isAdmin) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Drop and recreate foreign key constraints with CASCADE DELETE
            const migrations = [
                // Projecten table
                'ALTER TABLE projecten DROP CONSTRAINT IF EXISTS projecten_user_id_fkey',
                'ALTER TABLE projecten ADD CONSTRAINT projecten_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
                
                // Contexten table  
                'ALTER TABLE contexten DROP CONSTRAINT IF EXISTS contexten_user_id_fkey',
                'ALTER TABLE contexten ADD CONSTRAINT contexten_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
                
                // Taken table
                'ALTER TABLE taken DROP CONSTRAINT IF EXISTS taken_user_id_fkey',
                'ALTER TABLE taken ADD CONSTRAINT taken_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
                
                // Dagelijkse planning table (user_id)
                'ALTER TABLE dagelijkse_planning DROP CONSTRAINT IF EXISTS dagelijkse_planning_user_id_fkey',
                'ALTER TABLE dagelijkse_planning ADD CONSTRAINT dagelijkse_planning_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
                
                // Feedback table
                'ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_user_id_fkey',
                'ALTER TABLE feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
            ];
            
            for (const migration of migrations) {
                try {
                    await client.query(migration);
                } catch (migError) {
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                message: 'CASCADE DELETE constraints migrated successfully',
                note: 'All user-related data will now be automatically deleted when users are deleted'
            });
            
        } catch (transactionError) {
            await client.query('ROLLBACK');
            throw transactionError;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ CASCADE DELETE migration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== Admin Dashboard v2 Statistics Endpoints =====

// GET /api/admin2/stats/revenue - Payment and revenue statistics
app.get('/api/admin2/stats/revenue', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }


        // Hardcoded pricing (TODO: migrate to payment_configurations table with pricing)
        const pricing = {
            'monthly_7': 7.00,
            'yearly_70': 70.00,
            'monthly_8': 8.00,
            'yearly_80': 80.00,
            'free': 0
        };

        // Calculate MRR (Monthly Recurring Revenue) by tier with hardcoded pricing
        // NOTE: Using selected_plan because Plug&Pay webhook sets that field, not subscription_tier
        const mrrQuery = await pool.query(`
            SELECT
                COALESCE(selected_plan, 'free') as tier,
                COUNT(*) as user_count
            FROM users
            WHERE subscription_status = 'active'
              AND COALESCE(selected_plan, 'free') != 'free'
            GROUP BY COALESCE(selected_plan, 'free')
            ORDER BY COALESCE(selected_plan, 'free')
        `);

        // Format by_tier array with calculated revenue
        const byTier = mrrQuery.rows.map(row => {
            const tier = row.tier;
            const userCount = parseInt(row.user_count);
            const priceMonthly = pricing[tier] || 0;
            const revenue = userCount * priceMonthly;

            return {
                tier,
                user_count: userCount,
                price_monthly: priceMonthly,
                revenue
            };
        });

        // Calculate total MRR
        const totalMrr = byTier.reduce((sum, tier) => sum + tier.revenue, 0);

        // Get payment configurations (simplified - no pricing data)
        const configsQuery = await pool.query(`
            SELECT
                plan_id,
                plan_name,
                checkout_url,
                is_active
            FROM payment_configurations
            WHERE is_active = true
            ORDER BY plan_id
        `);

        const paymentConfigs = configsQuery.rows.map(row => ({
            plan_id: row.plan_id,
            plan_name: row.plan_name,
            checkout_url: row.checkout_url,
            is_active: row.is_active
        }));


        res.json({
            mrr: totalMrr,
            arr: totalMrr * 12,  // Annual Recurring Revenue
            by_tier: byTier,
            payment_configs: paymentConfigs
        });

    } catch (error) {
        console.error('❌ Error fetching revenue statistics:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch statistics'
        });
    }
});

// ===== Admin Dashboard v2 User Management Endpoints =====

// GET /api/admin2/users/search - Search for users by email, name, or ID
app.get('/api/admin2/users/search', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Get query parameter
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 50;

        // Validation: minimum 2 characters
        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                error: 'Invalid query',
                message: 'Search term must be at least 2 characters'
            });
        }


        // Search in email, naam, and id (cast to text)
        const searchPattern = `%${query}%`;
        const searchQuery = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.naam,
                u.account_type,
                CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END as subscription_tier,
                u.subscription_status,
                u.trial_end_date,
                u.actief,
                u.created_at,
                u.laatste_login
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE u.email ILIKE $1
                OR u.naam ILIKE $1
                OR u.id::text ILIKE $1
            ORDER BY
                CASE
                    WHEN u.email ILIKE $1 THEN 1
                    WHEN u.naam ILIKE $1 THEN 2
                    ELSE 3
                END,
                u.created_at DESC
            LIMIT $2
        `, [searchPattern, limit]);

        // Get total users count for context
        const totalQuery = await pool.query('SELECT COUNT(*) as total FROM users');
        const totalUsers = parseInt(totalQuery.rows[0].total);


        res.json({
            query: query,
            results: searchQuery.rows,
            count: searchQuery.rows.length,
            total_users: totalUsers
        });

    } catch (error) {
        console.error('❌ Error searching users:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to search users'
        });
    }
});

// GET /api/admin2/users/:id - Get detailed information about a specific user
app.get('/api/admin2/users/:id', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = req.params.id; // Accept string IDs like 'user_1750513625687_5458i79dj'

        // Validation: user ID must not be empty
        if (!userId || userId.trim() === '') {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must not be empty'
            });
        }


        // 1. Get user details
        const userQuery = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.naam,
                u.account_type,
                CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END as subscription_tier,
                u.subscription_status,
                u.trial_end_date,
                u.actief,
                u.created_at,
                u.laatste_login,
                u.onboarding_video_seen,
                u.onboarding_video_seen_at
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE u.id = $1
        `, [userId]);

        if (userQuery.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        const user = userQuery.rows[0];

        // 2. Get task summary (afgewerkt is a timestamp, not boolean)
        const taskSummaryQuery = await pool.query(`
            SELECT
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) as completed_tasks,
                COUNT(*) FILTER (WHERE afgewerkt IS NULL) as active_tasks,
                COUNT(*) FILTER (WHERE herhaling_actief = true) as recurring_tasks
            FROM taken
            WHERE user_id = $1
        `, [userId]);

        const taskSummary = taskSummaryQuery.rows[0];

        // 3. Get tasks by project (top 10)
        // Fix: Use project_id with AS aliasing for frontend compatibility
        const tasksByProjectQuery = await pool.query(`
            SELECT project_id AS project, COUNT(*) as count
            FROM taken
            WHERE user_id = $1 AND project_id IS NOT NULL
            GROUP BY project_id
            ORDER BY count DESC
            LIMIT 10
        `, [userId]);

        // 4. Get tasks by context (top 10)
        // Fix: Use context_id with AS aliasing for frontend compatibility
        const tasksByContextQuery = await pool.query(`
            SELECT context_id AS context, COUNT(*) as count
            FROM taken
            WHERE user_id = $1 AND context_id IS NOT NULL
            GROUP BY context_id
            ORDER BY count DESC
            LIMIT 10
        `, [userId]);

        // 5. Get email import summary
        const emailSummaryQuery = await pool.query(`
            SELECT
                COUNT(*) as total_imports,
                COUNT(*) FILTER (WHERE task_id IS NOT NULL) as processed_imports,
                MIN(imported_at) as first_import,
                MAX(imported_at) as last_import
            FROM email_imports
            WHERE user_id = $1
        `, [userId]);

        const emailSummary = emailSummaryQuery.rows[0];

        // 6. Get recent email imports (last 10)
        const recentEmailsQuery = await pool.query(`
            SELECT email_from, email_subject, imported_at
            FROM email_imports
            WHERE user_id = $1
            ORDER BY imported_at DESC
            LIMIT 10
        `, [userId]);

        // 7. Get subscription details with payment configuration
        const subscriptionQuery = await pool.query(`
            SELECT
                u.subscription_status,
                CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END as subscription_tier,
                u.trial_end_date,
                pc.plan_name,
                pc.checkout_url,
                pc.price_monthly
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            LEFT JOIN payment_configurations pc
                ON pc.plan_id = CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END AND pc.is_active = true
            WHERE u.id = $1
        `, [userId]);

        const subscription = subscriptionQuery.rows[0] || {
            subscription_status: user.subscription_status,
            subscription_tier: user.subscription_tier,
            trial_end_date: user.trial_end_date,
            plan_name: null,
            checkout_url: null,
            price_monthly: null
        };


        // Calculate completion rate and recent emails
        const totalTasks = parseInt(taskSummary.total_tasks) || 0;
        const completedTasks = parseInt(taskSummary.completed_tasks) || 0;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
        const pendingTasks = parseInt(taskSummary.active_tasks) || 0;

        // Build response according to frontend contract
        res.json({
            user: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                account_type: user.account_type,
                subscription_tier: user.subscription_tier,
                subscription_status: user.subscription_status,
                trial_end_date: user.trial_end_date,
                actief: user.actief,
                created_at: user.created_at,
                last_login: user.laatste_login,
                onboarding_video_seen: user.onboarding_video_seen,
                onboarding_video_seen_at: user.onboarding_video_seen_at
            },
            tasks: {
                summary: {
                    total: totalTasks,
                    completed: completedTasks,
                    completion_rate: completionRate,
                    pending: pendingTasks,
                    recurring: parseInt(taskSummary.recurring_tasks) || 0
                },
                by_project: tasksByProjectQuery.rows,
                by_context: tasksByContextQuery.rows
            },
            emails: {
                summary: {
                    total: parseInt(emailSummary.total_imports) || 0,
                    recent_30d: parseInt(emailSummary.processed_imports) || 0
                },
                recent: recentEmailsQuery.rows
            },
            subscription: {
                status: subscription.subscription_status,
                tier: subscription.subscription_tier,
                trial_end_date: subscription.trial_end_date,
                plan_name: subscription.plan_name,
                price_monthly: subscription.price_monthly
            }
        });

    } catch (error) {
        console.error('❌ Error getting user details:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ User ID that failed:', req.params.id);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to get user details',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/admin2/users/:id/tier - Change user's subscription tier
app.put('/api/admin2/users/:id/tier', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = parseInt(req.params.id);
        const { tier } = req.body;

        // Validation: user ID must be a valid number
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must be a positive number'
            });
        }

        // Validation: tier must be provided and valid
        const validTiers = ['free', 'monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'];
        if (!tier || !validTiers.includes(tier)) {
            return res.status(400).json({
                error: 'Invalid tier',
                message: 'Tier must be one of: free, monthly_7, yearly_70, monthly_8, yearly_80'
            });
        }


        // Get current user data before update
        const currentUserQuery = await pool.query(`
            SELECT id, email, subscription_tier
            FROM users
            WHERE id = $1
        `, [userId]);

        if (currentUserQuery.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        const currentUser = currentUserQuery.rows[0];
        const oldTier = currentUser.subscription_tier;

        // Update user's subscription tier (update subscription_tier column directly)
        const updateQuery = await pool.query(`
            UPDATE users
            SET subscription_tier = $1
            WHERE id = $2
            RETURNING id, subscription_tier
        `, [tier, userId]);

        const updatedAt = new Date().toISOString();

        // Log audit trail
        await pool.query(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action,
                target_user_id,
                old_value,
                new_value,
                timestamp,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.session.userId,
            'TIER_CHANGE',
            userId,
            oldTier,
            tier,
            updatedAt,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || 'Unknown'
        ]).catch(err => {
            // If audit log table doesn't exist yet, log to console but don't fail the request
        });


        res.json({
            success: true,
            user_id: userId,
            old_tier: oldTier,
            new_tier: tier,
            updated_at: updatedAt
        });

    } catch (error) {
        console.error('❌ Error changing user tier:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to change tier'
        });
    }
});

// PUT /api/admin2/users/:id/trial - Extend user's trial period
app.put('/api/admin2/users/:id/trial', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = parseInt(req.params.id);
        const { trial_end_date } = req.body;

        // Validation: user ID must be a valid number
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must be a positive number'
            });
        }

        // Validation: trial_end_date is required
        if (!trial_end_date) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'trial_end_date is required'
            });
        }

        // Validation: trial_end_date must be a valid date
        const trialDate = new Date(trial_end_date);
        if (isNaN(trialDate.getTime())) {
            return res.status(400).json({
                error: 'Invalid date',
                message: 'trial_end_date must be a valid ISO date (YYYY-MM-DD)'
            });
        }

        // Validation: trial_end_date must be in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of today
        trialDate.setHours(0, 0, 0, 0);

        if (trialDate <= today) {
            return res.status(400).json({
                error: 'Invalid date',
                message: 'Trial end date must be in the future'
            });
        }


        // Check if user exists and get old value
        const userQuery = await pool.query(
            'SELECT id, email, trial_end_date FROM users WHERE id = $1',
            [userId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        const oldTrialEnd = userQuery.rows[0].trial_end_date;

        // Update trial_end_date
        await pool.query(
            'UPDATE users SET trial_end_date = $1 WHERE id = $2',
            [trial_end_date, userId]
        );

        const updatedAt = new Date().toISOString();

        // Log audit trail
        await pool.query(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action,
                target_user_id,
                old_value,
                new_value,
                timestamp,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.session.userId,
            'TRIAL_EXTEND',
            userId,
            oldTrialEnd ? oldTrialEnd.toISOString().split('T')[0] : null,
            trial_end_date,
            updatedAt,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || 'Unknown'
        ]).catch(err => {
            // If audit log table doesn't exist yet, log to console but don't fail the request
        });


        res.json({
            success: true,
            user_id: userId,
            old_trial_end: oldTrialEnd ? oldTrialEnd.toISOString().split('T')[0] : null,
            new_trial_end: trial_end_date,
            updated_at: updatedAt
        });

    } catch (error) {
        console.error('❌ Error updating trial:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update trial'
        });
    }
});

// PUT /api/admin2/users/:id/block - Block user account (prevent login)
app.put('/api/admin2/users/:id/block', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = parseInt(req.params.id);
        const { blocked } = req.body;

        // Validation: user ID must be a valid number
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must be a positive number'
            });
        }

        // Validation: blocked must be boolean
        if (typeof blocked !== 'boolean') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Blocked must be a boolean value'
            });
        }

        // Security: prevent self-block
        if (userId === req.session.userId) {
            return res.status(403).json({
                error: 'Cannot block self',
                message: 'Admins cannot block their own account'
            });
        }


        // Check if user exists
        const userQuery = await pool.query(
            'SELECT id, email FROM users WHERE id = $1',
            [userId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        // Update actief status (actief = !blocked)
        await pool.query(
            'UPDATE users SET actief = $1 WHERE id = $2',
            [!blocked, userId]
        );

        const updatedAt = new Date().toISOString();

        // Invalidate all sessions for this user (if blocking)
        let sessionsInvalidated = 0;
        if (blocked) {
            // Delete sessions where user_id matches in the session data
            const deleteResult = await pool.query(`
                DELETE FROM session
                WHERE sess::jsonb->'passport'->>'user' = $1
                OR sess::jsonb->>'userId' = $1
            `, [userId.toString()]);

            sessionsInvalidated = deleteResult.rowCount || 0;
        }

        // Log audit trail
        await pool.query(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action,
                target_user_id,
                old_value,
                new_value,
                timestamp,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.session.userId,
            blocked ? 'USER_BLOCK' : 'USER_UNBLOCK',
            userId,
            (!blocked).toString(),
            blocked.toString(),
            updatedAt,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || 'Unknown'
        ]).catch(err => {
            // If audit log table doesn't exist yet, log to console but don't fail the request
        });


        res.json({
            success: true,
            user_id: userId,
            blocked: blocked,
            sessions_invalidated: sessionsInvalidated,
            updated_at: updatedAt
        });

    } catch (error) {
        console.error('❌ Error blocking user:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to block user'
        });
    }
});

// DELETE /api/admin2/users/:id - Delete user account and all associated data
app.delete('/api/admin2/users/:id', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = req.params.id; // Accept string IDs like 'user_1750513625687_5458i79dj'
        const adminUserId = req.session.userId;

        // Validation: user ID must not be empty
        if (!userId || userId.trim() === '') {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must not be empty'
            });
        }


        // Security Check 1: Prevent self-delete
        if (userId === adminUserId) {
            return res.status(403).json({
                error: 'Cannot delete self',
                message: 'Admins cannot delete their own account'
            });
        }

        // Get user info before deletion (for audit log and response)
        const userResult = await pool.query(
            'SELECT id, email, account_type FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        const targetUser = userResult.rows[0];

        // Security Check 2: Prevent deletion of last admin
        if (targetUser.account_type === 'admin') {
            const adminCountResult = await pool.query(
                "SELECT COUNT(*) as count FROM users WHERE account_type = 'admin'"
            );
            const adminCount = parseInt(adminCountResult.rows[0].count);

            if (adminCount <= 1) {
                return res.status(403).json({
                    error: 'Cannot delete last admin',
                    message: 'At least one admin account must remain'
                });
            }
        }

        // Count cascade deletions before deletion (for audit log and response)
        const tasksCountResult = await pool.query(
            'SELECT COUNT(*) as count FROM taken WHERE gebruiker_id = $1',
            [userId]
        );
        const tasksCount = parseInt(tasksCountResult.rows[0].count);

        const emailsCountResult = await pool.query(
            'SELECT COUNT(*) as count FROM email_imports WHERE user_id = $1',
            [userId]
        );
        const emailsCount = parseInt(emailsCountResult.rows[0].count);

        const sessionsCountResult = await pool.query(
            "SELECT COUNT(*) as count FROM sessions WHERE sess::text LIKE $1",
            [`%"userId":"${userId}"%`]
        );
        const sessionsCount = parseInt(sessionsCountResult.rows[0].count);


        // Perform deletion (cascades handled by database foreign keys)
        // Database schema has ON DELETE CASCADE for:
        // - taken.gebruiker_id -> users.id
        // - email_imports.user_id -> users.id
        // Sessions need manual cleanup (JSON column, no foreign key)

        await pool.query('BEGIN');

        // Delete user's sessions manually (sessions table has JSON data, no FK constraint)
        await pool.query(
            "DELETE FROM sessions WHERE sess::text LIKE $1",
            [`%"userId":"${userId}"%`]
        );

        // Delete user (cascades to tasks, email_imports via foreign keys)
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        await pool.query('COMMIT');

        const deletedAt = new Date().toISOString();

        // Log audit trail
        await pool.query(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action,
                target_user_id,
                old_value,
                new_value,
                timestamp,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.session.userId,
            'USER_DELETE',
            userId,
            targetUser.email,
            JSON.stringify({
                tasks: tasksCount,
                email_imports: emailsCount,
                sessions: sessionsCount
            }),
            deletedAt,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || 'Unknown'
        ]).catch(err => {
            // If audit log table doesn't exist yet, log to console but don't fail the request
        });


        res.json({
            success: true,
            user_id: targetUser.id,
            email: targetUser.email,
            deleted_at: deletedAt,
            cascade_deleted: {
                tasks: tasksCount,
                email_imports: emailsCount,
                sessions: sessionsCount
            }
        });

    } catch (error) {
        // Rollback transaction on error
        try {
            await pool.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('❌ Rollback error:', rollbackError);
        }

        console.error('❌ Error deleting user:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to delete user'
        });
    }
});

// POST /api/admin2/users/:id/reset-password - Reset user's password (admin-initiated)
app.post('/api/admin2/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = parseInt(req.params.id);

        // Validation: user ID must be a valid number
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must be a positive number'
            });
        }


        // 1. Check if user exists
        const userQuery = await pool.query(`
            SELECT id, email, naam
            FROM users
            WHERE id = $1
        `, [userId]);

        if (userQuery.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        const user = userQuery.rows[0];

        // 2. Generate random 12-character alphanumeric password
        const generatePassword = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
            let password = '';
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        };

        const newPassword = generatePassword();

        // 3. Hash the new password with bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 4. Update user's password in database
        await pool.query(`
            UPDATE users
            SET wachtwoord_hash = $1
            WHERE id = $2
        `, [hashedPassword, userId]);

        const timestamp = new Date().toISOString();

        // 5. Log audit trail
        await pool.query(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action,
                target_user_id,
                old_value,
                new_value,
                timestamp,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.session.userId,
            'PASSWORD_RESET',
            userId,
            null,  // old_value: niet opslaan voor security
            null,  // new_value: niet opslaan voor security
            timestamp,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || 'Unknown'
        ]).catch(err => {
            // If audit log table doesn't exist yet, log to console but don't fail the request
        });


        // 6. Return success with new password
        res.json({
            success: true,
            user_id: userId,
            email: user.email,
            new_password: newPassword,
            message: 'Provide this password to the user securely'
        });

    } catch (error) {
        console.error('❌ Error resetting password:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to reset password'
        });
    }
});

// POST /api/admin2/users/:id/logout - Force logout user (invalidate all sessions)
app.post('/api/admin2/users/:id/logout', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = parseInt(req.params.id);

        // Validation: user ID must be a valid number
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must be a positive number'
            });
        }


        // Check if user exists
        const userCheck = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        // Delete all sessions for this user
        // PostgreSQL session store: sess->'passport'->>'user' bevat user_id als string
        const deleteResult = await pool.query(`
            DELETE FROM session
            WHERE sess->>'passport' IS NOT NULL
                AND sess->'passport'->>'user' = $1::text
            RETURNING sid
        `, [userId]);

        const sessionsInvalidated = deleteResult.rows.length;

        // Log audit entry
        const timestamp = new Date().toISOString();
        await pool.query(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action,
                target_user_id,
                old_value,
                new_value,
                timestamp,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.session.userId,
            'FORCE_LOGOUT',
            userId,
            null,
            JSON.stringify({ sessions_invalidated: sessionsInvalidated }),
            timestamp,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || 'Unknown'
        ]).catch(err => {
            // If audit log table doesn't exist yet, log to console but don't fail the request
        });


        res.json({
            success: true,
            user_id: userId,
            sessions_invalidated: sessionsInvalidated,
            timestamp: timestamp
        });

    } catch (error) {
        console.error('❌ Error forcing logout:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to force logout'
        });
    }
});

// ========================================
// ADMIN DASHBOARD V2 - SYSTEM CONFIGURATION
// ========================================

// GET /api/admin2/system/settings - Get all system settings
app.get('/api/admin2/system/settings', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }


        // Query all settings from system_settings table
        const result = await pool.query(`
            SELECT key, value, description, updated_at
            FROM system_settings
            ORDER BY key ASC
        `);


        res.json({
            settings: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ System settings error:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            stack: error.stack
        });

        // Graceful fallback - return empty array if table doesn't exist or query fails
        res.status(200).json({
            settings: [],
            count: 0,
            warning: 'System settings table may not exist or query failed',
            debug: error.message  // Temporary for debugging
        });
    }
});

// PUT /api/admin2/system/settings/:key - Update a system setting
app.put('/api/admin2/system/settings/:key', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { key } = req.params;
        const { value } = req.body;


        // Validation: value must be non-empty string
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid value',
                message: 'Value is required and must be a non-empty string'
            });
        }

        // Special validation for onboarding_video_url
        if (key === 'onboarding_video_url') {
            const youtubePattern = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)[a-zA-Z0-9_-]+/;
            const vimeoPattern = /^https:\/\/(www\.)?vimeo\.com\/\d+/;

            const isValidUrl = youtubePattern.test(value) || vimeoPattern.test(value);

            if (!isValidUrl) {
                return res.status(400).json({
                    error: 'Invalid value',
                    message: 'onboarding_video_url must be a valid YouTube or Vimeo URL',
                    field: 'value'
                });
            }
        }

        // 1. Get old value first for audit trail
        const existingSetting = await pool.query(
            'SELECT value FROM system_settings WHERE key = $1',
            [key]
        );

        if (existingSetting.rows.length === 0) {
            return res.status(404).json({
                error: 'Setting not found',
                message: `No setting with key '${key}'`
            });
        }

        const oldValue = existingSetting.rows[0].value;

        // 2. Update with new value
        const updateResult = await pool.query(
            `UPDATE system_settings
             SET value = $1, updated_at = NOW()
             WHERE key = $2
             RETURNING updated_at`,
            [value, key]
        );

        const updatedAt = updateResult.rows[0].updated_at;

        // 3. Insert audit log with graceful fallback
        try {
            await pool.query(`
                INSERT INTO admin_audit_log (
                    admin_user_id,
                    action,
                    target_type,
                    target_identifier,
                    details,
                    ip_address,
                    user_agent,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                req.session.userId,
                'SETTING_UPDATE',
                'system_setting',
                key,
                JSON.stringify({
                    setting_key: key,
                    old_value: oldValue,
                    new_value: value
                }),
                req.ip,
                req.get('User-Agent') || 'Unknown'
            ]);
        } catch (auditError) {
            // Graceful fallback - don't fail the entire operation
            console.error('⚠️ Failed to create audit log (non-critical):', auditError.message);
        }


        res.json({
            success: true,
            key,
            old_value: oldValue,
            new_value: value,
            updated_at: updatedAt
        });

    } catch (error) {
        console.error('❌ Error updating system setting:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update system setting'
        });
    }
});

// ========================================
// ADMIN DASHBOARD V2 - DEBUG TOOLS
// ========================================

// GET /api/admin2/debug/user-data/:id - Complete user data inspector
app.get('/api/admin2/debug/user-data/:id', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userId = parseInt(req.params.id, 10);

        // Validate userId
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must be a positive integer'
            });
        }


        // Parallel queries voor performance - gebruik Promise.all
        const [
            userResult,
            taskSummary,
            tasksByProject,
            tasksByContext,
            emailSummary,
            recentEmails,
            sessionInfo,
            planningCount,
            recurringCount
        ] = await Promise.all([
            // 1. User details - ALLE velden
            pool.query(`
                SELECT
                    id,
                    email,
                    naam,
                    LENGTH(wachtwoord_hash) as password_hash_length,
                    account_type,
                    subscription_tier,
                    subscription_status,
                    trial_end_date,
                    actief,
                    created_at,
                    laatste_login,
                    onboarding_video_seen,
                    onboarding_video_seen_at
                FROM users
                WHERE id = $1
            `, [userId]),

            // 2. Task summary
            pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) as completed,
                    COUNT(*) FILTER (WHERE afgewerkt IS NULL) as pending,
                    COUNT(*) FILTER (WHERE herhaling_actief = true) as recurring,
                    0 as blocked,
                    CASE
                        WHEN COUNT(*) > 0 THEN
                            ROUND((COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL)::numeric / COUNT(*)::numeric) * 100, 1)
                        ELSE 0
                    END as completion_rate
                FROM taken
                WHERE user_id = $1
            `, [userId]),

            // 3. Tasks by project
            pool.query(`
                SELECT
                    COALESCE(project_id::text, '(geen project)') as project,
                    COUNT(*) as count
                FROM taken
                WHERE user_id = $1
                GROUP BY project_id
                ORDER BY count DESC
                LIMIT 20
            `, [userId]),

            // 4. Tasks by context
            pool.query(`
                SELECT
                    COALESCE(context_id::text, '(geen context)') as context,
                    COUNT(*) as count
                FROM taken
                WHERE user_id = $1
                GROUP BY context_id
                ORDER BY count DESC
                LIMIT 20
            `, [userId]),

            // 5. Email imports summary
            pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE imported_at >= NOW() - INTERVAL '30 days') as recent_30d,
                    MIN(imported_at) as oldest_import,
                    MAX(imported_at) as newest_import,
                    COUNT(*) FILTER (WHERE task_id IS NOT NULL) as processed,
                    COUNT(*) FILTER (WHERE task_id IS NOT NULL) as converted_to_task
                FROM email_imports
                WHERE user_id = $1
            `, [userId]),

            // 6. Recent email imports (last 10)
            pool.query(`
                SELECT
                    email_from,
                    email_subject,
                    imported_at,
                    CASE WHEN task_id IS NOT NULL THEN true ELSE false END as processed,
                    task_id
                FROM email_imports
                WHERE user_id = $1
                ORDER BY imported_at DESC
                LIMIT 10
            `, [userId]),

            // 7. Session info
            pool.query(`
                SELECT
                    COUNT(*) as active_sessions,
                    MAX(expire) as last_activity
                FROM session
                WHERE sess::text LIKE $1
                AND expire > NOW()
            `, [`%"userId":"${userId}"%`]),

            // 8. Dagelijkse planning entries count
            pool.query(`
                SELECT COUNT(*) as total
                FROM dagelijkse_planning
                WHERE actie_id IN (SELECT id FROM taken WHERE user_id = $1)
            `, [userId]),

            // 9. Herhalende taken count (actief)
            pool.query(`
                SELECT COUNT(*) as total
                FROM taken
                WHERE user_id = $1
                AND herhaling_actief = true
            `, [userId])
        ]);

        // Check if user exists
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }

        const user = userResult.rows[0];
        const tasks = taskSummary.rows[0];
        const emails = emailSummary.rows[0];
        const sessions = sessionInfo.rows[0];

        // Build comprehensive response
        const responseData = {
            user: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                password_hash_length: user.password_hash_length, // Voor debugging
                account_type: user.account_type,
                subscription_tier: user.subscription_tier,
                subscription_status: user.subscription_status,
                trial_end_date: user.trial_end_date,
                actief: user.actief,
                created_at: user.created_at,
                last_login: user.laatste_login,
                onboarding_video_seen: user.onboarding_video_seen,
                onboarding_video_seen_at: user.onboarding_video_seen_at
            },
            tasks: {
                summary: {
                    total: parseInt(tasks.total),
                    completed: parseInt(tasks.completed),
                    pending: parseInt(tasks.pending),
                    recurring: parseInt(tasks.recurring),
                    blocked: parseInt(tasks.blocked),
                    completion_rate: parseFloat(tasks.completion_rate)
                },
                by_project: tasksByProject.rows.map(row => ({
                    project: row.project,
                    count: parseInt(row.count)
                })),
                by_context: tasksByContext.rows.map(row => ({
                    context: row.context,
                    count: parseInt(row.count)
                }))
            },
            emails: {
                summary: {
                    total: parseInt(emails.total),
                    recent_30d: parseInt(emails.recent_30d),
                    oldest_import: emails.oldest_import,
                    newest_import: emails.newest_import,
                    processed: parseInt(emails.processed),
                    converted_to_task: parseInt(emails.converted_to_task)
                },
                recent: recentEmails.rows.map(email => ({
                    from_email: email.email_from,
                    subject: email.email_subject,
                    imported_at: email.imported_at,
                    processed: email.processed,
                    task_id: email.task_id
                }))
            },
            subscription: {
                status: user.subscription_status,
                tier: user.subscription_tier,
                trial_end_date: user.trial_end_date
            },
            sessions: {
                active_count: parseInt(sessions.active_sessions),
                last_activity: sessions.last_activity
            },
            planning: {
                total_entries: parseInt(planningCount.rows[0].total)
            },
            recurring: {
                total_active: parseInt(recurringCount.rows[0].total)
            }
        };


        res.json(responseData);

    } catch (error) {
        console.error('❌ Error in user data inspector:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to fetch user data',
            details: error.message
        });
    }
});

// GET /api/admin2/debug/user-data-by-email - Complete user data inspector by email
app.get('/api/admin2/debug/user-data-by-email', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const userEmail = req.query.email;

        // Validate email
        if (!userEmail || typeof userEmail !== 'string') {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Email parameter is required'
            });
        }

        // Basic email format validation
        if (!userEmail.includes('@') || userEmail.length < 3) {
            return res.status(400).json({
                error: 'Invalid email format',
                message: 'Please provide a valid email address'
            });
        }


        // First, get the user ID from email
        const userLookup = await pool.query(`
            SELECT id FROM users WHERE LOWER(email) = LOWER($1)
        `, [userEmail]);

        if (userLookup.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with email ${userEmail}`
            });
        }

        const userId = userLookup.rows[0].id;

        // Parallel queries voor performance - gebruik Promise.all
        const [
            userResult,
            taskSummary,
            tasksByProject,
            tasksByContext,
            emailSummary,
            recentEmails,
            sessionInfo,
            planningCount,
            recurringCount
        ] = await Promise.all([
            // 1. User details - ALLE velden
            pool.query(`
                SELECT
                    id,
                    email,
                    naam,
                    LENGTH(wachtwoord_hash) as password_hash_length,
                    account_type,
                    subscription_tier,
                    subscription_status,
                    trial_end_date,
                    actief,
                    created_at,
                    laatste_login,
                    onboarding_video_seen,
                    onboarding_video_seen_at
                FROM users
                WHERE id = $1
            `, [userId]),

            // 2. Task summary
            pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) as completed,
                    COUNT(*) FILTER (WHERE afgewerkt IS NULL) as pending,
                    COUNT(*) FILTER (WHERE herhaling_actief = true) as recurring,
                    0 as blocked,
                    CASE
                        WHEN COUNT(*) > 0 THEN
                            ROUND((COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL)::numeric / COUNT(*)::numeric) * 100, 1)
                        ELSE 0
                    END as completion_rate
                FROM taken
                WHERE user_id = $1
            `, [userId]),

            // 3. Tasks by project
            pool.query(`
                SELECT
                    COALESCE(project_id::text, '(geen project)') as project,
                    COUNT(*) as count
                FROM taken
                WHERE user_id = $1
                GROUP BY project_id
                ORDER BY count DESC
                LIMIT 20
            `, [userId]),

            // 4. Tasks by context
            pool.query(`
                SELECT
                    COALESCE(context_id::text, '(geen context)') as context,
                    COUNT(*) as count
                FROM taken
                WHERE user_id = $1
                GROUP BY context_id
                ORDER BY count DESC
                LIMIT 20
            `, [userId]),

            // 5. Email imports summary
            pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE imported_at >= NOW() - INTERVAL '30 days') as recent_30d,
                    MIN(imported_at) as oldest_import,
                    MAX(imported_at) as newest_import,
                    COUNT(*) FILTER (WHERE task_id IS NOT NULL) as processed,
                    COUNT(*) FILTER (WHERE task_id IS NOT NULL) as converted_to_task
                FROM email_imports
                WHERE user_id = $1
            `, [userId]),

            // 6. Recent email imports (last 10)
            pool.query(`
                SELECT
                    email_from,
                    email_subject,
                    imported_at,
                    CASE WHEN task_id IS NOT NULL THEN true ELSE false END as processed,
                    task_id
                FROM email_imports
                WHERE user_id = $1
                ORDER BY imported_at DESC
                LIMIT 10
            `, [userId]),

            // 7. Session info
            pool.query(`
                SELECT
                    COUNT(*) as active_sessions,
                    MAX(expire) as last_activity
                FROM session
                WHERE sess::text LIKE $1
                AND expire > NOW()
            `, [`%"userId":"${userId}"%`]),

            // 8. Dagelijkse planning entries count
            pool.query(`
                SELECT COUNT(*) as total
                FROM dagelijkse_planning
                WHERE actie_id IN (SELECT id FROM taken WHERE user_id = $1)
            `, [userId]),

            // 9. Herhalende taken count (actief)
            pool.query(`
                SELECT COUNT(*) as total
                FROM taken
                WHERE user_id = $1
                AND herhaling_actief = true
            `, [userId])
        ]);

        const user = userResult.rows[0];
        const tasks = taskSummary.rows[0];
        const emails = emailSummary.rows[0];
        const sessions = sessionInfo.rows[0];

        // Build comprehensive response
        const responseData = {
            user: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                password_hash_length: user.password_hash_length, // Voor debugging
                account_type: user.account_type,
                subscription_tier: user.subscription_tier,
                subscription_status: user.subscription_status,
                trial_end_date: user.trial_end_date,
                actief: user.actief,
                created_at: user.created_at,
                last_login: user.laatste_login,
                onboarding_video_seen: user.onboarding_video_seen,
                onboarding_video_seen_at: user.onboarding_video_seen_at
            },
            tasks: {
                summary: {
                    total: parseInt(tasks.total),
                    completed: parseInt(tasks.completed),
                    pending: parseInt(tasks.pending),
                    recurring: parseInt(tasks.recurring),
                    blocked: parseInt(tasks.blocked),
                    completion_rate: parseFloat(tasks.completion_rate)
                },
                by_project: tasksByProject.rows.map(row => ({
                    project: row.project,
                    count: parseInt(row.count)
                })),
                by_context: tasksByContext.rows.map(row => ({
                    context: row.context,
                    count: parseInt(row.count)
                }))
            },
            emails: {
                summary: {
                    total: parseInt(emails.total),
                    recent_30d: parseInt(emails.recent_30d),
                    oldest_import: emails.oldest_import,
                    newest_import: emails.newest_import,
                    processed: parseInt(emails.processed),
                    converted_to_task: parseInt(emails.converted_to_task)
                },
                recent: recentEmails.rows.map(email => ({
                    from_email: email.email_from,
                    subject: email.email_subject,
                    imported_at: email.imported_at,
                    processed: email.processed,
                    task_id: email.task_id
                }))
            },
            subscription: {
                status: user.subscription_status,
                tier: user.subscription_tier,
                trial_end_date: user.trial_end_date
            },
            sessions: {
                active_count: parseInt(sessions.active_sessions),
                last_activity: sessions.last_activity
            },
            planning: {
                total_entries: parseInt(planningCount.rows[0].total)
            },
            recurring: {
                total_active: parseInt(recurringCount.rows[0].total)
            }
        };


        res.json(responseData);

    } catch (error) {
        console.error('❌ Error in user data inspector (by email):', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to fetch user data',
            details: error.message
        });
    }
});

// ========================================
// ADMIN DASHBOARD V2 API ENDPOINTS
// ========================================
// Admin Dashboard V2 - User-based authentication with account_type='admin'
// All endpoints require valid session + account_type='admin' check


// GET /api/admin2/stats/tasks - Task statistics
app.get('/api/admin2/stats/tasks', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Total taken count
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM taken');
        const total = parseInt(totalResult.rows[0].count);

        // Completion rate (afgewerkt is TIMESTAMP, not boolean - check IS NOT NULL)
        const completionResult = await pool.query(`
            SELECT
                (COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) * 100.0 / COUNT(*))::DECIMAL(5,2) as completion_rate
            FROM taken
        `);
        const completionRate = parseFloat(completionResult.rows[0].completion_rate || 0);

        // Tasks created today (gebruik "aangemaakt" niet "aangemaakt_op")
        const todayResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM taken
            WHERE DATE(aangemaakt) = CURRENT_DATE
        `);
        const createdToday = parseInt(todayResult.rows[0].count);

        // Tasks created this week
        const weekResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM taken
            WHERE aangemaakt >= DATE_TRUNC('week', NOW())
        `);
        const createdWeek = parseInt(weekResult.rows[0].count);

        // Tasks created this month
        const monthResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM taken
            WHERE aangemaakt >= DATE_TRUNC('month', NOW())
        `);
        const createdMonth = parseInt(monthResult.rows[0].count);

        // Calculate completed and pending counts
        const completedCount = Math.round(total * (completionRate / 100));
        const pendingCount = total - completedCount;

        res.json({
            total_tasks: total,
            completed: completedCount,
            pending: pendingCount,
            completion_rate: completionRate,
            created_today: createdToday,
            created_week: createdWeek,
            created_month: createdMonth
        });
    } catch (error) {
        console.error('Admin2 tasks stats error:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch statistics'
        });
    }
});

// GET /api/admin2/stats/emails - Email import statistics
app.get('/api/admin2/stats/emails', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Total emails imported
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM email_imports');
        const totalImports = parseInt(totalResult.rows[0].count);

        // Emails imported today
        const todayResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_imports
            WHERE DATE(imported_at) = CURRENT_DATE
        `);
        const importedToday = parseInt(todayResult.rows[0].count);

        // Emails imported this week
        const weekResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_imports
            WHERE imported_at >= DATE_TRUNC('week', NOW())
        `);
        const importedWeek = parseInt(weekResult.rows[0].count);

        // Emails imported this month
        const monthResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_imports
            WHERE imported_at >= DATE_TRUNC('month', NOW())
        `);
        const importedMonth = parseInt(monthResult.rows[0].count);

        // Users with email imports (count and percentage)
        const usersWithImportResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM email_imports
        `);
        const usersWithImportCount = parseInt(usersWithImportResult.rows[0].count);

        // Total users for percentage calculation
        const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(totalUsersResult.rows[0].count);

        // Calculate percentage (users with imports / total users * 100)
        const usersWithImportPercentage = totalUsers > 0
            ? parseFloat(((usersWithImportCount / totalUsers) * 100).toFixed(2))
            : 0;

        res.json({
            total_imports: totalImports,
            imported: {
                today: importedToday,
                week: importedWeek,
                month: importedMonth
            },
            users_with_import: {
                count: usersWithImportCount,
                percentage: usersWithImportPercentage
            }
        });
    } catch (error) {
        console.error('Admin2 email stats error:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch statistics'
        });
    }
});

// GET /api/admin2/stats/database - Database size and table statistics
app.get('/api/admin2/stats/database', requireAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }


        // Get database size (pretty format)
        const dbSizeResult = await pool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
        `);

        // Get database size in bytes
        const dbSizeBytesResult = await pool.query(`
            SELECT pg_database_size(current_database()) as database_size_bytes
        `);

        // Get table sizes with row counts (Neon PostgreSQL compatible)
        const tablesResult = await pool.query(`
            SELECT
                schemaname,
                tablename as name,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 50
        `);

        // Get row counts for each table via COUNT(*)
        const tables = [];
        let totalRows = 0;

        for (const row of tablesResult.rows) {
            try {
                // Query row count for this specific table
                const countResult = await pool.query(`SELECT COUNT(*) as row_count FROM ${row.name}`);
                const rowCount = parseInt(countResult.rows[0].row_count);

                tables.push({
                    name: row.name,
                    size: row.size,
                    size_bytes: parseInt(row.size_bytes),
                    row_count: rowCount
                });

                totalRows += rowCount;
            } catch (countError) {
                // If COUNT fails for a table, add it without row count
                console.warn(`⚠️ Could not count rows for table ${row.name}:`, countError.message);
                tables.push({
                    name: row.name,
                    size: row.size,
                    size_bytes: parseInt(row.size_bytes),
                    row_count: 0
                });
            }
        }

        const databaseSize = dbSizeResult.rows[0].database_size;
        const tableCount = tables.length;


        res.json({
            database_size: databaseSize,
            database_size_formatted: databaseSize,  // Frontend verwacht deze naam
            database_size_bytes: parseInt(dbSizeBytesResult.rows[0].database_size_bytes),
            table_count: tableCount,
            total_rows: totalRows,
            tables: tables
        });

    } catch (error) {
        console.error('❌ Error fetching database statistics:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch statistics'
        });
    }
});

// ===== V1 API - URL-based endpoints for external integrations =====
// These endpoints use import codes for authentication instead of sessions

// Test endpoint to verify V1 API is accessible
app.get('/api/v1/test', (req, res) => {
    res.json({
        message: 'V1 API is working',
        version: '0.6.10',
        timestamp: new Date().toISOString()
    });
});

// Quick Add Task via URL (for Siri Shortcuts, automations, etc.)
app.get('/api/v1/quick-add', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Log incoming request for debugging

        // Extract parameters from URL
        const { code, text, project, context, date, duur } = req.query;

        // Validate required fields
        if (!code || !text) {
            return res.status(400).json({
                error: 'Missing required parameters',
                received: req.query,
                required: ['code', 'text'],
                optional: ['project', 'context', 'date', 'duur'],
                example: '/api/v1/quick-add?code=abc123&text=Buy milk&project=Shopping'
            });
        }

        // Find user by import code
        const user = await db.getUserByImportCode(code);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid import code',
                hint: 'Use your personal import code from Tickedify settings'
            });
        }

        const userId = user.id;

        // Build task data
        const taskData = {
            text: text.trim(),
            userId: userId,
            lijst: 'inbox', // Always add to inbox
            duur: duur ? parseInt(duur) : null
        };

        // Handle project
        if (project) {
            taskData.projectId = await findOrCreateProject(project, userId);
        }

        // Handle context
        if (context) {
            taskData.contextId = await findOrCreateContext(context, userId);
        }

        // Handle date
        if (date) {
            try {
                // Support multiple date formats
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    taskData.verschijndatum = parsedDate.toISOString().split('T')[0];
                }
            } catch (e) {
            }
        }

        // Create the task
        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const result = await pool.query(`
            INSERT INTO taken (
                id, tekst, lijst, aangemaakt, project_id, context_id, 
                verschijndatum, duur, type, user_id
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            taskId,
            taskData.text,
            'inbox',
            taskData.projectId || null,
            taskData.contextId || null,
            taskData.verschijndatum || null,
            taskData.duur || null,
            'taak',
            userId
        ]);

        const createdTask = result.rows[0];

        // Return success with task details
        res.json({
            success: true,
            message: 'Task added successfully',
            task: {
                id: createdTask.id,
                text: createdTask.tekst,
                project: project || null,
                context: context || null,
                date: createdTask.verschijndatum || null,
                duration: createdTask.duur || null,
                list: createdTask.lijst
            }
        });

    } catch (error) {
        console.error('Quick-add error:', error);
        res.status(500).json({ 
            error: 'Failed to add task',
            details: error.message 
        });
    }
});

// Debug endpoint for recurring tasks issue
app.get('/api/debug/recurring-tasks-analysis', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        // Get recently completed tasks with recurring settings
        const recentlyCompletedQuery = `
            SELECT 
                id, tekst, lijst, project_id, context_id, 
                verschijndatum, afgewerkt, 
                herhaling_type, herhaling_actief,
                opmerkingen
            FROM taken 
            WHERE afgewerkt >= NOW() - INTERVAL '3 days'
            AND herhaling_actief = true
            AND herhaling_type IS NOT NULL
            ORDER BY afgewerkt DESC
        `;
        
        const completedResult = await pool.query(recentlyCompletedQuery);
        
        // For each completed recurring task, check if a new one was created
        const analysis = [];
        
        for (const task of completedResult.rows) {
            // Look for potential new tasks created around the same time
            const searchQuery = `
                SELECT id, tekst, verschijndatum, aangemaakt
                FROM taken
                WHERE tekst = $1
                AND lijst = $2
                AND aangemaakt >= $3
                AND afgewerkt IS NULL
                ORDER BY aangemaakt DESC
                LIMIT 1
            `;
            
            const newTaskResult = await pool.query(searchQuery, [
                task.tekst,
                task.lijst,
                task.afgewerkt
            ]);
            
            analysis.push({
                completedTask: {
                    id: task.id,
                    tekst: task.tekst,
                    lijst: task.lijst,
                    afgewerkt: task.afgewerkt,
                    herhaling_type: task.herhaling_type,
                    verschijndatum: task.verschijndatum
                },
                newTaskCreated: newTaskResult.rows.length > 0,
                newTask: newTaskResult.rows[0] || null
            });
        }
        
        // Also check for orphaned recurring tasks (active but not completed)
        const orphanedQuery = `
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, aangemaakt
            FROM taken
            WHERE herhaling_actief = true
            AND afgewerkt IS NULL
            AND verschijndatum < CURRENT_DATE
            ORDER BY verschijndatum DESC
            LIMIT 20
        `;
        
        const orphanedResult = await pool.query(orphanedQuery);
        
        res.json({
            summary: {
                recentlyCompletedRecurring: completedResult.rows.length,
                successfullyRecreated: analysis.filter(a => a.newTaskCreated).length,
                failed: analysis.filter(a => !a.newTaskCreated).length,
                orphanedRecurringTasks: orphanedResult.rows.length
            },
            failedRecreations: analysis.filter(a => !a.newTaskCreated),
            orphanedTasks: orphanedResult.rows,
            allAnalysis: analysis
        });
        
    } catch (error) {
        console.error('Debug recurring tasks analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to find task by ID across all tables
app.get('/api/debug/find-task/:taskId', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskId } = req.params;
        
        // Search in taken table
        const taskResult = await pool.query('SELECT * FROM taken WHERE id = $1', [taskId]);
        
        // Also check if this task ID appears in any planning
        const planningResult = await pool.query('SELECT * FROM dagelijkse_planning WHERE actie_id = $1', [taskId]);
        
        res.json({
            task_id: taskId,
            found_in_taken: taskResult.rows,
            referenced_in_planning: planningResult.rows
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to cleanup orphaned planning items
app.post('/api/debug/cleanup-orphaned-planning', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const userId = getCurrentUserId(req);
        
        // Log cleanup operation start - CRITICAL for debugging mass deletions
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_START', {
            userId: userId,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        // Find planning items that reference completed tasks
        const completedTasksPlanning = await pool.query(`
            SELECT dp.id, dp.datum, dp.uur, dp.naam, dp.actie_id, t.afgewerkt
            FROM dagelijkse_planning dp
            JOIN taken t ON dp.actie_id = t.id
            WHERE dp.actie_id IS NOT NULL 
            AND t.afgewerkt IS NOT NULL
            ORDER BY dp.datum DESC, dp.uur
        `);
        
        // Find planning items that reference non-existent tasks
        const orphanedPlanning = await pool.query(`
            SELECT dp.id, dp.datum, dp.uur, dp.naam, dp.actie_id
            FROM dagelijkse_planning dp
            LEFT JOIN taken t ON dp.actie_id = t.id
            WHERE dp.actie_id IS NOT NULL 
            AND t.id IS NULL
            ORDER BY dp.datum DESC, dp.uur
        `);
        
        const totalToClean = orphanedPlanning.rows.length + completedTasksPlanning.rows.length;
        
        // Log cleanup analysis
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_ANALYSIS', {
            userId: userId,
            completedTasksPlanningCount: completedTasksPlanning.rows.length,
            orphanedPlanningCount: orphanedPlanning.rows.length,
            totalToClean: totalToClean,
            completedTasksPlanningIds: completedTasksPlanning.rows.map(row => row.id),
            orphanedPlanningIds: orphanedPlanning.rows.map(row => row.id),
            endpoint: '/api/debug/cleanup-orphaned-planning',
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        if (totalToClean === 0) {
            await forensicLogger.log('PLANNING', 'BULK_CLEANUP_NO_ITEMS', {
                userId: userId,
                endpoint: '/api/debug/cleanup-orphaned-planning',
                responseTimestamp: new Date().toISOString(),
                triggeredBy: 'debug_cleanup'
            });
            
            return res.json({
                message: 'No planning items to clean',
                cleaned: 0,
                completed_tasks_planning: [],
                orphaned_items: []
            });
        }
        
        // Delete planning items for completed tasks
        const deleteCompletedResult = await pool.query(`
            DELETE FROM dagelijkse_planning
            WHERE id IN (
                SELECT dp.id
                FROM dagelijkse_planning dp
                JOIN taken t ON dp.actie_id = t.id
                WHERE dp.actie_id IS NOT NULL 
                AND t.afgewerkt IS NOT NULL
            )
        `);
        
        // Log completed tasks cleanup
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_COMPLETED_TASKS', {
            userId: userId,
            deletedCount: deleteCompletedResult.rowCount,
            deletedItems: completedTasksPlanning.rows,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        // Delete orphaned planning items
        const deleteOrphanedResult = await pool.query(`
            DELETE FROM dagelijkse_planning
            WHERE id IN (
                SELECT dp.id
                FROM dagelijkse_planning dp
                LEFT JOIN taken t ON dp.actie_id = t.id
                WHERE dp.actie_id IS NOT NULL 
                AND t.id IS NULL
            )
        `);
        
        // Log orphaned items cleanup
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_ORPHANED_ITEMS', {
            userId: userId,
            deletedCount: deleteOrphanedResult.rowCount,
            deletedItems: orphanedPlanning.rows,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        const totalCleaned = deleteCompletedResult.rowCount + deleteOrphanedResult.rowCount;
        
        // Log cleanup completion
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_COMPLETE', {
            userId: userId,
            cleanedCompleted: deleteCompletedResult.rowCount,
            cleanedOrphaned: deleteOrphanedResult.rowCount,
            totalCleaned: totalCleaned,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            responseTimestamp: new Date().toISOString(),
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        res.json({
            message: 'Cleaned up planning items',
            completed_tasks_planning: completedTasksPlanning.rows,
            orphaned_items: orphanedPlanning.rows,
            cleaned_completed: deleteCompletedResult.rowCount,
            cleaned_orphaned: deleteOrphanedResult.rowCount,
            total_cleaned: totalCleaned
        });
        
    } catch (error) {
        // Log cleanup error
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_ERROR', {
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to check recent planning data
app.get('/api/debug/recent-planning', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        // Get all planning data from the last 7 days
        const recentPlanning = await pool.query(`
            SELECT datum, COUNT(*) as item_count, 
                   array_agg(DISTINCT type) as types,
                   MIN(aangemaakt) as earliest_created,
                   MAX(aangemaakt) as latest_created
            FROM dagelijkse_planning 
            WHERE datum >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY datum
            ORDER BY datum DESC
        `);
        
        // Get all planning items for today specifically
        const todayPlanning = await pool.query(`
            SELECT id, datum, uur, type, naam, actie_id, aangemaakt
            FROM dagelijkse_planning 
            WHERE datum = CURRENT_DATE
            ORDER BY uur, positie
        `);
        
        // Check if any planning was deleted recently (if we had audit logs)
        const allPlanningCount = await pool.query('SELECT COUNT(*) as total FROM dagelijkse_planning');
        
        res.json({
            recent_planning_by_date: recentPlanning.rows,
            today_planning_items: todayPlanning.rows,
            total_planning_items_in_db: parseInt(allPlanningCount.rows[0].total),
            today_date: new Date().toISOString().split('T')[0]
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to test recovery
app.get('/api/debug/test-recovery/:taskId', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskId } = req.params;
        
        // Test 1: Check database connection
        const dbTest = await pool.query('SELECT NOW()');
        
        // Test 2: Find the task
        const taskResult = await pool.query(
            'SELECT id, tekst, herhaling_type, lijst FROM taken WHERE id = $1',
            [taskId]
        );
        
        // Test 3: Check table columns
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'taken'
            ORDER BY ordinal_position
        `);
        
        res.json({
            database_connected: true,
            database_time: dbTest.rows[0].now,
            task_found: taskResult.rows.length > 0,
            task_data: taskResult.rows[0] || null,
            table_columns: columnCheck.rows.map(r => r.column_name)
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Single task recovery endpoint
app.post('/api/taak/recover-recurring', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskId } = req.body;
        
        if (!taskId) {
            return res.status(400).json({ error: 'taskId required' });
        }
        
        // Get the completed task
        const taskResult = await pool.query(
            'SELECT * FROM taken WHERE id = $1',
            [taskId]
        );
        
        
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const task = taskResult.rows[0];
        
        // Create new task with proper date calculation
        const newTask = {
            tekst: task.tekst,
            lijst: task.lijst,
            projectId: task.project_id,
            contextId: task.context_id,
            duur: task.duur,
            herhalingActief: true,
            herhalingType: task.herhaling_type,
            opmerkingen: task.opmerkingen
        };
        
        // Calculate next date based on recurrence type
        let nextDate;
        if (task.herhaling_type === 'werkdagen') {
            // Find next weekday
            nextDate = new Date();
            do {
                nextDate.setDate(nextDate.getDate() + 1);
            } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
        } else if (task.herhaling_type === 'dagelijks') {
            nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 1);
        } else if (task.herhaling_type && task.herhaling_type.startsWith('weekly-')) {
            // Calculate proper weekly recurrence
            const parts = task.herhaling_type.split('-');
            const interval = parseInt(parts[1]) || 1;
            const targetDays = parts[2]?.split(',').map(Number) || [];
            
            nextDate = new Date(task.verschijndatum);
            nextDate.setDate(nextDate.getDate() + (interval * 7));
        } else {
            // Default to tomorrow
            nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 1);
        }
        
        newTask.verschijndatum = nextDate.toISOString().split('T')[0];
        
        // Insert directly using SQL
        const newTaskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // First check if herhaling columns exist
            const columnCheck = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'taken' 
                AND column_name IN ('herhaling_type', 'herhaling_actief', 'opmerkingen')
            `);
            
            const existingColumns = columnCheck.rows.map(r => r.column_name);
            
            // Build dynamic insert query based on available columns
            const columns = ['id', 'tekst', 'lijst', 'project_id', 'context_id', 'verschijndatum', 'duur', 'user_id', 'aangemaakt'];
            const values = [newTaskId, task.tekst, 'acties', task.project_id, task.context_id, newTask.verschijndatum, task.duur, task.user_id];
            const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', 'NOW()'];
            
            // Add optional columns if they exist
            if (existingColumns.includes('herhaling_type')) {
                columns.push('herhaling_type');
                values.push(task.herhaling_type);
                placeholders.push(`$${values.length}`);
            }
            
            if (existingColumns.includes('herhaling_actief')) {
                columns.push('herhaling_actief');
                values.push(true);
                placeholders.push(`$${values.length}`);
            }
            
            if (existingColumns.includes('opmerkingen')) {
                columns.push('opmerkingen');
                values.push(task.opmerkingen || '');
                placeholders.push(`$${values.length}`);
            }
            
            const insertQuery = `
                INSERT INTO taken (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
            `;
            
            
            await pool.query(insertQuery, values.slice(0, placeholders.filter(p => p.startsWith('$')).length));
            
            res.json({
                success: true,
                newTaskId: newTaskId,
                nextDate: newTask.verschijndatum
            });
        } catch (insertError) {
            console.error('Failed to insert recovered task:', insertError);
            console.error('Error details:', insertError.message);
            throw insertError;
        }
        
    } catch (error) {
        console.error('Recover recurring task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Recovery endpoint for missing recurring tasks
app.post('/api/debug/recover-recurring-tasks', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskIds } = req.body;
        if (!taskIds || !Array.isArray(taskIds)) {
            return res.status(400).json({ error: 'taskIds array required' });
        }
        
        const recovered = [];
        const failed = [];
        
        for (const taskId of taskIds) {
            try {
                // Get the completed task
                const taskResult = await pool.query(
                    'SELECT * FROM taken WHERE id = $1',
                    [taskId]
                );
                
                if (taskResult.rows.length === 0) {
                    failed.push({ taskId, error: 'Task not found' });
                    continue;
                }
                
                const task = taskResult.rows[0];
                
                // Calculate next date based on pattern
                // For now, set to tomorrow as a simple recovery
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + 1);
                const nextDateString = nextDate.toISOString().split('T')[0];
                
                // Create new task WITH recurring properties preserved
                const newId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                const insertResult = await pool.query(`
                    INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, afgewerkt, user_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING id
                `, [
                    newId, task.tekst, new Date().toISOString(), task.lijst,
                    task.project_id, nextDateString + 'T00:00:00.000Z', task.context_id, task.duur, task.type,
                    task.herhaling_type, task.herhaling_waarde, task.herhaling_actief, task.opmerkingen, null, task.user_id
                ]);
                
                const newTaskResult = { id: insertResult.rows[0]?.id };
                
                if (newTaskResult.id) {
                    recovered.push({
                        originalTaskId: taskId,
                        newTaskId: newTaskResult.id,
                        newDate: nextDateString
                    });
                } else {
                    failed.push({ taskId, error: 'Failed to create new task' });
                }
                
            } catch (error) {
                failed.push({ taskId, error: error.message });
            }
        }
        
        res.json({
            success: true,
            recovered: recovered.length,
            failed: failed.length,
            details: { recovered, failed }
        });
        
    } catch (error) {
        console.error('Recover recurring tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fix recovered tasks that lost their recurring properties  
app.post('/api/debug/fix-missing-recurring-properties', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const userId = getCurrentUserId(req);
        
        // Find all completed recurring tasks from today
        const completedRecurringTasks = await pool.query(`
            SELECT * FROM taken 
            WHERE user_id = $1 
            AND herhaling_type IS NOT NULL 
            AND herhaling_actief = true 
            AND afgewerkt >= CURRENT_DATE
            ORDER BY afgewerkt DESC
        `, [userId]);
        
        // Find all active tasks created today that might be missing recurring properties
        const todaysTasks = await pool.query(`
            SELECT * FROM taken 
            WHERE user_id = $1 
            AND afgewerkt IS NULL 
            AND aangemaakt >= CURRENT_DATE
            AND (herhaling_type IS NULL OR herhaling_actief = false)
        `, [userId]);
        
        const fixed = [];
        
        // Try to match tasks by name and restore recurring properties
        for (const completedTask of completedRecurringTasks.rows) {
            const matchingTask = todaysTasks.rows.find(task => 
                task.tekst === completedTask.tekst && 
                (!task.herhaling_type || !task.herhaling_actief)
            );
            
            if (matchingTask) {
                await pool.query(`
                    UPDATE taken 
                    SET herhaling_type = $1, herhaling_waarde = $2, herhaling_actief = $3
                    WHERE id = $4 AND user_id = $5
                `, [
                    completedTask.herhaling_type,
                    completedTask.herhaling_waarde, 
                    completedTask.herhaling_actief,
                    matchingTask.id,
                    userId
                ]);
                
                fixed.push({
                    taskId: matchingTask.id,
                    taskName: matchingTask.tekst,
                    restoredRecurring: completedTask.herhaling_type
                });
            }
        }
        
        res.json({
            success: true,
            message: `Fixed ${fixed.length} tasks with missing recurring properties`,
            completedRecurringFound: completedRecurringTasks.rows.length,
            todaysTasksFound: todaysTasks.rows.length,
            fixed: fixed
        });
        
    } catch (error) {
        console.error('Fix recurring properties error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to list all users
app.get('/api/debug/users-info', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const users = await pool.query(`
            SELECT id, email, naam, rol, aangemaakt, actief, email_import_code
            FROM users 
            ORDER BY aangemaakt ASC
        `);
        
        res.json({
            total_users: users.rows.length,
            users: users.rows.map(user => ({
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol,
                aangemaakt: user.aangemaakt,
                actief: user.actief,
                has_import_code: !!user.email_import_code
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Test user switch endpoint for Claude testing
app.post('/api/debug/switch-test-user', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const testUserEmail = 'test@example.com';
        
        // Get test user info
        const testUser = await pool.query(`
            SELECT id, email, naam, rol 
            FROM users 
            WHERE email = $1 AND actief = true
        `, [testUserEmail]);
        
        if (testUser.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Test user not found',
                hint: 'test@example.com user must exist and be active' 
            });
        }
        
        const user = testUser.rows[0];
        
        // Log the switch for forensic tracking
        await forensicLogger.logUserAction('TEST_USER_SWITCH', {
            userId: user.id,
            userEmail: user.email
        }, {
            endpoint: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            switchedFrom: 'Claude automated testing'
        });
        
        // Return test user session info
        res.json({
            success: true,
            testUser: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol
            },
            message: 'Claude can now test with this user account',
            note: 'All subsequent API calls should use this user_id for testing'
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// ============================================================================
// ADMIN DASHBOARD V2 STATISTICS ENDPOINTS
// ============================================================================

// GET /api/admin2/stats/home - All statistics for home dashboard
app.get('/api/admin2/stats/home', requireAdmin, async (req, res) => {
    try {

        // User statistics - all counts in parallel
        const [
            totalUsers,
            active7d,
            active30d,
            newToday,
            newWeek,
            newMonth,
            inactive30d,
            inactive60d,
            inactive90d
        ] = await Promise.all([
            // Total users
            pool.query('SELECT COUNT(*) FROM users'),
            // Active last 7 days
            pool.query("SELECT COUNT(*) FROM users WHERE laatste_login >= NOW() - INTERVAL '7 days'"),
            // Active last 30 days
            pool.query("SELECT COUNT(*) FROM users WHERE laatste_login >= NOW() - INTERVAL '30 days'"),
            // New today
            pool.query('SELECT COUNT(*) FROM users WHERE DATE(COALESCE(created_at, aangemaakt)) = CURRENT_DATE'),
            // New this week
            pool.query("SELECT COUNT(*) FROM users WHERE COALESCE(created_at, aangemaakt) >= DATE_TRUNC('week', NOW())"),
            // New this month
            pool.query("SELECT COUNT(*) FROM users WHERE COALESCE(created_at, aangemaakt) >= DATE_TRUNC('month', NOW())"),
            // Inactive >30 days
            pool.query("SELECT COUNT(*) FROM users WHERE laatste_login < NOW() - INTERVAL '30 days' OR laatste_login IS NULL"),
            // Inactive >60 days
            pool.query("SELECT COUNT(*) FROM users WHERE laatste_login < NOW() - INTERVAL '60 days' OR laatste_login IS NULL"),
            // Inactive >90 days
            pool.query("SELECT COUNT(*) FROM users WHERE laatste_login < NOW() - INTERVAL '90 days' OR laatste_login IS NULL")
        ]);

        // Subscription tier distribution - JOIN to subscriptions table
        const subscriptionTiers = await pool.query(`
            SELECT
                CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END as tier,
                COUNT(*) as count
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            GROUP BY tier
        `);

        const tierCounts = {
            free: 0,
            trial: 0,
            standard: 0,
            no_limit: 0
        };

        subscriptionTiers.rows.forEach(row => {
            const tier = row.tier || 'free';
            const count = parseInt(row.count);

            // Map actual tier IDs to display groups
            if (tier === 'monthly_7' || tier === 'yearly_70') {
                tierCounts.standard += count;
            } else if (tier === 'monthly_8' || tier === 'yearly_80') {
                tierCounts.no_limit += count;
            } else if (tier === 'trial') {
                tierCounts.trial += count;
            } else if (tier === 'free') {
                tierCounts.free = count;
            }
        });

        // Trial statistics
        const activeTrials = await pool.query(`
            SELECT COUNT(*) FROM users
            WHERE subscription_status = 'trial' AND trial_end_date >= CURRENT_DATE
        `);

        // Trial conversion rate - only count COMPLETED trials (trial_end_date < today)
        // NOTE: Old query only counted ('active', 'expired', 'cancelled') statuses, missing 'trialing' and 'beta_expired'
        const conversionRate = await pool.query(`
            SELECT
                (COUNT(*) FILTER (WHERE subscription_status = 'active') * 100.0 /
                 NULLIF(COUNT(*), 0))::DECIMAL(5,2) as conversion_rate
            FROM users
            WHERE trial_end_date IS NOT NULL
              AND trial_end_date < CURRENT_DATE
        `);

        // Recent registrations (last 10) - JOIN to subscriptions table
        const recentRegistrations = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.naam,
                COALESCE(u.created_at, u.aangemaakt) as created_at,
                CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END as subscription_tier
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            ORDER BY COALESCE(u.created_at, u.aangemaakt) DESC
            LIMIT 10
        `);

        // Build response
        const response = {
            users: {
                total: parseInt(totalUsers.rows[0].count),
                active_7d: parseInt(active7d.rows[0].count),
                active_30d: parseInt(active30d.rows[0].count),
                new_today: parseInt(newToday.rows[0].count),
                new_week: parseInt(newWeek.rows[0].count),
                new_month: parseInt(newMonth.rows[0].count),
                inactive_30d: parseInt(inactive30d.rows[0].count),
                inactive_60d: parseInt(inactive60d.rows[0].count),
                inactive_90d: parseInt(inactive90d.rows[0].count)
            },
            subscriptions: tierCounts,
            trials: {
                active: parseInt(activeTrials.rows[0].count),
                conversion_rate: parseFloat(conversionRate.rows[0].conversion_rate) || 0
            },
            recent_registrations: recentRegistrations.rows.map(user => ({
                id: user.id,
                email: user.email,
                naam: user.naam,
                created_at: user.created_at,
                subscription_tier: user.subscription_tier || 'free'
            }))
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Error fetching admin home statistics:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch statistics'
        });
    }
});

// ============================================================================
// T020: GET /api/admin2/system/payments - Get all payment configurations
// ============================================================================

app.get('/api/admin2/system/payments', requireAdmin, async (req, res) => {
    try {

        // Simple SELECT van payment_configurations tabel
        const result = await pool.query(`
            SELECT
                id,
                plan_id,
                plan_name,
                plan_description,
                checkout_url,
                is_active,
                created_at,
                updated_at
            FROM payment_configurations
            ORDER BY plan_id ASC
        `);


        res.json({
            payment_configs: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Payment configurations error:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            stack: error.stack
        });

        // Graceful fallback - return empty array if table/columns don't exist or query fails
        res.status(200).json({
            payment_configs: [],
            count: 0,
            warning: 'Payment configurations table may have schema issues',
            debug: error.message  // Temporary for debugging
        });
    }
});

// ============================================================================
// T021: PUT /api/admin2/system/payments/:id/checkout-url - Update checkout URL
// ============================================================================

app.put('/api/admin2/system/payments/:id/checkout-url', requireAdmin, async (req, res) => {
    try {

        const configId = parseInt(req.params.id);
        const { checkout_url } = req.body;

        // Validatie: config ID moet valid integer zijn
        if (isNaN(configId)) {
            return res.status(400).json({
                error: 'Invalid config ID',
                message: 'Config ID must be a valid number'
            });
        }

        // Validatie: checkout_url is verplicht
        if (!checkout_url) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'checkout_url is required',
                field: 'checkout_url'
            });
        }

        // Validatie: moet HTTPS zijn
        if (!checkout_url.startsWith('https://')) {
            return res.status(400).json({
                error: 'Invalid checkout URL',
                message: 'Checkout URL must start with https://',
                field: 'checkout_url'
            });
        }

        // Validatie: URL format check
        try {
            new URL(checkout_url);
        } catch (urlError) {
            return res.status(400).json({
                error: 'Invalid checkout URL',
                message: 'Checkout URL is not a valid URL format',
                field: 'checkout_url'
            });
        }

        // Validatie: moet payment provider domain bevatten
        const validProviders = ['mollie.com', 'stripe.com', 'paypal.com', 'paddle.com'];
        const hasValidProvider = validProviders.some(provider => checkout_url.includes(provider));

        if (!hasValidProvider) {
            return res.status(400).json({
                error: 'Invalid checkout URL',
                message: `Checkout URL must contain one of: ${validProviders.join(', ')}`,
                field: 'checkout_url'
            });
        }

        // GET oude checkout_url en plan details eerst
        const currentConfig = await pool.query(`
            SELECT id, plan_id, plan_name, checkout_url
            FROM payment_configurations
            WHERE id = $1
        `, [configId]);

        if (currentConfig.rows.length === 0) {
            return res.status(404).json({
                error: 'Payment configuration not found',
                message: `No configuration with ID ${configId}`
            });
        }

        const config = currentConfig.rows[0];
        const oldUrl = config.checkout_url;

        // UPDATE met nieuwe checkout_url
        const updateResult = await pool.query(`
            UPDATE payment_configurations
            SET checkout_url = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING updated_at
        `, [checkout_url, configId]);

        const updatedAt = updateResult.rows[0].updated_at;

        // INSERT audit log met graceful fallback
        try {
            await pool.query(`
                INSERT INTO admin_audit_log (
                    admin_user_id,
                    action,
                    target_type,
                    target_id,
                    old_value,
                    new_value,
                    ip_address,
                    user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                req.session.userId,
                'PAYMENT_CHECKOUT_URL_UPDATE',
                'payment_configuration',
                configId,
                oldUrl,
                checkout_url,
                req.ip,
                req.get('User-Agent')
            ]);
        } catch (auditError) {
            // Graceful fallback - log to console als audit tabel niet bestaat
            console.log('[AUDIT] Admin', req.session.userId, 'updated checkout URL for config', configId, ':', oldUrl, '→', checkout_url);
        }

        // Return plan context + old/new URL voor confirmation
        const response = {
            success: true,
            config_id: configId,
            plan_id: config.plan_id,
            plan_name: config.plan_name,
            old_url: oldUrl,
            new_url: checkout_url,
            updated_at: updatedAt
        };


        res.json(response);

    } catch (error) {
        console.error('❌ Error updating checkout URL:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update checkout URL'
        });
    }
});

// ============================================================================
// T024: POST /api/admin2/debug/database-backup - Database backup metadata
// ============================================================================

app.post('/api/admin2/debug/database-backup', requireAdmin, async (req, res) => {
    try {

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Collect database size
        const sizeResult = await pool.query(`
            SELECT pg_database_size(current_database()) / 1024 / 1024 AS size_mb
        `);
        const database_size_mb = Math.round(sizeResult.rows[0].size_mb);

        // Collect table info with row counts
        const tablesResult = await pool.query(`
            SELECT
                tablename
            FROM pg_catalog.pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        const tables = [];
        let total_rows = 0;

        // Get row count for each table
        for (const table of tablesResult.rows) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
                const row_count = parseInt(countResult.rows[0].count);
                tables.push({
                    name: table.tablename,
                    rows: row_count
                });
                total_rows += row_count;
            } catch (error) {
                console.error(`❌ Error counting rows in ${table.tablename}:`, error.message);
                tables.push({
                    name: table.tablename,
                    rows: 0,
                    error: 'Failed to count rows'
                });
            }
        }

        // Get last backup timestamp from system_settings or use NOW()
        let last_backup_timestamp;
        try {
            const backupSettingResult = await pool.query(`
                SELECT value FROM system_settings WHERE key = 'last_backup_timestamp'
            `);
            if (backupSettingResult.rows.length > 0) {
                last_backup_timestamp = backupSettingResult.rows[0].value;
            } else {
                last_backup_timestamp = new Date().toISOString();
            }
        } catch (error) {
            // Fallback als system_settings tabel niet bestaat
            last_backup_timestamp = new Date().toISOString();
        }

        // Collect database name from connection
        const dbNameResult = await pool.query(`SELECT current_database() as db_name`);
        const database_name = dbNameResult.rows[0].db_name;

        // Generate Neon dashboard URL (from env vars if available)
        const neon_project_id = process.env.NEON_PROJECT_ID || 'your-project-id';
        const neon_dashboard_url = `https://console.neon.tech/app/projects/${neon_project_id}`;

        // Build response with backup metadata
        const backup_info = {
            database_name,
            database_size_mb,
            table_count: tables.length,
            total_rows,
            tables,
            backup_timestamp: last_backup_timestamp
        };

        const instructions = {
            automatic_backups: 'Neon automatically backs up your database daily with point-in-time restore capability',
            manual_backup_via_branch: 'Create a new branch in Neon dashboard for instant backup snapshot',
            sql_export: `Use pg_dump for manual SQL export: pg_dump -h ${process.env.DB_HOST || 'your-neon-host'} -U ${process.env.DB_USER || 'your-user'} -d ${database_name} > backup.sql`,
            neon_documentation: 'https://neon.tech/docs/manage/backups'
        };

        // Audit logging met graceful fallback
        try {
            await pool.query(`
                INSERT INTO admin_audit_log (
                    admin_user_id,
                    action,
                    target_type,
                    target_id,
                    old_value,
                    new_value,
                    ip_address,
                    user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                req.session.userId,
                'DATABASE_BACKUP_REQUEST',
                'database',
                database_name,
                null,
                JSON.stringify({ size_mb: database_size_mb, tables: tables.length, rows: total_rows }),
                req.ip,
                req.get('User-Agent')
            ]);
        } catch (auditError) {
            // Graceful fallback - log to console als audit tabel niet bestaat
            console.log('[AUDIT] Admin', req.session.userId, 'requested database backup metadata for', database_name);
        }


        res.json({
            success: true,
            backup_info,
            neon_dashboard_url,
            instructions,
            message: 'Backup metadata collected. Use Neon dashboard or pg_dump for actual backups.'
        });

    } catch (error) {
        console.error('❌ Error collecting backup metadata:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to collect backup metadata',
            details: error.message
        });
    }
});

// Forensic logging analysis endpoints
app.get('/api/debug/forensic/recurring-events', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.hours) || 24;
        const taskId = req.query.taskId;
        
        const events = await forensicLogger.getRecurringTaskEvents(taskId, timeRange);
        
        res.json({
            timeRange: `${timeRange} hours`,
            totalEvents: events.length,
            events: events
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/forensic/planning-events', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.hours) || 24;
        
        const events = await forensicLogger.getPlanningEvents(timeRange);
        
        res.json({
            timeRange: `${timeRange} hours`,
            totalEvents: events.length,
            events: events
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/database-columns', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'taken' 
            ORDER BY ordinal_position
        `);
        
        res.json({
            success: true,
            table: 'taken',
            columns: result.rows,
            herhalingColumns: result.rows.filter(col => col.column_name.startsWith('herhaling'))
        });
    } catch (error) {
        console.error('Failed to get database columns:', error);
        res.status(500).json({ error: 'Failed to retrieve database columns' });
    }
});

// POST /api/subscription/select - Select subscription plan
app.post('/api/subscription/select', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        const { plan_id, source } = req.body;

        // Validate required fields
        if (!plan_id || !source) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: plan_id and source are required'
            });
        }

        // Validate plan_id (includes No Limit plans: monthly_8 and yearly_80)
        const validPlanIds = ['trial_14_days', 'monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'];
        if (!validPlanIds.includes(plan_id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan_id. Must be one of: ' + validPlanIds.join(', ')
            });
        }

        // Validate source
        const validSources = ['beta', 'upgrade', 'registration'];
        if (!validSources.includes(source)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid source. Must be one of: ' + validSources.join(', ')
            });
        }

        const userId = req.session.userId;

        // Update user's subscription selection and status
        const updateResult = await pool.query(`
            UPDATE users
            SET selected_plan = $1,
                plan_selected_at = NOW(),
                selection_source = $2,
                subscription_status = 'active'
            WHERE id = $3
            RETURNING selected_plan, subscription_status
        `, [plan_id, source, userId]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Plan selection saved successfully',
            selected_plan: plan_id
        });

    } catch (error) {
        console.error('Error selecting subscription plan:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Debug endpoint to find specific task by ID without user filtering
app.get('/api/debug/find-task/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        // T017: Filter soft deleted tasks
        const result = await pool.query('SELECT * FROM taken WHERE id = $1 AND verwijderd_op IS NULL', [id]);
        
        if (result.rows.length > 0) {
            res.json({
                found: true,
                task: result.rows[0],
                message: `Task ${id} found`
            });
        } else {
            res.json({
                found: false,
                message: `Task ${id} not found in database`
            });
        }
    } catch (error) {
        console.error('Error finding task:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Fix user_id for specific task
app.put('/api/debug/fix-user/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE taken SET user_id = $1 WHERE id = $2 RETURNING *',
            ['default-user-001', id]
        );
        
        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: `Task ${id} user_id updated to default-user-001`,
                task: result.rows[0]
            });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error fixing user_id:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Migration endpoint for pure B2 storage
app.post('/api/admin/migrate-to-pure-b2', requireAuth, async (req, res) => {
    try {
        const { migrateDatabaseFilesToB2 } = require('./migrate-to-pure-b2.js');
        
        await migrateDatabaseFilesToB2();
        
        res.json({
            success: true,
            message: 'Migration to pure B2 storage completed successfully'
        });
        
    } catch (error) {
        console.error('❌ Migration API failed:', error);
        res.status(500).json({
            error: 'Migration failed',
            details: error.message
        });
    }
});

// ============================================================================
// T023: POST /api/admin2/debug/sql-query - Execute SQL queries with safety checks
// ============================================================================

app.post('/api/admin2/debug/sql-query', requireAdmin, async (req, res) => {
    try {

        const { query, confirm_destructive } = req.body;

        // Validatie: query is verplicht
        if (!query) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'SQL query is required',
                field: 'query'
            });
        }

        // Validatie: query moet een string zijn
        if (typeof query !== 'string') {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Query must be a string',
                field: 'query'
            });
        }

        // Parse en trim query
        const trimmedQuery = query.trim();

        if (trimmedQuery.length === 0) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Query cannot be empty',
                field: 'query'
            });
        }

        // Uppercase check voor keywords
        const upperQuery = trimmedQuery.toUpperCase();

        // BLOCKING CHECK: Dangerous operations die NOOIT toegestaan zijn
        const blockedKeywords = ['DROP', 'TRUNCATE', 'ALTER'];

        for (const keyword of blockedKeywords) {
            if (upperQuery.includes(keyword)) {

                // Log blocked attempt to audit
                try {
                    await pool.query(`
                        INSERT INTO admin_audit_log (
                            admin_user_id,
                            action,
                            target_type,
                            target_id,
                            old_value,
                            new_value,
                            ip_address,
                            user_agent
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        req.session.userId,
                        'SQL_QUERY_BLOCKED',
                        'database',
                        null,
                        null,
                        JSON.stringify({ keyword, query_preview: trimmedQuery.substring(0, 200) }),
                        req.ip,
                        req.get('User-Agent')
                    ]);
                } catch (auditError) {
                    console.log('[AUDIT] Blocked SQL query attempt:', keyword, 'by admin', req.session.userId);
                }

                return res.status(400).json({
                    error: `${keyword} operations are blocked for safety`,
                    blocked_keyword: keyword,
                    message: 'This operation is permanently blocked to protect the database'
                });
            }
        }

        // DESTRUCTIVE CHECK: Operations die confirmation vereisen
        const destructiveKeywords = ['DELETE', 'UPDATE'];

        for (const keyword of destructiveKeywords) {
            if (upperQuery.includes(keyword) && !confirm_destructive) {

                return res.status(400).json({
                    error: `${keyword} operations require explicit confirmation`,
                    destructive_keyword: keyword,
                    required_body: { confirm_destructive: true },
                    message: 'Add "confirm_destructive": true to execute this query'
                });
            }
        }

        // Execute query met timeout en timing

        // Set statement timeout to 10 seconds
        await pool.query('SET statement_timeout = 10000');

        const startTime = Date.now();
        let result;

        try {
            result = await pool.query(trimmedQuery);
        } finally {
            // Always reset timeout
            await pool.query('RESET statement_timeout');
        }

        const executionTime = Date.now() - startTime;

        // Prepare response
        const rows = result.rows || [];
        const rowCount = rows.length;
        const warnings = [];

        // Limit results to 1000 rows
        const limitedRows = rows.slice(0, 1000);
        if (rowCount > 1000) {
            warnings.push('Results limited to 1000 rows');
        }

        // Log to audit
        try {
            await pool.query(`
                INSERT INTO admin_audit_log (
                    admin_user_id,
                    action,
                    target_type,
                    target_id,
                    old_value,
                    new_value,
                    ip_address,
                    user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                req.session.userId,
                confirm_destructive ? 'SQL_QUERY_DESTRUCTIVE' : 'SQL_QUERY_SAFE',
                'database',
                null,
                null,
                JSON.stringify({
                    query: trimmedQuery.substring(0, 500), // Truncate long queries
                    row_count: rowCount,
                    execution_time_ms: executionTime
                }),
                req.ip,
                req.get('User-Agent')
            ]);
        } catch (auditError) {
            console.log('[AUDIT] Admin', req.session.userId, 'executed SQL query:', trimmedQuery.substring(0, 100), '| Rows:', rowCount);
        }

        // Build response
        const response = {
            success: true,
            query: trimmedQuery,
            rows: limitedRows,
            row_count: rowCount,
            execution_time_ms: executionTime,
            warnings: warnings.length > 0 ? warnings : undefined
        };


        res.json(response);

    } catch (error) {
        console.error('❌ Error executing SQL query:', error);

        // Check for specific PostgreSQL errors
        if (error.code === '57014') {
            // Query timeout
            return res.status(500).json({
                error: 'Query timeout',
                message: 'Query execution exceeded 10 second timeout',
                postgres_code: error.code
            });
        }

        if (error.code === '42601' || error.code === '42501') {
            // Syntax error or permission denied
            return res.status(400).json({
                error: 'Query error',
                message: error.message,
                postgres_code: error.code
            });
        }

        // Generic error
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to execute SQL query',
            details: error.message
        });
    }
});

// ============================================================================
// T025: POST /api/admin2/debug/cleanup-orphaned-data - Multi-level cleanup van orphaned data
// ============================================================================

app.post('/api/admin2/debug/cleanup-orphaned-data', requireAdmin, async (req, res) => {
    const startTime = Date.now();

    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { preview = true, targets } = req.body;
        const adminUserId = req.session.userId;

        // Validation: preview must be boolean if provided
        if (typeof preview !== 'boolean') {
            return res.status(400).json({
                error: 'Invalid preview value',
                message: 'preview must be a boolean (true/false)'
            });
        }

        // Validation: targets must be array if provided
        if (targets !== undefined && !Array.isArray(targets)) {
            return res.status(400).json({
                error: 'Invalid targets value',
                message: 'targets must be an array of strings'
            });
        }


        // Definieer alle cleanup targets met queries
        const allTargets = [
            {
                name: 'orphaned_tasks',
                description: 'Tasks with non-existent user_id',
                countQuery: 'SELECT COUNT(*) as count FROM taken WHERE user_id NOT IN (SELECT id FROM users)',
                deleteQuery: 'DELETE FROM taken WHERE user_id NOT IN (SELECT id FROM users)',
                enabled: !targets || targets.includes('orphaned_tasks')
            },
            {
                name: 'orphaned_email_imports',
                description: 'Email imports with non-existent user_id',
                countQuery: 'SELECT COUNT(*) as count FROM email_imports WHERE user_id NOT IN (SELECT id FROM users)',
                deleteQuery: 'DELETE FROM email_imports WHERE user_id NOT IN (SELECT id FROM users)',
                enabled: !targets || targets.includes('orphaned_email_imports')
            },
            {
                name: 'orphaned_planning_entries',
                description: 'Planning entries with non-existent user_id or taak_id',
                countQuery: `SELECT COUNT(*) as count FROM dagelijkse_planning
                             WHERE user_id NOT IN (SELECT id FROM users)
                             OR taak_id NOT IN (SELECT id FROM taken)`,
                deleteQuery: `DELETE FROM dagelijkse_planning
                              WHERE user_id NOT IN (SELECT id FROM users)
                              OR taak_id NOT IN (SELECT id FROM taken)`,
                enabled: !targets || targets.includes('orphaned_planning_entries')
            },
            {
                name: 'expired_sessions',
                description: 'Session records older than 30 days',
                countQuery: "SELECT COUNT(*) as count FROM session WHERE expire < NOW() - INTERVAL '30 days'",
                deleteQuery: "DELETE FROM session WHERE expire < NOW() - INTERVAL '30 days'",
                enabled: !targets || targets.includes('expired_sessions')
            },
            {
                name: 'orphaned_audit_logs',
                description: 'Audit logs with non-existent admin_user_id (optional)',
                countQuery: `SELECT COUNT(*) as count FROM admin_audit_log
                             WHERE admin_user_id NOT IN (SELECT id FROM users WHERE account_type = 'admin')`,
                deleteQuery: `DELETE FROM admin_audit_log
                              WHERE admin_user_id NOT IN (SELECT id FROM users WHERE account_type = 'admin')`,
                enabled: (!targets || targets.includes('orphaned_audit_logs')) && false // disabled by default, table might not exist
            }
        ];

        const cleanupResults = [];
        let totalDeleted = 0;

        // PREVIEW MODE - alleen tellen, niet verwijderen
        if (preview) {

            for (const target of allTargets.filter(t => t.enabled)) {
                try {
                    const countResult = await pool.query(target.countQuery);
                    const count = parseInt(countResult.rows[0].count);

                    cleanupResults.push({
                        target: target.name,
                        description: target.description,
                        found: count,
                        deleted: 0,
                        query: target.deleteQuery
                    });

                } catch (error) {
                    // Graceful skip voor targets die niet bestaan (bijv. admin_audit_log)
                }
            }
        }
        // EXECUTE MODE - daadwerkelijk verwijderen
        else {

            await pool.query('BEGIN');

            try {
                for (const target of allTargets.filter(t => t.enabled)) {
                    try {
                        // Eerst tellen
                        const countResult = await pool.query(target.countQuery);
                        const count = parseInt(countResult.rows[0].count);

                        // Dan verwijderen
                        const deleteResult = await pool.query(target.deleteQuery);
                        const deleted = deleteResult.rowCount || 0;

                        cleanupResults.push({
                            target: target.name,
                            description: target.description,
                            found: count,
                            deleted: deleted,
                            query: target.deleteQuery
                        });

                        totalDeleted += deleted;
                    } catch (error) {
                        // Graceful skip voor targets die niet bestaan
                    }
                }

                await pool.query('COMMIT');

                // Audit log voor execute mode
                const cleanupTimestamp = new Date().toISOString();
                await pool.query(`
                    INSERT INTO admin_audit_log (
                        admin_user_id,
                        action,
                        target_user_id,
                        old_value,
                        new_value,
                        timestamp,
                        ip_address,
                        user_agent
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    adminUserId,
                    'DATA_CLEANUP',
                    null,
                    JSON.stringify({ targets: targets || 'all' }),
                    JSON.stringify({
                        cleanup_results: cleanupResults,
                        total_deleted: totalDeleted
                    }),
                    cleanupTimestamp,
                    req.ip || req.connection.remoteAddress,
                    req.headers['user-agent'] || 'Unknown'
                ]).catch(err => {
                });

            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }
        }

        const executionTime = Date.now() - startTime;

        res.json({
            success: true,
            preview: preview,
            cleanup_results: cleanupResults,
            total_records_deleted: preview ? 0 : totalDeleted,
            execution_time_ms: executionTime
        });

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to cleanup orphaned data'
        });
    }
});


// Force deploy Thu Jun 26 11:21:42 CEST 2025

// ===================================================================
// === ADMIN MESSAGING SYSTEM ENDPOINTS ===
// Feature: 026-lees-messaging-system
// Phase 1: Core Foundation
// ===================================================================

// Note: requireAdmin middleware is defined earlier in server.js (line ~2344)
// It supports both password-based admin auth (admin2.html) and user-based admin auth

// POST /api/admin/messages - Create message
app.post('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const {
      title, message, message_type, target_type, target_subscription,
      target_users, trigger_type, trigger_value, dismissible, snoozable,
      publish_at, expires_at, button_label, button_action, button_target
    } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Validate specific_users target type has users selected
    if (target_type === 'specific_users' && (!target_users || target_users.length === 0)) {
      return res.status(400).json({
        error: 'Geen gebruikers geselecteerd. Selecteer minimaal één gebruiker voor dit bericht.'
      });
    }

    // Validate next_page_visit trigger has valid page identifier
    if (trigger_type === 'next_page_visit') {
      if (!trigger_value || trigger_value.trim() === '') {
        return res.status(400).json({
          error: 'Page identifier required for next_page_visit trigger'
        });
      }

      if (!trigger_value.startsWith('/')) {
        return res.status(400).json({
          error: 'Page identifier must start with / (e.g., /planning)'
        });
      }

      const validPages = [
        '/app',
        // Lijsten
        '/inbox', '/actielijst', '/projecten', '/follow-up', '/completed', '/planning', '/postponed',
        // Tools
        '/contextenbeheer', '/wekelijkse-optimalisatie', '/zoeken',
        // Popups
        '/planning-popup', '/recurring-popup'
      ];
      if (!validPages.includes(trigger_value)) {
        return res.status(400).json({
          error: `Invalid page. Must be one of: ${validPages.join(', ')}`
        });
      }
    }

    // Set publish_at to NOW() if not provided and trigger is immediate
    // Trigger types: immediate, days_after_signup, first_page_visit, nth_page_visit, next_time, next_page_visit
    const finalTriggerType = trigger_type || 'immediate';
    const finalPublishAt = publish_at || (finalTriggerType === 'immediate' ? new Date() : null);

    const result = await pool.query(`
      INSERT INTO admin_messages (
        title, message, message_type, target_type, target_subscription,
        target_users, trigger_type, trigger_value, dismissible, snoozable,
        publish_at, expires_at, button_label, button_action, button_target
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      title, message, message_type || 'information', target_type || 'all',
      target_subscription, target_users, finalTriggerType,
      trigger_value, dismissible !== false, snoozable !== false,
      finalPublishAt, expires_at || null, button_label || null,
      button_action || null, button_target || null
    ]);

    res.status(201).json({
      success: true,
      messageId: result.rows[0].id,
      message: 'Message created successfully'
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/messages - List all messages
app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.*,
        COUNT(DISTINCT CASE WHEN mi.user_id IS NOT NULL THEN mi.user_id END) as shown_count,
        COUNT(DISTINCT CASE WHEN mi.dismissed = true THEN mi.user_id END) as dismissed_count
      FROM admin_messages m
      LEFT JOIN message_interactions mi ON mi.message_id = m.id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/messages/:id - Get single message
app.get('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;

    const result = await pool.query(
      'SELECT * FROM admin_messages WHERE id = $1',
      [messageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/messages/:id/analytics - Message analytics
app.get('/api/admin/messages/:id/analytics', requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;

    // TODO: Implement full analytics (zie api-contracts.md)
    // Phase 4 implementation

    res.json({ message: 'Analytics implementation coming in Phase 4' });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/messages/:id/toggle - Toggle active status
app.post('/api/admin/messages/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE admin_messages
      SET active = NOT active, updated_at = NOW()
      WHERE id = $1
      RETURNING active
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, active: result.rows[0].active });
  } catch (error) {
    console.error('Toggle message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/messages/:id - Update message
app.put('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const {
      title, message, message_type, target_type, target_subscription,
      target_users, trigger_type, trigger_value, dismissible, snoozable,
      publish_at, expires_at, button_label, button_action, button_target, active
    } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const result = await pool.query(`
      UPDATE admin_messages SET
        title = $1,
        message = $2,
        message_type = $3,
        target_type = $4,
        target_subscription = $5,
        target_users = $6,
        trigger_type = $7,
        trigger_value = $8,
        dismissible = $9,
        snoozable = $10,
        publish_at = $11,
        expires_at = $12,
        button_label = $13,
        button_action = $14,
        button_target = $15,
        active = $16,
        updated_at = NOW()
      WHERE id = $17
      RETURNING *
    `, [
      title, message, message_type || 'information', target_type || 'all',
      target_subscription, target_users, trigger_type || 'immediate',
      trigger_value, dismissible !== false, snoozable !== false,
      publish_at, expires_at, button_label, button_action, button_target,
      active !== false, req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/messages/:id - Delete message
app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;

    // Check if message exists
    const checkResult = await pool.query(
      'SELECT id FROM admin_messages WHERE id = $1',
      [messageId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Delete message (hard delete)
    // Note: This will cascade delete message_interactions due to foreign key
    await pool.query('DELETE FROM admin_messages WHERE id = $1', [messageId]);

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/messages/:id/duplicate - Duplicate message
app.post('/api/admin/messages/:id/duplicate', requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;

    // Get original message
    const original = await pool.query(
      'SELECT * FROM admin_messages WHERE id = $1',
      [messageId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const msg = original.rows[0];

    // Create duplicate with modified title and inactive status
    const result = await pool.query(`
      INSERT INTO admin_messages (
        title, message, message_type, target_type, target_subscription,
        target_users, trigger_type, trigger_value, dismissible, snoozable,
        publish_at, expires_at, button_label, button_action, button_target, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false)
      RETURNING id
    `, [
      `Copy of ${msg.title}`,
      msg.message,
      msg.message_type,
      msg.target_type,
      msg.target_subscription,
      msg.target_users,
      msg.trigger_type,
      msg.trigger_value,
      msg.dismissible,
      msg.snoozable,
      msg.publish_at,
      msg.expires_at,
      msg.button_label,
      msg.button_action,
      msg.button_target
    ]);

    res.json({
      success: true,
      messageId: result.rows[0].id,
      message: 'Message duplicated successfully (inactive)'
    });
  } catch (error) {
    console.error('Duplicate message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DEPRECATED: This endpoint has been replaced by /api/admin2/users/search
// The old route used 'username' which doesn't exist in the schema (should be 'naam')
// Removed to prevent confusion and 500 errors

// GET /api/admin/messages/preview-targets - Preview targeting
app.get('/api/admin/messages/preview-targets', requireAdmin, async (req, res) => {
  try {
    const { target_type, target_subscription, target_users } = req.query;

    // Dynamic query building based on targeting
    let whereConditions = ['1=1'];
    let queryParams = [];

    if (target_type === 'filtered' && target_subscription) {
      const subscriptions = JSON.parse(target_subscription);
      queryParams.push(subscriptions);
      whereConditions.push(`subscription_type = ANY($${queryParams.length})`);
    } else if (target_type === 'specific_users' && target_users) {
      const userIds = JSON.parse(target_users);
      queryParams.push(userIds);
      whereConditions.push(`id = ANY($${queryParams.length})`);
    }
    // target_type = 'all' → geen extra where clause

    // Count total + get sample of first 5
    const countQuery = `
      SELECT COUNT(*) as count FROM users
      WHERE ${whereConditions.join(' AND ')}
    `;
    const sampleQuery = `
      SELECT id, naam as name, email FROM users
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY naam
      LIMIT 5
    `;

    const [countResult, sampleResult] = await Promise.all([
      pool.query(countQuery, queryParams),
      pool.query(sampleQuery, queryParams)
    ]);

    res.json({
      count: parseInt(countResult.rows[0].count),
      sample: sampleResult.rows
    });
  } catch (error) {
    console.error('Preview targets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================================================================
// === USER MESSAGING ENDPOINTS ===
// ===================================================================

// GET /api/messages/unread - Get unread messages
app.get('/api/messages/unread', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.session.userId;
    const pageIdentifier = req.query.page; // Voor page visit triggers
    const now = new Date();

    // Valideer page parameter format
    if (pageIdentifier && !pageIdentifier.startsWith('/')) {
      return res.status(400).json({
        error: 'Page parameter must start with / (e.g., /planning)'
      });
    }

    // Haal user subscription type en created_at op
    const userResult = await pool.query(`
      SELECT subscription_type, created_at FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userSubscription = userResult.rows[0].subscription_type || 'free';
    const userCreatedAt = userResult.rows[0].created_at;
    const daysSinceSignup = Math.floor((now - new Date(userCreatedAt)) / (1000 * 60 * 60 * 24));


    // Query voor immediate, days_after_signup, en next_time triggers
    const mainQuery = `
      SELECT m.* FROM admin_messages m
      WHERE m.active = true
        AND (m.publish_at IS NULL OR m.publish_at <= $1)
        AND (m.expires_at IS NULL OR m.expires_at > $1)

        -- Targeting filter
        AND (
          m.target_type = 'all'
          OR (m.target_type = 'filtered' AND $3 = ANY(m.target_subscription))
          OR (m.target_type = 'specific_users' AND $2 = ANY(m.target_users))
        )

        -- Trigger filter (immediate + days_after_signup + next_time)
        AND (
          m.trigger_type = 'immediate'
          OR (m.trigger_type = 'days_after_signup' AND $4 >= m.trigger_value::integer)
          OR m.trigger_type = 'next_time'
        )

        -- Exclude dismissed/snoozed
        AND m.id NOT IN (
          SELECT message_id FROM message_interactions
          WHERE user_id = $2
            AND (dismissed = true OR snoozed_until > $1)
        )

      ORDER BY
        CASE m.message_type
          WHEN 'important' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'feature' THEN 3
          WHEN 'educational' THEN 4
          WHEN 'tip' THEN 5
          WHEN 'information' THEN 6
          ELSE 7
        END,
        m.created_at DESC
    `;

    const mainResult = await pool.query(mainQuery, [now, userId, userSubscription, daysSinceSignup]);
    let messages = mainResult.rows;

    // Page visit triggers - alleen als pageIdentifier is meegegeven
    if (pageIdentifier) {
      // Haal visit count op voor deze page
      const visitResult = await pool.query(`
        SELECT visit_count FROM user_page_visits
        WHERE user_id = $1 AND page_identifier = $2
      `, [userId, pageIdentifier]);

      const visitCount = visitResult.rows.length > 0 ? visitResult.rows[0].visit_count : 0;

      // Query voor page visit triggered messages
      const pageVisitQuery = `
        SELECT m.* FROM admin_messages m
        WHERE m.active = true
          AND (m.publish_at IS NULL OR m.publish_at <= $1)
          AND (m.expires_at IS NULL OR m.expires_at > $1)

          -- Targeting filter
          AND (
            m.target_type = 'all'
            OR (m.target_type = 'filtered' AND $3 = ANY(m.target_subscription))
            OR (m.target_type = 'specific_users' AND $2 = ANY(m.target_users))
          )

          -- Page visit triggers
          AND (
            (m.trigger_type = 'first_page_visit' AND m.trigger_value = $4 AND $5 = 1)
            OR (m.trigger_type = 'nth_page_visit' AND
                split_part(m.trigger_value, ':', 2) = $4 AND
                $5 >= split_part(m.trigger_value, ':', 1)::integer)
            OR (m.trigger_type = 'next_page_visit' AND m.trigger_value = $4)
          )

          -- Exclude dismissed/snoozed
          AND m.id NOT IN (
            SELECT message_id FROM message_interactions
            WHERE user_id = $2
              AND (dismissed = true OR snoozed_until > $1)
          )
      `;

      const pageVisitResult = await pool.query(pageVisitQuery, [
        now, userId, userSubscription, pageIdentifier, visitCount
      ]);

      // Merge messages (vermijd duplicaten)
      const messageIds = new Set(messages.map(m => m.id));
      for (const msg of pageVisitResult.rows) {
        if (!messageIds.has(msg.id)) {
          messages.push(msg);
          messageIds.add(msg.id);
        }
      }

      // Re-sort merged messages by priority
      messages.sort((a, b) => {
        const priorityOrder = {
          'important': 1, 'warning': 2, 'feature': 3,
          'educational': 4, 'tip': 5, 'information': 6
        };
        const aPriority = priorityOrder[a.message_type] || 7;
        const bPriority = priorityOrder[b.message_type] || 7;

        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

    res.json({ messages });
  } catch (error) {
    console.error('Unread messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:id/dismiss - Dismiss message
app.post('/api/messages/:id/dismiss', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await pool.query(`
      INSERT INTO message_interactions (message_id, user_id, dismissed)
      VALUES ($1, $2, true)
      ON CONFLICT (message_id, user_id)
      DO UPDATE SET dismissed = true, last_shown_at = NOW()
    `, [req.params.id, req.session.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Dismiss message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:id/snooze - Snooze a message
app.post('/api/messages/:id/snooze', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { duration } = req.body; // duration in seconds
    if (!duration || typeof duration !== 'number') {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    const result = await pool.query(`
      INSERT INTO message_interactions (message_id, user_id, snoozed_until)
      VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3)
      ON CONFLICT (message_id, user_id)
      DO UPDATE SET snoozed_until = NOW() + INTERVAL '1 second' * $3
      RETURNING snoozed_until
    `, [req.params.id, req.session.userId, duration]);

    res.json({
      success: true,
      snoozedUntil: result.rows[0].snoozed_until
    });
  } catch (error) {
    console.error('Snooze message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:id/button-click - Track button click
app.post('/api/messages/:id/button-click', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await pool.query(`
      UPDATE message_interactions
      SET button_clicked = true, button_clicked_at = NOW()
      WHERE message_id = $1 AND user_id = $2
    `, [req.params.id, req.session.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Button click tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/page-visit/:pageIdentifier - Track page visit
app.post('/api/page-visit/:pageIdentifier', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(`
      INSERT INTO user_page_visits (user_id, page_identifier, visit_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, page_identifier)
      DO UPDATE SET
        visit_count = user_page_visits.visit_count + 1,
        last_visit_at = NOW()
      RETURNING visit_count
    `, [req.session.userId, req.params.pageIdentifier]);

    res.json({ success: true, visitCount: result.rows[0].visit_count });
  } catch (error) {
    console.error('Page visit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Force redeploy Sat Oct 18 23:52:24 CEST 2025
// Force redeploy Thu Oct 23 11:51:27 CEST 2025

// ============================================================================
// User Settings API - Feature 056-je-mag-een
// ============================================================================

// GET /api/user-settings - Retrieve user settings
app.get('/api/user-settings', async (req, res) => {
  try {
    // Authentication required
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - please log in'
      });
    }

    const userId = req.session.userId;

    // Query user settings
    const result = await pool.query(
      'SELECT id, user_id, settings, created_at, updated_at FROM user_settings WHERE user_id = $1',
      [userId]
    );

    // Return null if no settings exist yet, otherwise return settings object
    const settings = result.rows.length > 0 ? result.rows[0] : null;

    res.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('GET /api/user-settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
});

// POST /api/user-settings - Create or update user settings (upsert)
app.post('/api/user-settings', async (req, res) => {
  try {
    // Authentication required
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - please log in'
      });
    }

    const userId = req.session.userId;

    // Validate request body
    if (!req.body.hasOwnProperty('settings')) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: settings'
      });
    }

    const settings = req.body.settings;

    // Validate settings is an object (not array, not null)
    if (typeof settings !== 'object' || Array.isArray(settings) || settings === null) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings format - must be an object'
      });
    }

    // Upsert settings (INSERT or UPDATE)
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         settings = $2,
         updated_at = NOW()
       RETURNING id, user_id, settings, created_at, updated_at`,
      [userId, JSON.stringify(settings)]
    );

    res.json({
      success: true,
      settings: result.rows[0]
    });

  } catch (error) {
    console.error('POST /api/user-settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
});

// ============================================================================
// ADMIN TEST ENVIRONMENT MANAGEMENT ENDPOINTS
// Feature 064: Separate Test Environment with Database Isolation
// ============================================================================

// 1. Verify database connections
app.get('/api/admin/test-db/verify', requireAdmin, async (req, res) => {
  try {
    const startTime = Date.now();

    // Test production connection
    const prodCheck = await pool.query('SELECT 1 as test');
    const prodLatency = Date.now() - startTime;

    // Test test database connection (if available)
    let testCheck = null;
    let testLatency = 0;
    if (testPool) {
      const testStartTime = Date.now();
      testCheck = await testPool.query('SELECT 1 as test');
      testLatency = Date.now() - testStartTime;
    }

    res.json({
      production: {
        connected: prodCheck.rowCount === 1,
        latency: prodLatency
      },
      test: {
        connected: testCheck ? testCheck.rowCount === 1 : false,
        configured: testPool !== null,
        latency: testLatency
      }
    });
  } catch (error) {
    console.error('Database verification error:', error);
    res.status(500).json({
      error: 'DatabaseVerificationFailed',
      message: error.message
    });
  }
});

// 2. Copy schema from production to test (SQL-based, no pg_dump required)
app.post('/api/admin/test-db/copy-schema', requireAdmin, async (req, res) => {
  if (!req.body.confirm) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Confirmation required for destructive operation'
    });
  }

  if (!testPool) {
    return res.status(500).json({
      error: 'TestDatabaseNotConfigured',
      message: 'DATABASE_URL_TEST environment variable not set'
    });
  }

  try {
    const startTime = Date.now();

    console.log('📋 Getting production schema...');

    // Step 1: Get all table definitions from production
    const tables = await pool.query(`
      SELECT
        table_name,
        (
          SELECT string_agg(
            '"' || column_name || '" ' ||
            CASE
              WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL
                THEN 'VARCHAR(' || character_maximum_length || ')'
              WHEN data_type = 'character varying' AND character_maximum_length IS NULL
                THEN 'VARCHAR'
              WHEN data_type = 'numeric' THEN 'DECIMAL(' || numeric_precision || ',' || numeric_scale || ')'
              WHEN data_type = 'ARRAY' THEN udt_name
              WHEN data_type = 'USER-DEFINED' THEN udt_name
              ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
            ', '
            ORDER BY ordinal_position
          )
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = t.table_name
        ) as columns,
        (
          SELECT string_agg(constraint_def, ', ')
          FROM (
            SELECT
              tc.constraint_name,
              'CONSTRAINT "' || tc.constraint_name || '" ' ||
              CASE tc.constraint_type
                WHEN 'PRIMARY KEY' THEN 'PRIMARY KEY (' || (
                  SELECT string_agg('"' || kcu.column_name || '"', ', ' ORDER BY kcu.ordinal_position)
                  FROM information_schema.key_column_usage kcu
                  WHERE kcu.constraint_name = tc.constraint_name
                ) || ')'
                WHEN 'UNIQUE' THEN 'UNIQUE (' || (
                  SELECT string_agg('"' || kcu.column_name || '"', ', ' ORDER BY kcu.ordinal_position)
                  FROM information_schema.key_column_usage kcu
                  WHERE kcu.constraint_name = tc.constraint_name
                ) || ')'
                WHEN 'CHECK' THEN 'CHECK (' || (
                  SELECT check_clause
                  FROM information_schema.check_constraints
                  WHERE constraint_name = tc.constraint_name
                ) || ')'
              END as constraint_def
            FROM information_schema.table_constraints tc
            WHERE tc.table_schema = 'public'
              AND tc.table_name = t.table_name
              AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK')
              AND tc.constraint_name NOT LIKE '%_not_null'
              AND (
                tc.constraint_type = 'CHECK'
                OR NOT EXISTS (
                  SELECT 1
                  FROM information_schema.key_column_usage kcu
                  WHERE kcu.constraint_name = tc.constraint_name
                    AND NOT EXISTS (
                      SELECT 1 FROM information_schema.columns c
                      WHERE c.table_schema = 'public'
                        AND c.table_name = t.table_name
                        AND c.column_name = kcu.column_name
                    )
                )
              )
          ) constraints_sub
        ) as constraints
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Step 2: Get all sequences
    const sequences = await pool.query(`
      SELECT
        sequencename as sequence_name,
        start_value,
        increment_by,
        max_value,
        min_value,
        cache_size,
        cycle
      FROM pg_sequences
      WHERE schemaname = 'public'
    `);

    // Step 3: Get foreign keys separately (to add after tables exist)
    const foreignKeys = await pool.query(`
      SELECT
        tc.conname AS constraint_name,
        tn.nspname AS table_schema,
        t.relname AS table_name,
        a.attname AS column_name,
        fn.nspname AS foreign_table_schema,
        ft.relname AS foreign_table_name,
        fa.attname AS foreign_column_name,
        u.attposition AS position,
        CASE tc.confupdtype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS update_rule,
        CASE tc.confdeltype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS delete_rule
      FROM pg_constraint tc
      JOIN pg_class t ON tc.conrelid = t.oid
      JOIN pg_namespace tn ON t.relnamespace = tn.oid
      JOIN pg_class ft ON tc.confrelid = ft.oid
      JOIN pg_namespace fn ON ft.relnamespace = fn.oid
      JOIN LATERAL (
        SELECT
          unnest(tc.conkey) AS local_attnum,
          unnest(tc.confkey) AS foreign_attnum,
          generate_series(1, array_length(tc.conkey, 1)) AS attposition
      ) u ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = u.local_attnum
      JOIN pg_attribute fa ON fa.attrelid = ft.oid AND fa.attnum = u.foreign_attnum
      WHERE tc.contype = 'f'
        AND tn.nspname = 'public'
      ORDER BY t.relname, u.attposition
    `);

    console.log(`🗑️ Clearing test database...`);

    // Step 4: Clear test database
    await testPool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await testPool.query('CREATE SCHEMA public');
    await testPool.query('GRANT ALL ON SCHEMA public TO neondb_owner');
    await testPool.query('GRANT ALL ON SCHEMA public TO public');

    console.log(`🔢 Creating ${sequences.rows.length} sequences...`);

    // Step 5: Create sequences
    for (const seq of sequences.rows) {
      const createSeqSQL = `
        CREATE SEQUENCE "${seq.sequence_name}"
        START WITH ${seq.start_value}
        INCREMENT BY ${seq.increment_by}
        MINVALUE ${seq.min_value}
        MAXVALUE ${seq.max_value}
        CACHE ${seq.cache_size}
        ${seq.cycle ? 'CYCLE' : 'NO CYCLE'}
      `;
      await testPool.query(createSeqSQL);
      console.log(`  ✓ Created sequence: ${seq.sequence_name}`);
    }

    console.log(`📦 Creating ${tables.rows.length} tables...`);

    // Step 6: Create all tables (without foreign keys)
    for (const table of tables.rows) {
      // Skip tables with no columns (schema inconsistency)
      if (!table.columns || table.columns.trim() === '') {
        console.log(`  ⚠️  Skipped table ${table.table_name}: no columns found`);
        continue;
      }

      const createSQL = `
        CREATE TABLE "${table.table_name}" (
          ${table.columns}
          ${table.constraints ? ', ' + table.constraints : ''}
        )
      `;

      console.log(`  📝 Creating table ${table.table_name}:`);
      console.log(createSQL);

      try {
        await testPool.query(createSQL);
        console.log(`  ✓ Created table: ${table.table_name}`);
      } catch (error) {
        // If constraint references non-existent column, recreate without constraints
        if (error.code === '42703' && error.message.includes('named in key does not exist')) {
          console.log(`  ⚠️  Retrying ${table.table_name} without constraints...`);
          const createSQLNoConstraints = `
            CREATE TABLE "${table.table_name}" (
              ${table.columns}
            )
          `;
          await testPool.query(createSQLNoConstraints);
          console.log(`  ✓ Created table: ${table.table_name} (without constraints)`);
        } else {
          throw error;
        }
      }
    }

    console.log(`🔗 Adding ${foreignKeys.rows.length} foreign keys...`);

    // Step 5: Add foreign keys
    const fkMap = new Map();
    for (const fk of foreignKeys.rows) {
      const key = `${fk.table_name}_${fk.constraint_name}`;
      if (!fkMap.has(key)) {
        fkMap.set(key, {
          table: fk.table_name,
          name: fk.constraint_name,
          columns: [],
          foreignTable: fk.foreign_table_name,
          foreignColumns: [],
          onUpdate: fk.update_rule,
          onDelete: fk.delete_rule
        });
      }
      fkMap.get(key).columns.push(fk.column_name);
      fkMap.get(key).foreignColumns.push(fk.foreign_column_name);
    }

    for (const [, fk] of fkMap) {
      const alterSQL = `
        ALTER TABLE "${fk.table}"
        ADD CONSTRAINT "${fk.name}"
        FOREIGN KEY ("${fk.columns.join('", "')}")
        REFERENCES "${fk.foreignTable}" ("${fk.foreignColumns.join('", "')}")
        ON UPDATE ${fk.onUpdate}
        ON DELETE ${fk.onDelete}
      `;

      try {
        await testPool.query(alterSQL);
        console.log(`  ✓ Added FK: ${fk.table}.${fk.columns} → ${fk.foreignTable}.${fk.foreignColumns}`);
      } catch (error) {
        // Skip FK if column doesn't exist (schema inconsistency)
        if (error.code === '42703' && error.message.includes('does not exist')) {
          console.log(`  ⚠️  Skipped FK: ${fk.table}.${fk.columns} → ${fk.foreignTable}.${fk.foreignColumns} (column missing)`);
        } else {
          console.error(`  ✗ Failed FK: ${fk.table}.${fk.columns} → ${fk.foreignTable}.${fk.foreignColumns}`);
          console.error(`  SQL: ${alterSQL}`);
          throw error;
        }
      }
    }

    // Step 6: Get final table count
    const tableCount = await testPool.query(`
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    const duration = Date.now() - startTime;

    console.log(`✅ Schema copied successfully - ${tableCount.rows[0].count} tables in ${duration}ms`);

    res.json({
      success: true,
      tablesCreated: parseInt(tableCount.rows[0].count),
      foreignKeysAdded: fkMap.size,
      duration,
      details: 'Schema copied successfully with all constraints and foreign keys'
    });

  } catch (error) {
    console.error('Schema copy error:', error);
    res.status(500).json({
      error: 'SchemaCopyFailed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 3. List production users
app.get('/api/admin/production-users', requireAdmin, async (req, res) => {
  try {
    // Always use productionPool to ensure we query PRODUCTION database
    // even when running on staging environment
    const result = await productionPool.query(`
      SELECT id, email, naam as username
      FROM users
      ORDER BY id
    `);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('List production users error:', error);
    res.status(500).json({
      error: 'QueryFailed',
      message: error.message
    });
  }
});

// 4. Validate schema differences between production and test
app.post('/api/admin/test-db/validate-schema', requireAdmin, async (req, res) => {
  if (!testPool) {
    return res.status(500).json({
      error: 'TestDatabaseNotConfigured',
      message: 'DATABASE_URL_TEST not set'
    });
  }

  try {
    const startTime = Date.now();

    // Get all tables and their columns from both databases
    const prodSchema = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const testSchema = await testPool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    // Build maps for comparison
    const prodTables = {};
    const testTables = {};

    prodSchema.rows.forEach(col => {
      if (!prodTables[col.table_name]) prodTables[col.table_name] = [];
      prodTables[col.table_name].push(col);
    });

    testSchema.rows.forEach(col => {
      if (!testTables[col.table_name]) testTables[col.table_name] = [];
      testTables[col.table_name].push(col);
    });

    // Compare schemas
    const differences = {
      missingTablesInTest: [],
      extraTablesInTest: [],
      tableDifferences: []
    };

    // Check for missing tables in test
    Object.keys(prodTables).forEach(tableName => {
      if (!testTables[tableName]) {
        differences.missingTablesInTest.push(tableName);
      }
    });

    // Check for extra tables in test
    Object.keys(testTables).forEach(tableName => {
      if (!prodTables[tableName]) {
        differences.extraTablesInTest.push(tableName);
      }
    });

    // Compare columns for tables that exist in both
    Object.keys(prodTables).forEach(tableName => {
      if (!testTables[tableName]) return;

      const prodCols = prodTables[tableName].map(c => c.column_name);
      const testCols = testTables[tableName].map(c => c.column_name);

      const missingCols = prodCols.filter(c => !testCols.includes(c));
      const extraCols = testCols.filter(c => !prodCols.includes(c));

      if (missingCols.length > 0 || extraCols.length > 0) {
        differences.tableDifferences.push({
          table: tableName,
          missingColumns: missingCols,
          extraColumns: extraCols
        });
      }
    });

    const duration = Date.now() - startTime;
    const hasDifferences =
      differences.missingTablesInTest.length > 0 ||
      differences.extraTablesInTest.length > 0 ||
      differences.tableDifferences.length > 0;

    res.json({
      success: true,
      schemasMatch: !hasDifferences,
      differences,
      duration,
      recommendation: hasDifferences
        ? 'Run "Copy Schema" to sync test database with production'
        : 'Schemas are in sync - safe to copy users'
    });

  } catch (error) {
    console.error('Schema validation error:', error);
    res.status(500).json({
      error: 'ValidationFailed',
      message: error.message
    });
  }
});

// Helper: Get common columns between production and test for a table
async function getCommonColumns(tableName, prodPool, testPool) {
  const prodCols = await prodPool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const testCols = await testPool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const prodColNames = prodCols.rows.map(r => r.column_name);
  const testColNames = testCols.rows.map(r => r.column_name);

  // Return columns that exist in BOTH databases
  return prodColNames.filter(col => testColNames.includes(col));
}

// Helper: Build dynamic INSERT statement
function buildInsertStatement(tableName, columns, row) {
  const colList = columns.map(c => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const values = columns.map(c => row[c]);

  return {
    sql: `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`,
    values
  };
}

// 5. Copy user from production to test (DYNAMIC VERSION)
app.post('/api/admin/test-db/copy-user', requireAdmin, async (req, res) => {
  const { userId, confirm } = req.body;

  if (!confirm) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Confirmation required'
    });
  }

  if (!testPool) {
    return res.status(500).json({
      error: 'TestDatabaseNotConfigured',
      message: 'DATABASE_URL_TEST not set'
    });
  }

  try {
    const startTime = Date.now();
    const copyStats = {
      users: 0,
      taken: 0,
      projecten: 0,
      contexten: 0,
      subtaken: 0,
      bijlagen: 0,
      feedback: 0,
      errors: []
    };

    // Get user from production
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'UserNotFound',
        message: `User ID ${userId} not found in production database`
      });
    }

    const user = userResult.rows[0];

    // Check for duplicate in test
    const testUserCheck = await testPool.query('SELECT id FROM users WHERE email = $1', [user.email]);
    if (testUserCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'UserAlreadyExists',
        message: `User ${user.email} already exists in test database`,
        details: 'Delete existing user from test database before retrying copy'
      });
    }

    // Begin transaction in test database
    const client = await testPool.connect();
    try {
      await client.query('BEGIN');

      // Helper function to copy table rows dynamically
      async function copyTableRows(tableName, rows) {
        if (rows.length === 0) return 0;

        const columns = await getCommonColumns(tableName, pool, testPool);
        let copiedCount = 0;

        for (const row of rows) {
          try {
            const { sql, values } = buildInsertStatement(tableName, columns, row);
            await client.query(sql, values);
            copiedCount++;
          } catch (err) {
            // Skip duplicate keys, report other errors
            if (!err.message.includes('duplicate key')) {
              copyStats.errors.push({
                table: tableName,
                error: err.message,
                rowId: row.id || 'unknown'
              });
            }
          }
        }

        return copiedCount;
      }

      // 1. Copy user
      copyStats.users = await copyTableRows('users', [user]);

      // 2. Copy taken (tasks)
      const taken = await pool.query('SELECT * FROM taken WHERE user_id = $1', [userId]);
      copyStats.taken = await copyTableRows('taken', taken.rows);

      // 3. Copy projecten (only those used by this user's taken)
      const projecten = await pool.query(`
        SELECT DISTINCT p.* FROM projecten p
        JOIN taken t ON t.project_id = p.id
        WHERE t.user_id = $1
      `, [userId]);
      copyStats.projecten = await copyTableRows('projecten', projecten.rows);

      // 4. Copy contexten (only those used by this user's taken)
      const contexten = await pool.query(`
        SELECT DISTINCT c.* FROM contexten c
        JOIN taken t ON t.context_id = c.id
        WHERE t.user_id = $1
      `, [userId]);
      copyStats.contexten = await copyTableRows('contexten', contexten.rows);

      // 5. Copy subtaken (only for this user's taken)
      const subtaken = await pool.query(`
        SELECT s.* FROM subtaken s
        JOIN taken t ON s.parent_taak_id = t.id
        WHERE t.user_id = $1
      `, [userId]);
      copyStats.subtaken = await copyTableRows('subtaken', subtaken.rows);

      // 6. Copy bijlagen (attachments)
      const bijlagen = await pool.query('SELECT * FROM bijlagen WHERE user_id = $1', [userId]);
      copyStats.bijlagen = await copyTableRows('bijlagen', bijlagen.rows);

      // 7. Copy feedback
      const feedback = await pool.query('SELECT * FROM feedback WHERE user_id = $1', [userId]);
      copyStats.feedback = await copyTableRows('feedback', feedback.rows);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        userEmail: user.email,
        stats: copyStats,
        duration,
        hasErrors: copyStats.errors.length > 0
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Copy user error:', error);
    res.status(500).json({
      error: 'CopyFailed',
      message: error.message
    });
  }
});

// DEBUG: Check what schema copy query returns for specific tables
app.get('/api/admin/test-db/debug-schema', async (req, res) => {
  try {
    // Get individual column details
    const columns = await pool.query(`
      SELECT
        table_name,
        column_name,
        ordinal_position,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        '"' || column_name || '" ' ||
        CASE
          WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
          WHEN data_type = 'numeric' THEN 'DECIMAL(' || numeric_precision || ',' || numeric_scale || ')'
          WHEN data_type = 'ARRAY' THEN udt_name
          WHEN data_type = 'USER-DEFINED' THEN udt_name
          ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
        as column_definition
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('password_reset_tokens', 'session', 'user_sessions')
      ORDER BY table_name, ordinal_position
    `);

    res.json({ columns: columns.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. List test database users
app.get('/api/admin/test-db/users', requireAdmin, async (req, res) => {
  if (!testPool) {
    return res.json({ users: [] });
  }

  try {
    const result = await testPool.query(`
      SELECT id, email, naam as username
      FROM users
      ORDER BY id
    `);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('List test users error:', error);
    // Don't return 500 if table doesn't exist yet - test DB might not have schema
    if (error.message.includes('does not exist')) {
      return res.json({ users: [], schemaNotInitialized: true });
    }
    res.status(500).json({
      error: 'QueryFailed',
      message: error.message
    });
  }
});

// 6. Delete user from test database
app.delete('/api/admin/test-db/user/:userId', requireAdmin, async (req, res) => {
  const userId = req.params.userId;

  if (!testPool) {
    return res.status(500).json({
      error: 'TestDatabaseNotConfigured',
      message: 'DATABASE_URL_TEST not set'
    });
  }

  try {
    // Check if user exists
    const userCheck = await testPool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'UserNotFound',
        message: 'User not found in test database'
      });
    }

    // Count related data before delete
    const taskCount = await testPool.query('SELECT COUNT(*) FROM taken WHERE user_id = $1', [userId]);
    const attachmentCount = await testPool.query('SELECT COUNT(*) FROM bijlagen WHERE user_id = $1', [userId]);
    const feedbackCount = await testPool.query('SELECT COUNT(*) FROM feedback WHERE user_id = $1', [userId]);

    // Delete user (cascades via foreign keys where applicable)
    await testPool.query('DELETE FROM feedback WHERE user_id = $1', [userId]);
    await testPool.query('DELETE FROM bijlagen WHERE user_id = $1', [userId]);
    await testPool.query(`
      DELETE FROM subtaken WHERE parent_taak_id IN (
        SELECT id FROM taken WHERE user_id = $1
      )
    `, [userId]);
    await testPool.query('DELETE FROM taken WHERE user_id = $1', [userId]);
    await testPool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      deletedTasks: parseInt(taskCount.rows[0].count),
      deletedAttachments: parseInt(attachmentCount.rows[0].count),
      deletedFeedback: parseInt(feedbackCount.rows[0].count)
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'DeleteFailed',
      message: error.message
    });
  }
});

// 7. Clear test database
app.post('/api/admin/test-db/clear', requireAdmin, async (req, res) => {
  if (!req.body.confirm) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Confirmation required for destructive operation'
    });
  }

  if (!testPool) {
    return res.status(500).json({
      error: 'TestDatabaseNotConfigured',
      message: 'DATABASE_URL_TEST not set'
    });
  }

  try {
    // Delete in correct order (respect foreign keys)
    const tables = [
      'feedback',
      'bijlagen',
      'subtaken',
      'taken',
      'users',
      'projecten',
      'contexten',
      'page_help',
      'user_sessions'
    ];

    let totalDeleted = 0;
    for (const table of tables) {
      try {
        const result = await testPool.query(`DELETE FROM ${table}`);
        totalDeleted += result.rowCount || 0;
      } catch (err) {
        // Table might not exist, continue
        console.log(`⚠️ Could not clear table ${table}:`, err.message);
      }
    }

    res.json({
      success: true,
      tablesCleared: tables.length,
      totalRowsDeleted: totalDeleted
    });

  } catch (error) {
    console.error('Clear database error:', error);
    res.status(500).json({
      error: 'ClearFailed',
      message: error.message
    });
  }
});

// ============================================================================
// END OF TEST ENVIRONMENT ENDPOINTS
// ============================================================================

// 404 handler - MUST be after all routes!
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
});

app.listen(PORT, () => {
    
    // Initialize database and storage manager after server starts
    setTimeout(async () => {
        try {
            if (db) {
                const { initDatabase } = require('./database');
                await initDatabase();
                dbInitialized = true;
            } else {
            }
        } catch (error) {
            console.error('⚠️ Database initialization failed:', error.message);
        }

        // Initialize storage manager for B2 functionality
        try {
            if (storageManager) {
                await storageManager.initialize();
            } else {
            }
        } catch (error) {
            console.error('⚠️ Storage manager initialization failed:', error.message);
        }
    }, 1000);
});

// ============================================================================
// Archive System Admin Endpoints
// T006: POST /api/admin/migrate-archive - Archive migration endpoint
// T007: GET /api/admin/archive-stats - Archive statistics endpoint
// ============================================================================

// T006: Migration endpoint for archiving existing completed tasks
app.post('/api/admin/migrate-archive', requireAdmin, async (req, res) => {
    try {

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { dry_run } = req.body;
        const startTime = Date.now();

        // Dry run - just count what would be migrated
        if (dry_run) {

            const takenCount = await pool.query(
                "SELECT COUNT(*) FROM taken WHERE lijst = 'afgewerkt'"
            );

            const subtakenCount = await pool.query(`
                SELECT COUNT(*) FROM subtaken s
                INNER JOIN taken t ON s.parent_taak_id = t.id
                WHERE t.lijst = 'afgewerkt'
            `);

            return res.json({
                success: true,
                dry_run: true,
                tasks_to_migrate: parseInt(takenCount.rows[0].count),
                subtasks_to_migrate: parseInt(subtakenCount.rows[0].count),
                estimated_duration_ms: parseInt(takenCount.rows[0].count) * 4
            });
        }

        // Actual migration

        await pool.query('BEGIN');

        // Migrate taken to taken_archief
        const takenResult = await pool.query(`
            INSERT INTO taken_archief (
                id, naam, lijst, status, datum, verschijndatum,
                project_id, context_id, duur, opmerkingen,
                top_prioriteit, prioriteit_datum,
                herhaling_type, herhaling_waarde, herhaling_actief,
                user_id, archived_at
            )
            SELECT
                id, naam, lijst, status, datum, verschijndatum,
                project_id, context_id, duur, opmerkingen,
                top_prioriteit, prioriteit_datum,
                herhaling_type, herhaling_waarde, herhaling_actief,
                user_id, CURRENT_TIMESTAMP
            FROM taken WHERE lijst = 'afgewerkt'
        `);


        // Migrate subtaken to subtaken_archief
        const subtakenResult = await pool.query(`
            INSERT INTO subtaken_archief (
                id, parent_taak_id, titel, voltooid, volgorde, archived_at
            )
            SELECT
                s.id, s.parent_taak_id, s.titel, s.voltooid, s.volgorde, CURRENT_TIMESTAMP
            FROM subtaken s
            INNER JOIN taken t ON s.parent_taak_id = t.id
            WHERE t.lijst = 'afgewerkt'
        `);


        // Delete from active tables
        await pool.query(`
            DELETE FROM subtaken WHERE parent_taak_id IN
                (SELECT id FROM taken WHERE lijst = 'afgewerkt')
        `);

        await pool.query("DELETE FROM taken WHERE lijst = 'afgewerkt'");

        await pool.query('COMMIT');

        const duration = Date.now() - startTime;


        res.json({
            success: true,
            tasks_migrated: takenResult.rowCount,
            subtasks_migrated: subtakenResult.rowCount,
            duration_ms: duration,
            errors: []
        });

    } catch (error) {
        await pool.query('ROLLBACK');

        console.error('❌ Migration failed:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            tasks_migrated: 0,
            rollback: true
        });
    }
});

// T007: Archive statistics endpoint
app.get('/api/admin/archive-stats', requireAdmin, async (req, res) => {
    try {

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const stats = {
            active_tasks: 0,
            archived_tasks: 0,
            active_subtasks: 0,
            archived_subtasks: 0,
            recent_archives: [],
            oldest_active_completed_task: null,
            archive_errors_24h: 0
        };

        // Get counts
        const activeTasks = await pool.query('SELECT COUNT(*) FROM taken');
        stats.active_tasks = parseInt(activeTasks.rows[0].count);

        try {
            const archivedTasks = await pool.query('SELECT COUNT(*) FROM taken_archief');
            stats.archived_tasks = parseInt(archivedTasks.rows[0].count);
        } catch (e) {
            // Archive table doesn't exist yet
            stats.archived_tasks = 0;
        }

        const activeSubtasks = await pool.query('SELECT COUNT(*) FROM subtaken');
        stats.active_subtasks = parseInt(activeSubtasks.rows[0].count);

        try {
            const archivedSubtasks = await pool.query('SELECT COUNT(*) FROM subtaken_archief');
            stats.archived_subtasks = parseInt(archivedSubtasks.rows[0].count);
        } catch (e) {
            // Archive table doesn't exist yet
            stats.archived_subtasks = 0;
        }

        // Get recent archives
        try {
            const recentArchives = await pool.query(`
                SELECT id, naam, archived_at, user_id
                FROM taken_archief
                ORDER BY archived_at DESC
                LIMIT 10
            `);
            stats.recent_archives = recentArchives.rows;
        } catch (e) {
            // Archive table doesn't exist yet
            stats.recent_archives = [];
        }

        // Check for oldest completed task still in active table (should be null after migration)
        const oldestCompleted = await pool.query(`
            SELECT id, naam
            FROM taken
            WHERE lijst = 'afgewerkt'
            ORDER BY datum ASC
            LIMIT 1
        `);

        stats.oldest_active_completed_task = oldestCompleted.rows[0] || null;


        res.json(stats);

    } catch (error) {
        console.error('❌ Archive stats error:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

// T009: Copy to archive endpoint (Phase 2 of staged deployment)
// ONLY copies completed tasks to archive, does NOT delete from active table
app.post('/api/admin/copy-to-archive', requireAdmin, async (req, res) => {
    try {

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Check if archive tables exist
        const archiveTablesExist = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'taken_archief'
            )
        `);

        if (!archiveTablesExist.rows[0].exists) {
            return res.status(400).json({
                error: 'Archive tables not found',
                message: 'Run database schema setup (T001-T002) first'
            });
        }

        const startTime = Date.now();

        await pool.query('BEGIN');

        // Copy completed tasks to archive (with ON CONFLICT to make idempotent)
        const takenResult = await pool.query(`
            INSERT INTO taken_archief (
                id, naam, lijst, status, datum, verschijndatum,
                project_id, context_id, duur, opmerkingen,
                top_prioriteit, prioriteit_datum,
                herhaling_type, herhaling_waarde, herhaling_actief,
                user_id, archived_at, created_at
            )
            SELECT
                id, naam, lijst, status, datum, verschijndatum,
                project_id, context_id, duur, opmerkingen,
                top_prioriteit, prioriteit_datum,
                herhaling_type, herhaling_waarde, FALSE,
                user_id, CURRENT_TIMESTAMP, created_at
            FROM taken
            WHERE lijst = 'afgewerkt'
            ON CONFLICT (id) DO NOTHING
        `);


        // Copy subtaken for completed tasks (with ON CONFLICT to make idempotent)
        const subtakenResult = await pool.query(`
            INSERT INTO subtaken_archief (
                id, parent_taak_id, titel, voltooid, volgorde, archived_at, created_at
            )
            SELECT
                s.id, s.parent_taak_id, s.titel, s.voltooid, s.volgorde, CURRENT_TIMESTAMP, s.created_at
            FROM subtaken s
            INNER JOIN taken t ON s.parent_taak_id = t.id
            WHERE t.lijst = 'afgewerkt'
            ON CONFLICT (id) DO NOTHING
        `);


        await pool.query('COMMIT');

        const duration = Date.now() - startTime;

        // Verify copy was successful
        const verifyTaken = await pool.query(`
            SELECT COUNT(*) FROM taken_archief
        `);

        const verifySubtaken = await pool.query(`
            SELECT COUNT(*) FROM subtaken_archief
        `);

        res.json({
            success: true,
            message: 'Copy to archive completed successfully',
            tasks_copied: takenResult.rowCount,
            subtasks_copied: subtakenResult.rowCount,
            total_in_archive: {
                tasks: parseInt(verifyTaken.rows[0].count),
                subtasks: parseInt(verifySubtaken.rows[0].count)
            },
            duration_ms: duration,
            note: 'Tasks NOT deleted from active table - use /cleanup-archived endpoint after verification'
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Copy-to-archive error:', error);

        res.status(500).json({
            error: 'Copy operation failed',
            details: error.message
        });
    }
});

// T010: Cleanup archived endpoint (Phase 5 of staged deployment)
// ONLY deletes completed tasks that exist in archive - safe cleanup after verification
app.post('/api/admin/cleanup-archived', requireAdmin, async (req, res) => {
    try {

        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Check if archive tables exist
        const archiveTablesExist = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'taken_archief'
            )
        `);

        if (!archiveTablesExist.rows[0].exists) {
            return res.status(400).json({
                error: 'Archive tables not found',
                message: 'Cannot cleanup without archive tables'
            });
        }

        const startTime = Date.now();

        await pool.query('BEGIN');

        // SAFETY CHECK: Only delete tasks that exist in archive
        // This prevents data loss if archive copy failed
        const deletedSubtaken = await pool.query(`
            DELETE FROM subtaken
            WHERE parent_taak_id IN (
                SELECT id FROM taken WHERE lijst = 'afgewerkt'
            )
            AND id IN (
                SELECT id FROM subtaken_archief
            )
        `);


        const deletedTaken = await pool.query(`
            DELETE FROM taken
            WHERE lijst = 'afgewerkt'
            AND id IN (
                SELECT id FROM taken_archief
            )
        `);


        await pool.query('COMMIT');

        const duration = Date.now() - startTime;

        // Verify cleanup
        const remainingCompleted = await pool.query(`
            SELECT COUNT(*) FROM taken WHERE lijst = 'afgewerkt'
        `);

        res.json({
            success: true,
            message: 'Cleanup completed successfully',
            tasks_deleted: deletedTaken.rowCount,
            subtasks_deleted: deletedSubtaken.rowCount,
            remaining_completed_tasks: parseInt(remainingCompleted.rows[0].count),
            duration_ms: duration,
            note: remainingCompleted.rows[0].count > 0
                ? `Warning: ${remainingCompleted.rows[0].count} completed tasks remain (not in archive)`
                : 'All completed tasks successfully cleaned up'
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Cleanup error:', error);

        res.status(500).json({
            error: 'Cleanup operation failed',
            details: error.message
        });
    }
});

// ========================================
// SUBSCRIPTION MANAGEMENT API ENDPOINTS
// Feature: 057-dan-gaan-we
// ========================================

// T016: GET /api/subscription/plans - Fetch available subscription plans
app.get('/api/subscription/plans', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Get user's current tier level
    const userResult = await pool.query(`
      SELECT p.tier_level
      FROM users u
      LEFT JOIN subscription_plans p ON u.subscription_plan = p.plan_id
      WHERE u.id = $1
    `, [userId]);

    const currentTierLevel = userResult.rows[0]?.tier_level || 0;

    // Get all active plans
    const plansResult = await pool.query(`
      SELECT
        plan_id,
        plan_name,
        price_monthly,
        price_yearly,
        tier_level,
        features
      FROM subscription_plans
      WHERE is_active = TRUE
      ORDER BY tier_level ASC
    `);

    const plans = plansResult.rows.map(plan => ({
      ...plan,
      is_current: plan.tier_level === currentTierLevel
    }));

    res.json({ plans, current_tier_level: currentTierLevel });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// T017: POST /api/subscription/checkout - Create checkout session
app.post('/api/subscription/checkout', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { plan_id, cycle } = req.body;

    if (!plan_id || !cycle) {
      return res.status(400).json({ error: 'Missing plan_id or cycle' });
    }

    if (!['monthly', 'yearly'].includes(cycle)) {
      return res.status(400).json({ error: 'Invalid cycle. Must be monthly or yearly' });
    }

    // Check user doesn't have active subscription
    const userResult = await pool.query(
      'SELECT subscription_status, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.subscription_status === 'active') {
      return res.status(409).json({ error: 'User already has active subscription' });
    }

    // Get plan details
    const planResult = await pool.query(
      'SELECT * FROM subscription_plans WHERE plan_id = $1',
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planResult.rows[0];
    const price = cycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

    // Call Plug&Pay API to create checkout session
    const checkoutData = await callPlugPayAPI('/checkout/sessions', 'POST', {
      customer_email: user.email,
      plan_id: plan.plan_id,
      cycle: cycle,
      amount: price,
      success_url: `${process.env.APP_URL || 'https://tickedify.com'}/app?checkout=success`,
      cancel_url: `${process.env.APP_URL || 'https://tickedify.com'}/app?checkout=cancel`,
      metadata: {
        user_id: userId,
        plan_id: plan_id,
        cycle: cycle
      }
    });

    res.json({
      checkout_url: checkoutData.checkout_url,
      session_id: checkoutData.session_id
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// T018: POST /api/subscription/upgrade - Upgrade plan immediately
app.post('/api/subscription/upgrade', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: 'Missing plan_id' });
    }

    // Get user's current subscription
    const userResult = await pool.query(`
      SELECT
        u.subscription_status,
        u.subscription_plan,
        u.plugpay_subscription_id,
        p.tier_level as current_tier
      FROM users u
      LEFT JOIN subscription_plans p ON u.subscription_plan = p.plan_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.subscription_status !== 'active') {
      return res.status(400).json({ error: 'User must have active subscription to upgrade' });
    }

    // Get new plan tier level
    const newTierLevel = await getPlanTierLevel(plan_id);
    if (!newTierLevel) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (newTierLevel <= user.current_tier) {
      return res.status(400).json({ error: 'Selected plan is not an upgrade' });
    }

    // Get plan details for pricing
    const planResult = await pool.query(
      'SELECT * FROM subscription_plans WHERE plan_id = $1',
      [plan_id]
    );
    const plan = planResult.rows[0];

    // Call Plug&Pay API to upgrade (immediate with proration)
    const upgradeData = await callPlugPayAPI(
      `/subscriptions/${user.plugpay_subscription_id}/change-plan`,
      'POST',
      {
        plan_id: plan_id,
        prorate: true,
        effective_date: 'immediate'
      }
    );

    // Update local database
    await pool.query(
      `UPDATE users SET
        subscription_plan = $1,
        subscription_price = $2,
        subscription_updated_at = NOW()
      WHERE id = $3`,
      [plan_id, plan.price_monthly, userId]
    );

    res.json({
      success: true,
      message: `Upgraded to ${plan.plan_name}`,
      prorated_charge: upgradeData.prorated_charge || 0
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// T019: POST /api/subscription/downgrade - Schedule downgrade for next renewal
app.post('/api/subscription/downgrade', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: 'Missing plan_id' });
    }

    // Get user's current subscription
    const userResult = await pool.query(`
      SELECT
        u.subscription_status,
        u.subscription_plan,
        u.subscription_renewal_date,
        u.plugpay_subscription_id,
        p.tier_level as current_tier
      FROM users u
      LEFT JOIN subscription_plans p ON u.subscription_plan = p.plan_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.subscription_status !== 'active') {
      return res.status(400).json({ error: 'User must have active subscription to downgrade' });
    }

    // Get new plan tier level
    const newTierLevel = await getPlanTierLevel(plan_id);
    if (!newTierLevel) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (newTierLevel >= user.current_tier) {
      return res.status(400).json({ error: 'Selected plan is not a downgrade' });
    }

    // Get plan name for response
    const planResult = await pool.query(
      'SELECT plan_name FROM subscription_plans WHERE plan_id = $1',
      [plan_id]
    );
    const planName = planResult.rows[0].plan_name;

    // Call Plug&Pay API to schedule downgrade
    const downgradeData = await callPlugPayAPI(
      `/subscriptions/${user.plugpay_subscription_id}/schedule-change`,
      'POST',
      {
        plan_id: plan_id,
        effective_date: user.subscription_renewal_date
      }
    );

    // Insert scheduled change request
    await pool.query(
      `INSERT INTO subscription_change_requests
        (user_id, current_plan, new_plan, change_type, effective_date, status, plugpay_change_id)
      VALUES ($1, $2, $3, 'downgrade', $4, 'pending', $5)`,
      [userId, user.subscription_plan, plan_id, user.subscription_renewal_date, downgradeData.change_id || null]
    );

    res.json({
      success: true,
      message: `Your plan will change to ${planName} on ${new Date(user.subscription_renewal_date).toLocaleDateString()}`,
      effective_date: user.subscription_renewal_date
    });
  } catch (error) {
    console.error('Downgrade error:', error);
    res.status(500).json({ error: 'Failed to schedule downgrade' });
  }
});

// T020: POST /api/subscription/cancel - Cancel subscription
app.post('/api/subscription/cancel', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Get user's current subscription
    const userResult = await pool.query(
      `SELECT subscription_status, subscription_renewal_date, plugpay_subscription_id
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.subscription_status !== 'active') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // Call Plug&Pay API to cancel subscription
    await callPlugPayAPI(
      `/subscriptions/${user.plugpay_subscription_id}/cancel`,
      'POST',
      { at_period_end: true }
    );

    // Update local database
    await pool.query(
      `UPDATE users SET
        subscription_status = 'canceled',
        subscription_updated_at = NOW()
      WHERE id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: `Subscription canceled. You retain access until ${new Date(user.subscription_renewal_date).toLocaleDateString()}`,
      access_until: user.subscription_renewal_date
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// T021: POST /api/subscription/reactivate - Reactivate canceled subscription
app.post('/api/subscription/reactivate', requireLogin, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Get user's current subscription
    const userResult = await pool.query(
      `SELECT subscription_status, subscription_renewal_date, subscription_plan, plugpay_subscription_id
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.subscription_status !== 'canceled') {
      return res.status(400).json({ error: 'Subscription is not canceled' });
    }

    // Check if still in grace period
    const now = new Date();
    const renewalDate = new Date(user.subscription_renewal_date);
    if (now > renewalDate) {
      return res.status(400).json({ error: 'Subscription already expired. Please create a new subscription' });
    }

    // Call Plug&Pay API to reactivate
    await callPlugPayAPI(
      `/subscriptions/${user.plugpay_subscription_id}/reactivate`,
      'POST',
      {}
    );

    // Update local database
    await pool.query(
      `UPDATE users SET
        subscription_status = 'active',
        subscription_updated_at = NOW()
      WHERE id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: `Subscription reactivated. Renews on ${renewalDate.toLocaleDateString()}`,
      renewal_date: user.subscription_renewal_date
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// T022: POST /api/webhooks/plugpay - Plug&Pay webhook endpoint
app.post('/api/webhooks/plugpay', async (req, res) => {
  try {
    const signature = req.headers['x-plugpay-signature'];
    const payload = req.body;
    const PLUGPAY_WEBHOOK_SECRET = process.env.PLUGPAY_WEBHOOK_SECRET;

    // Validate webhook signature
    if (!validatePlugPayWebhook(signature, payload, PLUGPAY_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event_id, event_type, data } = payload;

    // Check idempotency
    const alreadyProcessed = await isWebhookProcessed(event_id);
    if (alreadyProcessed) {
      console.log(`Webhook ${event_id} already processed, skipping`);
      return res.status(200).json({ status: 'already_processed' });
    }

    // Handle different event types
    let userId = null;

    if (event_type === 'subscription.created' || event_type === 'subscription.updated') {
      // Find user by subscription ID
      const userResult = await pool.query(
        'SELECT id FROM users WHERE plugpay_subscription_id = $1',
        [data.subscription_id]
      );

      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      } else if (data.metadata?.user_id) {
        // First subscription creation - use metadata
        userId = data.metadata.user_id;
      }

      if (userId) {
        await updateUserSubscriptionFromWebhook(userId, {
          subscription_id: data.subscription_id,
          status: data.status || 'active',
          plan: data.plan_id,
          renewal_date: data.next_billing_date,
          price: data.amount,
          cycle: data.billing_cycle || 'monthly'
        });
      }
    } else if (event_type === 'subscription.canceled' || event_type === 'subscription.expired') {
      // Find user by subscription ID
      const userResult = await pool.query(
        'SELECT id FROM users WHERE plugpay_subscription_id = $1',
        [data.subscription_id]
      );

      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;

        const newStatus = event_type === 'subscription.canceled' ? 'canceled' : 'expired';
        await pool.query(
          `UPDATE users SET
            subscription_status = $1,
            subscription_updated_at = NOW()
          WHERE id = $2`,
          [newStatus, userId]
        );
      }
    }

    // Insert webhook event record
    await pool.query(
      `INSERT INTO webhook_events (event_id, event_type, subscription_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [event_id, event_type, data.subscription_id, JSON.stringify(payload)]
    );

    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 500 to trigger Plug&Pay retry
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Force redeploy Sat Oct 18 23:52:24 CEST 2025
