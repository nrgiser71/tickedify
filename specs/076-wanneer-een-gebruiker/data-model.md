# Data Model: Admin Email Notification for Trial Starts

**Feature**: 076-wanneer-een-gebruiker
**Date**: 2025-12-22

## No Database Changes Required

This feature does not require any database schema changes. It uses existing data structures:

### Existing Entities Used

#### 1. User (existing table: `users`)
**Purpose**: Source of trial user information for notification email

| Field | Type | Used For |
|-------|------|----------|
| `id` | VARCHAR | User identifier |
| `email` | VARCHAR | Notification email content |
| `naam` | VARCHAR | Notification email content |
| `subscription_status` | VARCHAR | Verify trial activation |
| `trial_start_date` | DATE | Notification email content |
| `trial_end_date` | DATE | Notification email content |

#### 2. Admin Notification (email, not database entity)
**Purpose**: Inform administrator about new trial user

| Field | Description |
|-------|-------------|
| `customerEmail` | User's email address |
| `customerName` | User's name |
| `trialStartDate` | Date trial started |
| `trialEndDate` | Date trial ends |

## Data Flow

```
User selects trial plan
        ↓
POST /api/subscription/select
        ↓
Database updated with trial_start_date, trial_end_date
        ↓
sendNewTrialNotification() called with user data
        ↓
Email sent to support@tickedify.com
        ↓
Response returned to user (success)
```

## Email Template Data

The notification email will include:

```javascript
{
  to: 'support@tickedify.com',
  from: 'Tickedify <noreply@mg.tickedify.com>',
  subject: 'Nieuwe Trial Gebruiker voor Tickedify',
  data: {
    customerEmail: user.email,
    customerName: user.naam,
    trialStartDate: new Date().toISOString().split('T')[0],
    trialEndDate: trialEndDate.toISOString().split('T')[0]
  }
}
```
