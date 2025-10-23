# API Contracts: Abonnement-Betalingsproces

**Feature**: 011-in-de-app
**Date**: 2025-10-11
**Status**: Contract Definition Complete

## Overview

Dit document beschrijft alle API endpoints voor het abonnement-betalingsproces. Contracts zijn gedefinieerd voor frontend subscription selection, webhook processing, admin configuration, en payment return flows.

---

## 1. POST /api/subscription/select

**Purpose**: Gebruiker selecteert een subscription plan (trial of betaald)

### Request

**Headers**:
```
Content-Type: application/json
Cookie: session=[session_id]
```

**Body**:
```json
{
  "plan_id": "monthly_7",
  "source": "beta"
}
```

**Parameters**:
- `plan_id` (string, required): One of `trial_14_days`, `monthly_7`, `yearly_70`
- `source` (string, required): One of `beta`, `registration`, `upgrade`

### Response: Success (Trial Selected)

**Status**: 200 OK

```json
{
  "success": true,
  "plan_id": "trial_14_days",
  "subscription_status": "trialing",
  "trial_start_date": "2025-10-11",
  "trial_end_date": "2025-10-25",
  "redirect_url": null,
  "message": "Je gratis proefperiode van 14 dagen is gestart!"
}
```

### Response: Success (Paid Plan Selected)

**Status**: 200 OK

```json
{
  "success": true,
  "plan_id": "monthly_7",
  "subscription_status": "beta",
  "redirect_url": "https://pay.baasoverjetijd.be/checkout/tickedify-monthly?email=jan@buskens.be&user_id=123",
  "message": "Je wordt doorgestuurd naar de betaalpagina..."
}
```

### Response: Error (Checkout URL Not Configured)

**Status**: 400 Bad Request

```json
{
  "success": false,
  "error": "Betaallink niet geconfigureerd voor dit abonnement. Neem contact op met support.",
  "plan_id": "monthly_7"
}
```

### Response: Error (Trial Already Used)

**Status**: 400 Bad Request

```json
{
  "success": false,
  "error": "Je hebt al eerder de gratis proefperiode gebruikt.",
  "plan_id": "trial_14_days",
  "had_trial": true
}
```

### Response: Error (Invalid Plan)

**Status**: 400 Bad Request

```json
{
  "success": false,
  "error": "Ongeldig abonnement geselecteerd",
  "plan_id": "invalid_plan"
}
```

### Business Logic

1. Validate user is authenticated
2. Validate `plan_id` is one of: `trial_14_days`, `monthly_7`, `yearly_70`
3. If trial selected:
   - Check `had_trial` flag → reject if TRUE
   - Set `subscription_status` = 'trialing'
   - Set `trial_start_date` = TODAY
   - Set `trial_end_date` = TODAY + 14 days
   - Set `had_trial` = TRUE
   - Return success without redirect
4. If paid plan selected:
   - Look up `checkout_url` from `payment_configurations`
   - If not found or empty → return 400 error
   - Append query params: `email`, `user_id`, `plan_id`
   - Update `selected_plan` and `plan_selected_at`
   - Return redirect URL
5. Log selection event

---

## 2. POST /api/webhooks/plugandpay

**Purpose**: Plug&Pay webhook voor payment confirmation

### Request

**Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Body** (form-urlencoded):
```
webhook_event=order_payment_completed
&status=paid
&order_id=pp_order_abc123xyz
&email=jan@buskens.be
&amount=700
&api_key=[API_KEY]
&customer_name=Jan Buskens
&plan_id=monthly_7
```

**Parameters**:
- `webhook_event` (string): Event type (`order_payment_completed`)
- `status` (string): Payment status (`paid`, `failed`, `cancelled`)
- `order_id` (string, required): Unique Plug&Pay order ID
- `email` (string, required): User email
- `amount` (integer): Amount in cents
- `api_key` (string, required): Plug&Pay API key for validation
- `plan_id` (string): Selected plan ID

### Response: Success

**Status**: 200 OK

```json
{
  "success": true,
  "message": "Payment processed successfully",
  "order_id": "pp_order_abc123xyz",
  "user_id": 123
}
```

### Response: Success (Duplicate)

**Status**: 200 OK

```json
{
  "success": true,
  "message": "Payment already processed (idempotent)",
  "order_id": "pp_order_abc123xyz",
  "duplicate": true
}
```

### Response: Error (Invalid API Key)

**Status**: 401 Unauthorized

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### Response: Error (User Not Found)

**Status**: 404 Not Found

```json
{
  "success": false,
  "error": "User not found for email",
  "email": "unknown@example.com"
}
```

### Business Logic

1. Parse form-urlencoded body into payload object
2. Validate API key from `payload.api_key`
   - If invalid → return 401
3. Extract email: `payload.email` or `payload.customer_email`
4. Check idempotency: SELECT user WHERE `plugandpay_order_id` = `payload.order_id`
   - If found → return 200 (already processed)
5. Find user by email
   - If not found → return 404
