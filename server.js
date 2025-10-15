const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
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
                    console.log(`✅ GHL: Updated existing contact ${contactId} with tags: ${tags.join(', ')}`);
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
                console.log(`✅ GHL: Created new contact ${contactId} with tags: ${tags.join(', ')}`);
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

// Debug: Check forensic logger status at startup
console.log('🔍 DEBUG: FORENSIC_DEBUG environment variable:', process.env.FORENSIC_DEBUG);
console.log('🔍 DEBUG: Forensic logger enabled status:', forensicLogger.enabled);

// Force test log on startup
if (forensicLogger.enabled) {
    setTimeout(() => {
        forensicLogger.log('SYSTEM', 'STARTUP_TEST', { message: 'Forensic logging system initialized' });
        console.log('🧪 Startup test log written');
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
    
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
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

// Try to import and initialize database
let db = null;
let pool = null;
let dbInitialized = false;

// Initialize database immediately
try {
    const dbModule = require('./database');
    db = dbModule.db;
    pool = dbModule.pool;
    console.log('Database module imported successfully');
    
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
        console.log('🔍 DEBUG: Testing storage manager initialization...');
        
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
                        console.log('🔍 Testing B2 listBuckets operation...');
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
                console.error('🔍 Initialization error details:', initError);
            }
        }
        
        console.log('🔍 DEBUG: Storage status:', status);
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
        console.log('🔍 Testing B2 directly with current environment vars');
        
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
        
        console.log('🔍 DEBUG: Looking for bijlage:', bijlageId);
        
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
        
        console.log('🔍 DEBUG bijlage result:', result);
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
        
        console.log('✅ Default user created successfully');
        
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
        
        console.log('🔧 Manual database initialization requested...');
        const { initDatabase } = require('./database');
        await initDatabase();
        dbInitialized = true;
        
        console.log('✅ Manual database initialization completed');
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

        console.log('✅ jan@buskens.be is now admin');
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
        
        console.log('🚨 DATABASE RESET REQUESTED - This will delete ALL data!');
        
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
                console.log(`Could not count ${countQuery.table}:`, error.message);
                beforeCounts[countQuery.table] = 0;
            }
        }
        
        console.log('📊 Records before deletion:', beforeCounts);
        
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
                console.log(`✅ Deleted ${result.rowCount} records from ${tableName}`);
            } catch (error) {
                console.error(`❌ Error deleting from table:`, error);
                throw error;
            }
        }
        
        console.log('🧹 Database reset completed successfully');
        console.log('📊 Deleted records:', deletionResults);
        
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
        console.log('Testing recipient:', recipient);
        
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

// Helper function to get user ID by email address
async function getUserIdByEmail(email) {
    try {
        if (!email) {
            console.log('getUserIdByEmail: empty email provided');
            return null;
        }
        
        // Clean up email address (remove any brackets, spaces, etc.)
        const cleanEmail = email.trim().toLowerCase();
        console.log(`🔍 Looking up user for email: ${cleanEmail}`);
        
        const result = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = $1 AND actief = TRUE',
            [cleanEmail]
        );
        
        if (result.rows.length === 0) {
            console.log(`❌ No active user found for email: ${cleanEmail}`);
            return null;
        }
        
        const userId = result.rows[0].id;
        console.log(`✅ Found user ID: ${userId} for email: ${cleanEmail}`);
        return userId;
        
    } catch (error) {
        console.error('Error looking up user by email:', error);
        return null;
    }
}

