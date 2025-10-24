# Research: "Volgend Bezoek Aan Pagina" Bericht Trigger

**Feature**: 033-je-hebt-de
**Created**: 2025-10-24
**Status**: Complete

## Overview

This document captures the design decisions for implementing the page-specific "Volgend bezoek aan pagina" message trigger. This feature corrects Feature 032 which incorrectly implemented a global trigger.

---

## Decision 1: Trigger Type Naming

**Decision**: Use `next_page_visit` as the trigger_type value

**Rationale**:
- Clear differentiation from Feature 032's incorrect `next_time` trigger
- Consistent with existing page-specific triggers: `first_page_visit`, `nth_page_visit`
- Self-documenting name indicates page-specific behavior
- Follows existing naming convention in Tickedify messaging system

**Alternatives Considered**:
- `page_next_visit`: Less clear, breaks pattern of "action_object" naming
- `next_visit`: Too similar to incorrect `next_time`, could cause confusion
- `next_time_page`: Tries to salvage Feature 032 naming, but confusing

**References**:
- Existing triggers in server.js: `immediate`, `days_after_signup`, `first_page_visit`, `nth_page_visit`
- Feature 032 (abandoned): used `next_time` (incorrect global implementation)

---

## Decision 2: Page Identifier Storage

**Decision**: Store page identifier in existing `trigger_value` VARCHAR field

**Rationale**:
- Reuses existing database column (no schema migration needed)
- Consistent with `nth_page_visit` pattern which stores page path in similar field
- VARCHAR field can store page paths like "/planning", "/taken", "/actielijst"
- No breaking changes to database schema (BÈTA FREEZE requirement)

**Alternatives Considered**:
- New `page_identifier` column: Requires migration, violates BÈTA FREEZE constraint
- JSON in `trigger_value`: Overcomplicated for simple string storage
- Separate `message_pages` table: Over-engineering for 1:1 relationship

**Database Impact**:
- ✅ No schema changes required
- ✅ Existing `trigger_value VARCHAR` accommodates page paths
- ✅ Backwards compatible with all existing triggers

---

## Decision 3: Page Identifier Format

**Decision**: Use URL pathname format (e.g., "/planning", "/taken", "/actielijst")

**Rationale**:
- Matches how pages are identified in client-side JavaScript (`window.location.pathname`)
- Consistent with existing page visit tracking in `user_page_visits` table
- Human-readable and admin-friendly (no cryptic IDs)
- Easy to match in backend filtering logic

**Alternatives Considered**:
- Route names ("DailyPlanning", "TaskList"): Requires maintaining route → page mapping
- Page IDs (numeric): Less intuitive for admins, requires lookup table
- Full URLs with domain: Overcomplicated, domain may change across environments

**Implementation Notes**:
- Frontend sends pathname when checking messages: `GET /api/messages/unread?page=/planning`
- Backend filters messages: `WHERE trigger_value = $page_param`
- Admin dropdown shows pathname (e.g., "/planning - Dagelijkse Planning")

---

## Decision 4: Page Selection UI in Admin Interface

**Decision**: Dropdown `<select>` element with predefined page options

**Rationale**:
- Prevents typos in page paths (common with free text input)
- Provides clear list of available pages to admin
- Consistent with existing UI patterns in admin2.html
- Easy to validate (must be one of known pages)

**Alternatives Considered**:
- Free text input: Error-prone, admin might enter invalid path
- Radio buttons: Takes too much vertical space (5+ pages)
- Autocomplete text field: More complex, unnecessary for small page list

**Page Options** (initial implementation):
- `/app` - Hoofdapplicatie
- `/planning` - Dagelijkse Planning
- `/taken` - Takenlijst
- `/actielijst` - Actielijst
- `/profiel` - Profiel

**Future Enhancement**: Auto-discover pages from routing config or page visit stats

---

## Decision 5: Backend Filtering Logic

