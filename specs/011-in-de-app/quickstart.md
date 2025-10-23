# Quickstart: Abonnement-Betalingsproces Testing

**Feature**: 011-in-de-app
**Date**: 2025-10-11
**Purpose**: End-to-end validation van complete subscription payment flow

## Prerequisites

Before starting, ensure:
- ✅ Database migrations applied (011-001, 011-002, 011-003)
- ✅ Plug&Pay API key configured in environment (`PLUGANDPAY_API_KEY`)
- ✅ GoHighLevel CRM credentials configured
- ✅ Admin has configured checkout URLs in admin dashboard
- ✅ Test user account exists: `jan@buskens.be`

---

## Scenario 1: Beta User → Trial Selection

**Goal**: Verify beta user can select 14-day trial without payment

### Steps

1. **Setup**: Ensure test user is in beta status
   ```sql
   UPDATE users
   SET subscription_status = 'beta',
       had_trial = FALSE
   WHERE email = 'jan@buskens.be';
   ```

2. **Login** as beta user
   - Navigate to `https://tickedify.com/`
   - Login with `jan@buskens.be` / `qyqhut-muDvop-fadki9`

3. **Trigger subscription screen**
   - Admin beëindigt beta periode via admin dashboard
   - User sees "De bèta periode is afgelopen" message
   - Subscription selection screen appears with 3 options

4. **Select trial**
   - Click "Gratis proefperiode (14 dagen)" option
   - Click "Bevestig selectie" button

5. **Verify immediate access**
   - ✅ No redirect to payment page
   - ✅ Success message: "Je gratis proefperiode is gestart!"
   - ✅ User has access to app immediately

6. **Database verification**
   ```sql
   SELECT subscription_status, trial_start_date, trial_end_date, had_trial
   FROM users
   WHERE email = 'jan@buskens.be';
   ```
   **Expected**:
   - `subscription_status` = 'trialing'
   - `trial_start_date` = TODAY
   - `trial_end_date` = TODAY + 14 days
   - `had_trial` = TRUE

7. **GoHighLevel verification**
   - Check contact tags in GHL CRM
   - ✅ Tag `tickedify-trial-user` added
   - ✅ Tag `tickedify-beta-user` removed (if present)

**Duration**: ~5 minutes

---

## Scenario 2: Beta User → Paid Plan (Monthly €7)

**Goal**: Verify beta user can select paid plan and complete payment

### Steps

1. **Setup**: Ensure test user is in beta status
   ```sql
   UPDATE users
   SET subscription_status = 'beta',
       had_trial = FALSE,
       login_token = NULL,
       login_token_used = FALSE
   WHERE email = 'jan@buskens.be';
   ```

2. **Admin configuration** (one-time setup)
   - Login to admin dashboard
   - Navigate to "Abonnement Configuratie"
   - Verify monthly_7 checkout URL is configured
   - Example: `https://pay.baasoverjetijd.be/checkout/tickedify-monthly`

3. **Login** as beta user
   - Navigate to `https://tickedify.com/`
   - Login with test credentials

4. **Select paid plan**
   - Subscription selection screen appears
   - Click "Maandelijks €7" option
   - Click "Bevestig selectie"

5. **Verify redirect**
   - ✅ Redirected to Plug&Pay checkout page
   - ✅ URL contains `email=jan@buskens.be`
   - ✅ URL contains `plan_id=monthly_7`
   - ✅ Checkout shows correct amount (€7.00)

6. **Complete payment** on Plug&Pay
   - Enter test card details (use Plug&Pay test mode)
   - Click "Betalen"
   - ✅ Payment processes successfully

7. **Webhook verification** (automatic)
   - Plug&Pay sends webhook to `/api/webhooks/plugandpay`
   - Check webhook logs:
     ```sql
     SELECT event_type, order_id, signature_valid, error_message
     FROM payment_webhook_logs
     ORDER BY processed_at DESC LIMIT 1;
     ```
   - **Expected**:
     - `event_type` = 'order_payment_completed'
     - `signature_valid` = TRUE
     - `error_message` = NULL

