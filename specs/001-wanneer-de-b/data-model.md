# Data Model: Subscription Selection

**Feature**: Abonnement Selectie Scherm voor Bèta Overgang
**Date**: 2025-01-21

## Entity Overview

This feature extends the existing user model and introduces subscription plan concepts.

## Core Entities

### 1. SubscriptionPlan (Static Configuration)
**Description**: Represents available subscription options

**Attributes**:
- `id`: String - Unique identifier ('trial_14_days', 'monthly_7', 'yearly_70')
- `name`: String - Display name ('14 dagen gratis', 'Maandelijks', 'Jaarlijks')
- `description`: String - Plan description
- `price`: Number - Price in euros (0, 7, 70)
- `billing_cycle`: String - Billing frequency ('trial', 'monthly', 'yearly')
- `trial_days`: Number - Trial period in days (14, 0, 0)
- `features`: Array<String> - List of included features

**Static Data** (hardcoded in JavaScript):
```javascript
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
  }
];
```

### 2. User (Extended Existing Entity)
**Description**: Existing user entity extended with subscription selection

**New Attributes**:
- `selected_plan`: String | null - Currently selected plan ID
- `plan_selected_at`: Timestamp | null - When plan was selected
- `selection_source`: String | null - Source of selection ('beta', 'upgrade', 'registration')

**Existing Relevant Attributes**:
- `id`: Number - User identifier
- `email`: String - User email
- `account_type`: String - Current account type ('beta', 'regular')
- `subscription_status`: String - Current subscription status

### 3. SubscriptionSelection (Temporary State)
**Description**: Represents user's current selection state (in sessionStorage)

**Attributes**:
- `selected_plan_id`: String | null - Currently selected plan
- `timestamp`: Number - When selection was made
- `source`: String - How user reached the selection screen

## Relationships

```
User (1) ---- (0..1) SubscriptionSelection
User (0..1) ---- (1) SubscriptionPlan (via selected_plan)
```

## Database Schema Changes

### Users Table Extension
```sql
-- Add new columns to existing users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS selected_plan VARCHAR(20),
ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS selection_source VARCHAR(20);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_selected_plan
ON users(selected_plan) WHERE selected_plan IS NOT NULL;
```

## Validation Rules

### SubscriptionPlan Validation
- `id` must be one of: 'trial_14_days', 'monthly_7', 'yearly_70'
- `price` must be non-negative number
- `billing_cycle` must be one of: 'trial', 'monthly', 'yearly'
- `trial_days` must be non-negative integer

### User Selection Validation
- `selected_plan` must reference valid SubscriptionPlan.id or be null
- `plan_selected_at` should be set when `selected_plan` is not null
- `selection_source` must be one of: 'beta', 'upgrade', 'registration', null

## State Transitions

### User Selection Flow
```
Initial State: selected_plan = null
     ↓ [user visits subscription page]
Selection State: selected_plan = null, UI shows options
     ↓ [user clicks plan option]
Selected State: selected_plan = plan_id, plan_selected_at = now()
     ↓ [future: payment processing]
Subscribed State: subscription_status = 'active'
```

### Beta Transition Flow
```
account_type = 'beta' AND beta_expired = true
     ↓ [redirect to subscription page]
selection_source = 'beta'
     ↓ [user selects plan]
selected_plan = plan_id, plan_selected_at = now()
     ↓ [future: successful payment]
account_type = 'regular', subscription_status = 'active'
```

## Data Access Patterns

### Read Operations
- **Get available plans**: Return static SUBSCRIPTION_PLANS array
- **Get user selection**: `SELECT selected_plan, plan_selected_at FROM users WHERE id = ?`
- **Check user eligibility**: Based on account_type and subscription_status

### Write Operations
- **Store selection**: `UPDATE users SET selected_plan = ?, plan_selected_at = NOW(), selection_source = ? WHERE id = ?`
- **Clear selection**: `UPDATE users SET selected_plan = NULL, plan_selected_at = NULL WHERE id = ?`

## Business Rules

### Selection Eligibility
- Beta users with expired beta period: Can select any plan
- New users during registration: Can select any plan
- Existing free users: Can select any plan
- Existing paid users: Cannot change selection (future: upgrade/downgrade logic)

### Plan Availability
- All three plans are always available
- No plan limits or restrictions in this phase
- Future: May add user-specific pricing or limited-time offers

## Future Considerations

### Payment Integration
When payment processing is added, the model will extend with:
- Payment transaction entities
- Subscription period tracking
- Billing history
- Failed payment handling

### Plan Management
Future enhancements may include:
- Dynamic pricing
- Limited-time offers
- User-specific discounts
- Plan feature toggles

This data model provides the foundation for subscription selection while remaining flexible for future payment integration.