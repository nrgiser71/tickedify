# Quickstart: Subscription Management Testing

**Feature**: 057-dan-gaan-we
**Date**: 2025-11-05
**Environment**: dev.tickedify.com (staging)

## Prerequisites

### Environment Setup
```bash
# Test credentials
EMAIL="jan@buskens.be"
PASSWORD="qyqhut-muDvop-fadki9"
BASE_URL="https://dev.tickedify.com"

# Login and capture session cookie
curl -s -L -k -c cookies.txt -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
```

### Database Setup (Run Once)
```bash
# Execute migration
psql $DATABASE_URL -f migrations/20251105_add_subscription_management.sql

# Verify tables created
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('subscription_plans', 'webhook_events', 'subscription_change_requests');"
```

### Plug&Pay Setup (Manual Configuration)
1. Create Plug&Pay account (if not exists)
2. Configure webhook endpoint: `https://dev.tickedify.com/api/webhooks/plugpay`
3. Add API key to environment: `PLUGPAY_API_KEY=xxx`
4. Add webhook secret to environment: `PLUGPAY_WEBHOOK_SECRET=xxx`
5. Create test plans in Plug&Pay matching database plan_ids: basic, pro, enterprise

---

## Test Scenarios

### Scenario 1: View Trial User Subscription ✅

**Description**: User in trial period sees trial status with countdown

**Steps**:
```bash
# 1. Fetch current subscription
curl -s -L -k -b cookies.txt "$BASE_URL/api/subscription" | jq .

# Expected response:
# {
#   "success": true,
#   "subscription": {
#     "status": "trial",
#     "plan_id": null,
#     "plan_name": "Free Trial",
#     "trial_end_date": "2025-11-19T00:00:00Z",
#     "trial_days_remaining": 14,
#     "updated_at": "2025-11-05T10:00:00Z"
#   }
# }
```

**Validation**:
- ✅ Status is "trial"
- ✅ trial_days_remaining shows correct countdown
- ✅ trial_end_date is 14 days from registration

**UI Check (Playwright)**:
```javascript
// Navigate to Settings
await page.goto('https://dev.tickedify.com/app');
await page.click('[data-tool="settings"]');

// Verify trial display
const trialText = await page.textContent('.subscription-status');
expect(trialText).toContain('Free Trial');
expect(trialText).toMatch(/\d+ days remaining/);

// Verify upgrade button exists
const upgradeBtn = await page.locator('button:has-text("Upgrade Now")');
expect(await upgradeBtn.isVisible()).toBe(true);
```

---

### Scenario 2: Fetch Available Plans ✅

**Description**: GET /api/subscription/plans returns all active plans

**Steps**:
```bash
# Fetch plans
curl -s -L -k -b cookies.txt "$BASE_URL/api/subscription/plans" | jq .

# Expected response:
# {
#   "success": true,
#   "current_plan_tier": null,
#   "plans": [
#     {
#       "plan_id": "basic",
#       "plan_name": "Basic Plan",
#       "price_monthly": 4.99,
#       "price_yearly": 49.99,
#       "tier_level": 1,
#       "features": ["Unlimited tasks", "Email import", "Daily planning"]
#     },
#     {
#       "plan_id": "pro",
#       "plan_name": "Pro Plan",
#       "price_monthly": 9.99,
#       "price_yearly": 99.99,
#       "tier_level": 2,
#       "features": ["Everything in Basic", "Recurring tasks", ...]
#     },
#     {
#       "plan_id": "enterprise",
#       "plan_name": "Enterprise Plan",
#       "price_monthly": 29.99,
#       "price_yearly": 299.99,
#       "tier_level": 3,
#       "features": ["Everything in Pro", "Team collaboration", ...]
#     }
#   ]
# }
```

**Validation**:
- ✅ Returns 3 plans (basic, pro, enterprise)
- ✅ Plans ordered by tier_level ascending
- ✅ All prices are positive numbers
- ✅ Features are non-empty arrays

---

### Scenario 3: Create Checkout Session (Trial → Paid) ✅

**Description**: User clicks "Upgrade Now" and gets Plug&Pay checkout URL

**Steps**:
```bash
# Create checkout for Pro monthly
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/subscription/checkout" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"pro","cycle":"monthly"}' | jq .

# Expected response:
# {
#   "success": true,
#   "checkout_url": "https://checkout.plugandpay.com/session/abc123",
#   "session_id": "cs_abc123def456"
# }
```