6. Update user:
   - `subscription_status` = 'active'
   - `payment_confirmed_at` = NOW()
   - `plugandpay_order_id` = `payload.order_id`
   - `amount_paid_cents` = `payload.amount`
   - Generate auto-login token (random 30 chars)
   - `login_token_expires` = NOW() + 10 minutes
   - `login_token_used` = FALSE
7. Log webhook to `payment_webhook_logs` table
8. Async: Sync to GoHighLevel (add tag 'tickedify-paid-customer')
9. Return 200 OK

### Security Considerations

- **API Key Validation**: MUST verify before processing
- **Idempotency**: MUST check order_id to prevent duplicate charges
- **Rate Limiting**: Max 100 requests/minute per IP
- **Logging**: ALL webhooks logged (success and failure)

---

## 3. GET /api/payment/success

**Purpose**: Return URL after successful Plug&Pay checkout

### Request

**Query Parameters**:
- `token` (string, required): Auto-login token from webhook
- `plan` (string, optional): Plan ID for confirmation message
- `order` (string, optional): Plug&Pay order ID

**Example**:
```
GET /api/payment/success?token=abc123xyz789def456ghi&plan=monthly_7&order=pp_order_123
```

### Response: Success

**Status**: 302 Redirect → `/app` with session cookie set

**Set-Cookie**:
```
session=[new_session_id]; HttpOnly; Secure; SameSite=Lax
```

**Flash Message** (stored in session):
```json
{
  "type": "success",
  "message": "Je abonnement is actief! Welkom bij Tickedify."
}
```

### Response: Error (Token Invalid/Expired)

**Status**: 302 Redirect → `/login?reason=token_expired`

**Flash Message**:
```json
{
  "type": "info",
  "message": "Je betaling is geslaagd! Log in om door te gaan."
}
```

### Response: Error (Token Already Used)

**Status**: 302 Redirect → `/login?reason=token_used`

**Flash Message**:
```json
{
  "type": "warning",
  "message": "Deze login link is al gebruikt. Log in met je email en wachtwoord."
}
```

### Business Logic

1. Extract `token` from query params
2. Validate token:
   - SELECT user WHERE `login_token` = token
   - Check `login_token_used` = FALSE
   - Check `login_token_expires` > NOW()
3. If valid:
   - Mark token as used: `login_token_used` = TRUE
   - Create session for user
   - Set session cookie
   - Redirect to `/app` with success message
4. If invalid/expired:
   - Redirect to `/login` with appropriate message
5. Log token usage attempt

---

## 4. GET /api/payment/cancelled

**Purpose**: Return URL when user cancels Plug&Pay checkout

### Request

**Query Parameters**: None required

### Response

**Status**: 302 Redirect → `/subscription?cancelled=true`

**Flash Message**:
```json
{
  "type": "info",
  "message": "Betaling geannuleerd. Je kunt het opnieuw proberen wanneer je klaar bent."
}
```

### Business Logic

1. Set flash message for cancelled payment
2. Redirect to subscription selection screen
3. User can retry payment selection
4. No database changes needed

---

## 5. GET /api/admin/payment-configurations

**Purpose**: Admin ophalen van alle payment configurations

### Request

**Headers**:
```
Cookie: admin_session=[session_id]
```

**Authentication**: Admin role required

### Response: Success

**Status**: 200 OK

```json
{
  "success": true,
  "configurations": [
    {
      "id": 1,
      "plan_id": "monthly_7",
      "plan_name": "Maandelijks €7",
      "checkout_url": "https://pay.baasoverjetijd.be/checkout/tickedify-monthly",
      "is_active": true,
      "created_at": "2025-10-11T10:00:00Z",
      "updated_at": "2025-10-11T10:00:00Z"
    },
    {
      "id": 2,
      "plan_id": "yearly_70",
      "plan_name": "Jaarlijks €70",
      "checkout_url": "https://pay.baasoverjetijd.be/checkout/tickedify-yearly",
      "is_active": true,
      "created_at": "2025-10-11T10:00:00Z",
      "updated_at": "2025-10-11T10:00:00Z"
    }
  ]
}
```

### Response: Error (Not Authenticated)