8. **Return to Tickedify** (automatic redirect)
   - ✅ User redirected to `/api/payment/success?token=[AUTO_TOKEN]`
   - ✅ Auto-login token validated
   - ✅ Session created automatically
   - ✅ Redirected to `/app` with success message

9. **Database verification**
   ```sql
   SELECT subscription_status, selected_plan, payment_confirmed_at,
          plugandpay_order_id, amount_paid_cents, login_token_used
   FROM users
   WHERE email = 'jan@buskens.be';
   ```
   **Expected**:
   - `subscription_status` = 'active'
   - `selected_plan` = 'monthly_7'
   - `payment_confirmed_at` = [recent timestamp]
   - `plugandpay_order_id` = [Plug&Pay order ID]
   - `amount_paid_cents` = 700
   - `login_token_used` = TRUE

10. **GoHighLevel verification**
    - Check contact tags in GHL CRM
    - ✅ Tag `tickedify-paid-customer` added
    - ✅ Tag `tickedify-beta-user` removed

**Duration**: ~10 minutes

---

## Scenario 3: Trial Expiry → Upgrade to Paid

**Goal**: Verify expired trial users are prompted for paid subscription

### Steps

1. **Setup**: Create expired trial user
   ```sql
   UPDATE users
   SET subscription_status = 'trialing',
       trial_start_date = NOW() - INTERVAL '15 days',
       trial_end_date = NOW() - INTERVAL '1 day',
       had_trial = TRUE
   WHERE email = 'jan@buskens.be';
   ```

2. **Login** as trial user
   - Navigate to `https://tickedify.com/`
   - Login with credentials

3. **Verify trial expiry detection**
   - ✅ System detects `trial_end_date` < NOW()
   - ✅ Updates `subscription_status` to 'trial_expired'
   - ✅ Shows message: "Je gratis proefperiode is afgelopen"
   - ✅ Subscription selection screen appears

4. **Verify trial option hidden**
   - ✅ Only 2 options shown:
     - Maandelijks €7
     - Jaarlijks €70
   - ✅ Trial option NOT visible (because `had_trial` = TRUE)

5. **Select yearly plan**
   - Click "Jaarlijks €70" option
   - Click "Bevestig selectie"

6. **Complete payment flow**
   - Same as Scenario 2, steps 5-10
   - Verify `amount_paid_cents` = 7000 (€70)

**Duration**: ~10 minutes

---

## Scenario 4: Payment Cancelled by User

**Goal**: Verify graceful handling when user cancels payment

### Steps

1. **Setup**: User in beta status (Scenario 2, step 1)

2. **Select paid plan** (Scenario 2, steps 3-5)
   - Redirected to Plug&Pay checkout

3. **Cancel payment**
   - On Plug&Pay checkout page, click "Annuleren" or close window
   - ✅ Redirected to `/api/payment/cancelled`

4. **Verify return to selection screen**
   - ✅ Redirected to `/subscription?cancelled=true`
   - ✅ Message shown: "Betaling geannuleerd. Je kunt het opnieuw proberen..."
   - ✅ Subscription options still visible

5. **Database verification**
   ```sql
   SELECT subscription_status, selected_plan, payment_confirmed_at
   FROM users
   WHERE email = 'jan@buskens.be';
   ```
   **Expected**:
   - `subscription_status` = 'beta' (unchanged)
   - `payment_confirmed_at` = NULL
   - No webhook log entry

6. **Retry payment**
   - User can select plan again and retry
   - Flow continues normally

**Duration**: ~5 minutes

---

## Scenario 5: Webhook Idempotency (Duplicate Prevention)

**Goal**: Verify system prevents duplicate payment processing

### Steps

1. **Setup**: Complete Scenario 2 (user with active subscription)

