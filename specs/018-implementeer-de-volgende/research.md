# Research: Admin Dashboard v2

**Feature**: Admin Dashboard v2 (admin2.html)
**Date**: 2025-10-18
**Status**: Complete

## Research Questions

### 1. Dashboard Architecture Pattern
**Question**: What's the best architecture for a multi-screen admin dashboard in vanilla JavaScript?

**Decision**: Single Page Application (SPA) with screen-based navigation
- Use hash-based routing (#home, #users, #tasks, etc.)
- Single HTML file with multiple `<section>` elements for each screen
- JavaScript to show/hide screens and manage navigation state
- Data fetching via REST API calls

**Rationale**:
- Consistent with existing Tickedify app.js patterns (already uses screen switching)
- No build tooling required (vanilla JavaScript requirement)
- Fast client-side navigation between screens
- Easy to maintain and extend with new screens

**Alternatives Considered**:
- Multi-page approach (admin2-home.html, admin2-users.html, etc.)
  - Rejected: More files to maintain, slower navigation, state loss between pages
- Full framework (React, Vue)
  - Rejected: Adds build complexity, inconsistent with existing codebase

### 2. API Endpoint Organization
**Question**: How should the new admin API endpoints be organized in server.js?

**Decision**: Prefix all new endpoints with `/api/admin2/` and group by domain
- `/api/admin2/stats/*` - Statistics endpoints (user stats, task stats, email stats, etc.)
- `/api/admin2/users/*` - User management (search, update, delete, etc.)
- `/api/admin2/system/*` - System configuration (settings, payments, etc.)
- `/api/admin2/debug/*` - Debug tools (user data inspector, SQL query, etc.)

**Rationale**:
- Clear namespace separation from existing `/api/*` endpoints
- Easy to apply admin authentication middleware to entire `/api/admin2/*` route group
- Grouped by functional domain for easier navigation in server.js
- Follows RESTful conventions

**Alternatives Considered**:
- Reuse existing `/api/debug/*` endpoints
  - Rejected: Those endpoints lack proper authentication and are for development only
- Separate admin API server
  - Rejected: Unnecessary complexity for current scale, monolithic structure is simpler

### 3. Statistics Calculation Strategy
**Question**: Should statistics be pre-calculated/cached or calculated on-demand?

**Decision**: Calculate on-demand with database aggregation queries
- Use efficient SQL aggregation (COUNT, SUM, AVG) with appropriate WHERE clauses
- Add database indexes on frequently queried columns (created_at, subscription_tier, etc.)
- No caching layer initially (can add later if performance issues)

**Rationale**:
- Real-time accuracy is important for admin decision-making
- Current scale (~100 users in beta) doesn't require caching
- PostgreSQL aggregation is fast enough (<200ms target)
- Simpler implementation and maintenance

**Alternatives Considered**:
- Pre-calculated statistics table updated by triggers
  - Rejected: Added complexity, potential for stale data, harder to debug
- Redis caching layer
  - Rejected: Premature optimization, adds infrastructure dependency

### 4. User Search Implementation
**Question**: How to implement efficient user search by email/name/ID?

**Decision**: PostgreSQL full-text search with ILIKE for flexible matching
- Use `WHERE email ILIKE $1 OR naam ILIKE $1 OR id::text ILIKE $1`
- Add `%` wildcards around search term for partial matching
- Add GIN index on email and naam columns for performance
- Limit results to 50 matches to prevent overwhelming UI

**Rationale**:
- ILIKE provides case-insensitive search (user-friendly)
- Supports partial matches (searching "jan" finds "jan@example.com")
- PostgreSQL has good ILIKE performance with proper indexes
- Simple query structure, easy to maintain

**Alternatives Considered**:
- Exact match only (WHERE email = $1)
  - Rejected: Too restrictive, poor UX
- External search service (Elasticsearch)
  - Rejected: Overkill for current scale, adds complexity
- Client-side filtering
  - Rejected: Doesn't scale, exposes all user data to client

### 5. User Data Inspector Scope
**Question**: What data should the user data inspector show?

**Decision**: Comprehensive view of all user-associated data
- User account details (email, tier, trial, registration date, last login)
- Task counts (total, completed, active, by project/context)
- Email import history (count, recent imports, success rate)
- Subscription details (tier, payment config, trial status)
- Daily planning entries (recent 10 days)
- System settings (if user has custom settings)

**Rationale**:
- Admins need complete visibility for debugging user issues
- All data is already in database, just needs aggregation
- Helpful for troubleshooting subscription, trial, and feature issues
- Privacy-conscious: only admins can access, audit logged

**Alternatives Considered**:
- Basic user info only
  - Rejected: Insufficient for debugging complex issues
- Export to JSON file
  - Rejected: Less convenient than in-dashboard view, export can be added later

### 6. Database Cleanup Safety
**Question**: How to make database cleanup safe for admins to use?

**Decision**: Multi-level safety approach
- Show preview of what will be deleted before confirming
- Require explicit confirmation checkbox + button click
- Only delete truly orphaned data (foreign key violations, old session data)
- Log all cleanup operations to audit log
- Show detailed summary of what was deleted after operation

**Rationale**:
- Prevents accidental data loss
- Transparency builds admin trust
- Audit trail for compliance and troubleshooting
- Conservative approach (only obvious orphaned data)

**Alternatives Considered**:
- Fully automated cleanup without confirmation
  - Rejected: Too risky, no recovery if wrong data deleted
- Read-only reporting only
  - Rejected: Defeats purpose of cleanup tool, forces manual SQL
- Soft delete with recovery window
  - Rejected: Adds complexity, not needed for orphaned data

### 7. Checkout URL Validation
**Question**: How to validate payment checkout URLs before saving?

**Decision**: Frontend and backend validation
- Frontend: Check URL format with regex, require https://
- Backend: Same validation + verify URL is reachable with HEAD request
- Mollie domain validation (must be pay.mollie.com or checkout.mollie.com)
- Test mode vs live mode detection (different URL patterns)

**Rationale**:
- Prevents broken payment flows
- Catches typos and copy-paste errors
- Double validation (frontend + backend) ensures data integrity
- Domain validation prevents phishing/incorrect URLs

**Alternatives Considered**:
- Frontend validation only
  - Rejected: Can be bypassed, not secure
- No validation
  - Rejected: Broken checkout URLs break user experience
- Full Mollie API integration to verify checkout ID
  - Rejected: Requires API credentials, slower, unnecessary for URL validation

### 8. Force Logout Implementation
**Question**: How to invalidate all user sessions when blocking account or force logout?

**Decision**: Database-level session invalidation
- Tickedify uses connect-pg-simple for PostgreSQL session storage
- Delete all session records where sess->>'passport'->>'user' = user_id
- Update user.actief = false for blocked accounts
- Session middleware automatically denies access when session not found

**Rationale**:
- Immediate effect (next request checks session)
- Works with existing session infrastructure
- No need to track session IDs separately
- Blocking account also sets actief=false for double protection

**Alternatives Considered**:
- Session TTL expiration
  - Rejected: Delayed effect, user could continue for hours
- In-memory session blacklist
  - Rejected: Doesn't persist across server restarts, not used by connect-pg-simple
- JWT token revocation
  - Rejected: Tickedify uses sessions, not JWTs

### 9. Multi-Screen Navigation State
**Question**: How to maintain state when switching between dashboard screens?

**Decision**: URL hash-based routing with localStorage for form state
- Use `window.location.hash` for current screen (e.g., #users, #tasks)
- Store unsaved form data in localStorage with screen prefix
- Restore form state when returning to screen
- Clear localStorage on successful form submission

**Rationale**:
- Hash changes don't cause page reload (fast navigation)
- Browser back/forward buttons work naturally
- Bookmarkable screens (e.g., bookmark #users for direct access)
- Form state preservation prevents data loss on accidental navigation

**Alternatives Considered**:
- Query parameters (?screen=users)
  - Rejected: Causes page reload on navigation
- JavaScript state object only
  - Rejected: Lost on page refresh
- History API (pushState)
  - Rejected: More complex, not needed for admin dashboard

### 10. User Growth Graph Visualization
**Question**: Which charting library to use for user growth graph?

**Decision**: Chart.js (MIT licensed, ~60KB)
- Widely used, well-documented
- No dependencies (works with vanilla JavaScript)
- Supports time-series line charts
- Good performance for admin dashboard scale
- CDN available (no build step needed)

**Rationale**:
- Battle-tested library with good community support
- Simple API for line charts
- Responsive and interactive
- Fits Tickedify's vanilla JavaScript architecture

**Alternatives Considered**:
- D3.js
  - Rejected: Overkill for simple line chart, steep learning curve
- Google Charts
  - Rejected: Requires external service, privacy concerns
- Canvas-based custom implementation
  - Rejected: Reinventing the wheel, time-consuming
- CSS-only visualization
  - Rejected: Limited interactivity, harder to maintain

## Technical Stack Summary

**Frontend**:
- HTML5 + CSS3 (existing style.css patterns)
- Vanilla JavaScript ES6+
- Chart.js 4.x for user growth graph
- Fetch API for HTTP requests
- LocalStorage for form state persistence

**Backend**:
- Node.js 16+ with Express.js 4.18.2
- PostgreSQL 14+ (Neon hosting)
- express-session with connect-pg-simple
- bcryptjs for password hashing
- pg driver for database queries

**API Design**:
- RESTful endpoints under `/api/admin2/*`
- JSON request/response format
- Session-based authentication
- Error responses with HTTP status codes + JSON error messages

**Security**:
- Admin-only middleware on all `/api/admin2/*` routes
- SQL injection prevention via parameterized queries
- Input validation on all user inputs
- Audit logging for all admin actions
- HTTPS enforcement (Vercel provides SSL)

## Dependencies

**New Dependencies**: None - using existing stack

**Existing Dependencies Used**:
- express (4.18.2) - HTTP server framework
- pg (8.11.3) - PostgreSQL client
- express-session (1.18.1) - Session management
- connect-pg-simple (9.0.1) - PostgreSQL session store
- bcryptjs (3.0.2) - Password hashing (for password reset feature)

**External Libraries** (CDN):
- Chart.js 4.x - User growth graph visualization

## Performance Considerations

**Statistics Queries**:
- Add indexes on: `users.created_at`, `users.subscription_tier`, `tasks.created_at`, `email_imports.created_at`
- Use COUNT(*) with WHERE clauses for filtering
- Use DATE_TRUNC for daily/weekly/monthly grouping
- Limit result sets (e.g., "recent 10 registrations" not "all registrations")

**API Response Times**:
- Target: <200ms for statistics endpoints
- Target: <500ms for user search
- Target: <1000ms for database cleanup operations
- Batch multiple statistics into single endpoint where logical (e.g., home dashboard stats)

**Frontend Optimization**:
- Lazy load screens (only fetch data when screen is opened)
- Cache statistics for 30 seconds (show stale data while refetching)
- Debounce search input (300ms delay before API call)
- Show loading skeletons during data fetch

## Security Considerations

**Authentication**:
- Reuse existing session-based auth from admin.html
- Require `account_type = 'admin'` check on all endpoints
- No public endpoints - everything requires admin session

**Authorization**:
- Prevent admin from deleting their own account
- Prevent deletion of last admin account
- Show confirmation dialogs for destructive operations

**Input Validation**:
- Validate all user inputs on backend (don't trust frontend validation)
- Sanitize SQL inputs via parameterized queries
- Validate URL formats for checkout URLs
- Validate date formats for trial extensions

**Audit Logging**:
- Log all admin actions to forensic_logs table (if exists) or console
- Include: timestamp, admin user ID, action type, target user ID, old value, new value
- Retention: 90 days for compliance

## Open Questions

**Resolved**:
- ✅ How to organize multi-screen navigation? → Hash-based routing
- ✅ How to calculate statistics? → On-demand SQL aggregation
- ✅ Which chart library to use? → Chart.js
- ✅ How to search users? → PostgreSQL ILIKE with indexes
- ✅ How to invalidate sessions? → Delete from PostgreSQL session table

**None Remaining** - All technical decisions made

## Next Steps

Proceed to Phase 1:
1. Create data-model.md (database entities and relationships)
2. Generate API contracts in /contracts/ directory
3. Create quickstart.md (manual testing guide)
4. Update CLAUDE.md with new admin2 context
