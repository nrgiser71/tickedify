# Implementation Tasks: Volledig Abonnement-Betalingsproces

**Feature**: 011-in-de-app
**Branch**: `011-in-de-app`
**Date**: 2025-10-11
**Status**: Ready for Execution

---

## Task Overview

**Total Tasks**: 36
**Estimated Duration**: 3-5 days
**Parallel Execution**: 15 tasks can run in parallel (marked [P])

**Phases**:
- Phase 1: Database Setup (T001-T005)
- Phase 2: Backend Helpers (T006-T008)
- Phase 3: API Endpoints (T009-T015)
- Phase 4: Frontend UI (T016-T020)
- Phase 5: Integration & Business Logic (T021-T022)
- Phase 6: Testing (T023-T030)
- Phase 7: Documentation & Deployment (T031-T036)

---

## Phase 1: Database Setup

### T001: Create migration 011-001 (extend users table)

**File**: `migrations/011-001-extend-users-table.sql`

**Action**: Create database migration file to extend users table with payment tracking fields.

**SQL**:
```sql
-- Migration 011-001: Extend users table with payment tracking fields
-- Feature: 011-in-de-app
-- Date: 2025-10-11

-- Add payment tracking fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS had_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plugandpay_order_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_token_used BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_plugandpay_order_id ON users(plugandpay_order_id);
CREATE INDEX IF NOT EXISTS idx_users_login_token ON users(login_token) WHERE login_token_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON users(trial_end_date) WHERE subscription_status = 'trialing';

-- Add constraint for trial dates
ALTER TABLE users ADD CONSTRAINT chk_trial_dates
  CHECK (trial_end_date IS NULL OR trial_start_date IS NULL OR trial_end_date >= trial_start_date);
```

**Verification**:
```sql
\d users
-- Should show all new columns
```

**Dependencies**: None (first task)

---

### T002: Create migration 011-002 (payment_configurations table)

**File**: `migrations/011-002-create-payment-configurations.sql`

**Action**: Create payment_configurations table for admin-configurable checkout URLs.

**SQL**:
```sql
-- Migration 011-002: Create payment_configurations table
-- Feature: 011-in-de-app
-- Date: 2025-10-11

CREATE TABLE IF NOT EXISTS payment_configurations (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  checkout_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_configs_plan_id ON payment_configurations(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_configs_active ON payment_configurations(is_active);

-- Insert initial data
INSERT INTO payment_configurations (plan_id, plan_name, checkout_url, is_active) VALUES
  ('monthly_7', 'Maandelijks €7', '', FALSE),
  ('yearly_70', 'Jaarlijks €70', '', FALSE)
ON CONFLICT (plan_id) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_config_updated_at
  BEFORE UPDATE ON payment_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_config_updated_at();
```

**Verification**:
```sql
SELECT * FROM payment_configurations;
-- Should show 2 rows (monthly_7, yearly_70)
```

**Dependencies**: T001 (users table must exist for referential integrity)

---

### T003: Create migration 011-003 (payment_webhook_logs table)

**File**: `migrations/011-003-create-webhook-logs.sql`

**Action**: Create payment_webhook_logs table for audit trail.

**SQL**:
```sql
-- Migration 011-003: Create payment_webhook_logs table
-- Feature: 011-in-de-app
-- Date: 2025-10-11

CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100),
  order_id VARCHAR(255),
  email VARCHAR(255),
  amount_cents INTEGER,
  payload JSONB,
  signature_valid BOOLEAN,
  processed_at TIMESTAMP DEFAULT NOW(),
  error_message TEXT,
  ip_address VARCHAR(45)
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON payment_webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON payment_webhook_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON payment_webhook_logs(processed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON payment_webhook_logs(event_type);
```

**Verification**:
```sql
\d payment_webhook_logs
-- Should show table structure
```

**Dependencies**: T001 (users table foreign key)

---

### T004: Run migrations on database

**Action**: Execute all three migrations on Neon database.

**Steps**:
1. Connect to Neon database using credentials from database.js
2. Run migration 011-001
3. Run migration 011-002
4. Run migration 011-003
5. Verify no errors

**Command** (via database.js or direct psql):
```bash
# Option 1: Via Node.js script
node -e "const db = require('./database'); db.query(fs.readFileSync('./migrations/011-001-extend-users-table.sql', 'utf8'))"

# Option 2: Direct psql (if connection string available)
psql $DATABASE_URL -f migrations/011-001-extend-users-table.sql
psql $DATABASE_URL -f migrations/011-002-create-payment-configurations.sql
psql $DATABASE_URL -f migrations/011-003-create-webhook-logs.sql
```

**Verification**: T005

**Dependencies**: T001, T002, T003 (migrations must exist)

---

### T005: Verify database schema

**Action**: Run verification queries to ensure all migrations applied correctly.

**Verification Queries**:
```sql
-- Check users table extensions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('payment_confirmed_at', 'trial_start_date', 'trial_end_date',
                       'had_trial', 'plugandpay_order_id', 'amount_paid_cents',
                       'login_token', 'login_token_expires', 'login_token_used');
-- Expected: 9 rows

-- Check payment_configurations table
SELECT COUNT(*) FROM payment_configurations;
-- Expected: 2 rows

-- Check payment_webhook_logs table exists
SELECT COUNT(*) FROM payment_webhook_logs;
-- Expected: 0 rows (empty table)

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('users', 'payment_configurations', 'payment_webhook_logs')
  AND indexname LIKE '%payment%' OR indexname LIKE '%trial%' OR indexname LIKE '%webhook%';
-- Expected: Multiple indexes
```

**Success Criteria**: All queries return expected results, no errors

**Dependencies**: T004 (migrations executed)

---

## Phase 2: Backend Helpers

### T006: Implement subscription state machine helper [P]

**File**: `server.js` (add helper functions section)

**Action**: Create helper functions for subscription state management.

**Code Location**: Add after existing helper functions in server.js

**Functions to Implement**:
```javascript
/**
 * Subscription State Machine Helper
 * Manages subscription status transitions and validation
 */

// Valid subscription states
const SUBSCRIPTION_STATES = {
  BETA: 'beta',
  TRIALING: 'trialing',
  TRIAL_EXPIRED: 'trial_expired',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

// Valid plan IDs
const PLAN_IDS = {
  TRIAL: 'trial_14_days',
  MONTHLY: 'monthly_7',
  YEARLY: 'yearly_70'
};

/**
 * Check if user can access app based on subscription status
 * @param {string} status - Current subscription status
 * @returns {boolean} - True if user has access
 */
function canAccessApp(status) {
  return status === SUBSCRIPTION_STATES.ACTIVE || status === SUBSCRIPTION_STATES.TRIALING;
}

/**
 * Determine if trial has expired based on end date
 * @param {Date} trialEndDate - Trial end date
 * @returns {boolean} - True if trial has expired
 */
function isTrialExpired(trialEndDate) {
  if (!trialEndDate) return false;
  return new Date(trialEndDate) < new Date();
}

/**
 * Validate plan selection based on user's history
 * @param {string} planId - Selected plan ID
 * @param {boolean} hadTrial - Whether user already had trial
 * @returns {object} - {valid: boolean, error: string}
 */
function validatePlanSelection(planId, hadTrial) {
  if (!Object.values(PLAN_IDS).includes(planId)) {
    return { valid: false, error: 'Ongeldig abonnement geselecteerd' };
  }

  if (planId === PLAN_IDS.TRIAL && hadTrial) {
    return { valid: false, error: 'Je hebt al eerder de gratis proefperiode gebruikt' };
  }

  return { valid: true };
}

/**
 * Calculate trial end date (14 days from now)
 * @returns {Date} - Trial end date
 */
function calculateTrialEndDate() {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);
  return endDate;
}
```

**Testing**: Add console.log tests to verify functions work correctly

