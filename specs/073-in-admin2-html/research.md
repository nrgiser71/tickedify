# Research: User Task Activity Chart

## Technical Context Resolution

### Language/Version
- **Decision**: Vanilla JavaScript (ES6+) for frontend, Node.js + Express for backend
- **Rationale**: Consistent with existing codebase, no framework dependencies
- **Alternatives**: React/Vue rejected - project uses vanilla JS throughout

### Primary Dependencies
- **Decision**: Chart.js for chart rendering
- **Rationale**: Already used elsewhere in admin dashboard, lightweight, well-documented
- **Alternatives**: D3.js (too complex), no-library canvas (too much work)

### Storage
- **Decision**: PostgreSQL (Neon) - existing `taken` table with `created_at` column
- **Rationale**: Data already exists, just need aggregation query
- **Alternatives**: None - use existing infrastructure

### Testing
- **Decision**: API endpoint testing via curl, manual browser testing
- **Rationale**: Consistent with project testing approach
- **Alternatives**: Playwright available if UI testing needed

### Target Platform
- **Decision**: Web browser (Chrome, Firefox, Safari, Edge modern versions)
- **Rationale**: Existing admin dashboard target
- **Alternatives**: None

### Project Type
- **Decision**: Web application (frontend + backend)
- **Rationale**: Feature adds both API endpoint and UI component
- **Alternatives**: None

### Performance Goals
- **Decision**: Chart loads within 500ms for up to 365 days of data
- **Rationale**: Admin users expect responsive UI
- **Alternatives**: Pagination if data exceeds reasonable limits

### Constraints
- **Decision**: No new dependencies except Chart.js (if not already present)
- **Rationale**: Keep bundle size small
- **Alternatives**: None

### Scale/Scope
- **Decision**: Support date ranges up to 1 year, handle users with 0-10,000+ tasks
- **Rationale**: Covers all realistic use cases
- **Alternatives**: None

---

## Existing Code Analysis

### User Details Panel Location
- **File**: `public/admin2.html` lines 1328-1420
- **Function**: `Screens.loadUserDetails()` in `public/admin2.js` lines 1234-1294
- **Current sections**: User info, Task summary, Email summary, Subscription details, User actions

### API Endpoint
- **Current endpoint**: `GET /api/admin2/users/:id` (server.js line 13503)
- **Returns**: user info, tasks summary, tasks by project/context, emails summary
- **Task data available**: `created_at` timestamp already in `taken` table

### Data Available
- **Table**: `taken`
- **Key column**: `created_at` (timestamp when task was created)
- **User association**: `user_id` foreign key

### Chart.js Status
- **Check needed**: Verify if Chart.js is already included in admin2.html
- **CDN available**: Yes, can use jsDelivr CDN

---

## Design Decisions

### Chart Placement
- **Decision**: Add new section after "Task Summary" stats grid
- **Rationale**: Logical flow - summary first, then detailed breakdown by date
- **Alternative rejected**: Separate tab/modal - unnecessary complexity

### Period Selector UI
- **Decision**: Dropdown with presets + date picker container that shows on "Custom"
- **Rationale**: Clean UI, matches admin2 design patterns
- **Alternative rejected**: Date range slider - less intuitive

### Date Calculation
- **Decision**: Calculate date ranges client-side, pass to API as start/end dates
- **Rationale**: Simpler API, flexible client
- **Alternative rejected**: Server-side period names - less flexible

### Statistics Display
- **Decision**: Stats grid below chart (Total, Average, Peak Day, Trend)
- **Rationale**: Consistent with existing stats-grid patterns in admin2
- **Alternative rejected**: Inline with chart - too crowded

### Empty State
- **Decision**: Show chart with flat line at 0, stats show zeros
- **Rationale**: Clear visual feedback, no ambiguity
- **Alternative rejected**: "No data" message - less informative

---

## API Contract Design

### New Endpoint
```
GET /api/admin2/users/:id/task-activity?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

### Response Format
```json
{
  "activity": [
    { "date": "2025-12-01", "count": 5 },
    { "date": "2025-12-02", "count": 3 },
    ...
  ],
  "statistics": {
    "total": 45,
    "average": 3.5,
    "peak_date": "2025-12-05",
    "peak_count": 12,
    "trend": "up"  // "up", "down", "stable"
  },
  "period": {
    "start_date": "2025-12-01",
    "end_date": "2025-12-12"
  }
}
```

### Trend Calculation
- Compare first half average to second half average of selected period
- "up" if second half > first half by 10%+
- "down" if second half < first half by 10%+
- "stable" otherwise

---

## Risk Assessment

### Low Risk
- Database query performance - simple GROUP BY on indexed column
- Chart.js integration - well-documented library

### Medium Risk
- Date handling edge cases (timezone issues)
- Mitigation: Use UTC dates throughout, convert only for display

### No Risk
- Data availability - `created_at` already exists on all tasks
- UI space - user details panel has room for additional content
