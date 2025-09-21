# Research: Abonnement Selectie Scherm

**Feature**: Subscription selection screen for beta transition
**Date**: 2025-01-21

## Research Tasks Completed

### 1. Testing Framework Analysis
**Question**: What testing approach should be used for this web application?

**Decision**: Manual testing + browser-based testing
**Rationale**:
- Current codebase shows no existing test framework in package.json
- Feature is UI-focused with simple selection logic
- Existing Tickedify appears to use manual testing approach
- For this scope, manual browser testing is sufficient

**Alternatives considered**:
- Jest + DOM testing library: Overkill for simple UI selection
- Playwright/Cypress: Good for future e2e testing but not needed for this scope
- No testing: Risky for subscription logic

### 2. Integration Points Analysis
**Question**: How should the subscription screen integrate with existing beta transition logic?

**Decision**: Hook into existing beta expiration flow with dedicated HTML page
**Rationale**:
- Existing code shows `showUpgradeMessage()` function in app.js:12551
- Current flow shows toast message for beta expiration
- Can extend existing logic to redirect to subscription page
- Maintains separation of concerns

**Integration approach**:
- Modify existing `showUpgradeMessage()` to redirect to `/subscription.html`
- Use URL parameters to pass user context
- Store selection temporarily for future payment integration

### 3. UI Framework and Styling
**Question**: What approach for styling and responsive design?

**Decision**: Vanilla CSS with existing design system
**Rationale**:
- Current codebase uses vanilla JavaScript and CSS
- Existing `style.css` file shows consistent design patterns
- Must match current macOS-style design language
- No framework dependencies to maintain

**Patterns identified in existing code**:
- CSS custom properties (--macos-blue, etc.)
- Glass morphism effects with backdrop-filter
- Modal/popup patterns already established
- Responsive breakpoints for mobile/tablet

### 4. Data Storage Approach
**Question**: How to store subscription selection before payment implementation?

**Decision**: Use sessionStorage + database field for persistence
**Rationale**:
- sessionStorage for immediate UI state
- Add `selected_plan` field to users table for persistence
- Allows retrieval after payment integration is built
- Non-blocking approach that doesn't require payment logic

**Database schema addition**:
```sql
ALTER TABLE users ADD COLUMN selected_plan VARCHAR(20);
-- Values: 'trial_14_days', 'monthly_7', 'yearly_70', null
```

### 5. URL Routing Strategy
**Question**: Should this be a separate page or modal overlay?

**Decision**: Separate HTML page (`/subscription.html`)
**Rationale**:
- Easier to test independently
- Can be linked from multiple entry points (beta transition, manual upgrade)
- Follows existing pattern (admin.html, changelog.html, etc.)
- Future-friendly for direct linking

**URL structure**:
- `/subscription.html` - main page
- `/subscription.html?source=beta` - from beta transition
- `/subscription.html?source=upgrade` - from manual upgrade

## Technical Implementation Decisions

### File Structure
```
public/
├── subscription.html     # Main subscription selection page
├── subscription.js       # Selection logic and API calls
└── style.css            # Extended with subscription styles
server.js                 # Add endpoint for storing selection
```

### API Endpoints Needed
```
POST /api/subscription/select
  Body: { plan: 'trial_14_days' | 'monthly_7' | 'yearly_70' }
  Response: { success: boolean, message: string }

GET /api/subscription/status
  Response: { selected_plan: string, can_select: boolean }
```

### Browser Support
- Chrome 90+ (primary target)
- Safari 14+ (macOS/iOS)
- Firefox 88+ (secondary)
- IE/Edge legacy: Not supported (matches current app)

## Dependencies and Integration Points

### Existing Code Integration
- Modify `app.js` `showUpgradeMessage()` function
- Extend database schema with new column
- Use existing session management system
- Follow existing authentication patterns

### External Dependencies
- None required (vanilla implementation)
- Uses existing Express.js and PostgreSQL setup

## Risk Assessment

**Low Risk**:
- Simple UI without complex interactions
- No payment processing complexity
- Builds on established patterns

**Medium Risk**:
- Database schema changes require migration
- Integration with existing authentication flow

**Mitigation**:
- Test database migration on staging first
- Implement feature flag for gradual rollout

## Next Steps for Implementation
1. Create HTML page with subscription options
2. Implement client-side selection logic
3. Add backend API endpoint for storing selection
4. Integrate with existing beta transition flow
5. Add styling to match existing design system