**Status**: 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required"
}
```

### Response: Error (Not Admin)

**Status**: 403 Forbidden

```json
{
  "success": false,
  "error": "Admin access required"
}
```

### Business Logic

1. Validate admin session
2. SELECT all from `payment_configurations` ORDER BY `plan_id`
3. Return configurations array
4. Note: Trial plan NOT included (no payment needed)

---

## 6. PUT /api/admin/payment-configurations/:plan_id

**Purpose**: Admin update checkout URL voor specific plan

### Request

**Headers**:
```
Content-Type: application/json
Cookie: admin_session=[session_id]
```

**Path Parameters**:
- `plan_id` (string): One of `monthly_7`, `yearly_70`

**Body**:
```json
{
  "checkout_url": "https://pay.baasoverjetijd.be/checkout/tickedify-monthly",
  "is_active": true
}
```

**Parameters**:
- `checkout_url` (string, required): HTTPS URL to Plug&Pay checkout
- `is_active` (boolean, optional): Enable/disable this plan

### Response: Success

**Status**: 200 OK

```json
{
  "success": true,
  "message": "Configuratie opgeslagen",
  "configuration": {
    "id": 1,
    "plan_id": "monthly_7",
    "plan_name": "Maandelijks €7",
    "checkout_url": "https://pay.baasoverjetijd.be/checkout/tickedify-monthly",
    "is_active": true,
    "updated_at": "2025-10-11T14:30:00Z"
  }
}
```

### Response: Error (Invalid URL)

**Status**: 400 Bad Request

```json
{
  "success": false,
  "error": "Checkout URL moet een geldige HTTPS URL zijn",
  "checkout_url": "http://invalid.com"
}
```

### Response: Error (Plan Not Found)

**Status**: 404 Not Found

```json
{
  "success": false,
  "error": "Abonnement niet gevonden",
  "plan_id": "invalid_plan"
}
```

### Business Logic

1. Validate admin session
2. Validate `checkout_url`:
   - Must start with `https://`
   - Must be valid URL format
3. UPDATE `payment_configurations` SET:
   - `checkout_url` = provided value
   - `is_active` = provided value (default TRUE)
   - `updated_at` = NOW()
4. WHERE `plan_id` = provided plan_id
5. Return updated configuration
6. Log admin action

---

## 7. GET /api/subscription/status

**Purpose**: Get current user's subscription status (for frontend display)

### Request

**Headers**:
```
Cookie: session=[session_id]
```

### Response: Success (Active Subscription)

**Status**: 200 OK

```json
{
  "success": true,
  "subscription_status": "active",
  "selected_plan": "monthly_7",
  "plan_name": "Maandelijks €7",
  "payment_confirmed_at": "2025-10-11T12:00:00Z",
  "can_access_app": true
}
```

### Response: Success (Trial Active)

**Status**: 200 OK

```json
{
  "success": true,
  "subscription_status": "trialing",
  "selected_plan": "trial_14_days",
  "plan_name": "14 dagen gratis proefperiode",
  "trial_start_date": "2025-10-11",
  "trial_end_date": "2025-10-25",
  "days_remaining": 14,
  "can_access_app": true
}
```

### Response: Success (Trial Expired)

**Status**: 200 OK

```json
{
  "success": true,
  "subscription_status": "trial_expired",
  "selected_plan": "trial_14_days",
  "trial_end_date": "2025-10-25",
  "can_access_app": false,
  "message": "Je gratis proefperiode is afgelopen. Kies een abonnement om door te gaan."
}
```

### Response: Error (Not Authenticated)

**Status**: 401 Unauthorized

```json
{
  "success": false,
  "error": "Not authenticated"
}
```

### Business Logic

1. Validate user session
2. Get user from database
3. Check if trial expired (compare `trial_end_date` with NOW())
   - If expired and status still 'trialing' → update to 'trial_expired'
4. Calculate days remaining for trial
5. Determine `can_access_app`:
   - TRUE if status = 'active' or 'trialing'
   - FALSE if status = 'trial_expired', 'expired', 'beta'
6. Return subscription status with appropriate fields

---

## Contract Testing Strategy

### Test Files to Create

1. `tests/contract/test-subscription-select.js`
   - Test all plan selections (trial, monthly, yearly)
   - Test error cases (invalid plan, trial already used, missing checkout URL)
   - Verify database updates
   - Verify redirect URL generation

2. `tests/contract/test-webhook-processing.js`
   - Test successful payment webhook
   - Test duplicate webhook (idempotency)
   - Test invalid API key
   - Test user not found
   - Verify database updates
   - Verify auto-login token generation

3. `tests/contract/test-payment-return.js`
   - Test success return with valid token
   - Test expired token
   - Test already used token
   - Verify session creation
   - Verify redirects

4. `tests/contract/test-admin-config.js`
   - Test get all configurations
   - Test update configuration
   - Test URL validation
   - Test admin authentication
   - Verify database updates

5. `tests/contract/test-subscription-status.js`
   - Test active subscription status
   - Test trial status
   - Test trial expiry detection
   - Test access control flags

### Contract Validation

All tests MUST:
- ✅ Validate request/response schemas
- ✅ Test authentication and authorization
- ✅ Test error cases and edge cases
- ✅ Verify database state changes
- ✅ Test idempotency where applicable
- ✅ Currently FAIL (no implementation yet)

---

## Summary

**API Endpoints**: 7 total
- 3 User-facing endpoints (subscription select, status, payment return)
- 1 Webhook endpoint (Plug&Pay integration)
- 2 Admin endpoints (config get/update)
- 1 Cancellation endpoint

**Security**:
- API key validation on webhooks
- Admin authentication on config endpoints
- Auto-login token security (10-min expiry, single-use)
- Idempotency on payment processing

**Status**: Contracts defined, ready for test generation