2. **Simulate duplicate webhook**
   - Use curl to send duplicate Plug&Pay webhook:
   ```bash
   curl -X POST https://tickedify.com/api/webhooks/plugandpay \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "webhook_event=order_payment_completed" \
     -d "status=paid" \
     -d "order_id=SAME_ORDER_ID_AS_BEFORE" \
     -d "email=jan@buskens.be" \
     -d "amount=700" \
     -d "api_key=YOUR_API_KEY" \
     -d "plan_id=monthly_7"
   ```

3. **Verify idempotent response**
   - ✅ HTTP 200 OK returned
   - ✅ Response: `{"success": true, "duplicate": true, "message": "Payment already processed"}`
   - ✅ No database updates performed
   - ✅ No duplicate GHL sync triggered

4. **Webhook log verification**
   ```sql
   SELECT COUNT(*) FROM payment_webhook_logs
   WHERE order_id = 'SAME_ORDER_ID_AS_BEFORE';
   ```
   **Expected**: 2 entries (original + duplicate)
   - First entry: `error_message` = NULL
   - Second entry: `error_message` = "Duplicate webhook - already processed"

**Duration**: ~3 minutes

---

## Scenario 6: Auto-Login Token Expiry

**Goal**: Verify expired tokens fallback to login screen

### Steps

1. **Setup**: Complete payment but don't use return URL immediately

2. **Wait for token expiry** (or manually expire):
   ```sql
   UPDATE users
   SET login_token_expires = NOW() - INTERVAL '1 minute'
   WHERE email = 'jan@buskens.be';
   ```

3. **Attempt to use return URL**
   - Navigate to `/api/payment/success?token=[EXPIRED_TOKEN]`

4. **Verify fallback behavior**
   - ✅ Token validation fails (expired)
   - ✅ Redirected to `/login?reason=token_expired`
   - ✅ Message: "Je betaling is geslaagd! Log in om door te gaan."

5. **Login manually**
   - Enter email/password
   - ✅ Login succeeds
   - ✅ User has active subscription access

**Duration**: ~3 minutes

---

## Scenario 7: Admin Configuration Management

**Goal**: Verify admin can configure Plug&Pay checkout URLs

### Steps

1. **Login** as admin
   - Navigate to `https://tickedify.com/admin.html`
   - Login with admin credentials

2. **Navigate** to subscription config
   - Click "Abonnement Configuratie" menu item
   - ✅ Shows table with 2 plans (monthly, yearly)

3. **Update monthly checkout URL**
   - Edit checkout URL field
   - Enter: `https://pay.baasoverjetijd.be/checkout/tickedify-monthly-new`
   - Click "Opslaan"

4. **Verify save success**
   - ✅ Success message: "Configuratie opgeslagen"
   - ✅ URL updated in table
   - ✅ `updated_at` timestamp refreshed

5. **Database verification**
   ```sql
   SELECT plan_id, checkout_url, updated_at
   FROM payment_configurations
   WHERE plan_id = 'monthly_7';
   ```
   **Expected**: New URL persisted

6. **Test URL validation**
   - Try to save invalid URL (HTTP instead of HTTPS)
   - ✅ Error message: "Checkout URL moet een geldige HTTPS URL zijn"
   - ✅ URL not saved

7. **Verify new URL used**
   - Logout from admin
   - Login as regular user
   - Select monthly plan
   - ✅ Redirected to NEW checkout URL

**Duration**: ~7 minutes

---

## Scenario 8: Missing Checkout URL Error

**Goal**: Verify error handling when checkout URL not configured

### Steps

1. **Setup**: Clear checkout URL for yearly plan
   ```sql
   UPDATE payment_configurations
   SET checkout_url = '',
       is_active = FALSE
   WHERE plan_id = 'yearly_70';
   ```

2. **Login** as user in beta/trial_expired status

3. **Select yearly plan**
   - Click "Jaarlijks €70" option
   - Click "Bevestig selectie"