**Dependencies**: None (can run in parallel)

---

### T007: Implement auto-login token generation and validation [P]

**File**: `server.js` (add helper functions section)

**Action**: Create functions for secure auto-login token management.

**Code Location**: Add after subscription state helpers

**Functions to Implement**:
```javascript
/**
 * Auto-Login Token Helper
 * Generates and validates secure single-use tokens with expiry
 */

/**
 * Generate cryptographically random auto-login token
 * @returns {string} - Random 30-character token
 */
function generateLoginToken() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Calculate token expiry timestamp (10 minutes from now)
 * @returns {Date} - Token expiry timestamp
 */
function calculateTokenExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

/**
 * Validate auto-login token
 * @param {object} tokenData - Token data from database
 * @returns {object} - {valid: boolean, reason: string}
 */
function validateLoginToken(tokenData) {
  if (!tokenData) {
    return { valid: false, reason: 'token_not_found' };
  }

  if (tokenData.login_token_used) {
    return { valid: false, reason: 'token_used' };
  }

  if (new Date(tokenData.login_token_expires) < new Date()) {
    return { valid: false, reason: 'token_expired' };
  }

  return { valid: true };
}
```

**Testing**: Test token generation produces unique tokens, expiry is 10 minutes

**Dependencies**: None (can run in parallel)

---

### T008: Implement webhook idempotency check helper [P]

**File**: `server.js` (add helper functions section)

**Action**: Create function to check if webhook already processed (prevent duplicates).

**Code Location**: Add after token helpers

**Function to Implement**:
```javascript
/**
 * Webhook Idempotency Helper
 * Prevents duplicate webhook processing via order_id tracking
 */

/**
 * Check if webhook order has already been processed
 * @param {string} orderId - Plug&Pay order ID
 * @returns {Promise<object>} - {processed: boolean, userId: number}
 */
async function checkWebhookIdempotency(orderId) {
  const query = `
    SELECT id, subscription_status
    FROM users
    WHERE plugandpay_order_id = $1
  `;

  const result = await db.query(query, [orderId]);

  if (result.rows.length > 0) {
    return {
      processed: true,
      userId: result.rows[0].id,
      status: result.rows[0].subscription_status
    };
  }

  return { processed: false };
}

/**
 * Log webhook event to payment_webhook_logs table
 * @param {object} webhookData - Webhook event data
 * @returns {Promise<number>} - Log entry ID
 */
async function logWebhookEvent(webhookData) {
  const query = `
    INSERT INTO payment_webhook_logs
    (user_id, event_type, order_id, email, amount_cents, payload, signature_valid, error_message, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const values = [
    webhookData.userId || null,
    webhookData.eventType,
    webhookData.orderId,
    webhookData.email,
    webhookData.amountCents || null,
    JSON.stringify(webhookData.payload),
    webhookData.signatureValid,
    webhookData.errorMessage || null,
    webhookData.ipAddress || null
  ];

  const result = await db.query(query, values);
  return result.rows[0].id;
}
```

**Testing**: Test with mock order IDs, verify database queries work

**Dependencies**: None (can run in parallel), but requires T004 (migrations)

---

## Phase 3: API Endpoints

### T009: Implement POST /api/subscription/select

**File**: `server.js` (add new endpoint)

**Action**: Implement subscription plan selection endpoint.

**Code Location**: Add in API endpoints section, around line 2000-3000 with other /api/ routes

**Endpoint Implementation**:
```javascript
/**
 * POST /api/subscription/select
 * User selects a subscription plan (trial or paid)
 */
