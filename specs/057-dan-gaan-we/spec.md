# Feature Specification: Subscription Management in Settings

## Feature Overview

Add a subscription management block to the Settings screen that displays the user's current subscription plan, renewal date, and provides controls to upgrade, downgrade, or cancel their subscription.

## Feature Context

This feature extends the Settings screen (Feature 056) by adding the first concrete settings section. It integrates with Plug&Pay for subscription management and provides users with transparent control over their billing.

## User Stories

1. As a user, I want to see my current subscription plan so I know what features I have access to
2. As a user, I want to see when my subscription renews so I can plan accordingly
3. As a user, I want to upgrade my plan so I can access more features
4. As a user, I want to downgrade my plan to save money
5. As a user, I want to cancel my subscription if I no longer need Tickedify

## Functional Requirements

### Display Requirements

1. **Current Plan Display**
   - Show plan name and price with billing cycle (e.g., "Pro Plan - €9.99/month")
   - **Do NOT show feature list** (keep minimal)
   - Different display for trial users: "Free Trial - X days remaining"

2. **Renewal Information**
   - Display next renewal date in readable format
   - Show renewal amount
   - Indicate if subscription is set to cancel with "Cancels on [date]" message

3. **Action Buttons**
   - "Upgrade Plan" button (visible when higher tiers available)
   - "Downgrade Plan" button (visible when lower tiers available)
   - "Cancel Subscription" button (visible for active paid subscriptions)
   - "Reactivate Subscription" button (visible for canceled subscriptions in grace period)
   - "Upgrade Now" button (visible for trial users)

### Upgrade/Downgrade Flow

4. **Plan Selection**
   - Show available plans in a clear comparison format
   - Highlight current plan
   - Display pricing for each plan
   - Show key feature differences

5. **Confirmation**
   - Confirm plan change with user
   - **For Upgrades**: Show immediate billing impact with prorated charge
   - **For Downgrades**: Show change will take effect at next renewal date
   - Display new renewal date and amount

6. **Processing**
   - **For Upgrades**: Immediately integrate with Plug&Pay API for prorated billing
   - **For Downgrades**: Schedule change for next renewal date via Plug&Pay
   - Update database with new plan information or scheduled change
   - Show success/error feedback with timing details

### Cancellation Flow

7. **Cancellation Confirmation**
   - Require explicit confirmation before canceling
   - Show what happens after cancellation
   - Provide option to keep subscription active

8. **Cancellation Processing**
   - Integrate with Plug&Pay API to cancel subscription
   - Update database to reflect cancellation status
   - Show confirmation message with end date

### Integration Requirements

9. **Plug&Pay Integration**
   - Use Plug&Pay API for all subscription operations
   - Store Plug&Pay subscription ID in database
   - Handle webhook callbacks for subscription updates

10. **Database Schema**
    - Add subscription-related fields to users or user_settings table
    - Store: plan_id, subscription_status, renewal_date, plug_pay_subscription_id

### Security & Validation

11. **Authentication**
    - All subscription operations require authenticated user
    - Verify user owns the subscription being modified

12. **Error Handling**
    - Handle Plug&Pay API errors gracefully
    - Show user-friendly error messages
    - Log errors for debugging

## Clarification Answers

### 1. Cancellation Behavior
**Decision**: Subscription remains active until end of current billing period
- User retains access to paid features until subscription expires
- Show "Cancels on [date]" message in subscription block
- No immediate loss of access

### 2. Upgrade/Downgrade Billing
**Decision**: Asymmetric billing approach
- **Upgrades**: Take effect immediately with prorated billing (user pays difference for remaining period)
- **Downgrades**: Take effect at next renewal date (user keeps current plan until period ends)
- Show clear messaging about when changes take effect

