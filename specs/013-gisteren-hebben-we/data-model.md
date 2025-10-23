# Data Model: Premium Plus Subscription Tier

**Feature**: 013-gisteren-hebben-we
**Date**: 2025-10-12

## Overview

This feature extends the existing subscription system with two new Premium Plus plans that offer unlimited attachment storage, differentiating them from Standard plans (100MB/5MB/1-per-task limits).

## Extended Entities

### 1. SUBSCRIPTION_PLANS Array

**Location**: In-memory constant defined in:
- `public/js/subscription-data.js` (frontend)
- `server.js` line ~9741 (backend)

**Current State**: 3 plans (trial_14_days, monthly_7, yearly_70)

**New Plans**:

```javascript
{
  id: 'monthly_8',
  name: 'Premium Plus Maandelijks',
  description: 'Ongelimiteerde bijlages per maand',
  price: 8,
  billing_cycle: 'monthly',
  trial_days: 0,
  features: [
    'Alle functies',
    'Onbeperkte taken',
    'Email import',
    'Premium support',
    'Ongelimiteerde bijlages',
    'Geen limiet op bestandsgrootte'
  ]
}

{
  id: 'yearly_80',
  name: 'Premium Plus Jaarlijks',
  description: 'Ongelimiteerde bijlages - bespaar €16 per jaar',
  price: 80,
  billing_cycle: 'yearly',
  trial_days: 0,
  features: [
    'Alle functies',
    'Onbeperkte taken',
    'Email import',
    'Premium support',
    'Ongelimiteerde bijlages',
    'Geen limiet op bestandsgrootte',
    '2 maanden gratis'
  ]
}
```

**Relationships**:
- Referenced by `POST /api/subscription/select` for plan validation
- Used by admin config endpoint to generate payment configuration cards
- Used by subscription page UI to render plan options

### 2. payment_configurations Table

**Location**: PostgreSQL database (Neon hosted)

**Schema** (already exists - no changes):
```sql
CREATE TABLE payment_configurations (
  plan_id VARCHAR(50) PRIMARY KEY,
  plan_name VARCHAR(255) NOT NULL,
  checkout_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**New Rows** (auto-populated by admin system):
```sql
INSERT INTO payment_configurations (plan_id, plan_name, checkout_url, is_active)
VALUES
  ('monthly_8', 'Premium Plus Maandelijks', NULL, FALSE),
  ('yearly_80', 'Premium Plus Jaarlijks', NULL, FALSE);
```

**Admin Flow**:
1. Admin visits `/admin-subscription-config.html`
2. Backend checks SUBSCRIPTION_PLANS array
3. For each plan_id not in payment_configurations → INSERT with NULL checkout_url
4. Admin UI renders configuration cards for all 5 plans
5. Admin sets checkout_url and marks is_active = TRUE via PUT endpoint

### 3. Subscription Tier Detection Logic

**Location**: `server.js` multiple locations

**Current Logic** (example from upload validation):
```javascript
const isPremium = user.trial_expires_at &&
                  new Date(user.trial_expires_at) > new Date() &&
                  user.plan_id &&
                  (user.plan_id === 'monthly_7' || user.plan_id === 'yearly_70');
```

**Updated Logic**:
```javascript
const isPremium = user.trial_expires_at &&
                  new Date(user.trial_expires_at) > new Date() &&
                  user.plan_id &&
                  (user.plan_id === 'monthly_7' ||
                   user.plan_id === 'yearly_70' ||
                   user.plan_id === 'monthly_8' ||
                   user.plan_id === 'yearly_80');
```

**Alternative (cleaner)**:
```javascript
const PREMIUM_PLAN_IDS = ['monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'];
const isPremium = user.trial_expires_at &&
                  new Date(user.trial_expires_at) > new Date() &&
                  user.plan_id &&
                  PREMIUM_PLAN_IDS.includes(user.plan_id);