**Decision**: Extend existing `GET /api/messages/unread` endpoint with page parameter

**Rationale**:
- Reuses existing message filtering infrastructure
- Consistent with how `first_page_visit` and `nth_page_visit` already work
- Minimal code changes (add page parameter + WHERE clause)
- Backwards compatible (page parameter optional for non-page-specific triggers)

**SQL Query Pattern**:
```sql
SELECT m.* FROM admin_messages m
WHERE m.active = true
  AND m.publish_at <= NOW()
  AND (m.expires_at IS NULL OR m.expires_at > NOW())
  AND (
    m.trigger_type = 'immediate'
    OR (m.trigger_type = 'days_after_signup' AND ...)
    OR (m.trigger_type = 'next_page_visit' AND m.trigger_value = $page_param)
  )
  AND m.id NOT IN (
    SELECT message_id FROM message_interactions
    WHERE user_id = $user_id AND dismissed = TRUE
  )
```

**Alternatives Considered**:
- New `/api/messages/page/:page` endpoint: Duplication of filtering logic
- Client-side filtering: Inefficient, leaks messages for other pages
- WebSocket push: Overcomplicated for polling-based system

**Performance Consideration**:
- Add index on `(trigger_type, trigger_value)` if queries slow down
- Current queries <100ms, so likely not needed initially

---

## Decision 6: Frontend Implementation Strategy

**Decision**: Modify existing message polling to include current page pathname

**Rationale**:
- Minimal changes to existing frontend code
- Polling already happens every 30 seconds
- Simply add `?page=${pathname}` to existing API call
- No new JavaScript files or dependencies needed

**Implementation Approach**:
```javascript
// In existing message polling code (likely in app.html or shared JS)
const pathname = window.location.pathname;
fetch(`/api/messages/unread?page=${encodeURIComponent(pathname)}`)
  .then(res => res.json())
  .then(messages => displayMessages(messages));
```

**Alternatives Considered**:
- Separate page-specific message check: Duplicates polling logic
- Send page on every API call: Unnecessary overhead for non-message endpoints
- Use navigation events: More complex, polling already works well

---

## Decision 7: Visit Timing Definition

**Decision**: Message triggers on first visit to specific page AFTER message creation

**Rationale** (from spec clarifications):
- Simpler implementation: no need to check visit history before message creation
- Consistent with "next visit" concept: next = after now
- Even first-ever visit to a page counts as "next visit"
- No dependency on user_page_visits history

**Scenario Example**:
- Day 1: User visits `/planning` (or never visited before)
- Day 2: Admin creates message for "Volgend bezoek aan pagina: /planning"
- Day 3: User visits `/planning` → **Message shows** (first visit after creation)

**Alternatives Rejected**:
- Require previous visit: Too complex, confusing for admins and users
- Track "last visit before message creation": Unnecessary state tracking

---

## Decision 8: Subpage Handling

**Decision**: Exact pathname match only (no wildcard matching)

**Rationale**:
- Simple and predictable behavior for admins
- Avoids confusion about what counts as "the page"
- Consistent with existing page visit tracking
- Easy to implement and test

**Behavior**:
- Message for `/planning` shows ONLY on `/planning`
- Does NOT show on `/planning/edit` or `/planning/history`
- If admin wants messages on subpages, create separate messages

**Future Enhancement** (not in this feature):
- Could add wildcard support later (e.g., `/planning/*`)
- Would require UI for wildcard selection
- Would complicate filtering logic

---

## Decision 9: Migration Strategy for Feature 032

**Decision**: Abandon Feature 032 branch, start fresh with Feature 033

**Rationale** (from spec clarifications):
- Clean slate: no confusion between incorrect and correct implementations
- Feature 032 was never merged to main (BÈTA FREEZE protected production)
- No backwards compatibility issues (032 never in production)
- Clear git history: 033 = correct implementation

