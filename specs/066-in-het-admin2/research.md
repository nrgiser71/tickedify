# Research: Revenue Dashboard Detail Views

**Feature**: 066-in-het-admin2
**Date**: 2025-11-14
**Status**: ✅ Complete - All NEEDS CLARIFICATION resolved

## Overview

This document resolves all 13 NEEDS CLARIFICATION markers from spec.md through research, codebase analysis, and design decisions.

---

## Decision 1: UI Display Pattern

### Question
Should detail views open as modal popup, side panel, or inline expansion?

### Options Evaluated

**Option A: Modal Dialog**
- **Pros**:
  - Already used in admin2.html for user details panel
  - Focuses user attention by dimming background
  - Clean close UX (X button, ESC key, backdrop click)
  - Natural loading state display
  - Mobile-friendly (full-screen on small viewports)

- **Cons**:
  - Requires z-index management
  - Blocks dashboard view while open

**Option B: Side Panel**
- **Pros**:
  - Keeps dashboard context visible
  - Good for comparing metrics

- **Cons**:
  - Not used elsewhere in admin2 (inconsistent UX)
  - Complex responsive behavior on mobile
  - Requires horizontal space calculation
  - Harder to manage multiple open panels

**Option C: Inline Expansion**
- **Pros**:
  - Simplest implementation
  - No overlay management needed

- **Cons**:
  - Disrupts stats-grid layout (cards reflow)
  - Confusing with multiple cards expanded
  - Poor UX for scrolling long user lists
  - No precedent in admin2 design

### Decision
✅ **Modal Dialog**

### Rationale
- Consistency with existing admin2 user details modal
- Proven z-index approach (no new complexity)
- Better UX for focused data views
- Mobile-responsive by design
- Reuse existing modal CSS classes

### Implementation Notes
- Use existing admin2 modal styles (`.admin-modal`, `.modal-overlay`)
- Z-index: 10000 (same as user details modal)
- Backdrop click to close
- ESC key handler
- Loading spinner during API fetch

---

## Decision 2: Detail Content Per Card

### MRR Card - Monthly Recurring Revenue

**Content**:
- Breakdown table with columns: Plan Type, User Count, Price/Month, Total Revenue
- Data source: Existing `/api/admin2/stats/revenue` response's `by_tier` array
- Sort by: Revenue (descending)

**Example**:
```
Plan Type          Users    Price/Month    Revenue
yearly_80            3       €6.67/mo       €20.00
monthly_7            5       €7.00/mo       €35.00
monthly_8            2       €8.00/mo       €16.00
─────────────────────────────────────────────────
Total MRR                                   €71.00
```

**Rationale**: No new API needed, reuses existing data, clear breakdown

---

### Active Subscriptions Card

**Content**:
- User list table with columns: Email, Name, Plan, Amount/Month, Started, Order ID
- Data source: New endpoint `/api/admin2/revenue/active-subscriptions`
- Filter: `subscription_status = 'active' AND selected_plan != 'free'`
- Sort: By revenue (descending), secondary by email (asc)
- Click row → opens existing User Management detail panel

**Example**:
```
Email                Name           Plan        Amount     Started      Order ID
user@example.com     Jan Buskens    yearly_80   €6.67/mo   2025-10-15   abc-123
test@test.com        Test User      monthly_7   €7.00/mo   2025-11-01   def-456
```

**Rationale**: Most requested detail view, enables quick user lookup, leverages existing user detail panel

---

### Premium Revenue Card

**Content**:
- User list filtered by monthly plans (`monthly_7`, `monthly_8`)
- Same columns as Active Subscriptions
- Breakdown summary: "3 users on €7/mo, 2 users on €8/mo"
- Data source: Same as Active Subscriptions, client-side filter

**Rationale**: Subset of active subscriptions, no separate endpoint needed

---

### Enterprise Revenue Card

**Content**:
- User list filtered by yearly plans (`yearly_70`, `yearly_80`)
- Same columns as Active Subscriptions
- Monthly equivalent shown (yearly/12)
- Breakdown summary: "2 users on €70/year, 1 user on €80/year"
- Data source: Same as Active Subscriptions, client-side filter

**Rationale**: Subset of active subscriptions, no separate endpoint needed

---

### Free Tier Revenue Card

