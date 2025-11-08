# Research: Subscription Management in Settings

**Feature**: 057-dan-gaan-we
**Date**: 2025-11-05
**Status**: Complete

## Research Questions

### 1. Plug&Pay API Integration Approach

**Question**: Does Plug&Pay provide an SDK or should we use direct REST API calls?

**Research Findings**:
- Plug&Pay documentation suggests REST API integration (no official SDK mentioned)
- Similar integrations in payment processing typically use direct HTTPS calls
- Webhook-based architecture for subscription state synchronization

**Decision**: Use direct REST API calls with `fetch()` or `axios`
- **Rationale**:
  - Simpler dependency management (no third-party SDK to maintain)
  - More control over request/response handling
  - Easier debugging and logging
  - Tickedify already uses this pattern for other integrations (Mailgun, Backblaze B2)
- **Implementation Pattern**:
  ```javascript
  // Backend helper function
  async function callPlugPayAPI(endpoint, method, data) {
    const response = await fetch(`https://api.plugandpay.com/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${process.env.PLUGPAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined
    });
    return response.json();
  }
  ```

**Alternatives Considered**:
- Third-party wrapper libraries: Rejected - adds dependency overhead
- Custom SDK implementation: Rejected - overkill for small API surface area

### 2. Database Schema for Subscription Data

**Question**: What subscription metadata should be stored locally vs fetched from Plug&Pay?

**Decision**: Store minimal metadata locally, treat Plug&Pay as source of truth
- **Local Database Storage** (PostgreSQL):
  ```sql
  -- Add to existing 'users' table:
  ALTER TABLE users ADD COLUMN plugpay_subscription_id VARCHAR(255);
  ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50);
    -- 'trial', 'active', 'canceled', 'expired'
  ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(50);
    -- 'basic', 'pro', 'enterprise' (or whatever plans exist)
  ALTER TABLE users ADD COLUMN subscription_renewal_date TIMESTAMP;
  ALTER TABLE users ADD COLUMN subscription_price DECIMAL(10,2);
  ALTER TABLE users ADD COLUMN subscription_cycle VARCHAR(20);
    -- 'monthly', 'yearly'
  ALTER TABLE users ADD COLUMN trial_end_date TIMESTAMP;
  ALTER TABLE users ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NOW();
  ```

- **Rationale**:
  - Fast read access for Settings screen display (no API call needed)
  - Webhook updates keep local data synchronized
  - Plug&Pay remains authoritative for billing operations
  - Reduces API calls and improves UI performance

- **Sync Strategy**:
  - Webhook endpoint `/api/webhooks/plugpay` receives subscription updates
  - On webhook: validate signature, update local database
  - On user action (upgrade/downgrade/cancel): update Plug&Pay, then local DB
  - On page load: optionally verify with Plug&Pay if data >1 hour old (cache freshness)

**Alternatives Considered**:
- Fetch from Plug&Pay on every page load: Rejected - slow UX, unnecessary API calls
- Store full subscription object: Rejected - data duplication, sync complexity
- No local storage (always fetch): Rejected - poor performance, API rate limit risk

### 3. Plan Tier Definition and Storage

**Question**: Where should available subscription plans be defined?

**Decision**: Store plan definitions in PostgreSQL, separate from user subscriptions
- **Plan Table Schema**:
  ```sql
  CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_id VARCHAR(50) UNIQUE NOT NULL,  -- 'basic', 'pro', 'enterprise'
    plan_name VARCHAR(100) NOT NULL,      -- 'Basic Plan', 'Pro Plan'
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    features JSONB,                        -- Array of feature strings
    tier_level INTEGER NOT NULL,           -- 1, 2, 3 for upgrade/downgrade logic
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- **Rationale**:
  - Database-driven plan configuration (no code changes to add plans)
  - Easy to modify pricing without deployment
  - `tier_level` enables automatic upgrade/downgrade button logic
  - Features as JSONB allows flexible plan descriptions

- **Initial Seed Data**:
  ```sql
  INSERT INTO subscription_plans (plan_id, plan_name, price_monthly, price_yearly, tier_level, features) VALUES
  ('basic', 'Basic Plan', 4.99, 49.99, 1, '["Unlimited tasks", "Email import", "Daily planning"]'),
  ('pro', 'Pro Plan', 9.99, 99.99, 2, '["Everything in Basic", "Recurring tasks", "Priority support", "Advanced analytics"]'),
  ('enterprise', 'Enterprise Plan', 29.99, 299.99, 3, '["Everything in Pro", "Team collaboration", "API access", "Custom integrations"]');
  ```

**Alternatives Considered**:
- Hardcoded in JavaScript: Rejected - no flexibility, requires deployment for changes
- Environment variables: Rejected - awkward for complex data structures
- External config file: Rejected - database is more manageable for operational changes

### 4. Upgrade/Downgrade Billing Logic

**Question**: How should prorated billing be calculated for mid-cycle upgrades?