**Actions**:
- ❌ Do NOT merge branch `032-bij-het-maken` to main
- ✅ Implement Feature 033 on branch `033-je-hebt-de`
- ✅ Use new trigger name `next_page_visit` (not `next_time`)
- 🗑️ Branch 032 can be deleted or kept as reference (user decision)

---

## Technology Stack Validation

**Confirmed Technologies**:
- ✅ **Backend**: Node.js + Express.js (existing server.js endpoints)
- ✅ **Frontend**: Vanilla JavaScript ES6 (no frameworks needed)
- ✅ **Database**: PostgreSQL via Neon (existing tables, no migrations)
- ✅ **Hosting**: Vercel (existing deployment pipeline)
- ✅ **Testing**: Manual testing workflow (quickstart.md scenarios)

**No New Dependencies Required**:
- ✅ Reuses existing Express routing
- ✅ Reuses existing PostgreSQL driver (pg)
- ✅ Reuses existing frontend message display modal
- ✅ No new npm packages needed

---

## Design Patterns Applied

**1. Extend Don't Modify**:
- Add new trigger type, don't change existing triggers
- Add page parameter to API, keep it optional for backwards compatibility
- Extend dropdown in admin UI, don't replace existing options

**2. Database Reuse**:
- No schema changes (use existing `trigger_value` field)
- Follow existing trigger evaluation patterns
- Reuse dismiss tracking infrastructure

**3. Consistency**:
- Naming follows `first_page_visit` / `nth_page_visit` pattern
- Storage follows existing trigger configuration patterns
- UI follows existing admin2.html form patterns

---

## Risk Assessment

**Low Risk**:
- ✅ No database migrations (schema unchanged)
- ✅ Backwards compatible (existing triggers unaffected)
- ✅ Additive change (no refactoring existing code)
- ✅ BÈTA FREEZE protection (no production deployment risk)

**Medium Risk**:
- ⚠️ Must test page parameter in all frontend pages
- ⚠️ Must ensure page dropdown stays in sync with actual pages
- ⚠️ Must validate SQL query performance with new WHERE clause

**Mitigation**:
- Comprehensive quickstart.md test scenarios
- Manual testing on staging (dev.tickedify.com)
- Performance validation via API response time monitoring

---

## Dependencies on Existing System

**Required Existing Components**:
1. ✅ `admin_messages` table with `trigger_type` and `trigger_value` columns
2. ✅ `message_interactions` table with dismiss tracking
3. ✅ `GET /api/messages/unread` endpoint with filtering logic
4. ✅ `POST /api/admin/messages` endpoint for message creation
5. ✅ Admin2.html message creation form
6. ✅ Frontend message display modal (app.html or shared JS)
7. ✅ User authentication system (for user_id in message queries)

**No Dependencies on Feature 032**:
- ❌ Feature 032 code is NOT reused (abandoned)
- ✅ Clean implementation from scratch

---

## Open Questions RESOLVED

All questions resolved via spec clarifications:

1. **Visit timing**: ✅ RESOLVED - First visit after message creation
2. **Migration strategy**: ✅ RESOLVED - Abandon 032, start fresh
3. **Page identifier format**: ✅ RESOLVED - URL pathname (e.g., "/planning")
4. **Subpage handling**: ✅ RESOLVED - Exact match only
5. **Database changes**: ✅ RESOLVED - No migrations, use trigger_value field

---

## Next Steps

**Phase 1 Artifacts**:
1. `data-model.md` - Entity definitions (minimal, reuses existing schema)
2. `contracts/api-contract.md` - API endpoint modifications
3. `quickstart.md` - Manual testing scenarios
4. Update `CLAUDE.md` agent context (incremental O(1) update)

**Phase 2** (via `/tasks` command):
- Generate implementation tasks from Phase 1 artifacts
- Sequence tasks: Backend → Frontend → Testing → Deployment

---

**Research Complete**: 2025-10-24
**All design decisions documented and justified**
**Ready for Phase 1: Design & Contracts**