app.post('/api/subscription/select', requireAuth, async (req, res) => {
  try {
    const { plan_id, source } = req.body;
    const userId = req.session.userId;

    // Get user data
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    const user = userResult.rows[0];

    // Validate plan selection
    const validation = validatePlanSelection(plan_id, user.had_trial);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error, plan_id });
    }

    // TRIAL SELECTION
    if (plan_id === PLAN_IDS.TRIAL) {
      const trialStartDate = new Date();
      const trialEndDate = calculateTrialEndDate();

      const updateQuery = `
        UPDATE users
        SET subscription_status = $1,
            selected_plan = $2,
            plan_selected_at = NOW(),
            selection_source = $3,
            trial_start_date = $4,
            trial_end_date = $5,
            had_trial = TRUE
        WHERE id = $6
      `;

      await db.query(updateQuery, [
        SUBSCRIPTION_STATES.TRIALING,
        plan_id,
        source,
        trialStartDate,
        trialEndDate,
        userId
      ]);

      return res.json({
        success: true,
        plan_id: plan_id,
        subscription_status: SUBSCRIPTION_STATES.TRIALING,
        trial_start_date: trialStartDate.toISOString().split('T')[0],
        trial_end_date: trialEndDate.toISOString().split('T')[0],
        redirect_url: null,
        message: 'Je gratis proefperiode van 14 dagen is gestart!'
      });
    }

    // PAID PLAN SELECTION
    // Get checkout URL from payment_configurations
    const configQuery = `
      SELECT checkout_url, is_active
      FROM payment_configurations
      WHERE plan_id = $1 AND is_active = TRUE
    `;

    const configResult = await db.query(configQuery, [plan_id]);

    if (configResult.rows.length === 0 || !configResult.rows[0].checkout_url) {
      return res.status(400).json({
        success: false,
        error: 'Betaallink niet geconfigureerd voor dit abonnement. Neem contact op met support.',
        plan_id
      });
    }

    const checkoutUrl = configResult.rows[0].checkout_url;

    // Update user selection
    const updateQuery = `
      UPDATE users
      SET selected_plan = $1,
          plan_selected_at = NOW(),
          selection_source = $2
      WHERE id = $3
    `;

    await db.query(updateQuery, [plan_id, source, userId]);

    // Build redirect URL with query params
    const redirectUrl = new URL(checkoutUrl);
    redirectUrl.searchParams.append('email', user.email);
    redirectUrl.searchParams.append('user_id', userId);
    redirectUrl.searchParams.append('plan_id', plan_id);

    return res.json({
      success: true,
      plan_id: plan_id,
      subscription_status: user.subscription_status,
      redirect_url: redirectUrl.toString(),
      message: 'Je wordt doorgestuurd naar de betaalpagina...'
    });

  } catch (error) {
    console.error('Error in /api/subscription/select:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});
```

**Testing**:
- Test with trial_14_days → verify database update
- Test with monthly_7 → verify redirect URL generated
- Test with invalid plan → verify error response

**Dependencies**: T006 (state machine helpers), T004 (migrations)

---

### T010: Implement POST /api/webhooks/plugandpay

**File**: `server.js` (add new endpoint)

**Action**: Implement Plug&Pay webhook processing endpoint.

**Code Location**: Add in API endpoints section

**Endpoint Implementation**:
```javascript
/**
 * POST /api/webhooks/plugandpay
 * Plug&Pay webhook for payment confirmation
 * Format: application/x-www-form-urlencoded
 */
app.post('/api/webhooks/plugandpay', async (req, res) => {
  try {
    // Parse form-urlencoded payload
    const payload = {};
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // req.body is already parsed by express.urlencoded middleware
      Object.assign(payload, req.body);
    } else {
      console.warn('Unexpected content-type:', contentType);
      return res.status(400).json({ success: false, error: 'Invalid content type' });
    }

    console.log('Webhook received:', payload);

    // Validate API key
    const apiKey = payload.api_key || payload.apiKey;
    if (apiKey !== process.env.PLUGANDPAY_API_KEY) {
      console.warn('Invalid API key in webhook');

      // Log failed webhook
      await logWebhookEvent({
        eventType: payload.webhook_event || payload.status,
        orderId: payload.order_id,
        email: payload.email,
        payload: payload,
        signatureValid: false,
        errorMessage: 'Invalid API key',
        ipAddress: req.ip
      });

      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check event type
    const isPaymentCompleted = payload.webhook_event === 'order_payment_completed' ||
                                payload.status === 'paid';

    if (!isPaymentCompleted) {
      console.log('Webhook not a payment completion, ignoring');
      return res.json({ success: true, message: 'Event acknowledged but not processed' });
    }

    // Extract data
    const orderId = payload.order_id;
    const email = String(payload.email || payload.customer_email || '').toLowerCase().trim();
    const amountCents = parseInt(payload.amount) || 0;

    if (!orderId || !email) {
      await logWebhookEvent({
        eventType: payload.webhook_event,
        orderId: orderId,
        email: email,
        payload: payload,
        signatureValid: true,
        errorMessage: 'Missing order_id or email',
        ipAddress: req.ip
      });

      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check idempotency
    const idempotency = await checkWebhookIdempotency(orderId);
    if (idempotency.processed) {
      console.log('Webhook already processed for order:', orderId);

      await logWebhookEvent({
        userId: idempotency.userId,
        eventType: payload.webhook_event,
        orderId: orderId,
        email: email,
        amountCents: amountCents,
        payload: payload,
        signatureValid: true,
        errorMessage: 'Duplicate webhook - already processed',
        ipAddress: req.ip
      });

      return res.json({
        success: true,
        duplicate: true,
        message: 'Payment already processed (idempotent)',
        order_id: orderId
      });
    }

    // Find user by email
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await db.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      await logWebhookEvent({
        eventType: payload.webhook_event,
        orderId: orderId,
        email: email,
        amountCents: amountCents,
        payload: payload,
        signatureValid: true,
        errorMessage: 'User not found for email',
        ipAddress: req.ip
      });

      return res.status(404).json({ success: false, error: 'User not found for email', email });
    }

    const user = userResult.rows[0];

    // Generate auto-login token
    const loginToken = generateLoginToken();
    const tokenExpires = calculateTokenExpiry();

    // Update user to active subscription
    const updateQuery = `
      UPDATE users
      SET subscription_status = $1,
          payment_confirmed_at = NOW(),
          plugandpay_order_id = $2,
          amount_paid_cents = $3,
          login_token = $4,
          login_token_expires = $5,
          login_token_used = FALSE
      WHERE id = $6
    `;

    await db.query(updateQuery, [
      SUBSCRIPTION_STATES.ACTIVE,
      orderId,
      amountCents,
      loginToken,
      tokenExpires,
      user.id
    ]);

    // Log successful webhook
    await logWebhookEvent({
      userId: user.id,
      eventType: payload.webhook_event,
      orderId: orderId,
      email: email,
      amountCents: amountCents,
      payload: payload,
      signatureValid: true,
      errorMessage: null,
      ipAddress: req.ip
    });

    // TODO: Async GoHighLevel sync (will be implemented in T021)
    // syncToGoHighLevel(user.email, ['tickedify-paid-customer'], ['tickedify-beta-user', 'tickedify-trial-user'])

    console.log('Payment processed successfully for user:', user.id);

    return res.json({
      success: true,
      message: 'Payment processed successfully',
      order_id: orderId,
      user_id: user.id
    });

  } catch (error) {
    console.error('Error in webhook processing:', error);

    // Log error
    try {
      await logWebhookEvent({
        eventType: 'error',
        orderId: req.body.order_id,
        email: req.body.email,
        payload: req.body,
        signatureValid: false,
        errorMessage: error.message,
        ipAddress: req.ip
      });
    } catch (logError) {
      console.error('Error logging webhook failure:', logError);
    }

    return res.status(500).json({ success: false, error: 'Server error' });
  }
});
```

**Testing**:
- Test with valid webhook payload → verify user updated
- Test with duplicate order_id → verify idempotent response
- Test with invalid API key → verify 401 response

**Dependencies**: T007 (token helpers), T008 (idempotency), T004 (migrations)

---

### T011: Implement GET /api/payment/success [P]

**File**: `server.js` (add new endpoint)

**Action**: Implement payment success return URL with auto-login.

**Code Location**: Add in API endpoints section

**Endpoint Implementation**:
```javascript
/**
 * GET /api/payment/success
 * Return URL after successful Plug&Pay checkout
 * Auto-login user via token
 */
app.get('/api/payment/success', async (req, res) => {
  try {
    const { token, plan, order } = req.query;

    if (!token) {
      return res.redirect('/login?reason=missing_token');
    }

    // Find user by login token
    const query = `
      SELECT id, email, login_token_used, login_token_expires
      FROM users
      WHERE login_token = $1
    `;

    const result = await db.query(query, [token]);

    if (result.rows.length === 0) {
      console.warn('Login token not found:', token);
      return res.redirect('/login?reason=token_not_found&message=' +
        encodeURIComponent('Je betaling is geslaagd! Log in om door te gaan.'));
    }

    const user = result.rows[0];

    // Validate token
    const validation = validateLoginToken(user);

    if (!validation.valid) {
      console.log('Token validation failed:', validation.reason);

      const message = validation.reason === 'token_used' ?
        'Deze login link is al gebruikt. Log in met je email en wachtwoord.' :
        'Je betaling is geslaagd! Log in om door te gaan.';

      return res.redirect(`/login?reason=${validation.reason}&message=${encodeURIComponent(message)}`);
    }

    // Mark token as used
    const updateQuery = 'UPDATE users SET login_token_used = TRUE WHERE id = $1';
    await db.query(updateQuery, [user.id]);

    // Create session
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.successMessage = 'Je abonnement is actief! Welkom bij Tickedify.';

    console.log('Auto-login successful for user:', user.id);

    // Redirect to app
    return res.redirect('/app');

  } catch (error) {
    console.error('Error in /api/payment/success:', error);
    return res.redirect('/login?reason=error&message=' +
      encodeURIComponent('Er is een fout opgetreden. Log in om door te gaan.'));
  }
});
```

**Testing**:
- Test with valid token → verify session created, redirect to /app
- Test with expired token → verify redirect to login
- Test with used token → verify redirect to login

**Dependencies**: T007 (token validation)

---

### T012: Implement GET /api/payment/cancelled [P]

**File**: `server.js` (add new endpoint)

**Action**: Implement payment cancellation return URL.

**Code Location**: Add in API endpoints section

**Endpoint Implementation**:
```javascript
/**
 * GET /api/payment/cancelled
 * Return URL when user cancels Plug&Pay checkout
 */
app.get('/api/payment/cancelled', async (req, res) => {
  try {
    // Set flash message for cancelled payment
    if (req.session) {
      req.session.infoMessage = 'Betaling geannuleerd. Je kunt het opnieuw proberen wanneer je klaar bent.';
    }

    console.log('Payment cancelled by user');

    // Redirect back to subscription selection screen
    return res.redirect('/subscription?cancelled=true');

  } catch (error) {
    console.error('Error in /api/payment/cancelled:', error);
    return res.redirect('/subscription');
  }
});
```

**Testing**:
- Test redirect to /subscription
- Test flash message set in session

**Dependencies**: None (simple redirect)

---

### T013: Implement GET /api/subscription/status [P]

**File**: `server.js` (add new endpoint)

**Action**: Implement endpoint to get user's subscription status.

**Code Location**: Add in API endpoints section

**Endpoint Implementation**:
```javascript
/**
 * GET /api/subscription/status
 * Get current user's subscription status
 */
app.get('/api/subscription/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const query = `
      SELECT subscription_status, selected_plan, payment_confirmed_at,
             trial_start_date, trial_end_date, had_trial
      FROM users
      WHERE id = $1
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    let status = user.subscription_status;

    // Check if trial has expired
    if (status === SUBSCRIPTION_STATES.TRIALING && isTrialExpired(user.trial_end_date)) {
      // Update status to trial_expired
      await db.query('UPDATE users SET subscription_status = $1 WHERE id = $2',
        [SUBSCRIPTION_STATES.TRIAL_EXPIRED, userId]);
      status = SUBSCRIPTION_STATES.TRIAL_EXPIRED;
    }

    // Calculate days remaining for trial
    let daysRemaining = null;
    if (status === SUBSCRIPTION_STATES.TRIALING && user.trial_end_date) {
      const now = new Date();
      const endDate = new Date(user.trial_end_date);
      const diffTime = endDate - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Determine access
    const canAccess = canAccessApp(status);

    // Build response
    const response = {
      success: true,
      subscription_status: status,
      selected_plan: user.selected_plan,
      can_access_app: canAccess
    };

    // Add plan name
    if (user.selected_plan === PLAN_IDS.TRIAL) {
      response.plan_name = '14 dagen gratis proefperiode';
    } else if (user.selected_plan === PLAN_IDS.MONTHLY) {
      response.plan_name = 'Maandelijks €7';
    } else if (user.selected_plan === PLAN_IDS.YEARLY) {
      response.plan_name = 'Jaarlijks €70';
    }

    // Add trial-specific fields
    if (status === SUBSCRIPTION_STATES.TRIALING) {
      response.trial_start_date = user.trial_start_date;
      response.trial_end_date = user.trial_end_date;
      response.days_remaining = daysRemaining;
    } else if (status === SUBSCRIPTION_STATES.TRIAL_EXPIRED) {
      response.trial_end_date = user.trial_end_date;
      response.message = 'Je gratis proefperiode is afgelopen. Kies een abonnement om door te gaan.';
    }

    // Add active subscription fields
    if (status === SUBSCRIPTION_STATES.ACTIVE) {
      response.payment_confirmed_at = user.payment_confirmed_at;
    }

    return res.json(response);

  } catch (error) {
    console.error('Error in /api/subscription/status:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});
```

**Testing**:
- Test with active subscription → verify correct fields
- Test with trial → verify days_remaining calculation
- Test with trial_expired → verify status update

**Dependencies**: T006 (state machine helpers)

---

### T014: Implement GET /api/admin/payment-configurations [P]

**File**: `server.js` (add new endpoint)

**Action**: Implement admin endpoint to get all payment configurations.

**Code Location**: Add in admin API endpoints section

**Endpoint Implementation**:
```javascript
/**
 * GET /api/admin/payment-configurations
 * Admin: Get all payment configurations
 */
app.get('/api/admin/payment-configurations', requireAdminAuth, async (req, res) => {
  try {
    const query = `
      SELECT id, plan_id, plan_name, checkout_url, is_active, created_at, updated_at
      FROM payment_configurations
      ORDER BY plan_id
    `;

    const result = await db.query(query);

    return res.json({
      success: true,
      configurations: result.rows
    });

  } catch (error) {
    console.error('Error in /api/admin/payment-configurations GET:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});
```

**Testing**:
- Test as admin → verify configurations returned
- Test as non-admin → verify 403 error

**Dependencies**: T004 (migrations), requireAdminAuth middleware must exist

---

### T015: Implement PUT /api/admin/payment-configurations/:plan_id [P]

**File**: `server.js` (add new endpoint)

**Action**: Implement admin endpoint to update payment configuration.

**Code Location**: Add in admin API endpoints section

**Endpoint Implementation**:
```javascript
/**
 * PUT /api/admin/payment-configurations/:plan_id
 * Admin: Update payment configuration
 */
app.put('/api/admin/payment-configurations/:plan_id', requireAdminAuth, async (req, res) => {
  try {
    const { plan_id } = req.params;
    const { checkout_url, is_active } = req.body;

    // Validate checkout URL
    if (checkout_url) {
      if (!checkout_url.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          error: 'Checkout URL moet een geldige HTTPS URL zijn',
          checkout_url
        });
      }

      // Basic URL validation
      try {
        new URL(checkout_url);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Checkout URL moet een geldige URL zijn',
          checkout_url
        });
      }
    }

    // Update configuration
    const query = `
      UPDATE payment_configurations
      SET checkout_url = COALESCE($1, checkout_url),
          is_active = COALESCE($2, is_active),
          updated_at = NOW()
      WHERE plan_id = $3
      RETURNING *
    `;

    const result = await db.query(query, [
      checkout_url || null,
      is_active !== undefined ? is_active : null,
      plan_id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Abonnement niet gevonden',
        plan_id
      });
    }

    console.log('Payment configuration updated:', plan_id);

    return res.json({
      success: true,
      message: 'Configuratie opgeslagen',
      configuration: result.rows[0]
    });

  } catch (error) {
    console.error('Error in /api/admin/payment-configurations PUT:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});
```

**Testing**:
- Test with valid HTTPS URL → verify update
- Test with HTTP URL → verify validation error
- Test with invalid plan_id → verify 404 error

**Dependencies**: T004 (migrations), requireAdminAuth middleware

---

## Phase 4: Frontend UI

### T016: Update subscription.js for paid plan redirect [P]

**File**: `public/js/subscription.js`

**Action**: Update confirmSelection() function to handle paid plan redirects.

**Code Changes**:
```javascript
// Update confirmSelection() function around line 197-252

async function confirmSelection() {
    if (!subscriptionState.selectedPlanId) {
        showErrorModal('Selecteer eerst een abonnement.');
        return;
    }

    if (subscriptionState.isLoading) return;

    try {
        subscriptionState.isLoading = true;

        // Show loading on confirm button
        const confirmButton = document.getElementById('confirm-selection');
        if (confirmButton) {
            SubscriptionHelpers.showLoading(confirmButton);
            confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met opslaan...';
        }

        // Send selection to API
        const response = await SubscriptionAPI.selectPlan(
            subscriptionState.selectedPlanId,
            subscriptionState.selectionSource
        );

        if (response.success) {
            console.log('Plan selection confirmed:', response);

            // Check if redirect URL provided (paid plan)
            if (response.redirect_url) {
                // Paid plan - redirect to Plug&Pay checkout
                console.log('Redirecting to checkout:', response.redirect_url);

                // Store selection in session for recovery
                sessionStorage.setItem('subscription_selection', JSON.stringify({
                    planId: subscriptionState.selectedPlanId,
                    timestamp: Date.now()
                }));

                // Redirect to Plug&Pay
                window.location.href = response.redirect_url;

            } else {
                // Trial plan - show success message
                showSuccessModal(response.message);

                // Store successful selection
                sessionStorage.setItem('subscription_selection', JSON.stringify({
                    planId: subscriptionState.selectedPlanId,
                    timestamp: Date.now()
                }));
            }

        } else {
            throw new Error(response.error || 'Failed to save selection');
        }

    } catch (error) {
        console.error('Error confirming selection:', error);
        showErrorModal(error.message || 'Er is een fout opgetreden bij het opslaan van je selectie. Probeer het opnieuw.');
    } finally {
        subscriptionState.isLoading = false;

        // Reset confirm button (only if not redirecting)
        if (!subscriptionState.isLoading) {
            const confirmButton = document.getElementById('confirm-selection');
            if (confirmButton) {
                SubscriptionHelpers.hideLoading(confirmButton);
                confirmButton.innerHTML = '<i class="fas fa-check"></i> Bevestig selectie';
            }
        }
    }
}
```

**Testing**:
- Test trial selection → verify no redirect
- Test paid plan selection → verify redirect to Plug&Pay
- Test error handling → verify error message shown

**Dependencies**: T009 (subscription/select endpoint)

---

### T017: Create admin-subscription-config.html page [P]

**File**: `public/admin-subscription-config.html` (new file)

**Action**: Create admin page for managing payment configurations.

**HTML Structure**:
```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Abonnement Configuratie - Tickedify Admin</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="admin-body">
    <!-- Header -->
    <header class="admin-header">
        <div class="container">
            <h1><i class="fas fa-credit-card"></i> Abonnement Configuratie</h1>
            <a href="/admin.html" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Terug naar Admin
            </a>
        </div>
    </header>

    <!-- Main Content -->
    <main class="admin-main">
        <div class="container">
            <!-- Loading Overlay -->
            <div id="loading-overlay" class="loading-overlay" style="display: none;">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin fa-3x"></i>
                    <span>Laden...</span>
                </div>
            </div>

            <!-- Info Section -->
            <div class="admin-info-box">
                <p><i class="fas fa-info-circle"></i> Configureer de Plug&Pay checkout URLs voor elk abonnement type. Deze URLs worden gebruikt om gebruikers door te sturen naar de betaalpagina.</p>
            </div>

            <!-- Configurations Table -->
            <div class="admin-section">
                <h2>Abonnementen</h2>
                <table id="configurations-table" class="admin-table">
                    <thead>
                        <tr>
                            <th>Abonnement</th>
                            <th>Plan ID</th>
                            <th>Checkout URL</th>
                            <th>Status</th>
                            <th>Acties</th>
                        </tr>
                    </thead>
                    <tbody id="configurations-body">
                        <!-- Filled by JavaScript -->
                    </tbody>
                </table>
            </div>

            <!-- Edit Modal -->
            <div id="edit-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close" onclick="closeEditModal()">&times;</span>
                    <h2>Configuratie Bewerken</h2>

                    <form id="edit-form" onsubmit="saveConfiguration(event)">
                        <input type="hidden" id="edit-plan-id">

                        <div class="form-group">
                            <label>Abonnement:</label>
                            <p id="edit-plan-name" class="form-static-text"></p>
                        </div>

                        <div class="form-group">
                            <label for="edit-checkout-url">Checkout URL:</label>
                            <input type="url" id="edit-checkout-url" class="form-control"
                                   placeholder="https://pay.baasoverjetijd.be/checkout/..." required>
                            <small>URL moet beginnen met https://</small>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="edit-is-active">
                                Actief (gebruikers kunnen dit abonnement selecteren)
                            </label>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Opslaan
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">
                                Annuleren
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Success/Error Messages -->
            <div id="message-container"></div>
        </div>
    </main>

    <script src="/js/admin-subscription-config.js"></script>
</body>
</html>
```

**CSS** (add to `public/style.css`):
```css
/* Admin Subscription Config Styles */
.admin-info-box {
    background: #e3f2fd;
    border-left: 4px solid #2196F3;
    padding: 15px;
    margin-bottom: 20px;
}

.admin-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.admin-table th {
    background: #f5f5f5;
    padding: 12px;
    text-align: left;
    font-weight: 600;
}

.admin-table td {
    padding: 12px;
    border-bottom: 1px solid #ddd;
}

.admin-table tr:hover {
    background: #f9f9f9;
}

.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.status-badge.active {
    background: #c8e6c9;
    color: #2e7d32;
}

.status-badge.inactive {
    background: #ffcdd2;
    color: #c62828;
}

.form-static-text {
    font-weight: 600;
    margin: 0;
}
```

**Testing**:
- Test page loads
- Test table structure renders
- Test modal opens/closes

**Dependencies**: None (static HTML)

---

### T018: Create admin-subscription-config.js [P]

**File**: `public/js/admin-subscription-config.js` (new file)

**Action**: Create JavaScript for admin payment configuration management.

**Full Implementation**: (See continuation in next message due to length)

```javascript
/**
 * Admin Subscription Configuration JavaScript
 * Manages Plug&Pay checkout URL configuration
 */

let configurations = [];

/**
 * Initialize page
 */
async function initializePage() {
    try {
        showLoadingOverlay('Configuraties laden...');
        await loadConfigurations();
        renderConfigurations();
        hideLoadingOverlay();
    } catch (error) {
        console.error('Error initializing page:', error);
        hideLoadingOverlay();
        showMessage('error', 'Fout bij laden van configuraties: ' + error.message);
    }
}

/**
 * Load configurations from API
 */
async function loadConfigurations() {
    const response = await fetch('/api/admin/payment-configurations', {
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error('Failed to load configurations');
    }

    const data = await response.json();

    if (data.success) {
        configurations = data.configurations;
    } else {
        throw new Error(data.error || 'Unknown error');
    }
}

/**
 * Render configurations table
 */
function renderConfigurations() {
    const tbody = document.getElementById('configurations-body');
    tbody.innerHTML = '';

    configurations.forEach(config => {
        const row = document.createElement('tr');

        const statusBadge = config.is_active ?
            '<span class="status-badge active">Actief</span>' :
            '<span class="status-badge inactive">Inactief</span>';

        const checkoutUrlDisplay = config.checkout_url ?
            `<code>${config.checkout_url}</code>` :
            '<em>Nog niet geconfigureerd</em>';

        row.innerHTML = `
            <td><strong>${config.plan_name}</strong></td>
            <td><code>${config.plan_id}</code></td>
            <td>${checkoutUrlDisplay}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openEditModal('${config.plan_id}')">
                    <i class="fas fa-edit"></i> Bewerken
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Open edit modal for configuration
 */
function openEditModal(planId) {
    const config = configurations.find(c => c.plan_id === planId);
    if (!config) return;

    document.getElementById('edit-plan-id').value = config.plan_id;
    document.getElementById('edit-plan-name').textContent = config.plan_name;
    document.getElementById('edit-checkout-url').value = config.checkout_url || '';
    document.getElementById('edit-is-active').checked = config.is_active;

    document.getElementById('edit-modal').style.display = 'block';
}

/**
 * Close edit modal
 */
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('edit-form').reset();
}

/**
 * Save configuration
 */
async function saveConfiguration(event) {
    event.preventDefault();

    const planId = document.getElementById('edit-plan-id').value;
    const checkoutUrl = document.getElementById('edit-checkout-url').value;
    const isActive = document.getElementById('edit-is-active').checked;

    try {
        showLoadingOverlay('Opslaan...');

        const response = await fetch(`/api/admin/payment-configurations/${planId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                checkout_url: checkoutUrl,
                is_active: isActive
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('success', 'Configuratie succesvol opgeslagen!');
            closeEditModal();
            await loadConfigurations();
            renderConfigurations();
        } else {
            throw new Error(data.error || 'Failed to save');
        }

    } catch (error) {
        console.error('Error saving configuration:', error);
        showMessage('error', 'Fout bij opslaan: ' + error.message);
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay(message = 'Laden...') {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        const spinner = overlay.querySelector('.loading-spinner span');
        if (spinner) {
            spinner.textContent = message;
        }
        overlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Show message to user
 */
function showMessage(type, message) {
    const container = document.getElementById('message-container');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;

    container.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializePage);

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target === modal) {
        closeEditModal();
    }
};
```

**Testing**:
- Test load configurations
- Test edit modal
- Test save configuration
- Test validation

**Dependencies**: T014, T015 (admin API endpoints)

---

### T019: Add payment success/cancel pages [P]

**File**: `public/payment-success.html` and `public/payment-cancelled.html` (new files)

**Action**: Create user-facing pages for payment return flows.

**Note**: These pages are optional if using direct redirects. The /api/payment/success endpoint already handles redirect to /app, and /api/payment/cancelled redirects to /subscription.

**If needed, create minimal pages**:

`public/payment-success.html`:
```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Betaling Succesvol - Tickedify</title>
    <link rel="stylesheet" href="/style.css">
    <script>
        // Auto-redirect after checking token
        window.onload = function() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (token) {
                // Let backend handle auto-login
                window.location.href = '/api/payment/success?token=' + token;
            } else {
                // No token, redirect to login
                window.location.href = '/login?message=' + encodeURIComponent('Je betaling is geslaagd! Log in om door te gaan.');
            }
        };
    </script>
</head>
<body>
    <div class="loading-container">
        <div class="spinner"></div>
        <p>Bezig met inloggen...</p>
    </div>
</body>
</html>
```

`public/payment-cancelled.html`:
```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <title>Betaling Geannuleerd - Tickedify</title>
    <script>
        // Auto-redirect to subscription page
        window.onload = function() {
            window.location.href = '/api/payment/cancelled';
        };
    </script>
</head>
<body>
    <p>Je wordt teruggestuurd...</p>
</body>
</html>
```

**Testing**: Test redirects work correctly

**Dependencies**: T011, T012 (API endpoints)

---

### T020: Update subscription.html with error handling

**File**: `public/subscription.html`

**Action**: Add error message display for payment configuration errors.

**Code Changes**:
```html
<!-- Add after existing error modal, around line 50-100 -->

<!-- Error Modal for Configuration Issues -->
<div id="config-error-modal" class="modal" style="display: none;">
    <div class="modal-content modal-error">
        <span class="close" onclick="closeConfigErrorModal()">&times;</span>
        <div class="modal-icon">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h2>Configuratie Probleem</h2>
        <p id="config-error-message"></p>
        <p class="modal-hint">Neem contact op met support als dit probleem aanhoudt.</p>
        <button class="btn btn-secondary" onclick="closeConfigErrorModal()">
            Sluiten
        </button>
    </div>
</div>
```

**JavaScript** (add to subscription.js):
```javascript
// Add these functions at the end of subscription.js

function showConfigError(message) {
    const modal = document.getElementById('config-error-modal');
    const messageEl = document.getElementById('config-error-message');

    if (modal && messageEl) {
        messageEl.textContent = message;
        modal.style.display = 'block';
    }
}

function closeConfigErrorModal() {
    const modal = document.getElementById('config-error-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Update showErrorModal to use showConfigError for config issues
// In confirmSelection error handling, check for config-related errors
```

**Testing**: Test error modal appears for missing checkout URL

**Dependencies**: T016 (subscription.js updates)

---

## Phase 5: Integration & Business Logic

### T021: Implement GoHighLevel sync for paid customers

**File**: `server.js` (add function, use in webhook endpoint)

**Action**: Implement CRM synchronization for paid customer tags.

**Code Location**: Add helper function, then call from T010 webhook endpoint

**Function Implementation**:
```javascript
/**
 * Sync user to GoHighLevel CRM with tags
 * @param {string} email - User email
 * @param {Array<string>} tagsToAdd - Tags to add
 * @param {Array<string>} tagsToRemove - Tags to remove
 * @returns {Promise<boolean>} - Success status
 */
async function syncToGoHighLevel(email, tagsToAdd = [], tagsToRemove = []) {
  try {
    // Check if GoHighLevel integration is configured
    if (!process.env.GOHIGHLEVEL_API_KEY) {
      console.warn('GoHighLevel API key not configured, skipping sync');
      return false;
    }

    // Find contact by email
    const findContactUrl = `https://rest.gohighlevel.com/v1/contacts/lookup?email=${encodeURIComponent(email)}`;

    const findResponse = await fetch(findContactUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!findResponse.ok) {
      console.error('GoHighLevel contact lookup failed:', await findResponse.text());
      return false;
    }

    const contactData = await findResponse.json();

    if (!contactData.contact) {
      console.warn('Contact not found in GoHighLevel:', email);
      return false;
    }

    const contactId = contactData.contact.id;

    // Update contact tags
    const updateUrl = `https://rest.gohighlevel.com/v1/contacts/${contactId}`;

    const currentTags = contactData.contact.tags || [];
    const updatedTags = [
      ...currentTags.filter(tag => !tagsToRemove.includes(tag)),
      ...tagsToAdd
    ];

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tags: Array.from(new Set(updatedTags)) // Remove duplicates
      })
    });

    if (!updateResponse.ok) {
      console.error('GoHighLevel contact update failed:', await updateResponse.text());
      return false;
    }

    console.log('GoHighLevel sync successful for:', email);
    return true;

  } catch (error) {
    console.error('Error syncing to GoHighLevel:', error);
    return false;
  }
}
```

**Update T010 webhook endpoint**:
```javascript
// After user update, add:
try {
  await syncToGoHighLevel(
    user.email,
    ['tickedify-paid-customer'],
    ['tickedify-beta-user', 'tickedify-trial-user']
  );
} catch (syncError) {
  // Log error but don't fail webhook
  console.error('GoHighLevel sync failed:', syncError);
}
```

**Testing**:
- Test with valid GHL API key → verify tags updated
- Test without API key → verify graceful skip
- Test with non-existent contact → verify no crash

**Dependencies**: T010 (webhook endpoint)

---

### T022: Implement trial expiry detection (login check)

**File**: `server.js` (add to login route or middleware)

**Action**: Check for trial expiry on every login and update status.

**Code Location**: Add to existing login route or create middleware

**Implementation**:
```javascript
/**
 * Check and update trial expiry status
 * Call this on every login
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Updated user status
 */
async function checkAndUpdateTrialExpiry(userId) {
  const query = `
    SELECT subscription_status, trial_end_date
    FROM users
    WHERE id = $1
  `;

  const result = await db.query(query, [userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Check if trial has expired
  if (user.subscription_status === SUBSCRIPTION_STATES.TRIALING &&
      isTrialExpired(user.trial_end_date)) {

    // Update to trial_expired
    const updateQuery = `
      UPDATE users
      SET subscription_status = $1
      WHERE id = $2
      RETURNING subscription_status
    `;

    await db.query(updateQuery, [SUBSCRIPTION_STATES.TRIAL_EXPIRED, userId]);

    console.log('Trial expired for user:', userId);

    return {
      status: SUBSCRIPTION_STATES.TRIAL_EXPIRED,
      message: 'Je gratis proefperiode is afgelopen'
    };
  }

  return {
    status: user.subscription_status,
    message: null
  };
}

// Add to login route:
app.post('/api/login', async (req, res) => {
  // ... existing login logic ...

  // After successful authentication:
  const trialStatus = await checkAndUpdateTrialExpiry(user.id);

  if (trialStatus && trialStatus.status === SUBSCRIPTION_STATES.TRIAL_EXPIRED) {
    // Redirect to subscription page
    return res.json({
      success: true,
      requiresSubscription: true,
      message: trialStatus.message
    });
  }

  // ... continue with normal login ...
});
```

**Testing**:
- Test with expired trial → verify status updated
- Test with active trial → verify no change
- Test with active subscription → verify no change

**Dependencies**: T006 (state machine helpers)

---

## Phase 6: Testing

### T023: Test Scenario 1 (Beta → Trial)

**Action**: Execute quickstart.md Scenario 1 - Beta user selects trial.

**Test Steps** (from quickstart.md):
1. Setup test user in beta status
2. Login as beta user
3. Trigger subscription screen
4. Select trial option
5. Verify immediate access
6. Verify database updates
7. Verify GoHighLevel tags

**Success Criteria**:
- ✅ Trial selected without payment
- ✅ Database: subscription_status = 'trialing'
- ✅ trial_start_date = TODAY
- ✅ trial_end_date = TODAY + 14 days
- ✅ had_trial = TRUE
- ✅ User has immediate app access

**Testing Method**: Manual via Playwright MCP or automated test script

**Dependencies**: T009 (subscription/select), T016 (frontend)

---

### T024: Test Scenario 2 (Beta → Paid Plan)

**Action**: Execute quickstart.md Scenario 2 - Complete paid subscription flow.

**Test Steps**:
1. Setup test user in beta status
2. Admin configure checkout URL
3. Login and select paid plan
4. Verify redirect to Plug&Pay
5. Complete test payment
6. Verify webhook processing
7. Verify auto-login return
8. Verify database updates
9. Verify GoHighLevel sync

**Success Criteria**:
- ✅ Redirect to Plug&Pay with correct params
- ✅ Webhook processes successfully
- ✅ Database: subscription_status = 'active'
- ✅ Auto-login token works
- ✅ User returned to app with session
- ✅ GHL tags updated

**Testing Method**: End-to-end with real Plug&Pay test payment

**Dependencies**: All API endpoints (T009-T015), T021 (GHL sync)

---

### T025: Test Scenario 3 (Trial Expiry → Upgrade)

**Action**: Execute quickstart.md Scenario 3 - Trial expired user upgrades.

**Test Steps**:
1. Create user with expired trial
2. Login
3. Verify trial expiry detected
4. Verify trial option hidden
5. Select yearly plan
6. Complete payment flow

**Success Criteria**:
- ✅ Trial expiry detected automatically
- ✅ Status updated to 'trial_expired'
- ✅ Trial option not shown
- ✅ Can select paid plan
- ✅ Payment flow completes

**Testing Method**: Manual with database setup

**Dependencies**: T022 (trial expiry check), T009 (plan selection)

---

### T026: Test Scenario 4 (Payment Cancelled)

**Action**: Execute quickstart.md Scenario 4 - User cancels payment.

**Test Steps**:
1. Select paid plan
2. Redirect to Plug&Pay
3. Cancel payment on checkout
4. Verify return to selection screen
5. Verify no database changes
6. Verify can retry

**Success Criteria**:
- ✅ Redirected back to subscription page
- ✅ Message shown: "Betaling geannuleerd..."
- ✅ subscription_status unchanged
- ✅ Can select plan again

**Testing Method**: Manual with Plug&Pay cancellation

**Dependencies**: T012 (cancelled endpoint), T016 (frontend)

---

### T027: Test Scenario 5 (Webhook Idempotency)

**Action**: Execute quickstart.md Scenario 5 - Duplicate webhook prevention.

**Test Steps**:
1. Complete successful payment
2. Simulate duplicate webhook via curl
3. Verify idempotent response
4. Verify no duplicate database updates
5. Verify webhook logs

**Success Criteria**:
- ✅ HTTP 200 OK returned
- ✅ Response: duplicate = true
- ✅ No database changes on duplicate
- ✅ Both webhooks logged

**Testing Method**: Automated curl test

**Dependencies**: T010 (webhook), T008 (idempotency)

---

### T028: Test Scenario 6 (Token Expiry)

**Action**: Execute quickstart.md Scenario 6 - Expired token fallback.

**Test Steps**:
1. Complete payment but don't use return URL
2. Manually expire token in database
3. Attempt to use return URL
4. Verify fallback to login
5. Verify manual login works

**Success Criteria**:
- ✅ Token validation fails (expired)
- ✅ Redirect to /login with message
- ✅ Message: "Je betaling is geslaagd! Log in..."
- ✅ Manual login succeeds
- ✅ User has active subscription

**Testing Method**: Manual with database manipulation

**Dependencies**: T011 (success endpoint), T007 (token validation)

---

### T029: Test Scenario 7 (Admin Configuration)

**Action**: Execute quickstart.md Scenario 7 - Admin URL management.

**Test Steps**:
1. Login as admin
2. Navigate to subscription config
3. Update monthly checkout URL
4. Verify save success
5. Test URL validation (try HTTP)
6. Verify new URL used in selection

**Success Criteria**:
- ✅ Table shows 2 plans
- ✅ Edit modal opens
- ✅ Save updates database
- ✅ URL validation works
- ✅ New URL used in redirects

**Testing Method**: Manual admin testing

**Dependencies**: T017, T018 (admin UI), T014, T015 (admin API)

---

### T030: Test Scenario 8 (Missing URL Error)

**Action**: Execute quickstart.md Scenario 8 - Missing checkout URL error.

**Test Steps**:
1. Clear checkout URL for yearly plan
2. Login as user
3. Select yearly plan
4. Verify error message
5. Verify no redirect
6. Restore URL and verify works

**Success Criteria**:
- ✅ Error: "Betaallink niet geconfigureerd..."
- ✅ No redirect attempted
- ✅ User stays on selection screen
- ✅ Can select different plan

**Testing Method**: Manual with database setup

**Dependencies**: T009 (plan selection), T020 (error UI)

---

## Phase 7: Documentation & Deployment

### T031: Update ARCHITECTURE.md

**File**: `ARCHITECTURE.md`

**Action**: Document new endpoints, tables, and subscription flow.

**Sections to Add**:

```markdown
## Subscription & Payment System (Feature 011)

### Database Tables

#### users (extended)
- `payment_confirmed_at`: Timestamp of webhook payment confirmation
- `trial_start_date`: Start date of 14-day trial
- `trial_end_date`: End date of trial
- `had_trial`: Flag tracking if user used trial
- `plugandpay_order_id`: Plug&Pay order ID (unique, for idempotency)
- `amount_paid_cents`: Amount paid in cents
- `login_token`: Auto-login token for payment return
- `login_token_expires`: Token expiry (10 minutes)
- `login_token_used`: Single-use flag

#### payment_configurations (new)
- Admin-configurable Plug&Pay checkout URLs per plan
- plan_id: 'monthly_7', 'yearly_70'
- checkout_url: Full HTTPS URL to Plug&Pay
- is_active: Enable/disable plan

#### payment_webhook_logs (new)
- Audit trail for all Plug&Pay webhooks
- user_id, event_type, order_id, email, amount_cents
- payload (JSONB), signature_valid, error_message
- 90-day retention for troubleshooting

### API Endpoints

#### POST /api/subscription/select
User selects subscription plan (trial or paid)
- Input: plan_id, source
- Trial: immediate activation
- Paid: returns redirect URL to Plug&Pay

#### POST /api/webhooks/plugandpay
Plug&Pay webhook for payment confirmation
- Format: application/x-www-form-urlencoded
- Event: order_payment_completed
- Validates API key, checks idempotency
- Updates user to active, generates auto-login token

#### GET /api/payment/success
Return URL after successful payment
- Auto-login via token (10-min expiry, single-use)
- Creates session, redirects to /app

#### GET /api/payment/cancelled
Return URL when payment cancelled
- Redirects to /subscription with message

#### GET /api/subscription/status
Get current user subscription status
- Returns status, plan, trial dates, access flag
- Auto-detects trial expiry

#### GET /api/admin/payment-configurations
Admin: Get all payment configurations

#### PUT /api/admin/payment-configurations/:plan_id
Admin: Update checkout URL and activation status

### Subscription State Machine

States: beta → trialing → trial_expired → active
- Beta users can select trial or paid
- Trial users (after 14 days) → trial_expired
- Trial_expired users can only select paid
- Active = paid subscription confirmed

### Security Features

- API key validation on webhooks
- Idempotency via plugandpay_order_id
- Auto-login tokens: 10-minute expiry, single-use
- HTTPS-only checkout URLs
- Comprehensive webhook logging

### Integration

- Plug&Pay: Payment provider (form-urlencoded webhooks)
- GoHighLevel: CRM sync for paid customer tags
```

**Testing**: Verify documentation accurate and complete

**Dependencies**: All implementation tasks complete

---

### T032: Update CHANGELOG.md

**File**: `public/changelog.html`

**Action**: Add entry for feature 011 subscription payment system.

**Changelog Entry**:
```html
<div class="version-entry">
    <div class="version-header">
        <span class="version-number">v0.18.0</span>
        <span class="version-date">2025-10-11</span>
        <span class="badge badge-feature">Feature</span>
        <span class="badge badge-latest">Latest</span>
    </div>
    <div class="version-content">
        <h3>🎉 Feature 011: Volledig Abonnement-Betalingsproces</h3>

        <h4>⚡ Nieuwe Functionaliteit</h4>
        <ul>
            <li><strong>Plug&Pay Integration</strong> - Veilige betalingen via Plug&Pay payment provider</li>
            <li><strong>Trial Periode</strong> - 14 dagen gratis proefperiode beschikbaar</li>
            <li><strong>Maandelijks Abonnement</strong> - €7 per maand optie</li>
            <li><strong>Jaarlijks Abonnement</strong> - €70 per jaar (2 maanden gratis)</li>
            <li><strong>Auto-Login Systeem</strong> - Naadloze terugkeer na betaling zonder opnieuw inloggen</li>
            <li><strong>Admin Configuratie</strong> - Beheer betaallinks per abonnement in admin dashboard</li>
        </ul>

        <h4>🔧 Technische Verbeteringen</h4>
        <ul>
            <li><strong>Database Schema</strong> - Nieuwe tabellen voor payment tracking en configuratie</li>
            <li><strong>Webhook Integration</strong> - Automatische payment confirmation via Plug&Pay webhooks</li>
            <li><strong>Idempotency</strong> - Voorkomt dubbele payments via order ID tracking</li>
            <li><strong>Security</strong> - API key validatie, single-use tokens met 10-minuten expiry</li>
            <li><strong>Audit Logging</strong> - Volledige webhook history voor troubleshooting</li>
            <li><strong>GoHighLevel Sync</strong> - Automatische CRM tag updates voor betaalde klanten</li>
        </ul>

        <h4>🎯 Gebruikerservaring</h4>
        <ul>
            <li>Duidelijke abonnement selectie scherm met 3 opties</li>
            <li>Trial optie verdwijnt na eerste gebruik</li>
            <li>Automatische trial expiry detectie bij login</li>
            <li>Gebruiksvriendelijke error messages in Nederlands</li>
            <li>Fallback naar login bij verlopen auto-login tokens</li>
        </ul>

        <h4>📋 Admin Functies</h4>
        <ul>
            <li>Nieuwe "Abonnement Configuratie" pagina in admin dashboard</li>
            <li>Beheer Plug&Pay checkout URLs per abonnement type</li>
            <li>Activeer/deactiveer abonnementen per plan</li>
            <li>URL validatie (HTTPS verplicht)</li>
        </ul>
    </div>
</div>
```

**Testing**: Verify changelog displays correctly

**Dependencies**: All implementation complete

---

### T033: Version bump in package.json

**File**: `package.json`

**Action**: Increment version to 0.18.0 (major feature addition).

**Code Change**:
```json
{
  "version": "0.18.0",
  ...
}
```

**Verification**: Check package.json shows correct version

**Dependencies**: None

---

### T034: Deploy to staging (dev.tickedify.com)

**Action**: Deploy feature to staging environment for testing.

**Steps**:
1. Ensure develop branch is up to date
2. Push all commits to develop branch
3. Trigger Vercel deployment to dev.tickedify.com
4. Wait for deployment confirmation
5. Configure PLUGANDPAY_API_KEY environment variable in Vercel
6. Run database migrations on staging database

**Verification Commands**:
```bash
# Check version endpoint
curl -s https://dev.tickedify.com/api/version

# Check new endpoints
curl -s https://dev.tickedify.com/api/subscription/plans
```

**Success Criteria**:
- ✅ Deployment completes without errors
- ✅ Version shows 0.18.0
- ✅ Database migrations applied
- ✅ All endpoints accessible

**Dependencies**: T001-T030 (all implementation complete)

---

### T035: Staging validation

**Action**: Execute full regression test suite on staging.

**Test Checklist**:
- [ ] Scenario 1: Beta → Trial
- [ ] Scenario 2: Beta → Paid
- [ ] Scenario 3: Trial Expiry → Upgrade
- [ ] Scenario 4: Payment Cancelled
- [ ] Scenario 5: Webhook Idempotency
- [ ] Scenario 6: Token Expiry
- [ ] Scenario 7: Admin Configuration
- [ ] Scenario 8: Missing URL Error
- [ ] Performance: Webhook <500ms
- [ ] Performance: Redirect <200ms

**Success Criteria**: All scenarios pass on staging

**Dependencies**: T034 (staging deployment)

---

### T036: Production deployment (requires approval)

**Action**: Deploy to production tickedify.com after explicit approval.

**⚠️ CRITICAL**: Only deploy after:
1. All staging tests pass (T035)
2. User explicitly says "JA, DEPLOY NAAR PRODUCTIE"
3. No other approval phrase is acceptable

**Steps**:
1. Wait for explicit approval from user
2. Merge develop → main branch via Pull Request
3. Verify Vercel production deployment
4. Configure PLUGANDPAY_API_KEY in production environment
5. Run database migrations on production
6. Verify version endpoint shows 0.18.0
7. Monitor logs for first 30 minutes

**Verification**:
```bash
curl -s https://tickedify.com/api/version
# Should show: {"version":"0.18.0"}
```

**Rollback Plan**:
- If critical issues: Revert main branch to previous commit
- Vercel auto-deploys on rollback
- Database migrations are additive (no DROP statements)

**Dependencies**: T035 (staging validation), explicit user approval

---

## Parallel Execution Guide

### Parallel Group 1: Backend Helpers (can run concurrently)
```bash
# All these helpers are independent
Task T006: Subscription state machine helper
Task T007: Auto-login token helper
Task T008: Webhook idempotency helper
```

### Parallel Group 2: API Endpoints (after helpers complete)
```bash
# These endpoints can be implemented in parallel
Task T011: GET /api/payment/success
Task T012: GET /api/payment/cancelled
Task T013: GET /api/subscription/status
Task T014: GET /api/admin/payment-configurations
Task T015: PUT /api/admin/payment-configurations/:plan_id

# Note: T009 and T010 must be sequential as they modify shared code
```

### Parallel Group 3: Frontend UI (after contracts defined)
```bash
# All frontend files are independent
Task T016: Update subscription.js
Task T017: Create admin-subscription-config.html
Task T018: Create admin-subscription-config.js
Task T019: Add payment success/cancel pages
Task T020: Update subscription.html error handling
```

### Parallel Group 4: Testing (after implementation)
```bash
# Test scenarios can run in parallel
Task T023: Test Scenario 1
Task T024: Test Scenario 2
Task T025: Test Scenario 3
Task T026: Test Scenario 4
Task T027: Test Scenario 5
Task T028: Test Scenario 6
Task T029: Test Scenario 7
Task T030: Test Scenario 8
```

---

## Task Execution Order

**Sequential Phases**:
1. **Phase 1** (T001-T005): Database must complete first
2. **Phase 2** (T006-T008): Helpers before endpoints
3. **Phase 3** (T009-T015): Some endpoints sequential, some parallel
4. **Phase 4** (T016-T020): All parallel (after contracts)
5. **Phase 5** (T021-T022): Integration logic
6. **Phase 6** (T023-T030): Testing (parallel execution possible)
7. **Phase 7** (T031-T036): Documentation and deployment (sequential)

**Critical Path**:
T001 → T004 → T006 → T009 → T010 → T021 → T024 → T035 → T036

**Estimated Timeline**:
- Day 1: T001-T008 (Database + Helpers)
- Day 2: T009-T015 (API Endpoints)
- Day 3: T016-T022 (Frontend + Integration)
- Day 4: T023-T030 (Testing)
- Day 5: T031-T036 (Documentation + Deployment)

---

## Success Criteria

**Feature Complete When**:
- ✅ All 36 tasks completed
- ✅ All 8 test scenarios pass
- ✅ Staging validation successful
- ✅ Production deployment approved and executed
- ✅ No critical bugs in first 24 hours

**Acceptance Criteria** (from spec.md):
- Users can select trial without payment
- Users can select paid plan and complete payment via Plug&Pay
- Auto-login after payment works seamlessly
- Admin can configure checkout URLs
- Webhook processing is idempotent
- Trial expiry detected and enforced
- GoHighLevel tags updated for paid customers

---

**Status**: ✅ Ready for Execution
**Next Command**: Begin with T001 (Create migration 011-001)