**Validation**:
- ✅ Returns valid checkout_url (starts with https://checkout.plugandpay.com)
- ✅ Returns session_id for tracking
- ✅ Checkout URL redirects to Plug&Pay payment form

**Manual Step**: Complete payment on Plug&Pay checkout page

**Post-Payment Webhook Simulation**:
```bash
# Simulate Plug&Pay webhook (subscription.created)
curl -s -L -k -X POST "$BASE_URL/api/webhooks/plugpay" \
  -H "Content-Type: application/json" \
  -H "x-plugpay-signature: $(echo -n '{"event_id":"evt_test_001",...}' | openssl dgst -sha256 -hmac "$PLUGPAY_WEBHOOK_SECRET" | awk '{print $2}')" \
  -d '{
    "event_id": "evt_test_001",
    "event_type": "subscription.created",
    "subscription_id": "sub_test_abc123",
    "data": {
      "plan_id": "pro",
      "status": "active",
      "renewal_date": "2025-12-05T00:00:00Z",
      "price": 9.99,
      "cycle": "monthly"
    }
  }' | jq .

# Expected: {"status":"processed"}
```

**Validation After Webhook**:
```bash
# Verify subscription updated
curl -s -L -k -b cookies.txt "$BASE_URL/api/subscription" | jq .

# Expected:
# {
#   "success": true,
#   "subscription": {
#     "status": "active",
#     "plan_id": "pro",
#     "plan_name": "Pro Plan",
#     "price": 9.99,
#     "cycle": "monthly",
#     "renewal_date": "2025-12-05T00:00:00Z",
#     "plugpay_subscription_id": "sub_test_abc123"
#   }
# }
```

---

### Scenario 4: Upgrade Plan (Basic → Pro, Immediate) ✅

**Description**: Active Basic user upgrades to Pro with immediate effect

**Prerequisites**: User must have active Basic subscription
```bash
# Setup: Mock active Basic subscription
psql $DATABASE_URL -c "UPDATE users SET subscription_status='active', subscription_plan='basic', subscription_price=4.99, subscription_cycle='monthly', plugpay_subscription_id='sub_basic_123' WHERE email='jan@buskens.be';"
```

**Steps**:
```bash
# Upgrade to Pro
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/subscription/upgrade" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"pro"}' | jq .

# Expected response:
# {
#   "success": true,
#   "message": "Successfully upgraded to Pro Plan",
#   "subscription": {
#     "status": "active",
#     "plan_id": "pro",
#     "plan_name": "Pro Plan",
#     "price": 9.99,
#     "cycle": "monthly",
#     "renewal_date": "2025-12-05T00:00:00Z"
#   },
#   "prorated_charge": 5.12
# }
```

**Validation**:
- ✅ plan_id changed from "basic" to "pro"
- ✅ price updated to 9.99
- ✅ prorated_charge calculated (difference for remaining period)
- ✅ Plug&Pay API called with prorate=true

**UI Check**:
```javascript
// Verify Settings shows Pro Plan
await page.reload();
const planText = await page.textContent('.subscription-plan-name');
expect(planText).toContain('Pro Plan');
expect(planText).toContain('€9.99/month');
```

---

### Scenario 5: Downgrade Plan (Pro → Basic, Scheduled) ✅

**Description**: Active Pro user downgrades to Basic at next renewal

**Prerequisites**: User must have active Pro subscription
```bash
# Setup: Mock active Pro subscription
psql $DATABASE_URL -c "UPDATE users SET subscription_status='active', subscription_plan='pro', subscription_price=9.99, subscription_renewal_date='2025-12-05', plugpay_subscription_id='sub_pro_123' WHERE email='jan@buskens.be';"
```

**Steps**:
```bash
# Downgrade to Basic
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/subscription/downgrade" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"basic"}' | jq .

# Expected response:
# {
#   "success": true,
#   "message": "Your plan will change to Basic Plan on December 5, 2025",
#   "effective_date": "2025-12-05T00:00:00Z",
#   "scheduled_plan": "basic"
# }
```

**Validation**:
- ✅ Current plan still shows "pro" in users table
- ✅ subscription_change_requests table has pending entry
- ✅ effective_date matches renewal_date
- ✅ Plug&Pay API called with effective_date=next_renewal

**Database Check**:
```bash
# Verify scheduled change
psql $DATABASE_URL -c "SELECT current_plan, new_plan, effective_date, status FROM subscription_change_requests WHERE user_id=(SELECT id FROM users WHERE email='jan@buskens.be');"

# Expected:
# current_plan | new_plan | effective_date      | status
# -------------+----------+---------------------+--------
# pro          | basic    | 2025-12-05 00:00:00 | pending
```

**UI Check**:
```javascript
// Verify Settings shows scheduled downgrade message
await page.reload();
const message = await page.textContent('.subscription-scheduled-change');
expect(message).toContain('Your plan will change to Basic Plan on December 5, 2025');

// Verify current plan still shows Pro
const currentPlan = await page.textContent('.subscription-plan-name');
expect(currentPlan).toContain('Pro Plan');
```

---

### Scenario 6: Cancel Subscription (Grace Period) ✅

**Description**: User cancels active subscription, retains access until period end

**Prerequisites**: User must have active subscription
```bash
# Setup: Active Pro subscription
psql $DATABASE_URL -c "UPDATE users SET subscription_status='active', subscription_plan='pro', subscription_renewal_date='2025-12-05', plugpay_subscription_id='sub_pro_123' WHERE email='jan@buskens.be';"
```

**Steps**:
```bash
# Cancel subscription
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/subscription/cancel" | jq .

# Expected response:
# {
#   "success": true,
#   "message": "Subscription canceled. You retain access until December 5, 2025",
#   "cancels_on": "2025-12-05T00:00:00Z"
# }
```

**Validation**:
- ✅ subscription_status changed to "canceled"
- ✅ subscription_plan still shows "pro" (retained during grace)
- ✅ renewal_date unchanged (end of access)
- ✅ Plug&Pay API called with at_period_end=true

**Database Check**:
```bash
psql $DATABASE_URL -c "SELECT subscription_status, subscription_plan, subscription_renewal_date FROM users WHERE email='jan@buskens.be';"

# Expected:
# subscription_status | subscription_plan | subscription_renewal_date
# --------------------+-------------------+--------------------------
# canceled            | pro               | 2025-12-05 00:00:00
```

**UI Check**:
```javascript
// Verify Settings shows cancellation message
await page.reload();
const status = await page.textContent('.subscription-status');
expect(status).toContain('Cancels on December 5, 2025');

// Verify Reactivate button appears
const reactivateBtn = await page.locator('button:has-text("Reactivate Subscription")');
expect(await reactivateBtn.isVisible()).toBe(true);

// Verify Cancel button hidden
const cancelBtn = await page.locator('button:has-text("Cancel Subscription")');
expect(await cancelBtn.isVisible()).toBe(false);
```

---

### Scenario 7: Reactivate Canceled Subscription ✅

**Description**: User reactivates canceled subscription before expiry

**Prerequisites**: User must have canceled subscription (from Scenario 6)

**Steps**:
```bash
# Reactivate subscription
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/subscription/reactivate" | jq .

# Expected response:
# {
#   "success": true,
#   "message": "Subscription reactivated. Renews on December 5, 2025",
#   "subscription": {
#     "status": "active",
#     "plan_id": "pro",
#     "plan_name": "Pro Plan",
#     "renewal_date": "2025-12-05T00:00:00Z"
#   }
# }
```

**Validation**:
- ✅ subscription_status changed back to "active"
- ✅ Plan and renewal_date unchanged
- ✅ Plug&Pay API called to reactivate subscription

**Database Check**:
```bash
psql $DATABASE_URL -c "SELECT subscription_status, subscription_plan FROM users WHERE email='jan@buskens.be';"

# Expected:
# subscription_status | subscription_plan
# --------------------+-------------------
# active              | pro
```

**UI Check**:
```javascript
// Verify Settings shows active status
await page.reload();
const status = await page.textContent('.subscription-status');
expect(status).toContain('Renews on December 5, 2025');
expect(status).not.toContain('Cancels on');

// Verify Cancel button reappears
const cancelBtn = await page.locator('button:has-text("Cancel Subscription")');
expect(await cancelBtn.isVisible()).toBe(true);

// Verify Reactivate button hidden
const reactivateBtn = await page.locator('button:has-text("Reactivate Subscription")');
expect(await reactivateBtn.isVisible()).toBe(false);
```

---

### Scenario 8: Webhook Idempotency ✅

**Description**: Duplicate webhook events are not processed twice

**Steps**:
```bash
# Send webhook event
WEBHOOK_PAYLOAD='{"event_id":"evt_idem_001","event_type":"subscription.updated","subscription_id":"sub_test_123","data":{"plan_id":"pro","status":"active","renewal_date":"2025-12-05T00:00:00Z","price":9.99,"cycle":"monthly"}}'
SIGNATURE=$(echo -n "$WEBHOOK_PAYLOAD" | openssl dgst -sha256 -hmac "$PLUGPAY_WEBHOOK_SECRET" | awk '{print $2}')

# First webhook (should process)
curl -s -L -k -X POST "$BASE_URL/api/webhooks/plugpay" \
  -H "Content-Type: application/json" \
  -H "x-plugpay-signature: $SIGNATURE" \
  -d "$WEBHOOK_PAYLOAD" | jq .

# Expected: {"status":"processed"}

# Second webhook (duplicate event_id, should skip)
curl -s -L -k -X POST "$BASE_URL/api/webhooks/plugpay" \
  -H "Content-Type: application/json" \
  -H "x-plugpay-signature: $SIGNATURE" \
  -d "$WEBHOOK_PAYLOAD" | jq .

# Expected: {"status":"already_processed"}
```

**Validation**:
- ✅ First webhook returns "processed"
- ✅ Second webhook returns "already_processed"
- ✅ webhook_events table has single entry for event_id
- ✅ User subscription data updated only once

**Database Check**:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM webhook_events WHERE event_id='evt_idem_001';"

# Expected: 1 (not 2)
```

---

### Scenario 9: Invalid Plan Upgrade (Error Handling) ❌

**Description**: User tries to "upgrade" to same or lower tier

**Prerequisites**: User has active Pro subscription

**Steps**:
```bash
# Try to "upgrade" to Basic (actually downgrade)
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/subscription/upgrade" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"basic"}' | jq .

# Expected response:
# {
#   "success": false,
#   "error": "Selected plan is not an upgrade from your current plan"
# }
```

**Validation**:
- ✅ Returns 400 Bad Request
- ✅ Clear error message
- ✅ No changes to database
- ✅ No Plug&Pay API call made

---

### Scenario 10: Webhook Signature Validation ❌

**Description**: Webhook with invalid signature is rejected

**Steps**:
```bash
# Send webhook with invalid signature
curl -s -L -k -X POST "$BASE_URL/api/webhooks/plugpay" \
  -H "Content-Type: application/json" \
  -H "x-plugpay-signature: invalid_signature_12345" \
  -d '{"event_id":"evt_hack_001","event_type":"subscription.updated","subscription_id":"sub_test","data":{}}' | jq .

# Expected response:
# {
#   "error": "Unauthorized"
# }
```

**Validation**:
- ✅ Returns 401 Unauthorized
- ✅ Event not logged in webhook_events table
- ✅ No database changes made
- ✅ Error logged for security monitoring

---

### Scenario 11: UI Modal - Plan Comparison ✅

**Description**: User clicks Upgrade/Downgrade button and sees plan modal

**Steps (Playwright)**:
```javascript
// Navigate to Settings
await page.goto('https://dev.tickedify.com/app');
await page.click('[data-tool="settings"]');

// Click Upgrade Plan button
await page.click('button:has-text("Upgrade Plan")');

// Verify modal appears
const modal = await page.locator('.modal-subscription-plans');
expect(await modal.isVisible()).toBe(true);

// Verify all plans displayed
const plans = await page.locator('.plan-card').count();
expect(plans).toBe(3); // basic, pro, enterprise

// Verify current plan highlighted
const currentPlan = await page.locator('.plan-card.current-plan');
expect(await currentPlan.isVisible()).toBe(true);

// Verify pricing displayed
const proPlan = await page.locator('.plan-card[data-plan="pro"]');
const price = await proPlan.locator('.plan-price').textContent();
expect(price).toContain('€9.99/month');

// Verify features listed
const features = await proPlan.locator('.plan-feature').count();
expect(features).toBeGreaterThan(0);

// Click Pro plan card
await proPlan.click();

// Verify confirmation dialog appears
const confirmDialog = await page.locator('.confirm-upgrade-dialog');
expect(await confirmDialog.isVisible()).toBe(true);
expect(await confirmDialog.textContent()).toContain('Pro Plan');
expect(await confirmDialog.textContent()).toContain('€9.99/month');

// Cancel (don't actually upgrade in test)
await page.click('button:has-text("Cancel")');
```

**Validation**:
- ✅ Modal displays all active plans
- ✅ Current plan is highlighted
- ✅ Pricing and features shown clearly
- ✅ Confirmation dialog appears before upgrade
- ✅ Cancel button closes modal without changes

---

### Scenario 12: Trial Expiry Handling ✅

**Description**: User trial expires without subscription, status changes to expired

**Prerequisites**: User in trial with past trial_end_date
```bash
# Setup: Expired trial
psql $DATABASE_URL -c "UPDATE users SET subscription_status='trial', trial_end_date='2025-11-01' WHERE email='jan@buskens.be';"
```

**Steps**:
```bash
# Fetch subscription (API should detect expired trial)
curl -s -L -k -b cookies.txt "$BASE_URL/api/subscription" | jq .

# Expected response:
# {
#   "success": true,
#   "subscription": {
#     "status": "expired",
#     "plan_id": null,
#     "plan_name": "Trial Expired",
#     "message": "Your trial has expired. Please upgrade to continue using Tickedify."
#   }
# }
```

**Validation**:
- ✅ Status detected as expired
- ✅ Access to app features restricted (separate feature check)
- ✅ Upgrade call-to-action displayed

**UI Check**:
```javascript
// Verify Settings shows expired message
await page.goto('https://dev.tickedify.com/app');
await page.click('[data-tool="settings"]');

const status = await page.textContent('.subscription-status');
expect(status).toContain('Trial Expired');

// Verify prominent upgrade button
const upgradeBtn = await page.locator('button.btn-upgrade-primary');
expect(await upgradeBtn.isVisible()).toBe(true);
```

---

## Success Criteria

All scenarios should pass with ✅ before considering feature complete:

- [ ] Scenario 1: View Trial User Subscription
- [ ] Scenario 2: Fetch Available Plans
- [ ] Scenario 3: Create Checkout Session
- [ ] Scenario 4: Upgrade Plan (Immediate)
- [ ] Scenario 5: Downgrade Plan (Scheduled)
- [ ] Scenario 6: Cancel Subscription
- [ ] Scenario 7: Reactivate Subscription
- [ ] Scenario 8: Webhook Idempotency
- [ ] Scenario 9: Invalid Plan Upgrade (Error Handling)
- [ ] Scenario 10: Webhook Signature Validation
- [ ] Scenario 11: UI Modal - Plan Comparison
- [ ] Scenario 12: Trial Expiry Handling

---

## Cleanup After Testing

```bash
# Remove test data
psql $DATABASE_URL -c "DELETE FROM subscription_change_requests WHERE user_id=(SELECT id FROM users WHERE email='jan@buskens.be');"
psql $DATABASE_URL -c "DELETE FROM webhook_events WHERE event_id LIKE 'evt_test_%';"
psql $DATABASE_URL -c "UPDATE users SET subscription_status='trial', subscription_plan=NULL, subscription_price=NULL, subscription_renewal_date=NULL, plugpay_subscription_id=NULL, trial_end_date=NOW() + INTERVAL '14 days' WHERE email='jan@buskens.be';"

# Remove cookies
rm cookies.txt
```

---

## Performance Benchmarks

**Target Response Times** (95th percentile):
- GET /api/subscription: <100ms (single DB query)
- GET /api/subscription/plans: <50ms (cached or small table scan)
- POST /api/subscription/upgrade: <500ms (Plug&Pay API call)
- POST /api/subscription/downgrade: <300ms (DB write + Plug&Pay API)
- POST /api/subscription/cancel: <300ms (DB write + Plug&Pay API)
- POST /api/webhooks/plugpay: <200ms (idempotency check + DB write)

**Load Testing** (optional):
```bash
# Use Apache Bench to test subscription endpoint
ab -n 1000 -c 10 -C "connect.sid=$SESSION_COOKIE" "$BASE_URL/api/subscription"

# Expected: >95% requests under 200ms
```

---

## Notes

- **Plug&Pay Sandbox**: Use Plug&Pay test mode for all quickstart testing
- **Test Cards**: Use Plug&Pay test card numbers for checkout testing
- **Webhook Testing**: Use tools like webhook.site or ngrok for local webhook testing
- **Session Management**: Login session expires after 24 hours, re-login if needed
- **Database Reset**: Run cleanup script between test runs to avoid state pollution

---

**Last Updated**: 2025-11-05
**Tested By**: [Your name]
**Environment**: dev.tickedify.com (staging)
**Status**: Ready for implementation validation
