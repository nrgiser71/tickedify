# API Contract: Trial Notification

**Feature**: 076-wanneer-een-gebruiker
**Date**: 2025-12-22

## Modified Endpoint

### POST /api/subscription/select

**No API changes required** - The endpoint behavior remains the same. The notification is an internal side-effect.

#### Current Response (unchanged)
```json
{
  "success": true,
  "trial": true,
  "trialEndDate": "2025-01-05",
  "message": "Trial geactiveerd! Je hebt 14 dagen om Tickedify uit te proberen."
}
```

## Internal Function Contract

### sendNewTrialNotification()

**Purpose**: Send admin notification when a user starts a trial

**Signature**:
```javascript
async function sendNewTrialNotification(
  customerEmail: string,
  customerName: string,
  trialStartDate: Date,
  trialEndDate: Date
): Promise<boolean>
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerEmail | string | Yes | User's email address |
| customerName | string | Yes | User's display name |
| trialStartDate | Date | Yes | Trial start date |
| trialEndDate | Date | Yes | Trial end date |

**Returns**: `boolean` - `true` if email sent successfully, throws on failure

**Side Effects**:
- Sends email via Mailgun to `support@tickedify.com`
- Logs success/failure to console

**Error Handling**:
- Throws `Error('Email service not configured')` if Mailgun not configured
- Throws `Error('Failed to send trial notification')` on Mailgun failure
- Caller should catch and handle errors non-blockingly

## Email Contract

### Email Message Structure

**Headers**:
```
From: Tickedify <noreply@mg.tickedify.com>
To: support@tickedify.com
Subject: Nieuwe Trial Gebruiker voor Tickedify
```

**HTML Body**: Professional template with:
- Header: "🚀 Nieuwe Trial Gebruiker!" (blue/teal gradient)
- Badge: "TRIAL GESTART" (blue/orange background)
- Info box with:
  - Naam: {customerName}
  - Email: {customerEmail}
  - Trial Start: {trialStartDate}
  - Trial Einde: {trialEndDate}
- Footer: "Tickedify Admin Notificatie"

**Plain Text Fallback**:
```
NIEUWE TRIAL GEBRUIKER VOOR TICKEDIFY
=====================================

Er heeft zich zojuist een nieuwe gebruiker geregistreerd voor een trial.

Gebruiker gegevens:
- Naam: {customerName}
- Email: {customerEmail}
- Trial Start: {trialStartDate}
- Trial Einde: {trialEndDate}

Tickedify Admin Notificatie
```

## Integration Points

### Call Site: /api/subscription/select (server.js ~line 5345)

**When**: After successful trial database update, before return statement

**Integration Pattern**:
```javascript
// After line 5343 (database update)
// Before line 5346 (return statement)

// Send admin notification (non-blocking)
try {
  await sendNewTrialNotification(
    user.email,
    user.naam,
    new Date(),
    trialEndDate
  );
} catch (notificationError) {
  console.error('⚠️ Failed to send trial notification:', notificationError);
  // Continue - don't fail the trial activation
}
```

## Test Cases

### Contract Tests

1. **sendNewTrialNotification with valid data**
   - Input: valid email, name, dates
   - Expected: returns true, email sent

2. **sendNewTrialNotification with Mailgun unavailable**
   - Input: valid data, Mailgun API key not set
   - Expected: throws Error('Email service not configured')

3. **Email content verification**
   - Expected: Subject matches "Nieuwe Trial Gebruiker voor Tickedify"
   - Expected: HTML contains all user data
   - Expected: Plain text contains all user data