4. **Verify error message**
   - ✅ Error shown: "Betaallink niet geconfigureerd, neem contact op met support"
   - ✅ No redirect attempted
   - ✅ User remains on subscription selection screen
   - ✅ Can try different plan instead

5. **Restore checkout URL**
   ```sql
   UPDATE payment_configurations
   SET checkout_url = 'https://pay.baasoverjetijd.be/checkout/tickedify-yearly',
       is_active = TRUE
   WHERE plan_id = 'yearly_70';
   ```

**Duration**: ~3 minutes

---

## Performance Validation

### Webhook Processing Time

**Goal**: Verify <500ms webhook processing

```bash
# Test webhook processing time
time curl -X POST https://tickedify.com/api/webhooks/plugandpay \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "webhook_event=order_payment_completed" \
  -d "status=paid" \
  -d "order_id=test_$(date +%s)" \
  -d "email=jan@buskens.be" \
  -d "amount=700" \
  -d "api_key=YOUR_API_KEY"
```

**Expected**: Response time <500ms

### Redirect Time

**Goal**: Verify <200ms redirect to Plug&Pay

1. Open browser DevTools Network tab
2. Select paid plan and click confirm
3. Measure time from button click to Plug&Pay page load
4. **Expected**: <200ms for redirect (excluding Plug&Pay page load)

---

## Regression Testing Checklist

After implementing feature, verify all scenarios:

- [ ] Scenario 1: Beta → Trial (no payment)
- [ ] Scenario 2: Beta → Paid (with payment flow)
- [ ] Scenario 3: Trial Expiry → Upgrade
- [ ] Scenario 4: Payment Cancelled
- [ ] Scenario 5: Webhook Idempotency
- [ ] Scenario 6: Token Expiry Fallback
- [ ] Scenario 7: Admin Configuration
- [ ] Scenario 8: Missing Checkout URL Error
- [ ] Performance: Webhook <500ms
- [ ] Performance: Redirect <200ms

**All scenarios MUST pass before production deployment**

---

## Troubleshooting Guide

### Issue: Webhook not received

**Symptoms**: Payment completes but user status not updated

**Diagnosis**:
```sql
SELECT * FROM payment_webhook_logs
WHERE email = 'jan@buskens.be'
ORDER BY processed_at DESC LIMIT 5;
```

**Possible causes**:
- Plug&Pay webhook not configured (check Plug&Pay dashboard)
- API key mismatch (check environment variable)
- Firewall blocking Plug&Pay IPs
- Endpoint not deployed to production

### Issue: Auto-login token not working

**Symptoms**: User redirected to login after payment

**Diagnosis**:
```sql
SELECT login_token, login_token_expires, login_token_used
FROM users
WHERE email = 'jan@buskens.be';
```

**Possible causes**:
- Token expired (>10 minutes since generation)
- Token already used (`login_token_used` = TRUE)
- Token not generated (webhook failed)

### Issue: Duplicate payments

**Symptoms**: User charged multiple times

**Diagnosis**:
```sql
SELECT COUNT(*), order_id FROM payment_webhook_logs
GROUP BY order_id
HAVING COUNT(*) > 1;
```

**Resolution**:
- Check idempotency logic in webhook handler
- Verify unique constraint on `users.plugandpay_order_id`
- Contact Plug&Pay support if actual duplicate charge

---

## Summary

**Total Testing Time**: ~55 minutes for all scenarios

**Critical Paths**:
1. ✅ Trial selection (no payment) - Scenario 1
2. ✅ Paid subscription flow - Scenario 2
3. ✅ Webhook processing - Scenarios 2, 5
4. ✅ Auto-login return - Scenarios 2, 6
5. ✅ Admin configuration - Scenario 7

**Success Criteria**:
- All 8 scenarios pass without errors
- Performance benchmarks met (<500ms webhook, <200ms redirect)
- No duplicate payments
- Smooth user experience (no manual intervention needed)

**Status**: Quickstart guide complete, ready for implementation testing
