# Quickstart: Subscription Selection Feature

**Feature**: Abonnement Selectie Scherm voor Bèta Overgang
**Date**: 2025-01-21

## Prerequisites

- Tickedify application running locally on http://localhost:3000
- PostgreSQL database with existing users table
- User with beta account for testing

## Quick Setup

### 1. Database Migration
```sql
-- Run this SQL to add required columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS selected_plan VARCHAR(20),
ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS selection_source VARCHAR(20);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_selected_plan
ON users(selected_plan) WHERE selected_plan IS NOT NULL;
```

### 2. Create Subscription Page
Create `public/subscription.html` with subscription plan selection UI.

### 3. Add API Endpoints
Add these endpoints to `server.js`:
- `GET /api/subscription/plans`
- `POST /api/subscription/select`
- `GET /api/subscription/status`

### 4. Update Beta Transition Logic
Modify `public/app.js` `showUpgradeMessage()` function to redirect to subscription page.

## Testing the Feature

### Manual Testing Steps

1. **Access Subscription Page**
   ```
   Navigate to: http://localhost:3000/subscription.html
   Expected: Page displays three subscription options
   ```

2. **Test Plan Selection**
   - Click "14 dagen gratis" option
   - Expected: Visual feedback shows selection
   - Click "Maandelijks €7/maand" option
   - Expected: Selection changes to monthly plan
   - Click "Jaarlijks €70/jaar" option
   - Expected: Selection changes to yearly plan

3. **Test Selection Persistence**
   - Select any plan
   - Refresh the page
   - Expected: Selected plan is remembered (if implemented)

4. **Test Beta User Flow**
   ```
   1. Login as beta user with expired beta period
   2. Try to access main app
   3. Expected: Redirected to subscription selection
   4. Select a plan
   5. Expected: Selection stored in database
   ```

### API Testing

#### Get Available Plans
```bash
curl -X GET http://localhost:3000/api/subscription/plans \
  -H "Content-Type: application/json"
```

Expected Response:
```json
{
  "success": true,
  "plans": [
    {
      "id": "trial_14_days",
      "name": "14 dagen gratis",
      "description": "Probeer alle functies gratis uit",
      "price": 0,
      "billing_cycle": "trial",
      "trial_days": 14,
      "features": ["Alle functies", "Onbeperkte taken", "Email import"]
    },
    {
      "id": "monthly_7",
      "name": "Maandelijks",
      "description": "Per maand, stop wanneer je wilt",
      "price": 7,
      "billing_cycle": "monthly",
      "trial_days": 0,
      "features": ["Alle functies", "Onbeperkte taken", "Email import", "Premium support"]
    },
    {
      "id": "yearly_70",
      "name": "Jaarlijks",
      "description": "Bespaar €14 per jaar",
      "price": 70,
      "billing_cycle": "yearly",
      "trial_days": 0,
      "features": ["Alle functies", "Onbeperkte taken", "Email import", "Premium support", "2 maanden gratis"]
    }
  ]
}
```

#### Select Subscription Plan
```bash
curl -X POST http://localhost:3000/api/subscription/select \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "monthly_7",
    "source": "beta"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Plan selection saved successfully",
  "selected_plan": "monthly_7"
}
```

#### Get User Status
```bash
curl -X GET http://localhost:3000/api/subscription/status \
  -H "Content-Type: application/json"
```

Expected Response:
```json
{
  "success": true,
  "selected_plan": "monthly_7",
  "plan_selected_at": "2025-01-21T10:30:00Z",
  "selection_source": "beta",
  "can_select": true,
  "account_type": "beta"
}
```

## User Story Validation

### Story 1: Beta User Subscription Selection
**Given**: Beta user with expired beta period
**When**: User attempts to access application
**Then**: User sees subscription selection screen with three options

**Validation Steps**:
1. Set up beta user with expired period in database
2. Login attempt should redirect to /subscription.html
3. Verify three plans are displayed with correct pricing
4. Verify visual design matches existing app style

### Story 2: Plan Selection and Feedback
**Given**: User is on subscription selection screen
**When**: User clicks on a subscription plan
**Then**: Selection is visually confirmed but no payment processing occurs

**Validation Steps**:
1. Click each plan option
2. Verify visual feedback (highlight, checkmark, etc.)
3. Verify only one plan can be selected at a time
4. Verify no payment forms or external redirects occur

### Story 3: Reusability for New Users
**Given**: New user during registration process
**When**: User reaches subscription selection
**Then**: Same three options are shown with identical functionality

**Validation Steps**:
1. Access /subscription.html?source=registration
2. Verify same UI and functionality as beta flow
3. Verify selection is stored with source="registration"

## Common Issues and Solutions

### Issue: Database Connection Error
**Symptom**: API endpoints return 500 errors
**Solution**: Check PostgreSQL connection and verify database schema

### Issue: Session Authentication
**Symptom**: API returns 401 unauthorized
**Solution**: Ensure user is logged in and session is valid

### Issue: Plan Not Displaying
**Symptom**: Subscription page shows empty or broken layout
**Solution**: Check console for JavaScript errors, verify HTML/CSS files

### Issue: Selection Not Persisting
**Symptom**: Selected plan is lost on page refresh
**Solution**: Verify API endpoint is working and database updates are successful

## Performance Validation

### Page Load Performance
- Subscription page should load in < 2 seconds
- API responses should return in < 500ms
- JavaScript should execute without blocking UI

### Database Performance
- Plan selection should complete in < 100ms
- User status queries should be under 50ms
- No unnecessary database queries per request

## Browser Compatibility

Test in these browsers:
- ✅ Chrome 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ❌ IE (not supported)

## Security Validation

### Authentication
- All API endpoints require valid user session
- Unauthorized requests return 401 status
- No sensitive data exposed in client-side code

### Input Validation
- Only valid plan_ids are accepted
- Only valid source values are accepted
- Malformed requests return 400 status

## Ready for Production Checklist

- [ ] Database migration completed successfully
- [ ] All API endpoints return expected responses
- [ ] Manual testing passes for all user stories
- [ ] Performance meets requirements
- [ ] Security validation complete
- [ ] Browser compatibility verified
- [ ] Integration with existing beta transition logic working
- [ ] Visual design matches existing application

## Next Phase: Payment Integration

When payment processing is added, these additional validation steps will be needed:
- Payment gateway integration testing
- Subscription activation flow validation
- Billing cycle management verification
- Failed payment handling

This quickstart provides the foundation for validating the subscription selection feature before moving to payment implementation.