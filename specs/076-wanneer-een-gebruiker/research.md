# Research: Admin Email Notification for Trial Starts

**Feature**: 076-wanneer-een-gebruiker
**Date**: 2025-12-22

## Research Summary

### 1. Existing Admin Notification System

**Decision**: Use the existing `sendNewCustomerNotification()` function pattern
**Rationale**: The function at `server.js:495-595` already implements all Mailgun infrastructure, HTML email templates, and error handling
**Alternatives considered**: Creating new email service - rejected because existing infrastructure is already tested and working

**Current Implementation Details:**
- Function: `sendNewCustomerNotification(customerEmail, customerName, planName)` at `server.js:495`
- Uses Mailgun via `mailgun.js` library
- Sends to: `support@tickedify.com`
- From: `Tickedify <noreply@mg.tickedify.com>`
- Domain: `mg.tickedify.com` (EU region)
- HTML template with professional styling
- Plain text fallback included
- Non-blocking error handling (logs error but doesn't crash)

**Called from:** Webhook handler at `server.js:5585` after successful payment

### 2. Trial Activation Location

**Decision**: Add notification call in `/api/subscription/select` endpoint
**Rationale**: This is the single point where trials are activated (line 5335-5351)
**Alternatives considered**:
- Registration endpoint - rejected because trial isn't activated there, only after plan selection
- Separate endpoint - rejected because trial activation happens inline in subscription/select

**Current Trial Flow:**
1. User registers → goes to `/subscription` page
2. User selects "14-day trial" (planId = `PLAN_IDS.TRIAL_14`)
3. `POST /api/subscription/select` handles selection
4. If trial: Updates user record with `subscription_status = 'trialing'`
5. Returns success with `trial: true`

**Location for notification:** After successful database update at line 5343, before return statement

### 3. Email Content Differentiation

**Decision**: Create new function `sendNewTrialNotification()` with distinct template
**Rationale**: Clear visual differentiation helps admin quickly distinguish trial starts from paying customers
**Alternatives considered**:
- Reuse same function with parameter - rejected because email content should be noticeably different
- Same template with different badge - possible but distinct function is cleaner

**Differentiation approach:**
- Different subject line: "Nieuwe Trial Gebruiker" vs "Nieuwe Klant"
- Different badge: "TRIAL GESTART" (blue/orange) vs "BETALING SUCCESVOL" (green)
- Similar info fields: Name, Email, Trial Start Date, Trial End Date (instead of Plan name)

### 4. Error Handling Strategy

**Decision**: Non-blocking notification (same as subscription notifications)
**Rationale**: User experience should not be impacted if admin email fails
**Alternatives considered**:
- Blocking notification - rejected because trial activation is more important than admin notification
- Retry queue - over-engineering for this use case

**Implementation:**
- Try-catch around notification call
- Log error if fails
- Continue with successful trial response regardless
- No user-facing error message

### 5. User Data Available at Trial Start

**Decision**: Use data available in the endpoint context
**Rationale**: All needed data is already available from session and database query

**Available data:**
- `userId` - from `req.session.userId`
- `user.email` - from database query at line 5318
- `user.name` - can be fetched by adding to existing query
- `trialEndDate` - calculated at line 5336
- `trialStartDate` - CURRENT_DATE (can use `new Date()`)

**Query modification needed:** Add `naam` to SELECT at line 5318

## Technical Dependencies

- **Mailgun**: Already configured and working (same as password reset and customer notifications)
- **Environment Variables**: `MAILGUN_API_KEY` - already set
- **Email Domain**: `mg.tickedify.com` - already configured

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mailgun unavailable | Low - user still gets trial | Non-blocking notification |
| Email to wrong recipient | Medium - admin misses notification | Use same `support@tickedify.com` |
| Duplicate notifications | Low | Only called once in flow |

## Conclusion

This is a straightforward feature that follows existing patterns:
1. Create `sendNewTrialNotification()` function similar to `sendNewCustomerNotification()`
2. Call it in `/api/subscription/select` after successful trial activation
3. Non-blocking error handling ensures user experience is not affected