### 3. Plan Tiers & Trial Period
**Decision**: No free tier - only 2-week free trial period
- New users get 14 days free trial
- After trial, user must select paid plan
- No option to downgrade to free tier (doesn't exist)

### 4. Available Plans Display
**Decision**: Modal popup with plan comparison
- Show plans in modal overlay when clicking upgrade/downgrade
- Keep user within Tickedify app
- Display plan comparison with pricing and key differences
- Use existing Tickedify modal patterns

### 5. Trial User Display
**Decision**: Show trial status with countdown
- Display: "Free Trial - X days remaining"
- Show trial end date clearly
- Prominent "Upgrade Now" button
- Different styling than regular subscription display

### 6. Cancellation Reactivation
**Decision**: Yes, reactivation is possible
- Users can reactivate canceled subscription before it expires
- Show "Reactivate Subscription" button for canceled subscriptions in grace period
- Single click reactivation (no complex flow)

### 7. Price Display in Subscription Block
**Decision**: Show plan name + price + billing cycle
- Example: "Pro Plan - €9.99/month"
- **Do NOT show feature list** (keep it clean and minimal)
- Show renewal date separately

### 8. Email Notifications
**Decision**: Out of scope for this feature
- Email notification system not yet implemented in Tickedify
- Will be addressed in future feature
- For now: only in-app messaging/feedback

## User Scenarios

### Scenario 1: View Active Subscription
```
Given: User is logged in with active Pro subscription
When: User navigates to Settings
Then: User sees "Pro Plan - €9.99/month"
And: Renewal date is displayed (e.g., "Renews on March 15, 2025")
And: "Downgrade Plan" and "Cancel Subscription" buttons are visible
```

### Scenario 2: View Trial Status
```
Given: User is in 2-week trial period (5 days remaining)
When: User navigates to Settings
Then: User sees "Free Trial - 5 days remaining"
And: Trial end date is displayed
And: Prominent "Upgrade Now" button is visible
```

### Scenario 3: Upgrade Plan (Immediate Effect)
```
Given: User is on Basic plan (€4.99/month)
When: User clicks "Upgrade Plan"
Then: Modal shows available higher-tier plans with pricing
When: User selects Pro plan (€9.99/month) and confirms
Then: System calculates prorated charge for remaining period
And: Plug&Pay processes immediate upgrade with prorated billing
And: User sees success message
And: Current plan immediately updates to "Pro Plan - €9.99/month"
```

### Scenario 4: Downgrade Plan (Next Renewal)
```
Given: User is on Pro plan (€9.99/month)
When: User clicks "Downgrade Plan"
Then: Modal shows available lower-tier plans
When: User selects Basic plan and confirms
Then: System schedules downgrade for next renewal date
And: User sees message: "Your plan will change to Basic on [renewal date]"
And: Current plan still shows "Pro Plan" until renewal date
```

### Scenario 5: Cancel Subscription
```
Given: User has active paid subscription
When: User clicks "Cancel Subscription"
Then: Confirmation dialog appears explaining access continues until end date
When: User confirms cancellation
Then: Plug&Pay processes cancellation
And: Subscription block shows "Pro Plan - Cancels on March 15, 2025"
And: "Reactivate Subscription" button becomes visible
And: User retains access until March 15, 2025
```

### Scenario 6: Reactivate Canceled Subscription
```
Given: User has canceled subscription (still in grace period)
When: User navigates to Settings
Then: User sees "Pro Plan - Cancels on March 15, 2025"
And: "Reactivate Subscription" button is visible
When: User clicks "Reactivate Subscription"
Then: Plug&Pay processes reactivation
And: Subscription block updates to show normal renewal date
And: "Reactivate" button disappears, "Cancel Subscription" button returns
```

## Out of Scope

- Payment method management (handled by Plug&Pay)
- Billing history/invoices (future feature)
- Discount codes/promotions
- Referral program
- Team/organization subscriptions
- Custom enterprise plans
- Email notifications (future feature - system not yet implemented)
- Free tier (doesn't exist - only 2-week trial period)

## Dependencies

- Feature 056: Settings Screen Infrastructure (MUST be completed)
- Plug&Pay API credentials and integration
- Database schema updates for subscription data
- Plug&Pay webhook endpoint for subscription status updates

## Acceptance Criteria

1.  Subscription block displays current plan information accurately
2.  Renewal date shows correctly formatted
3.  Upgrade button shows modal with higher-tier plans
4.  Downgrade button shows modal with lower-tier plans
5.  Cancel button shows confirmation dialog
6.  All plan changes successfully communicate with Plug&Pay API
7.  Database updates reflect subscription changes
8.  Success/error messages display appropriately
9.  UI matches Tickedify design system (clean white layout)
10.  All actions require proper authentication
11.  Error handling works for API failures
12.  User cannot break billing state through rapid clicking

## Technical Notes

- Use existing Tickedify design system colors and spacing
- Match Settings screen styling from Feature 056
- Store minimal subscription data in database (Plug&Pay is source of truth)
- Use webhook handlers to keep local data synchronized
- Implement optimistic UI updates where appropriate
- Add loading states for all async operations

## Design Mockup Requirements

- Subscription block should fit within Settings screen layout
- Clear visual hierarchy (plan � date � actions)
- Buttons should use standard Tickedify button styling
- Modal popups should use existing modal patterns if available
- Consider mobile responsive design

## Summary

This specification is complete and ready for planning phase. All clarification questions have been answered and requirements are finalized.