**Content**:
- Count of free users
- Recent signups (last 30 days)
- Trial users count (if `trial_end_date` not null AND in future)
- Conversion opportunities metric
- Data source: New endpoint `/api/admin2/revenue/free-tier`

**Example**:
```
Free Users: 42
Recent Signups (30d): 8
Active Trials: 3

Note: Free tier generates no revenue
```

**Rationale**: Shows growth potential, highlights conversion opportunities

---

## Decision 3: Pagination Strategy

### Question
Should user lists be paginated? How many items per page?

### Current Scale Analysis
- Beta users: ~10-50 total
- Active paid subscriptions: ~5-15
- Projected 6 months: 100-500 users
- Modal height constraint: 400-600px

### Options Evaluated

**Option A: No Pagination (Scrollable)**
- **Pros**: Simple, no state management, fast implementation
- **Cons**: Performance issues at scale (>100 rows)

**Option B: Client-side Pagination**
- **Pros**: No server changes, instant page switches
- **Cons**: Loads all data upfront, doesn't scale

**Option C: Server-side Pagination**
- **Pros**: Scales to 1000s of users
- **Cons**: Complex (offset/limit, page state), overkill for current scale

### Decision
✅ **Option A: Scrollable list, no pagination**

### Rationale
- Current scale: 5-15 active subscriptions (far below 100 threshold)
- Simple implementation (no page state)
- Max 100 rows with vertical scroll is sufficient
- Can add pagination later if scale requires (YAGNI principle)

### Implementation Notes
- Max height: 500px with `overflow-y: scroll`
- Show row count: "{count} subscriptions"
- If >100 rows in future: Display warning "Showing first 100, use filters"

---

## Decision 4: Available Actions in Detail Views

### Question
What actions should be available in detail views?

### Phase 1 Scope (MVP)

**Included**:
- ✅ View user list
- ✅ Click user row → open User Management detail panel (reuse existing)
- ✅ Sort options: By Revenue (default), By Email, By Date
- ✅ Close modal (X button, ESC, backdrop click)

**Excluded** (Future Features):
- ❌ Export to CSV/Excel (no immediate need)
- ❌ Inline filters (e.g., filter by plan within modal)
- ❌ Bulk actions (e.g., send email to all)
- ❌ Edit subscription inline

### Decision
✅ **Click-through to existing user details + basic sort**

### Rationale
- Leverage existing User Management detail panel (DRY principle)
- Avoid feature creep (MVP first)
- Sort provides quick insights without complexity
- Export can be added later if requested

### Implementation Notes
- Click event on table row: `Screens.showUserDetails(userId)`
- Sort dropdown in modal header
- Default sort: Revenue descending (shows top customers first)

---

## Decision 5: Trial Users Handling

### Question
Are trial users included in "Active Subscriptions" count?

### Database Schema Research
```sql
-- users table columns relevant to trials:
trial_end_date TIMESTAMP       -- NULL if not in trial, future date if trial active
subscription_status VARCHAR     -- 'trial', 'active', 'cancelled', 'expired'
selected_plan VARCHAR           -- 'free', 'monthly_7', 'yearly_80', etc.
```

### Business Logic
- Trial users have `subscription_status = 'trial'`
- Active paid users have `subscription_status = 'active'` AND `selected_plan != 'free'`
- Trials generate NO revenue until they convert

### Decision
✅ **Trials excluded from Active Subscriptions and revenue metrics**

### Rationale
- Revenue dashboard shows current revenue only
- Trials are potential future revenue (not current)
- MRR = Monthly Recurring Revenue from active paid plans only
- Aligns with standard SaaS revenue accounting

### Implementation Notes
- Active Subscriptions filter: `WHERE subscription_status = 'active' AND selected_plan != 'free'`
- Future enhancement: Add separate "Active Trials" card

---

## Decision 6: Cancelled Subscriptions

### Question
How should cancelled subscriptions be shown in revenue details?

### Options Evaluated

**Option A: Show in separate "Churned" section**
- **Pros**: Visibility into churn rate
- **Con**: Not revenue (past, not current)

**Option B: Exclude entirely**
- **Pros**: Revenue dashboard = current state only
- **Cons**: No churn visibility

**Option C: Show greyed out in list**
- **Pros**: Historical context
- **Cons**: Confusing (is it revenue or not?)

### Decision
✅ **Option B: Exclude entirely from revenue detail views**