**Decision**: Delegate proration to Plug&Pay API, do not implement custom billing logic
- **Rationale**:
  - Payment processors like Plug&Pay handle proration automatically
  - Avoids complex edge cases (leap years, timezone issues, partial months)
  - Reduces liability and compliance risk
  - Simpler implementation and testing

- **Implementation Approach**:
  ```javascript
  // Upgrade: Plug&Pay calculates prorated charge automatically
  POST /subscriptions/{id}/change-plan
  {
    "new_plan": "pro",
    "prorate": true,  // Plug&Pay handles the math
    "effective_date": "immediate"
  }

  // Downgrade: Schedule for next renewal
  POST /subscriptions/{id}/change-plan
  {
    "new_plan": "basic",
    "prorate": false,
    "effective_date": "next_renewal"
  }
  ```

- **UI Communication**:
  - Show estimated charge from Plug&Pay API response before confirming upgrade
  - Show clear "Changes on [date]" message for scheduled downgrades
  - Display current plan until scheduled change takes effect

**Alternatives Considered**:
- Custom proration calculation: Rejected - error-prone, reinventing the wheel
- Always immediate changes: Rejected - poor UX for downgrades (user loses features immediately after paying)

### 5. Webhook Security and Validation

**Question**: How to securely validate Plug&Pay webhook requests?

**Decision**: Implement HMAC signature verification with API key
- **Webhook Endpoint Pattern**:
  ```javascript
  app.post('/api/webhooks/plugpay', async (req, res) => {
    // 1. Verify signature
    const signature = req.headers['x-plugpay-signature'];
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PLUGPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Handle idempotency
    const eventId = req.body.event_id;
    const existing = await pool.query(
      'SELECT id FROM webhook_events WHERE event_id = $1',
      [eventId]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ status: 'already_processed' });
    }

    // 3. Process event
    const { subscription_id, event_type, data } = req.body;
    await updateSubscriptionFromWebhook(subscription_id, event_type, data);

    // 4. Log event
    await pool.query(
      'INSERT INTO webhook_events (event_id, event_type, processed_at) VALUES ($1, $2, NOW())',
      [eventId, event_type]
    );

    res.status(200).json({ status: 'processed' });
  });
  ```

- **Rationale**:
  - HMAC signature prevents spoofed webhook requests
  - Idempotency prevents duplicate processing
  - Logging enables debugging and audit trail
  - Follows Plug&Pay webhook security best practices

**Alternatives Considered**:
- IP whitelist only: Rejected - IPs can change, not cryptographically secure
- No validation: Rejected - severe security risk
- JWT tokens: Rejected - overkill for webhook validation

### 6. Error Handling and Retry Logic

**Question**: How should failed subscription operations be handled?

**Decision**: User-facing errors with graceful degradation, background retry for webhooks
- **User-Initiated Actions** (upgrade/downgrade/cancel):
  - Show clear error messages in UI
  - Log error details for debugging
  - Do NOT retry automatically (user can retry manually)
  - Preserve UI state so user can correct issues

  ```javascript
  try {
    const result = await callPlugPayAPI('subscriptions/upgrade', 'POST', { plan: 'pro' });
    // Update local DB on success
    await updateUserSubscription(userId, result.subscription);
    showToast('success', 'Subscription upgraded successfully!');
  } catch (error) {
    console.error('Upgrade failed:', error);
    showToast('error', 'Upgrade failed. Please try again or contact support.');
    // DO NOT update local DB on failure
  }
  ```

- **Webhook Processing**:
  - Plug&Pay retries failed webhooks automatically (exponential backoff)
  - Return 200 immediately if already processed (idempotency)
  - Return 5xx for transient errors (triggers Plug&Pay retry)
  - Return 2xx for permanent errors after logging (no retry)

- **Rationale**:
  - User-initiated: user control, clear feedback
  - Webhooks: automated retry reduces manual intervention
  - Idempotency prevents data corruption from retries

**Alternatives Considered**:
- Automatic retry for user actions: Rejected - confusing UX, possible duplicate charges
- No webhook retry: Rejected - requires manual intervention for transient failures
- Queue-based retry: Rejected - overkill for small scale

## Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Integration | Direct REST API | Simpler, no SDK dependency |
| Local Storage | Minimal metadata in PostgreSQL | Fast reads, webhook sync |
| Plan Definitions | Database table (subscription_plans) | Flexible, no code changes |
| Proration Logic | Delegate to Plug&Pay | Avoid complexity, reduce risk |
| Webhook Security | HMAC + idempotency | Industry standard, secure |
| Error Handling | User-facing for actions, retry for webhooks | Clear UX, resilient sync |

## Open Questions (None Remaining)
All NEEDS CLARIFICATION items from Technical Context have been resolved.

## Next Steps
Proceed to Phase 1: Design & Contracts
- Generate data-model.md from research decisions
- Create OpenAPI contract for subscription endpoints
- Define quickstart test scenarios