```

**Usage Locations**:
- `/api/taak/:id/bijlagen` POST endpoint (upload validation)
- `/api/bijlagen/storage-stats` GET endpoint (limit calculation)
- Error messages (distinguish Standard vs Premium Plus)

### 4. Storage Limit Enforcement

**Location**: `storage-manager.js` STORAGE_CONFIG constant

**Current Limits** (line ~4-7):
```javascript
const STORAGE_CONFIG = {
  FREE_TIER_LIMIT: 100 * 1024 * 1024, // 100MB total
  MAX_FILE_SIZE_FREE: 5 * 1024 * 1024, // 5MB per file
  MAX_ATTACHMENTS_PER_TASK_FREE: 1, // 1 attachment per task
  ALLOWED_MIMETYPES: [/* ... */]
};
```

**Validation Logic** (in `validateFile` method):
```javascript
validateFile(file, isPremium, userStats) {
  const errors = [];

  // Skip size checks for Premium Plus users
  if (!isPremium && file.size > STORAGE_CONFIG.MAX_FILE_SIZE_FREE) {
    errors.push(`Maximum ${this.formatBytes(STORAGE_CONFIG.MAX_FILE_SIZE_FREE)} per bijlage voor Standard plan. Upgrade naar Premium Plus voor ongelimiteerde bijlages.`);
  }

  if (!isPremium) {
    const totalAfterUpload = userStats.used_bytes + file.size;
    if (totalAfterUpload > STORAGE_CONFIG.FREE_TIER_LIMIT) {
      errors.push(`Onvoldoende opslag. Upgrade naar Premium Plus voor ongelimiteerde bijlages.`);
    }
  }

  // MIME type validation applies to all users
  if (!STORAGE_CONFIG.ALLOWED_MIMETYPES.includes(file.mimetype)) {
    errors.push(`Bestandstype '${file.mimetype}' niet toegestaan.`);
  }

  return { valid: errors.length === 0, errors };
}
```

**No changes to STORAGE_CONFIG** - enforcement happens via `isPremium` flag checks.

## Tier Comparison Matrix

| Feature | Trial (14 days) | Standard (€7/€70) | Premium Plus (€8/€80) |
|---------|----------------|-------------------|----------------------|
| **Total Storage** | 100MB | 100MB | ♾️ Unlimited |
| **Max File Size** | 5MB | 5MB | ♾️ Unlimited |
| **Attachments per Task** | 1 | 1 | ♾️ Unlimited |
| **All Features** | ✅ | ✅ | ✅ |
| **Email Import** | ✅ | ✅ | ✅ |
| **Premium Support** | ❌ | ✅ | ✅ |
| **Priority Updates** | ❌ | ❌ | ✅ (implied) |

## Validation Rules

### Frontend Validation

**Location**: `public/js/subscription-data.js` - SUBSCRIPTION_VALIDATION object

**New Plan IDs**:
```javascript
isValidPlanId: function(planId) {
  return SUBSCRIPTION_PLANS.some(plan => plan.id === planId);
  // Now accepts: trial_14_days, monthly_7, yearly_70, monthly_8, yearly_80
}
```

**Feature Display**:
```javascript
getFeaturesHtml: function(planId) {
  const plan = this.getPlanById(planId);
  if (!plan || !plan.features) return '';
  return plan.features.map(feature => `<li>${feature}</li>`).join('');
}
```

### Backend Validation

**Location**: `server.js` - `/api/subscription/select` endpoint

**Plan ID Validation**:
```javascript
const validPlanIds = ['trial_14_days', 'monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'];
if (!validPlanIds.includes(plan_id)) {
  return res.status(400).json({ error: 'Invalid plan_id' });
}
```

**Checkout URL Validation**:
```javascript
const paymentConfig = await db.query(
  'SELECT checkout_url FROM payment_configurations WHERE plan_id = $1 AND is_active = TRUE',
  [plan_id]
);

if (!paymentConfig.rows[0]?.checkout_url) {
  return res.status(400).json({ error: 'Payment configuration not available for this plan' });
}
```

## State Transitions

### User Subscription Flow

```
[No Subscription]
  ↓ (registers)
[Trial - 14 days] (trial_14_days)
  ↓ (trial expires)
[Beta Expired Page]
  ↓ (selects plan)
  ├─→ [Standard Monthly] (monthly_7) → Plug&Pay checkout
  ├─→ [Standard Yearly] (yearly_70) → Plug&Pay checkout
  ├─→ [Premium Plus Monthly] (monthly_8) → Plug&Pay checkout
  └─→ [Premium Plus Yearly] (yearly_80) → Plug&Pay checkout
      ↓ (payment confirmed)
    [Active Subscription]
```

### Storage Enforcement State

```
[User uploads file]
  ↓
[Check user.plan_id]
  ├─→ Standard (trial/monthly_7/yearly_70)
  │   ↓
  │   [Apply STORAGE_CONFIG limits]
  │   ├─→ File > 5MB → ERROR "Upgrade naar Premium Plus"
  │   ├─→ Already has 1 attachment → ERROR "Upgrade naar Premium Plus"
  │   └─→ Total > 100MB → ERROR "Upgrade naar Premium Plus"
  │
  └─→ Premium Plus (monthly_8/yearly_80)
      ↓
      [Skip all storage limits]
      └─→ Upload succeeds (only MIME type validation)
```

## No Database Migrations Required

✅ **payment_configurations table** already exists with correct schema
✅ **users table** already has plan_id column
✅ **New plan IDs** auto-populate via admin config endpoint
✅ **Storage validation** uses existing isPremium flag logic

This is a **data-only change** - no schema modifications needed.

---

**Next Steps**: See `contracts/` for API contract specifications and `quickstart.md` for integration testing scenarios.