### Rationale
- Revenue dashboard shows CURRENT revenue state
- Cancelled = no longer contributing to MRR
- Churn analytics should be separate feature (not in revenue details)
- Keeps implementation simple and focused

### Implementation Notes
- Filter: `subscription_status = 'active'` (excludes 'cancelled', 'expired')
- Future: Add separate "Churn Analysis" screen if needed

---

## Decision 7: Empty State Handling

### Question
How to handle revenue cards with zero users (e.g., no Enterprise subscriptions)?

### UX Pattern
```
┌─────────────────────────────────┐
│  💎 Enterprise Revenue Details │
│                                 │
│     🚫 No Enterprise Plans      │
│                                 │
│  No yearly subscriptions yet.   │
│  Contact sales to enable.       │
│                                 │
│         [Close]                 │
└─────────────────────────────────┘
```

### Decision
✅ **Friendly empty state with icon + helpful message**

### Implementation Notes
- Check `users.length === 0` before rendering table
- Show centered message with emoji
- Contextual messages per card:
  - MRR: "No active subscriptions yet"
  - Active Subs: "No paying customers yet"
  - Premium: "No monthly subscriptions yet"
  - Enterprise: "No yearly subscriptions yet"
  - Free: "No free users yet" (unlikely)

---

## Decision 8: API Endpoint Design

### New Endpoints Required

#### 1. `/api/admin2/revenue/active-subscriptions`
**Method**: GET
**Auth**: `requireAdmin` middleware
**Response**:
```json
{
  "subscriptions": [
    {
      "user_id": "user_123",
      "email": "user@example.com",
      "naam": "Jan Buskens",
      "selected_plan": "yearly_80",
      "monthly_amount": 6.67,
      "created_at": "2025-10-15T10:30:00Z",
      "plugandpay_order_id": "abc-123"
    }
  ],
  "total_count": 10
}
```

#### 2. `/api/admin2/revenue/free-tier`
**Method**: GET
**Auth**: `requireAdmin` middleware
**Response**:
```json
{
  "free_users": 42,
  "recent_signups_30d": 8,
  "active_trials": 3,
  "conversion_opportunities": 5
}
```

### Rationale
- RESTful design
- Follows existing admin2 endpoint patterns
- Reuse `requireAdmin` middleware
- JSON responses (easy client-side handling)

---

## Summary of All Resolutions

| # | Clarification Needed | Resolution |
|---|---------------------|------------|
| 1 | MRR card details | by_tier breakdown table (plan, count, price, revenue) |
| 2 | Active Subs details | User list with email, name, plan, amount, date, order ID |
| 3 | Premium details | Filtered user list (monthly_7, monthly_8) |
| 4 | Enterprise details | Filtered user list (yearly_70, yearly_80) |
| 5 | Free Tier details | Count, recent signups, trials, conversion opportunities |
| 6 | Display format | Modal dialog (consistent with admin2 UX) |
| 7 | Pagination | No pagination, scrollable list (current scale <100) |
| 8 | Actions available | Click user → details, sort by revenue/email/date |
| 9 | User fields | email, naam, selected_plan, monthly_amount, created_at, order_id |
| 10 | Revenue breakdown | by_tier array from existing API |
| 11 | Trial users | Excluded (subscription_status='active' only) |
| 12 | Cancelled subs | Not shown (revenue dashboard = active state) |
| 13 | Empty states | Friendly message with icon and context |

---

## Technical Decisions Log

### Frontend Changes
- **File**: public/admin2.html
- **Changes**:
  - Add click handlers to 5 stat cards
  - Add modal HTML structure (reuse existing modal CSS)
  - Add detail rendering functions per card type
  - Add sort toggle logic
  - Add loading spinner during fetch
  - Add empty state rendering

### Backend Changes
- **File**: server.js
- **Changes**:
  - Add `/api/admin2/revenue/active-subscriptions` endpoint
  - Add `/api/admin2/revenue/free-tier` endpoint
  - Reuse existing `/api/admin2/stats/revenue` for MRR breakdown

### No Database Changes
- ✅ All data available in existing `users` table
- ✅ No migrations needed
- ✅ No new columns required

---

## Next Steps

✅ **Phase 0 Complete** - All research documented, all NEEDS CLARIFICATION resolved
⏸️ **Phase 1 Next** - Generate data-model.md, API contracts, quickstart.md

**Ready for Phase 1 execution.**