// Email Import System - Mailgun Webhook Handler
app.post('/api/email/import', upload.any(), async (req, res) => {
    try {
        console.log('📧 Email import request received');
        console.log('Headers:', req.headers);
        console.log('Body keys:', Object.keys(req.body));
        console.log('Files:', req.files?.length || 0);
        console.log('Full body:', req.body);
        
        // Log to a file we can check later
        const logEntry = {
            timestamp: new Date().toISOString(),
            headers: req.headers,
            body: req.body,
            bodyKeys: Object.keys(req.body)
        };
        console.log('IMPORT_LOG:', JSON.stringify(logEntry));
        
        // Try multiple field name variations for Mailgun compatibility
        const sender = req.body.sender || req.body.from || req.body.From || '';
        const recipient = req.body.recipient || req.body.to || req.body.To || '';
        const subject = req.body.subject || req.body.Subject || '';
        const bodyPlain = req.body['body-plain'] || req.body.text || req.body.body || '';
        const bodyHtml = req.body['body-html'] || req.body.html || '';
        const strippedText = req.body['stripped-text'] || req.body['stripped-plain'] || bodyPlain;
        
        console.log('Extracted fields:', { sender, recipient, subject, bodyPlain: bodyPlain?.substring(0, 100) });
        
        if (!sender && !subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required email fields (sender, subject)',
                receivedFields: Object.keys(req.body),
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`📨 Processing email from: ${sender}`);
        console.log(`📋 Subject: ${subject}`);
        
        // Parse email content
        console.log('🔄 About to parse email...');
        const taskData = parseEmailToTask({
            sender,
            subject,
            body: strippedText || bodyPlain || 'No body content',
            timestamp: new Date().toISOString()
        });
        console.log('✅ Email parsed successfully:', taskData);
        
        // Get user ID based on import code in recipient address
        let userId = null;
        
        // Try to extract import code from recipient (e.g., import+abc123@mg.tickedify.com)
        if (recipient) {
            const importCodeMatch = recipient.match(/import\+([a-zA-Z0-9]+)@mg\.tickedify\.com/);
            if (importCodeMatch) {
                const importCode = importCodeMatch[1];
                console.log(`🔍 Found import code: ${importCode}`);
                
                const user = await db.getUserByImportCode(importCode);
                if (user) {
                    userId = user.id;
                    console.log(`✅ Found user ID: ${userId} (${user.email}) for import code: ${importCode}`);
                } else {
                    console.log(`❌ No user found for import code: ${importCode}`);
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
            console.log('⚠️ No import code found, falling back to sender email matching');
            userId = await getUserIdByEmail(sender);
            if (!userId) {
                console.log(`❌ No user found for email: ${sender}`);
                return res.status(404).json({
                    success: false,
                    error: `No user account found for email address: ${sender}`,
                    hint: 'Use your personal import email address: import+yourcode@mg.tickedify.com (get code from settings)',
                    timestamp: new Date().toISOString()
                });
            }
            console.log(`✅ Found user ID: ${userId} for email: ${sender} (fallback method)`);
        }
        console.log('🔄 Resolving project and context IDs for user:', userId);
        if (taskData.projectName) {
            taskData.projectId = await findOrCreateProject(taskData.projectName, userId);
        }
        if (taskData.contextName) {
            taskData.contextId = await findOrCreateContext(taskData.contextName, userId);
        }
        
        console.log('✅ Project/Context resolution completed:', {
            project: taskData.projectName ? `${taskData.projectName} → ${taskData.projectId}` : 'none',
            context: taskData.contextName ? `${taskData.contextName} → ${taskData.contextId}` : 'none'
        });
        
        // Create task in database
        if (!pool) {
            throw new Error('Database not available');
        }
        console.log('🔄 About to create task in database...');
        
        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Convert verschijndatum to proper format for PostgreSQL DATE field
        let verschijndatumForDb = null;
        if (taskData.verschijndatum) {
            // Ensure it's in YYYY-MM-DD format for PostgreSQL DATE type
            const dateMatch = taskData.verschijndatum.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                verschijndatumForDb = dateMatch[1];
                console.log('📅 Converted deadline for database:', verschijndatumForDb);
            }
        }

        const result = await pool.query(`
            INSERT INTO taken (
                id, tekst, opmerkingen, lijst, aangemaakt, project_id, context_id, 
                verschijndatum, duur, type, user_id
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10)
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
            'taak',
            userId
        ]);
        
        const createdTask = result.rows[0];
        
        console.log('✅ Task created successfully:', {
            id: createdTask.id,
            tekst: createdTask.tekst,
            lijst: createdTask.lijst
        });
        
        // Send confirmation (would need Mailgun sending setup)
        console.log('📤 Would send confirmation email to:', sender);
        
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
            console.log('📁 Found existing project:', projectName, '→', existingProject.rows[0].id);
            return existingProject.rows[0].id;
        }
        
        // Create new project if not found
        const projectId = 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(
            'INSERT INTO projecten (id, naam, user_id) VALUES ($1, $2, $3)',
            [projectId, projectName, userId]
        );
        
        console.log('📁 Created new project:', projectName, '→', projectId);
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
            console.log('🏷️ Found existing context:', contextName, '→', existingContext.rows[0].id);
            return existingContext.rows[0].id;
        }
        
        // Create new context if not found
        const contextId = 'context_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(
            'INSERT INTO contexten (id, naam, user_id) VALUES ($1, $2, $3)',
            [contextId, contextName, userId]
        );
        
        console.log('🏷️ Created new context:', contextName, '→', contextId);
        return contextId;
        
    } catch (error) {
        console.error('❌ Error finding/creating context:', error);
        return null;
    }
}

// Email parsing helper function
function parseEmailToTask(emailData) {
    const { sender, subject, body, timestamp } = emailData;
    
    console.log('🔍 Parsing email content...');
    
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
        originalSender: sender,
        importedAt: timestamp
    };
    
    // Parse subject line for project, context, and tags
    // Format: [Project] Task title @context #tag
    
    // Extract project from [brackets]
    const projectMatch = subject.match(/\[([^\]]+)\]/);
    if (projectMatch) {
        taskData.projectName = projectMatch[1].trim();
        console.log('📁 Found project:', taskData.projectName);
    }
    
    // Extract context from @mentions
    const contextMatch = subject.match(/@([^\s#\]]+)/);
    if (contextMatch) {
        taskData.contextName = contextMatch[1].trim();
        console.log('🏷️ Found context:', taskData.contextName);
    }
    
    // Extract tags from #hashtags (for future use)
    const tagMatches = subject.match(/#([^\s@\]]+)/g);
    if (tagMatches) {
        const tags = tagMatches.map(tag => tag.substring(1));
        console.log('🏷️ Found tags:', tags);
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
    
    // Parse body for structured data
    if (body && body.length > 10) {
        console.log('📄 Parsing email body...');
        
        // Look for structured fields in body
        const bodyLines = body.split('\n');
        
        for (const line of bodyLines) {
            const trimmedLine = line.trim().toLowerCase();
            
            // Extract duration
            if (trimmedLine.startsWith('duur:')) {
                const duurMatch = line.match(/(\d+)/);
                if (duurMatch) {
                    taskData.duur = parseInt(duurMatch[1]);
                    console.log('⏱️ Found duration:', taskData.duur, 'minutes');
                }
            }
            
            // Extract deadline
            if (trimmedLine.startsWith('deadline:') || trimmedLine.startsWith('datum:')) {
                const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    taskData.verschijndatum = dateMatch[1];
                    console.log('📅 Found deadline:', taskData.verschijndatum);
                }
            }
            
            // Override project if specified in body
            if (trimmedLine.startsWith('project:')) {
                const projectName = line.split(':')[1]?.trim();
                if (projectName) {
                    taskData.projectName = projectName;
                    console.log('📁 Found project in body:', taskData.projectName);
                }
            }
            
            // Override context if specified in body
            if (trimmedLine.startsWith('context:')) {
                const contextName = line.split(':')[1]?.trim();
                if (contextName) {
                    taskData.contextName = contextName;
                    console.log('🏷️ Found context in body:', taskData.contextName);
                }
            }
        }
        
        // Extract body content as opmerkingen, excluding structured fields
        const bodyWithoutStructured = body
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
            console.log('📝 Found opmerkingen:', taskData.opmerkingen.substring(0, 50) + '...');
        }
    }
    
    console.log('✅ Parsed task data:', {
        tekst: taskData.tekst.substring(0, 50) + '...',
        project: taskData.projectName,
        context: taskData.contextName,
        duur: taskData.duur,
        deadline: taskData.verschijndatum
    });
    
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

        console.log('🔄 Running subscription column migration...');

        // Add subscription-related columns to users table if they don't exist
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS plugandpay_subscription_id VARCHAR(255)
        `);

        console.log('✅ Users table subscription columns added');

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
            console.log(`📧 Generated missing import code for user ${userId}: ${importCode}`);
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
        console.log('🔍 Notion import debug:', {
            userId,
            taaknaam,
            herhalingType,
            herhalingActief,
            requestBody: req.body
        });
        
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
                        console.log('📅 Converted European date:', datum, '→', isoDate);
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
        
        console.log(`🗑️ TEMP DELETE ALL: Deleted ${result.rowCount} acties for user ${userId} (${userCheck.rows[0].email})`);
        
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
    console.log('🔍 requireAuth check:', {
        url: req.url,
        method: req.method,
        hasSession: !!req.session,
        userId: req.session?.userId,
        sessionId: req.sessionID
    });
    
    if (!req.session.userId) {
        console.log('❌ Authentication failed - no userId in session');
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('✅ Authentication passed for user:', req.session.userId);
    next();
}

// Optional auth middleware (allows both authenticated and guest access)
function optionalAuth(req, res, next) {
    // For endpoints that can work with or without authentication
    next();
}

// Get current user ID from session or fallback to default
function getCurrentUserId(req) {
    if (!req.session.userId) {
        throw new Error('Niet ingelogd - geen geldige sessie');
    }
    return req.session.userId;
}

// Beta subscription middleware - checks if user has access during/after beta period
async function requireActiveSubscription(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    try {
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
        console.log(`❌ Access denied for user ${req.session.userId} - subscription required`);
        res.redirect('/upgrade');
        
    } catch (error) {
        console.error('❌ Error checking subscription status:', error);
        // On error, allow access (fail open)
        next();
    }
}

// Synchrone B2 cleanup functie met retry logic en gedetailleerde logging
async function cleanupB2Files(bijlagen, taskId = 'unknown') {
    console.log(`🧹 Starting B2 cleanup for ${bijlagen.length} files (task: ${taskId})`);
    
    if (!bijlagen || bijlagen.length === 0) {
        console.log(`ℹ️ No bijlagen to cleanup for task ${taskId}`);
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
        console.log(`🔄 Attempting to delete B2 file: ${bijlage.storage_path} (${bijlage.bestandsnaam})`);
        
        let deleteSuccess = false;
        let lastError = null;
        
        // Retry logic - max 2 pogingen
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                console.log(`🔄 Delete attempt ${attempt}/2 for ${bijlage.bestandsnaam}`);
                await storageManager.deleteFile(bijlage);
                console.log(`✅ B2 file deleted successfully: ${bijlage.storage_path} (${bijlage.bestandsnaam})`);
                deletedFiles.push(bijlage.bestandsnaam);
                deleteSuccess = true;
                break;
            } catch (error) {
                lastError = error;
                console.error(`❌ Delete attempt ${attempt}/2 failed for ${bijlage.bestandsnaam}:`, error.message);
                
                // Wait 1 second before retry
                if (attempt < 2) {
                    console.log(`⏳ Waiting 1 second before retry...`);
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
    
    console.log(`🧹 B2 cleanup completed for task ${taskId}:`, {
        deleted: deletedFiles.length,
        failed: failedFiles.length,
        success: result.success
    });
    
    if (failedFiles.length > 0) {
        console.error(`⚠️ B2 cleanup had failures for task ${taskId}:`, failedFiles);
    }
    
    return result;
}

// Authentication API endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, naam, wachtwoord } = req.body;
        
        if (!email || !naam || !wachtwoord) {
            return res.status(400).json({ error: 'Email, naam en wachtwoord zijn verplicht' });
        }
        
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email adres al in gebruik' });
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
        console.log(`📧 Generated import code for new user: ${importCode}`);
        
        // Sync to GHL with appropriate tag
        let ghlContactId = null;
        try {
            const tag = betaConfig.beta_period_active ? 'tickedify-beta-tester' : 'tickedify-user-needs-payment';
            ghlContactId = await addContactToGHL(email, naam, [tag]);
            
            if (ghlContactId) {
                await pool.query('UPDATE users SET ghl_contact_id = $1 WHERE id = $2', [ghlContactId, userId]);
                console.log(`✅ GHL: User synced with contact ID: ${ghlContactId}`);
            }
        } catch (ghlError) {
            console.error('⚠️ GHL sync failed during registration:', ghlError.message);
            // Don't fail registration if GHL sync fails
        }
        
        // If NOT in beta period, redirect to payment
        if (!betaConfig.beta_period_active) {
            console.log(`📦 User registered during non-beta period: ${email} - requires payment`);
            return res.json({
                success: true,
                requiresPayment: true,
                message: 'Account aangemaakt. Betaling vereist voor toegang.',
                redirect: '/upgrade',
                user: {
                    id: userId,
                    email,
                    naam,
                    account_type: accountType,
                    subscription_status: subscriptionStatus
                }
            });
        }
        
        // Beta period - start session and give access
        req.session.userId = userId;
        req.session.userEmail = email;
        req.session.userNaam = naam;
        
        console.log(`✅ Beta user registered: ${email} (${userId}) with import code: ${importCode}`);
        
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
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Fout bij aanmaken account' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, wachtwoord } = req.body;

        console.log(`[LOGIN-START] Login attempt for: ${email} [v0.17.24]`);

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

        console.log(`[BETA-CHECK] Login beta check for ${email}: betaPeriodActive=${betaConfig.beta_period_active}, accountType=${userDetails.account_type}, subscriptionStatus=${userDetails.subscription_status}`);

        // Check if trial is expired
        const trialIsExpired = isTrialExpired(userDetails);

        // If beta period is not active and user is beta type without paid/active subscription (or expired trial)
        if (!betaConfig.beta_period_active &&
            userDetails.account_type === 'beta' &&
            userDetails.subscription_status !== 'paid' &&
            userDetails.subscription_status !== 'active' &&
            (userDetails.subscription_status !== 'trialing' || trialIsExpired)) {

            console.log(`[LIMITED-LOGIN] Limited login for user ${email} - ${trialIsExpired ? 'trial expired' : 'beta period ended'}, upgrade required`);

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

                console.log(`✅ Session saved for beta user ${email} (userId: ${user.id})`);

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

        console.log(`[NORMAL-LOGIN] Normal login flow for ${email} - beta check passed or not applicable`);

        // Update last login
        await pool.query(
            'UPDATE users SET laatste_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Start session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userNaam = user.naam;

        console.log(`✅ User logged in: ${email} (${user.id})`);

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
        
        console.log(`✅ User logged out: ${userEmail}`);
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

    console.log(`📋 Subscription select request - planId: ${planId}, userId: ${userId}, session:`, {
      userId: req.session.userId,
      userEmail: req.session.userEmail,
      requiresUpgrade: req.session.requiresUpgrade,
      sessionID: req.sessionID
    });

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

      console.log(`✅ Trial activated for user ${userId} - expires ${trialEndDate.toISOString().split('T')[0]}`);

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

    console.log(`💳 User ${userId} (${user.email}) selected plan ${planId} - redirecting to checkout`);

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

    console.log('🔔 Plug&Pay webhook received:', {
      webhook_event: webhookData.webhook_event,
      contract_id: webhookData.contract_id,
      email: webhookData.email,
      billing_cycle: webhookData.billing_cycle,
      product: webhookData.product,
      sku: webhookData.sku,
      signup_token: webhookData.signup_token,
      full_payload: JSON.stringify(webhookData, null, 2)
    });

    // API key validation (DISABLED - PlugAndPay doesn't send API key automatically)
    // Based on Minddumper implementation analysis, Plug&Pay does not automatically
    // include API key in webhook payload, so we disable this check for now.
    // Security relies on webhook URL being private and HTTPS only.
    if (webhookData.api_key) {
      const apiKeyValid = webhookData.api_key === process.env.PLUGANDPAY_API_KEY;
      if (!apiKeyValid) {
        console.error('❌ Invalid API key provided in webhook');
      } else {
        console.log('✅ API key validation passed');
      }
    } else {
      console.log('⚠️ No API key in webhook (expected behavior for Plug&Pay)');
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
      console.log(`ℹ️ Non-subscription webhook: ${webhookData.webhook_event || webhookData.event || webhookData.status}`);
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

    console.log('📦 Subscription details extracted:', {
      selected_plan: selectedPlan,
      subscription_id: subscriptionId,
      billing_cycle: webhookData.billing_cycle,
      amount_cents: amountCents,
      sku: webhookData.sku
    });

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
      console.log(`⚠️ Webhook already processed for order ${orderId}`);
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

    // Update user to active subscription
    await pool.query(
      `UPDATE users
       SET subscription_status = $1,
           payment_confirmed_at = NOW(),
           plugandpay_order_id = $2,
           amount_paid_cents = $3,
           selected_plan = $4,
           plugandpay_subscription_id = $5
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
      await addContactToGHL(email, user.email, ['tickedify-paid-customer']);
      console.log(`✅ GHL: Tagged user as paid customer: ${email}`);
    } catch (ghlError) {
      console.error('⚠️ GHL sync failed:', ghlError.message);
      // Don't fail webhook if GHL sync fails
    }

    console.log(`✅ Payment confirmed for user ${user.id}:`, {
      order_id: orderId,
      amount_cents: amountCents,
      selected_plan: selectedPlan,
      subscription_id: subscriptionId
    });

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
      console.log(`⚠️ Invalid/expired return token: ${tokenValidation.error}`);
      return res.redirect('/payment-success.html?token_error=true');
    }

    // Token valid - auto-login user
    req.session.userId = tokenValidation.userId;
    req.session.userEmail = tokenValidation.email;

    console.log(`✅ Auto-login successful for user ${tokenValidation.email}`);
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
      console.log(`ℹ️ User ${userId} cancelled payment`);
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

// T014: GET /api/admin/payment-configurations - Admin: Get all payment configurations
app.get('/api/admin/payment-configurations', async (req, res) => {
  try {
    // Check for admin authentication (either password-based or user-based)
    const isAdminPasswordAuth = req.session.isAdmin === true;
    const userId = req.session.userId;

    // Allow access if admin password authenticated
    if (isAdminPasswordAuth) {
      console.log('✅ Admin password authentication confirmed for payment-configurations');
    } else if (userId) {
      // Check admin role for user-based authentication
      const userResult = await pool.query('SELECT rol FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0 || userResult.rows[0].rol !== 'admin') {
        return res.status(403).json({ error: 'Admin rechten vereist' });
      }
      console.log('✅ User-based admin authentication confirmed for payment-configurations');
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
      console.log('✅ Admin password authentication confirmed for PUT payment-configurations');
    } else if (userId) {
      // Check admin role for user-based authentication
      const userResult = await pool.query('SELECT rol FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0 || userResult.rows[0].rol !== 'admin') {
        return res.status(403).json({ error: 'Admin rechten vereist' });
      }
      console.log('✅ User-based admin authentication confirmed for PUT payment-configurations');
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
    console.log(`✅ Admin ${adminIdentifier} updated payment config for plan ${plan_id}`);

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
        
        console.log(`✅ New waitlist signup: ${email}`);
        
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
                        console.log(`📍 Found existing contact: ${contactId}`);
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
                        console.log(`✅ New contact created: ${contactId}`);
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
                        console.log(`✅ Tag added to existing contact: ${contactId}`);
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

        // Get user premium status and storage stats
        const isPremium = await db.checkUserPremiumStatus(userId);
        const userStats = await db.getUserStorageStats(userId);

        // Validate file upload
        const validation = storageManager.validateFile(file, isPremium, userStats);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Bestand niet toegestaan',
                details: validation.errors 
            });
        }

        // Check if task exists and belongs to user
        const existingTaak = await pool.query('SELECT id FROM taken WHERE id = $1 AND user_id = $2', [taakId, userId]);
        if (existingTaak.rows.length === 0) {
            return res.status(404).json({ error: 'Taak niet gevonden' });
        }

        // Check attachment limit for free users
        if (!isPremium) {
            const existingBijlagen = await db.getBijlagenForTaak(taakId);
            if (existingBijlagen.length >= STORAGE_CONFIG.MAX_ATTACHMENTS_PER_TASK_FREE) {
                return res.status(400).json({ 
                    error: `Maximum ${STORAGE_CONFIG.MAX_ATTACHMENTS_PER_TASK_FREE} bijlage per taak voor gratis gebruikers. Upgrade naar Premium voor onbeperkte bijlagen.` 
                });
            }
        }

        // DEBUG: Log file info before upload
        console.log('🔍 [SERVER UPLOAD] File received:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            bufferType: Buffer.isBuffer(file.buffer) ? 'Buffer' : typeof file.buffer
        });

        // CRITICAL: Check PNG signature IMMEDIATELY after multer processing
        if (file.buffer && file.buffer.length > 8) {
            const multerBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
            const multerFirstBytes = multerBuffer.slice(0, 8);
            const multerHex = Array.from(multerFirstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
            
            // Check if it's a PNG based on signature, regardless of MIME type
            const expectedPNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            const isPNGSignature = expectedPNG.every((byte, index) => multerFirstBytes[index] === byte);
            
            console.log('🚨 [MULTER CHECK] File signature after multer:', multerHex);
            console.log('🚨 [MULTER CHECK] MIME type from browser:   ', file.mimetype);
            console.log('🚨 [MULTER CHECK] Original filename:       ', file.originalname);
            console.log('🚨 [MULTER CHECK] Has PNG signature:       ', isPNGSignature);
            
            if (isPNGSignature && file.mimetype === 'image/png') {
                console.log('✅ [MULTER CHECK] PNG with correct MIME type - normal path');
            } else if (isPNGSignature && file.mimetype !== 'image/png') {
                console.log('🔍 [MIME TEST] PNG with different MIME type - testing if this fixes corruption');
            } else if (!isPNGSignature && file.mimetype === 'image/png') {
                console.log('🚨 [CRITICAL] PNG MIME type but no PNG signature - already corrupt!');
            }
        }

        // Upload file using storage manager
        const bijlageData = await storageManager.uploadFile(file, taakId, userId);

        // Save to database
        const savedBijlage = await db.createBijlage(bijlageData);

        console.log('✅ Bijlage uploaded successfully:', savedBijlage.id);
        
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
                
                console.log('🔍 [UPLOAD VERIFICATION] PNG signature after upload:', hexBytes, 'Valid:', isValidPNG);
            } catch (verifyError) {
                console.error('❌ [UPLOAD VERIFICATION] Failed to verify PNG after upload:', verifyError);
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

        // Check if task exists and belongs to user
        const existingTaak = await pool.query('SELECT id FROM taken WHERE id = $1 AND user_id = $2', [taakId, userId]);
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
            console.log('🔍 [MIME TEST] Original MIME type:', file.mimetype);
            console.log('🔍 [MIME TEST] Forced MIME type:', forceMimeType);
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
    console.log('🐛 DEBUG ROUTE HIT!', { id: req.params.id });
    res.json({ message: 'Debug route werkt!', id: req.params.id });
});

// DEBUG: Test route met authentication
app.get('/api/bijlage/:id/download-auth', requireAuth, (req, res) => {
    console.log('🔐 AUTH DEBUG ROUTE HIT!', { id: req.params.id, userId: req.session.userId });
    res.json({ message: 'Auth debug route werkt!', id: req.params.id, userId: req.session.userId });
});

// Download attachment - step by step restoration
app.get('/api/bijlage/:id/download', requireAuth, async (req, res) => {
    const startTime = Date.now();
    console.log('🔴 [BACKEND] Download request start:', new Date().toISOString(), { id: req.params.id });
    
    try {
        if (!db) {
            console.log('❌ No database available');
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const { id: bijlageId } = req.params;
        const userId = req.session.userId;
        
        console.log('🔍 Download attempt:', { bijlageId, userId });
        console.log('🔍 Database available:', !!db);
        console.log('🔍 getBijlage function available:', typeof db.getBijlage);

        // Get attachment info first to determine storage type
        const dbStart = Date.now();
        console.log('🔴 [BACKEND] About to call db.getBijlage...');
        const bijlage = await db.getBijlage(bijlageId, false);
        console.log('🔴 [BACKEND] Database lookup completed in:', Date.now() - dbStart, 'ms');
        
        console.log('🔍 Bijlage found:', !!bijlage);
        console.log('🔍 Bijlage details:', bijlage ? { id: bijlage.id, storage_type: bijlage.storage_type, user_id: bijlage.user_id } : 'null');
        if (bijlage) {
            console.log('🔍 Bijlage user_id:', bijlage.user_id, 'Request user_id:', userId);
        }
        
        if (!bijlage) {
            console.log('❌ Bijlage not found in database');
            return res.status(404).json({ error: 'Bijlage niet gevonden' });
        }

        // Check if user owns this attachment
        if (bijlage.user_id !== userId) {
            console.log('❌ User does not own bijlage');
            return res.status(403).json({ error: 'Geen toegang tot bijlage' });
        }
        
        if (bijlage.storage_type === 'database') {
            // File stored in database - fetch binary data separately
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                console.log('📦 Serving file from database, size:', bijlageWithData.bestand_data.length);
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers with actual buffer size
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                console.log('🔧 [BACKEND] Headers set - Content-Length:', buffer.length, 'vs DB metadata:', bijlage.bestandsgrootte);
                
                res.end(buffer, 'binary');
            } else {
                console.log('❌ Binary data not found in database');
                return res.status(404).json({ error: 'Bijlage data niet gevonden in database' });
            }
        } else if (bijlage.storage_type === 'backblaze' && bijlage.storage_path) {
            // TEMPORARY BYPASS: Try database first, then B2
            console.log('🔄 TEMPORARY BYPASS: Trying database first for Backblaze file');
            
            // Try to get file from database first (fallback)
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                console.log('📦 BYPASS: Serving Backblaze file from database backup, size:', bijlageWithData.bestand_data.length);
                
                // Ensure we have a Buffer for binary data
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers with actual buffer size
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                console.log('🔧 [BACKEND] DB Backup headers set - Content-Length:', buffer.length, 'vs DB metadata:', bijlage.bestandsgrootte);
                
                res.end(buffer, 'binary');
                return;
            }
            
            // File stored in Backblaze B2 (original logic)
            console.log('☁️ Database backup not found, trying Backblaze B2, path:', bijlage.storage_path);
            console.log('🔍 Storage manager available:', !!storageManager);
            console.log('🔍 Storage manager initialized:', storageManager?.initialized);
            
            try {
                const b2Start = Date.now();
                console.log('🔴 [BACKEND] About to call storageManager.downloadFile...');
                // Download file from B2 using storage manager
                const fileBuffer = await storageManager.downloadFile(bijlage);
                console.log('🔴 [BACKEND] B2 download completed in:', Date.now() - b2Start, 'ms, result:', !!fileBuffer);
                
                if (!fileBuffer) {
                    console.log('❌ File not found in B2 storage');
                    return res.status(404).json({ error: 'Bestand niet gevonden in cloud storage' });
                }
                
                console.log('📦 Serving file from B2, size:', fileBuffer.length);
                console.log('📦 FileBuffer type:', typeof fileBuffer, 'isBuffer:', Buffer.isBuffer(fileBuffer));
                
                // Ensure we have a Buffer for binary data
                const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
                
                // DEBUG: Check PNG file signature (first 8 bytes should be: 89 50 4E 47 0D 0A 1A 0A)
                if (bijlage.mimetype === 'image/png' && buffer.length > 8) {
                    const firstBytes = buffer.slice(0, 8);
                    const hexBytes = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    console.log('🔍 [PNG DEBUG] First 8 bytes:', hexBytes);
                    console.log('🔍 [PNG DEBUG] Expected PNG signature: 89 50 4e 47 0d 0a 1a 0a');
                    
                    // Check if PNG signature is correct
                    const expectedPNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                    const isValidPNG = expectedPNG.every((byte, index) => firstBytes[index] === byte);
                    console.log('🔍 [PNG DEBUG] Valid PNG signature:', isValidPNG);
                }
                
                // Set headers with actual buffer size from B2
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                console.log('🔧 [BACKEND] B2 headers set - Content-Length:', buffer.length, 'vs DB metadata:', bijlage.bestandsgrootte);
                console.log('🔴 [BACKEND] Total request time:', Date.now() - startTime, 'ms');
                
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
            console.log('📁 File system storage not implemented yet, path:', bijlage.storage_path);
            return res.status(501).json({ error: 'File system storage niet geïmplementeerd' });
        } else {
            // No valid storage found
            console.log('❌ No valid storage found for bijlage, type:', bijlage.storage_type);
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
    console.log('🎯 [BACKEND] Preview request start:', new Date().toISOString(), { id: req.params.id });
    
    try {
        if (!db) {
            console.log('❌ No database available');
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }

        const { id: bijlageId } = req.params;
        const userId = req.session.userId;
        
        console.log('🎯 Preview attempt:', { bijlageId, userId });

        // Get attachment info first to determine storage type
        const dbStart = Date.now();
        const bijlage = await db.getBijlage(bijlageId, false);
        console.log('🎯 [BACKEND] Database lookup completed in:', Date.now() - dbStart, 'ms');
        
        if (!bijlage) {
            console.log('❌ Bijlage not found in database');
            return res.status(404).json({ error: 'Bijlage niet gevonden' });
        }

        // Check if user owns this attachment
        if (bijlage.user_id !== userId) {
            console.log('❌ User does not own bijlage');
            return res.status(403).json({ error: 'Geen toegang tot bijlage' });
        }

        // Check if file type supports preview
        const isImage = bijlage.mimetype && bijlage.mimetype.startsWith('image/');
        const isPdf = bijlage.mimetype === 'application/pdf';
        
        if (!isImage && !isPdf) {
            console.log('❌ File type not supported for preview:', bijlage.mimetype);
            return res.status(400).json({ error: 'Bestandstype ondersteunt geen preview' });
        }
        
        if (bijlage.storage_type === 'database') {
            // File stored in database - fetch binary data separately
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                console.log('📦 Serving preview from database, size:', bijlageWithData.bestand_data.length);
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers for inline viewing
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                console.log('🎯 [BACKEND] Preview headers set - Content-Length:', buffer.length);
                
                res.end(buffer, 'binary');
            } else {
                console.log('❌ Binary data not found in database');
                return res.status(404).json({ error: 'Bijlage data niet gevonden in database' });
            }
        } else if (bijlage.storage_type === 'backblaze' && bijlage.storage_path) {
            // Try database first as fallback, then B2
            console.log('🔄 Trying database first for Backblaze file preview');
            
            const bijlageWithData = await db.getBijlage(bijlageId, true);
            if (bijlageWithData && bijlageWithData.bestand_data) {
                console.log('📦 Serving Backblaze preview from database backup, size:', bijlageWithData.bestand_data.length);
                
                const buffer = Buffer.isBuffer(bijlageWithData.bestand_data) ? bijlageWithData.bestand_data : Buffer.from(bijlageWithData.bestand_data);
                
                // Set headers for inline viewing
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                console.log('🎯 [BACKEND] DB Backup preview headers set - Content-Length:', buffer.length);
                
                res.end(buffer, 'binary');
                return;
            }

            // Fallback to B2 download
            try {
                console.log('🔽 Falling back to B2 download for preview:', bijlage.storage_path);
                
                const storageStart = Date.now();
                const fileBuffer = await storageManager.downloadFile(bijlage);
                console.log('🎯 [BACKEND] B2 download completed in:', Date.now() - storageStart, 'ms');
                
                if (!fileBuffer) {
                    console.log('❌ No file buffer returned from B2');
                    return res.status(404).json({ error: 'Bijlage niet gevonden in cloud storage' });
                }
                
                console.log('📦 FileBuffer type:', typeof fileBuffer, 'isBuffer:', Buffer.isBuffer(fileBuffer));
                
                const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
                
                // Set headers for inline viewing
                res.setHeader('Content-Type', bijlage.mimetype || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${bijlage.bestandsnaam}"`);
                res.setHeader('Content-Length', buffer.length);
                console.log('🎯 [BACKEND] B2 preview headers set - Content-Length:', buffer.length);
                console.log('🎯 [BACKEND] Total preview request time:', Date.now() - startTime, 'ms');
                
                res.end(buffer, 'binary');
                
            } catch (b2Error) {
                console.error('❌ Error downloading from B2 for preview:', b2Error);
                return res.status(500).json({ 
                    error: 'Fout bij laden preview uit cloud storage',
                    debug: `${b2Error.name}: ${b2Error.message}`
                });
            }
        } else {
            console.log('❌ No valid storage found for bijlage preview, type:', bijlage.storage_type);
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
        
        console.log(`🗑️ Deleting bijlage ${bijlageId}:`, {
            bestandsnaam: bijlage?.bestandsnaam,
            storage_path: bijlage?.storage_path,
            user_id: bijlage?.user_id
        });
        
        if (!bijlage) {
            console.log(`❌ Bijlage ${bijlageId} not found`);
            return res.status(404).json({ error: 'Bijlage niet gevonden' });
        }

        // Check if user owns this attachment
        if (bijlage.user_id !== userId) {
            console.log(`❌ User ${userId} does not own bijlage ${bijlageId} (owned by ${bijlage.user_id})`);
            return res.status(403).json({ error: 'Geen toegang tot bijlage' });
        }

        // Delete from B2 storage first
        try {
            console.log(`🧹 Attempting B2 delete for: ${bijlage.bestandsnaam}`);
            await storageManager.deleteFile(bijlage);
            console.log(`✅ B2 delete successful for: ${bijlage.bestandsnaam}`);
        } catch (error) {
            console.error(`⚠️ B2 delete failed for ${bijlage.bestandsnaam}:`, error.message);
            // Continue with database deletion even if B2 fails
        }

        // Delete from database
        const success = await db.deleteBijlage(bijlageId, userId);

        if (success) {
            console.log(`✅ Bijlage deleted successfully: ${bijlageId} (${bijlage.bestandsnaam})`);
            res.json({ success: true });
        } else {
            console.log(`❌ Database delete failed for bijlage ${bijlageId}`);
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

        const stats = await db.getUserStorageStats(userId);
        const isPremium = await db.checkUserPremiumStatus(userId);

        // Get user's plan_id to determine plan type
        const userResult = await pool.query('SELECT selected_plan FROM users WHERE id = $1', [userId]);
        const planId = userResult.rows[0]?.selected_plan || null;

        // Determine plan type
        const PREMIUM_PLUS_PLAN_IDS = ['monthly_8', 'yearly_80'];
        const PREMIUM_STANDARD_PLAN_IDS = ['monthly_7', 'yearly_70'];
        const isPremiumPlus = PREMIUM_PLUS_PLAN_IDS.includes(planId);
        const isPremiumStandard = PREMIUM_STANDARD_PLAN_IDS.includes(planId);

        res.json({
            success: true,
            stats: {
                used_bytes: stats.used_bytes,
                used_formatted: storageManager.formatBytes(stats.used_bytes),
                bijlagen_count: stats.bijlagen_count,
                is_premium: isPremium,
                plan_id: planId,
                plan_type: isPremiumPlus ? 'premium_plus' : (isPremiumStandard ? 'premium_standard' : 'free'),
                limits: {
                    total_bytes: isPremiumPlus ? null : (isPremiumStandard ? STORAGE_CONFIG.FREE_TIER_LIMIT : STORAGE_CONFIG.FREE_TIER_LIMIT),
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
        
        console.log(`🧪 Testing GHL integration for: ${email}`);
        
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

                console.log(`⚠️ /api/auth/me - User ${user.email} requires upgrade (${trialIsExpired ? 'trial expired' : 'beta expired'})`);
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
            console.log('Session table not available yet:', sessionError.message);
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
        console.log('📝 New feedback received:', {
            type: feedbackData.type,
            titel: feedbackData.titel,
            userId,
            prioriteit: feedbackData.prioriteit
        });
        
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
        
        console.log('🔍 B2 Status check:', status);
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
        
        console.log(`🧪 Testing B2 cleanup for task ${taskId} with ${bijlagen.length} bijlagen`);
        
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
        
        console.log('✅ Database cleaned - all task data removed');
        
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

// Search endpoint definitief verwijderd in v0.5.80
app.get('/api/lijst/:naam', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        const userId = getCurrentUserId(req);
        const data = await db.getList(naam, userId);
        
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
        const result = await pool.query('SELECT id, email, name FROM users WHERE email = $1', [email]);
        
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
            console.log('🚨 UI DEBUG: Data causing 500 error:', JSON.stringify(req.body, null, 2));
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
        
        console.log('🔍 SERVER: Adding single task to inbox:', { tekst, userId });
        
        if (!tekst) {
            return res.status(400).json({ error: 'Tekst is required' });
        }
        
        // Get current inbox first
        const currentInbox = await db.getList('inbox', userId);
        console.log('🔍 SERVER: Current inbox has', currentInbox.length, 'tasks');
        
        // Create new task
        const newTask = {
            id: generateId(),
            tekst: tekst,
            aangemaakt: new Date().toISOString()
        };
        
        // Add to current inbox
        const updatedInbox = [...currentInbox, newTask];
        console.log('🔍 SERVER: Updated inbox will have', updatedInbox.length, 'tasks');
        
        // Save updated inbox
        const success = await db.saveList('inbox', updatedInbox, userId);
        
        if (success) {
            console.log('✅ SERVER: Successfully added task to inbox');
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

        console.log(`🔄 Server: Updating task ${id} for user ${userId}:`, JSON.stringify(req.body, null, 2));

        // Check if this is a completion via checkbox
        if (completedViaCheckbox && updateData.lijst === 'afgewerkt') {
            console.log(`✅ Processing task completion via checkbox for task ${id}`);

            // First, get the current task to check its status and recurring settings
            const currentTask = await db.getTask(id, userId);
            if (!currentTask) {
                console.log(`Task ${id} not found`);
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    code: 'TASK_NOT_FOUND'
                });
            }

            // Check if task is already completed
            if (currentTask.lijst === 'afgewerkt') {
                console.log(`Task ${id} is already completed`);
                return res.status(400).json({
                    success: false,
                    error: 'Task is already completed',
                    code: 'INVALID_TASK_STATE',
                    currentState: currentTask.lijst
                });
            }

            // Validate required completion fields
            if (!updateData.afgewerkt) {
                console.log(`Missing completion timestamp for task ${id}`);
                return res.status(400).json({
                    success: false,
                    error: 'Completion timestamp (afgewerkt) is required',
                    code: 'VALIDATION_ERROR'
                });
            }

            // Update task to completed status
            const success = await db.updateTask(id, updateData, userId);

            if (!success) {
                console.log(`Failed to update task ${id} to completed status`);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to update task status',
                    code: 'UPDATE_FAILED'
                });
            }

            // Get updated task for response
            const updatedTask = await db.getTask(id, userId);

            // Check if task has recurring settings and needs a new instance
            let recurringTaskCreated = false;
            let nextTask = null;

            if (currentTask.herhaling_actief && currentTask.herhaling_type) {
                console.log(`🔄 Creating recurring task for completed task ${id} with pattern: ${currentTask.herhaling_type}`);

                try {
                    // Create next recurring task instance
                    const recurringResult = await db.createRecurringTask(currentTask);
                    if (recurringResult && recurringResult.success) {
                        recurringTaskCreated = true;
                        nextTask = recurringResult.newTask;
                        console.log(`✅ Created recurring task ${nextTask.id} for completed task ${id}`);
                    } else {
                        console.log(`⚠️ Failed to create recurring task for ${id}:`, recurringResult);
                    }
                } catch (recurringError) {
                    console.error(`❌ Error creating recurring task for ${id}:`, recurringError);
                    // Don't fail the main completion - just log the error
                }
            }

            // Return success response with task data and recurring info
            console.log(`✅ Task ${id} completed successfully via checkbox`);
            return res.json({
                success: true,
                task: {
                    id: updatedTask.id,
                    tekst: updatedTask.tekst,
                    lijst: updatedTask.lijst,
                    afgewerkt: updatedTask.afgewerkt,
                    herhaling_actief: updatedTask.herhaling_actief
                },
                recurringTaskCreated,
                ...(nextTask && { nextTask: {
                    id: nextTask.id,
                    tekst: nextTask.tekst,
                    lijst: nextTask.lijst,
                    verschijndatum: nextTask.verschijndatum
                }})
            });
        } else {
            // Normal task update (existing functionality)
            const success = await db.updateTask(id, req.body, userId);

            if (success) {
                console.log(`Task ${id} updated successfully`);
                res.json({ success: true });
            } else {
                console.log(`Task ${id} not found or update failed`);
                res.status(404).json({ error: 'Taak niet gevonden' });
            }
        }
    } catch (error) {
        console.error(`Error updating task ${id}:`, error);
        res.status(500).json({ error: 'Fout bij updaten', details: error.message });
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
        console.log(`🗑️ Deleting task ${id} for user ${userId}`);
        
        // Eerst bijlagen ophalen voor B2 cleanup (voor CASCADE ze verwijdert)
        const bijlagen = await db.getBijlagenForTaak(id);
        if (bijlagen && bijlagen.length > 0) {
            console.log(`📎 Found ${bijlagen.length} bijlagen for task ${id}`);
        }
        
        const result = await pool.query(
            'DELETE FROM taken WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        
        if (result.rows.length > 0) {
            console.log(`✅ Task ${id} deleted successfully`);
            
            let cleanupResult = { success: true, deleted: 0, failed: 0 };
            
            // Synchrone B2 cleanup met timeout
            if (bijlagen && bijlagen.length > 0) {
                console.log(`🧹 Starting synchronous B2 cleanup for task ${id}`);
                try {
                    // Timeout van 8 seconden voor B2 cleanup
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('B2 cleanup timeout after 8 seconds')), 8000);
                    });
                    
                    cleanupResult = await Promise.race([
                        cleanupB2Files(bijlagen, id),
                        timeoutPromise
                    ]);
                    
                    console.log(`🧹 B2 cleanup completed for task ${id}:`, cleanupResult);
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
            console.log(`❌ Task ${id} not found or not owned by user`);
            res.status(404).json({ error: 'Taak niet gevonden' });
        }
    } catch (error) {
        console.error(`Error deleting task ${id}:`, error);
        res.status(500).json({ error: 'Fout bij verwijderen', details: error.message });
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
        console.log(`📋 Getting subtaken for parent task ${parentId}`);
        
        const subtaken = await db.getSubtaken(parentId);
        res.json(subtaken);
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
        console.log(`➕ Creating subtaak for parent ${parentTaakId}: ${titel}`);
        
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
        console.log(`📝 Updating subtaak ${id}:`, JSON.stringify(req.body, null, 2));
        
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
        console.log(`🗑️ Deleting subtaak ${id}`);
        
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
        
        console.log(`🔄 Reordering subtaken for parent ${parentId}:`, subtaakIds);
        
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
        const result = await pool.query('SELECT * FROM taken WHERE id = $1', [id]);
        
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

// Test Dashboard Endpoints
const testModule = require('./test-runner');

// Version endpoint voor deployment tracking
app.get('/api/version', (req, res) => {
    // Clear require cache for package.json to get fresh version
    delete require.cache[require.resolve('./package.json')];
    const packageJson = require('./package.json');

    console.log(`📋 Version check - code version: 0.17.23-FINAL`);

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
        console.log('🚀 Starting full regression test suite...');
        const results = await testModule.runFullRegressionTests();
        
        console.log('✅ Regression tests completed:', {
            total: results.total_tests,
            passed: results.passed,
            failed: results.failed,
            duration: results.duration_ms
        });
        
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
        console.log('✅ Performance tests completed successfully');

        res.json(summary);
    } catch (error) {
        console.error('❌ Performance tests failed:', error);
        res.status(500).json({ error: error.message });
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
        console.log('🧹 Emergency cleanup initiated...');
        
        // Delete all test records (by ID pattern and by test names)
        const deletedTasks = await pool.query("DELETE FROM taken WHERE id LIKE 'test_%' OR tekst IN ('Completion test', 'Test taak', 'Database CRUD Test', 'Updated Test Task', 'Rollback Test', 'FK Test Task', 'Dagelijkse test taak', 'Completion workflow test', 'List management test', 'Project context test', 'Email versturen naar klanten', 'Vergadering voorbereiden', 'Factuur email versturen', 'Taak voor vandaag', 'Taak voor morgen') RETURNING id");
        const deletedProjects = await pool.query("DELETE FROM projecten WHERE id LIKE 'test_project_%' OR naam IN ('Test Project', 'FK Test Project') RETURNING id");
        const deletedContexts = await pool.query("DELETE FROM contexten WHERE id LIKE 'test_context_%' OR naam IN ('Test Context', 'FK Test Context') RETURNING id");
        
        const totalDeleted = deletedTasks.rows.length + deletedProjects.rows.length + deletedContexts.rows.length;
        
        console.log(`✅ Emergency cleanup completed - ${totalDeleted} records deleted`);
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
        
        console.log('🔧 Admin: Adding missing recurring columns...');
        
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
                console.log(`✅ Added column ${col.name}`);
                results.push({ column: col.name, status: 'added' });
            } catch (colError) {
                if (colError.message.includes('already exists')) {
                    console.log(`⚠️ Column ${col.name} already exists`);
                    results.push({ column: col.name, status: 'already_exists' });
                } else {
                    console.log(`❌ Failed to add column ${col.name}:`, colError.message);
                    results.push({ column: col.name, status: 'error', error: colError.message });
                }
            }
        }
        
        console.log('✅ Recurring columns setup complete');
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
        const result = await pool.query('SELECT * FROM taken WHERE lijst = $1 AND afgewerkt IS NULL ORDER BY aangemaakt DESC', [naam]);
        
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
            console.log('🐛 DEBUG: Database not available for task lookup');
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        console.log('🐛 DEBUG: Looking up task with ID:', id);
        
        // Use same pool as database module to avoid connection issues
        const { pool: dbPool } = require('./database');
        const result = await dbPool.query('SELECT * FROM taken WHERE id = $1', [id]);
        console.log('🐛 DEBUG: Query result rows count:', result.rows.length);
        
        if (result.rows.length > 0) {
            const task = result.rows[0];
            console.log('🐛 DEBUG: Found task:', task);
            
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
            console.log('🐛 DEBUG: Task not found in database');
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
        console.log('Creating recurring task for user', userId, ':', { originalTask, nextDate });
        
        const taskId = await db.createRecurringTask(originalTask, nextDate, userId);
        if (taskId) {
            // Debug: immediately check what's in acties list after creation
            setTimeout(async () => {
                try {
                    const actiesTasks = await db.getList('acties', userId);
                    console.log('🔍 DEBUG: All tasks in acties after creation:', actiesTasks.length);
                    const newTask = actiesTasks.find(t => t.id === taskId);
                    if (newTask) {
                        console.log('✅ DEBUG: New task found in acties list:', newTask);
                    } else {
                        console.log('❌ DEBUG: New task NOT found in acties list');
                        console.log('🔍 DEBUG: All task IDs in acties:', actiesTasks.map(t => t.id));
                    }
                } catch (error) {
                    console.log('Debug check failed:', error);
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
        
        console.log('Setting task priority:', { id, prioriteit, datum, userId });
        
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
        
        console.log('🔍 DEBUG: All tasks for 2025-06-16:', result.rows);
        console.log('🔍 DEBUG: Recent tasks (last hour):', recentResult.rows);
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
        
        console.log('🔍 DEBUG: Raw acties from database:', result.rows);
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
        
        console.log('🔍 DEBUG ENDPOINT: Testing save with data:', testData);
        
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
        console.log('🔧 SINGLE ACTION: Adding action:', actionData);
        
        const userId = getCurrentUserId(req);
        console.log('🔧 SINGLE ACTION: Using userId:', userId);
        
        // First check if task already exists for this user
        const existingCheck = await pool.query('SELECT * FROM taken WHERE id = $1 AND user_id = $2', [actionData.id, userId]);
        if (existingCheck.rows.length > 0) {
            console.log('🔧 SINGLE ACTION: Task already exists, updating instead');
            
            // Delete the existing task first
            await pool.query('DELETE FROM taken WHERE id = $1 AND user_id = $2', [actionData.id, userId]);
            console.log('🔧 SINGLE ACTION: Deleted existing task');
        }
        
        // Insert directly without touching existing data - WITH user_id
        const result = await pool.query(`
            INSERT INTO taken (id, tekst, opmerkingen, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, afgewerkt, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
            null,
            userId  // Add user_id
        ]);
        
        console.log('🔧 SINGLE ACTION: Successfully inserted with ID:', result.rows[0].id);
        
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
        
        console.log('🔧 FORCE MIGRATION: Starting herhaling_type column migration');
        
        // Force migrate the column size
        await pool.query(`ALTER TABLE taken ALTER COLUMN herhaling_type TYPE VARCHAR(50)`);
        
        console.log('✅ FORCE MIGRATION: Successfully migrated herhaling_type to VARCHAR(50)');
        
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
        
        console.log('🧪 Testing pattern:', pattern, 'with base date:', baseDate);
        
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
            nextDateObj.setMonth(date.getMonth() + 2);
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
                            const targetMonth = nextDateObj.getMonth();
                            nextDateObj.setMonth(targetMonth + 1);
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
        console.log(`✅ Server: Calculated date for testing: ${nextDate}`);
        
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
        
        console.log('🧪 Creating test task:', testTask);
        
        const insertResult = await pool.query(`
            INSERT INTO taken (tekst, verschijndatum, lijst, project_id, context_id, duur, herhaling_type, herhaling_actief)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [testTask.tekst, testTask.verschijndatum, testTask.lijst, testTask.project_id, testTask.context_id, testTask.duur, testTask.herhaling_type, testTask.herhaling_actief]);
        
        const taskId = insertResult.rows[0].id;
        console.log('✅ Test task created with ID:', taskId);
        
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
                console.log(`Updating task ${task.id}: "${originalText}" -> "${cleanedText}"`);
                
                const updateResult = await pool.query(`
                    UPDATE taken 
                    SET tekst = $1 
                    WHERE id = $2
                    RETURNING tekst
                `, [cleanedText, task.id]);
                
                console.log(`Update result for ${task.id}:`, updateResult.rows[0]);
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
        console.log('Mind dump GET: Loading preferences for user:', userId);
        
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

        console.log('Mind dump GET: Query result rows:', result.rows.length);
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log('Mind dump GET: Found preferences for user');
            res.json({
                preferences: row.preferences || {},
                customWords: row.custom_words || []
            });
        } else {
            console.log('Mind dump GET: No preferences found, returning defaults');
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
                console.log(`Skipping table ${table.table_name}: ${error.message}`);
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

        console.log('Admin feedback request - fetching feedback data...');

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

        console.log(`Found ${feedback.rows ? feedback.rows.length : 0} feedback items`);

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

        console.log('Admin feedback stats request...');

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

        console.log('Feedback stats:', stats.rows[0]);

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
        
        console.log(`✅ Admin updated user ${currentUser.email} from ${currentUser.account_type} to ${account_type}`);
        
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
        console.log('🔄 Starting forced beta migration...');
        
        // Add beta columns to users table if they don't exist
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'regular',
            ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS ghl_contact_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('✅ Users table beta columns added');
        
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
        console.log('✅ Beta_config table created');
        
        // Insert default beta config if not exists
        await pool.query(`
            INSERT INTO beta_config (id, beta_period_active, created_at, updated_at)
            VALUES (1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('✅ Default beta config inserted');

        // Add subscription-related columns to users table if they don't exist
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS plugandpay_subscription_id VARCHAR(255)
        `);
        console.log('✅ Users table subscription columns added');

        // Set existing users to beta type if they were created recently (assuming they are beta testers)
        await pool.query(`
            UPDATE users 
            SET account_type = 'beta', 
                subscription_status = 'beta_active'
            WHERE account_type IS NULL OR account_type = 'regular'
        `);
        console.log('✅ Existing users converted to beta type');
        
        // Also reset any expired users back to active if beta period is active
        const betaConfig = await db.getBetaConfig();
        if (betaConfig.beta_period_active) {
            await pool.query(`
                UPDATE users
                SET subscription_status = 'beta_active'
                WHERE account_type = 'beta' AND (subscription_status = 'expired' OR subscription_status = 'beta_expired')
            `);
            console.log('✅ Expired beta users reactivated');
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
        console.log('🔄 Starting migration: expired → beta_expired for beta users');

        // Update all beta users with 'expired' status to 'beta_expired'
        const result = await pool.query(`
            UPDATE users
            SET subscription_status = 'beta_expired'
            WHERE account_type = 'beta' AND subscription_status = 'expired'
            RETURNING id, email, subscription_status
        `);

        console.log(`✅ Migrated ${result.rows.length} beta users from 'expired' to 'beta_expired'`);

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
        
        console.log(`🗑️ Admin cleanup: Deleting ${userIds.length} test users...`);
        
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
                    
                    console.log(`🗑️ Deleting user: ${user.email} (${userId})`);
                    
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
                    console.log(`📊 User ${user.email} has:`, counts);
                    
                    // Delete all related data first (in correct order to avoid FK violations)
                    console.log(`🧹 Cleaning up related data for ${user.email}...`);
                    
                    // 1. Delete subtaken (depends on taken)
                    const subtakenDeleted = await client.query('DELETE FROM subtaken WHERE parent_taak_id IN (SELECT id FROM taken WHERE user_id = $1)', [userId]);
                    console.log(`🗑️ Deleted ${subtakenDeleted.rowCount} subtaken`);
                    
                    // 2. Delete bijlagen (depends on taken)  
                    const bijlagenDeleted = await client.query('DELETE FROM bijlagen WHERE taak_id IN (SELECT id FROM taken WHERE user_id = $1)', [userId]);
                    console.log(`🗑️ Deleted ${bijlagenDeleted.rowCount} bijlagen`);
                    
                    // 3. Delete dagelijkse_planning (references taken)
                    const planningDeleted = await client.query('DELETE FROM dagelijkse_planning WHERE user_id = $1', [userId]);
                    console.log(`🗑️ Deleted ${planningDeleted.rowCount} planning items`);
                    
                    // 4. Delete taken (references projecten/contexten)
                    const takenDeleted = await client.query('DELETE FROM taken WHERE user_id = $1', [userId]);
                    console.log(`🗑️ Deleted ${takenDeleted.rowCount} taken`);
                    
                    // 5. Delete projecten 
                    const projectenDeleted = await client.query('DELETE FROM projecten WHERE user_id = $1', [userId]);
                    console.log(`🗑️ Deleted ${projectenDeleted.rowCount} projecten`);
                    
                    // 6. Delete contexten
                    const contextenDeleted = await client.query('DELETE FROM contexten WHERE user_id = $1', [userId]);
                    console.log(`🗑️ Deleted ${contextenDeleted.rowCount} contexten`);
                    
                    // 7. Delete feedback
                    const feedbackDeleted = await client.query('DELETE FROM feedback WHERE user_id = $1', [userId]);
                    console.log(`🗑️ Deleted ${feedbackDeleted.rowCount} feedback`);
                    
                    // 8. Delete mind_dump_preferences if exists
                    try {
                        const mindDumpDeleted = await client.query('DELETE FROM mind_dump_preferences WHERE user_id = $1', [userId]);
                        console.log(`🗑️ Deleted ${mindDumpDeleted.rowCount} mind dump preferences`);
                    } catch (mindDumpError) {
                        console.log(`⚠️ Mind dump preferences table might not exist: ${mindDumpError.message}`);
                    }
                    
                    // 9. Finally delete the user
                    const deleteResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);
                    console.log(`🔄 DELETE user result: rowCount=${deleteResult.rowCount}`);
                    
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
                        console.log(`✅ Successfully deleted user: ${user.email} and all related data`);
                    } else {
                        results.push({ 
                            userId, 
                            email: user.email,
                            status: 'failed', 
                            error: 'User delete failed after cleaning related data',
                            originalCounts: counts
                        });
                        console.log(`❌ User delete failed for ${user.email} after cleaning related data`);
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
        
        console.log('🔄 Starting CASCADE DELETE migration...');
        
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
                    console.log(`✅ Executed: ${migration.substring(0, 50)}...`);
                } catch (migError) {
                    console.log(`⚠️ Migration warning: ${migError.message}`);
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
        console.log('🔗 Quick-add request received:', {
            url: req.url,
            query: req.query,
            headers: req.headers
        });

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
        console.log(`🔗 Quick-add task via URL for user ${user.email}`);

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
                console.log('Could not parse date:', date);
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
        console.log(`✅ Task created via quick-add: ${taskId}`);

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
        console.log('🔧 Recovery request for taskId:', taskId);
        
        if (!taskId) {
            return res.status(400).json({ error: 'taskId required' });
        }
        
        // Get the completed task
        const taskResult = await pool.query(
            'SELECT * FROM taken WHERE id = $1',
            [taskId]
        );
        
        console.log('📋 Found task rows:', taskResult.rows.length);
        
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const task = taskResult.rows[0];
        console.log('✅ Task data:', { id: task.id, tekst: task.tekst, herhaling_type: task.herhaling_type });
        
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
            console.log('🔍 Available columns:', existingColumns);
            
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
            
            console.log('📝 Insert query:', insertQuery);
            console.log('📊 Values:', values.slice(0, 8)); // Don't log all values for security
            
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

// Direct database query for forensic logs (bypass logger)
app.get('/api/debug/forensic/raw-database', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        // Check if forensic_logs table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'forensic_logs'
            ) as exists
        `);
        
        if (!tableExists.rows[0].exists) {
            return res.json({
                status: 'forensic_logs table does not exist',
                forensic_debug: process.env.FORENSIC_DEBUG,
                logger_enabled: forensicLogger.enabled
            });
        }
        
        // Get recent logs directly from database
        const logs = await pool.query(`
            SELECT * FROM forensic_logs 
            ORDER BY timestamp DESC 
            LIMIT 20
        `);
        
        res.json({
            status: 'forensic_logs table exists',
            forensic_debug: process.env.FORENSIC_DEBUG,
            logger_enabled: forensicLogger.enabled,
            total_logs: logs.rows.length,
            recent_logs: logs.rows
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            forensic_debug: process.env.FORENSIC_DEBUG,
            logger_enabled: forensicLogger.enabled
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

// Subscription API Endpoints
// GET /api/subscription/plans - Get available subscription plans
app.get('/api/subscription/plans', (req, res) => {
    try {
        // Static subscription plans data as defined in data-model.md
        const SUBSCRIPTION_PLANS = [
            {
                id: 'trial_14_days',
                name: '14 dagen gratis',
                description: 'Probeer alle functies gratis uit',
                price: 0,
                billing_cycle: 'trial',
                trial_days: 14,
                features: ['Alle functies', 'Onbeperkte taken', 'Email import']
            },
            {
                id: 'monthly_7',
                name: 'Maandelijks',
                description: 'Per maand, stop wanneer je wilt',
                price: 7,
                billing_cycle: 'monthly',
                trial_days: 0,
                features: ['Alle functies', 'Onbeperkte taken', 'Email import', 'Premium support']
            },
            {
                id: 'yearly_70',
                name: 'Jaarlijks',
                description: 'Bespaar €14 per jaar',
                price: 70,
                billing_cycle: 'yearly',
                trial_days: 0,
                features: ['Alle functies', 'Onbeperkte taken', 'Email import', 'Premium support', '2 maanden gratis']
            },
            {
                id: 'monthly_8',
                name: 'No Limit Maandelijks',
                description: 'Ongelimiteerde bijlages per maand',
                price: 8,
                billing_cycle: 'monthly',
                trial_days: 0,
                features: ['Alle functies', 'Onbeperkte taken', 'Email import', 'Premium support', 'Ongelimiteerde bijlages', 'Geen limiet op bestandsgrootte']
            },
            {
                id: 'yearly_80',
                name: 'No Limit Jaarlijks',
                description: 'Ongelimiteerde bijlages - bespaar €16 per jaar',
                price: 80,
                billing_cycle: 'yearly',
                trial_days: 0,
                features: ['Alle functies', 'Onbeperkte taken', 'Email import', 'Premium support', 'Ongelimiteerde bijlages', 'Geen limiet op bestandsgrootte', '2 maanden gratis']
            }
        ];

        res.json({
            success: true,
            plans: SUBSCRIPTION_PLANS
        });
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
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

// 404 handler - MUST be after all routes!
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
});

app.listen(PORT, () => {
    console.log(`🚀 Tickedify server v2 running on port ${PORT}`);
    
    // Initialize database and storage manager after server starts
    setTimeout(async () => {
        try {
            if (db) {
                const { initDatabase } = require('./database');
                await initDatabase();
                dbInitialized = true;
                console.log('✅ Database initialized successfully');
            } else {
                console.log('⚠️ Database module not available, skipping initialization');
            }
        } catch (error) {
            console.error('⚠️ Database initialization failed:', error.message);
        }
        
        // Initialize storage manager for B2 functionality
        try {
            if (storageManager) {
                await storageManager.initialize();
                console.log('✅ Storage manager initialized successfully');
                console.log('🔧 B2 available:', storageManager.isB2Available());
            } else {
                console.log('⚠️ Storage manager not available, skipping initialization');
            }
        } catch (error) {
            console.error('⚠️ Storage manager initialization failed:', error.message);
        }
    }, 1000);
});

// Debug endpoint to find specific task by ID without user filtering
app.get('/api/debug/find-task/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM taken WHERE id = $1', [id]);
        
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
        
        console.log('🚀 Starting migration to pure B2 storage via API...');
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


// Force deploy Thu Jun 26 11:21:42 CEST 2025
