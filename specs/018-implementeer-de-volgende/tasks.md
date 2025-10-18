# Tasks: Admin Dashboard v2

**Input**: Design documents from `/specs/018-implementeer-de-volgende/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: Node.js 16+, Express.js 4.18.2, PostgreSQL, Vanilla JavaScript
   → Structure: Monolithic (public/ frontend + server.js backend)
2. Load design documents ✓
   → data-model.md: Existing database schema, no new tables
   → contracts/: 4 contract files → 22 API endpoints
   → research.md: 10 technical decisions
   → quickstart.md: 15-minute testing workflow
3. Generate tasks by category ✓
   → Backend: 22 API endpoints
   → Database: Performance indexes
   → Frontend: admin2.html + admin2.js
   → Testing: Manual + automated tests
   → Documentation: Changelog update
4. Apply task rules ✓
   → Backend endpoints [P] - different route groups
   → Frontend after backend deployed
   → Tests after implementation (manual testing approach)
5. Number tasks sequentially (T001-T050) ✓
6. Validation ✓
   → All 22 endpoints have implementation tasks
   → Frontend depends on backend
   → Testing depends on both
```

## Format: `[ID] [Status] [P?] Description`
- **[P]**: Can run in parallel (different files/route groups, no dependencies)
- Include exact file paths in descriptions
- Status: [ ] pending, [>] in progress, [X] complete

## Path Conventions
- **Frontend**: `public/admin2.html`, `public/admin2.js`
- **Backend**: `server.js` (add new endpoints)
- **Styles**: `public/style.css` (reuse existing)
- **Contracts**: `specs/018-implementeer-de-volgende/contracts/`
- **Testing**: Manual via Playwright (tickedify-testing agent)

---

## Phase 3.1: Setup & Preparation

- [X] **T001** Create admin2.html skeleton structure
  - File: `public/admin2.html`
  - Action: Create HTML file with navigation structure for 10 screens
  - Screens: Home, Tasks, Emails, Database, Revenue, Users, System, DB Tools, Debug, Security
  - Navigation: Left sidebar with screen links (hash-based routing)
  - Layout: Reuse existing Tickedify macOS-style design from style.css
  - Dependencies: None
  - Estimated: 30 min

- [X] **T002** [P] Create admin2.js skeleton
  - File: `public/admin2.js`
  - Action: Create JavaScript file with screen manager and API client
  - Features: Hash routing, screen switching, loading states, error handling
  - API client: Fetch wrapper for /api/admin2/* endpoints
  - Dependencies: None (parallel with T001)
  - Estimated: 30 min

- [X] **T003** [P] Add Chart.js CDN to admin2.html
  - File: `public/admin2.html`
  - Action: Add Chart.js 4.x CDN link in <head>
  - Purpose: User growth graph visualization
  - URL: https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js
  - Dependencies: T001 (needs admin2.html to exist)
  - Estimated: 5 min

---

## Phase 3.2: Backend - Statistics Endpoints (All [P])
**CRITICAL: All statistics endpoints can be implemented in parallel - different route groups**

- [ ] **T004** [P] Implement GET /api/admin2/stats/home
  - File: `server.js`
  - Contract: `contracts/api-admin2-stats.md` (home endpoint)
  - Data model: `data-model.md` (User Statistics queries)
  - Action: Create endpoint returning all home dashboard statistics
  - Queries: Total users, active 7d/30d, new today/week/month, subscription distribution, trials, recent registrations, inactive users
  - Response: JSON object with nested stats structure
  - Auth: requireAuth middleware + account_type='admin' check
  - Dependencies: None (parallel with T005-T009)
  - Estimated: 45 min

- [ ] **T005** [P] Implement GET /api/admin2/stats/growth
  - File: `server.js`
  - Contract: `contracts/api-admin2-stats.md` (growth endpoint)
  - Data model: `data-model.md` (User growth query)
  - Action: Create endpoint returning user growth data (last 30 days)
  - Query: GROUP BY DATE(created_at), calculate cumulative count
  - Response: Array of {date, new_users, cumulative}
  - Auth: requireAuth + admin check
  - Dependencies: None (parallel with T004, T006-T009)
  - Estimated: 30 min

- [ ] **T006** [P] Implement GET /api/admin2/stats/tasks
  - File: `server.js`
  - Contract: `contracts/api-admin2-stats.md` (tasks endpoint)
  - Data model: `data-model.md` (Task Statistics queries)
  - Action: Create endpoint returning task statistics
  - Queries: Total tasks, completion rate, created today/week/month
  - Response: JSON object with task stats
  - Auth: requireAuth + admin check
  - Dependencies: None (parallel with T004-T005, T007-T009)
  - Estimated: 30 min

- [ ] **T007** [P] Implement GET /api/admin2/stats/emails
  - File: `server.js`
  - Contract: `contracts/api-admin2-stats.md` (emails endpoint)
  - Data model: `data-model.md` (Email Statistics queries)
  - Action: Create endpoint returning email import statistics
  - Queries: Total imports, today/week/month, users with email import
  - Response: JSON object with email stats
  - Auth: requireAuth + admin check
  - Dependencies: None (parallel with T004-T006, T008-T009)
  - Estimated: 30 min

- [ ] **T008** [P] Implement GET /api/admin2/stats/database
  - File: `server.js`
  - Contract: `contracts/api-admin2-stats.md` (database endpoint)
  - Data model: `data-model.md` (Database Statistics queries)
  - Action: Create endpoint returning database size and table statistics
  - Queries: pg_database_size, pg_class for table sizes/row counts
  - Response: JSON with database_size, tables array
  - Auth: requireAuth + admin check
  - Dependencies: None (parallel with T004-T007, T009)
  - Estimated: 30 min

- [ ] **T009** [P] Implement GET /api/admin2/stats/revenue
  - File: `server.js`
  - Contract: `contracts/api-admin2-stats.md` (revenue endpoint)
  - Data model: `data-model.md` (Revenue Statistics queries)
  - Action: Create endpoint returning MRR and revenue by tier
  - Queries: Calculate MRR from subscription tiers × payment_configurations prices
  - Response: JSON with mrr, by_tier array, payment_configs
  - Auth: requireAuth + admin check
  - Dependencies: None (parallel with T004-T008)
  - Estimated: 45 min

---

## Phase 3.3: Backend - User Management Endpoints (Sequential)
**NOTE: These modify server.js sequentially - NOT parallel**

- [ ] **T010** Implement GET /api/admin2/users/search
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (search endpoint)
  - Data model: `data-model.md` (User search query)
  - Action: Create endpoint for user search by email/name/ID
  - Query: ILIKE with wildcards, LIMIT 50
  - Validation: Minimum 2 characters
  - Response: JSON with results array, count, total_users
  - Auth: requireAuth + admin check
  - Dependencies: None
  - Estimated: 30 min

- [ ] **T011** Implement GET /api/admin2/users/:id
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (details endpoint)
  - Data model: `data-model.md` (User Data Inspector query)
  - Action: Create endpoint for comprehensive user details
  - Queries: User info, task summary, email summary, subscription details
  - Response: JSON with user, tasks, emails, subscription objects
  - Auth: requireAuth + admin check
  - Dependencies: T010 (sequential in server.js)
  - Estimated: 45 min

- [ ] **T012** Implement PUT /api/admin2/users/:id/tier
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (tier endpoint)
  - Data model: `data-model.md` (User Management state changes)
  - Action: Create endpoint to change subscription tier
  - Validation: tier must be ['free', 'premium', 'enterprise']
  - Audit: Log tier change (admin_id, user_id, old_tier, new_tier)
  - Response: JSON with success, old_tier, new_tier
  - Auth: requireAuth + admin check
  - Dependencies: T011 (sequential)
  - Estimated: 30 min

- [ ] **T013** Implement PUT /api/admin2/users/:id/trial
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (trial endpoint)
  - Data model: `data-model.md` (User Management state changes)
  - Action: Create endpoint to extend trial period
  - Validation: trial_end_date must be future date
  - Audit: Log trial extension
  - Response: JSON with success, old_trial_end, new_trial_end
  - Auth: requireAuth + admin check
  - Dependencies: T012 (sequential)
  - Estimated: 25 min

- [ ] **T014** Implement PUT /api/admin2/users/:id/block
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (block endpoint)
  - Data model: `data-model.md` (User account states)
  - Action: Create endpoint to block/unblock user account
  - Logic: Update users.actief, DELETE sessions for user
  - Security: Prevent self-block (return 403)
  - Audit: Log block/unblock action
  - Response: JSON with success, blocked status, sessions_invalidated count
  - Auth: requireAuth + admin check
  - Dependencies: T013 (sequential)
  - Estimated: 35 min

- [ ] **T015** Implement DELETE /api/admin2/users/:id
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (delete endpoint)
  - Data model: `data-model.md` (cascade delete)
  - Action: Create endpoint to delete user account
  - Security: Prevent self-delete, prevent last admin delete
  - Logic: DELETE user (cascades to tasks, email_imports)
  - Audit: Log deletion with cascade counts
  - Response: JSON with success, cascade_deleted counts
  - Auth: requireAuth + admin check
  - Dependencies: T014 (sequential)
  - Estimated: 40 min

- [ ] **T016** Implement POST /api/admin2/users/:id/reset-password
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (password reset endpoint)
  - Action: Create endpoint to reset user password (admin-initiated)
  - Logic: Generate random 12-char password, bcrypt hash, UPDATE users
  - Security: Return plaintext password ONCE in response
  - Audit: Log password reset
  - Response: JSON with success, new_password
  - Auth: requireAuth + admin check
  - Dependencies: T015 (sequential)
  - Estimated: 30 min

- [ ] **T017** Implement POST /api/admin2/users/:id/logout
  - File: `server.js`
  - Contract: `contracts/api-admin2-users.md` (logout endpoint)
  - Data model: `data-model.md` (session invalidation)
  - Action: Create endpoint to force logout user (invalidate all sessions)
  - Logic: DELETE FROM session WHERE sess->>'passport'->>'user' = user_id
  - Audit: Log force logout
  - Response: JSON with success, sessions_invalidated count
  - Auth: requireAuth + admin check
  - Dependencies: T016 (sequential)
  - Estimated: 25 min

---

## Phase 3.4: Backend - System Configuration Endpoints (Sequential)

- [ ] **T018** Implement GET /api/admin2/system/settings
  - File: `server.js`
  - Contract: `contracts/api-admin2-system.md` (settings GET)
  - Action: Create endpoint to fetch all system_settings
  - Query: SELECT * FROM system_settings
  - Response: JSON array of settings with key, value, description, updated_at
  - Auth: requireAuth + admin check
  - Dependencies: T017 (sequential in server.js)
  - Estimated: 20 min

- [ ] **T019** Implement PUT /api/admin2/system/settings/:key
  - File: `server.js`
  - Contract: `contracts/api-admin2-system.md` (settings PUT)
  - Research: `research.md` (onboarding video URL validation)
  - Action: Create endpoint to update system setting
  - Validation: URL format for onboarding_video_url (YouTube/Vimeo)
  - Logic: UPDATE system_settings SET value = $1 WHERE key = $2
  - Audit: Log setting change
  - Response: JSON with success, old_value, new_value
  - Auth: requireAuth + admin check
  - Dependencies: T018 (sequential)
  - Estimated: 30 min

- [ ] **T020** Implement GET /api/admin2/system/payments
  - File: `server.js`
  - Contract: `contracts/api-admin2-system.md` (payments GET)
  - Action: Create endpoint to fetch all payment_configurations
  - Query: SELECT * FROM payment_configurations WHERE is_active = true
  - Response: JSON array of payment configs
  - Auth: requireAuth + admin check
  - Dependencies: T019 (sequential)
  - Estimated: 20 min

- [ ] **T021** Implement PUT /api/admin2/system/payments/:id/checkout-url
  - File: `server.js`
  - Contract: `contracts/api-admin2-system.md` (checkout URL PUT)
  - Research: `research.md` (checkout URL validation)
  - Action: Create endpoint to update payment checkout URL
  - Validation: HTTPS, must contain 'mollie.com'
  - Logic: UPDATE payment_configurations SET checkout_url = $1 WHERE id = $2
  - Audit: Log checkout URL change
  - Response: JSON with success, old_url, new_url
  - Auth: requireAuth + admin check
  - Dependencies: T020 (sequential)
  - Estimated: 30 min

---

## Phase 3.5: Backend - Debug Tools Endpoints (Sequential)

- [ ] **T022** Implement GET /api/admin2/debug/user-data/:id
  - File: `server.js`
  - Contract: `contracts/api-admin2-debug.md` (user data inspector)
  - Data model: `data-model.md` (User Data Inspector comprehensive query)
  - Action: Create endpoint for user data inspector
  - Queries: All user-related data (user, tasks, emails, subscription, sessions)
  - Response: JSON with complete user data breakdown
  - Auth: requireAuth + admin check
  - Dependencies: T021 (sequential)
  - Estimated: 45 min

- [ ] **T023** Implement POST /api/admin2/debug/sql-query
  - File: `server.js`
  - Contract: `contracts/api-admin2-debug.md` (SQL query endpoint)
  - Research: `research.md` (SQL query safety checks)
  - Action: Create endpoint to execute custom SQL queries
  - Safety: Block DROP/TRUNCATE/ALTER, require confirm_destructive for UPDATE/DELETE
  - Logic: Parse query type, validate, execute with timeout (10s), LIMIT 100 rows
  - Audit: Log all SQL queries (type, query, rows_affected)
  - Response: JSON with success, query_type, rows (or rows_affected)
  - Auth: requireAuth + admin check
  - Dependencies: T022 (sequential)
  - Estimated: 60 min

- [ ] **T024** Implement POST /api/admin2/debug/database-backup
  - File: `server.js`
  - Contract: `contracts/api-admin2-debug.md` (backup endpoint)
  - Action: Create endpoint to trigger database backup
  - Logic: Informational response (Neon handles backups automatically)
  - Response: JSON with message about Neon backup capabilities
  - Auth: requireAuth + admin check
  - Dependencies: T023 (sequential)
  - Estimated: 15 min

- [ ] **T025** Implement POST /api/admin2/debug/cleanup-orphaned-data
  - File: `server.js`
  - Contract: `contracts/api-admin2-debug.md` (cleanup endpoint)
  - Data model: `data-model.md` (Database Cleanup Rules)
  - Action: Create endpoint to clean orphaned data
  - Logic: Preview mode (show what will be deleted), Execute mode (delete)
  - Cleanup: Expired sessions, orphaned planning, orphaned email_imports
  - Audit: Log cleanup operations
  - Response: JSON with deleted counts or preview counts
  - Auth: requireAuth + admin check
  - Dependencies: T024 (sequential)
  - Estimated: 45 min

---

## Phase 3.6: Database Optimization

- [ ] **T026** [P] Create database performance indexes
  - File: Database migrations (or manual SQL)
  - Data model: `data-model.md` (Recommended Indexes section)
  - Action: Create indexes for statistics query performance
  - Indexes:
    - `CREATE INDEX idx_users_created_at ON users(created_at);`
    - `CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);`
    - `CREATE INDEX idx_users_last_login ON users(last_login);`
    - `CREATE INDEX idx_taken_aangemaakt_op ON taken(aangemaakt_op);`
    - `CREATE INDEX idx_taken_voltooid ON taken(voltooid);`
    - `CREATE INDEX idx_email_imports_imported_at ON email_imports(imported_at);`
  - Testing: Verify query performance improvement with EXPLAIN ANALYZE
  - Dependencies: None (can run in parallel with backend work)
  - Estimated: 20 min

---

## Phase 3.7: Frontend - Home Dashboard Screen

- [ ] **T027** Implement Home Dashboard HTML structure
  - File: `public/admin2.html`
  - Action: Create HTML for home dashboard screen (data-screen="home")
  - Layout: Stats grid with cards for user metrics
  - Components: Total users card, active users card, new registrations card, subscription distribution, trials, growth graph canvas, recent registrations table, inactive users
  - Dependencies: T001 (needs admin2.html skeleton)
  - Estimated: 45 min

- [ ] **T028** Implement Home Dashboard JavaScript
  - File: `public/admin2.js`
  - Contract: `contracts/api-admin2-stats.md` (home, growth endpoints)
  - Action: Create functions to load and display home dashboard data
  - API Calls: GET /api/admin2/stats/home, GET /api/admin2/stats/growth
  - Chart: Initialize Chart.js line chart for user growth
  - Error Handling: Display errors, loading states
  - Dependencies: T027, T004, T005 (needs HTML structure and API endpoints)
  - Estimated: 60 min

---

## Phase 3.8: Frontend - Other Statistics Screens

- [ ] **T029** [P] Implement Task Analytics screen
  - Files: `public/admin2.html` (HTML), `public/admin2.js` (JavaScript)
  - Contract: `contracts/api-admin2-stats.md` (tasks endpoint)
  - Action: Create screen for task statistics
  - Display: Total tasks, completion rate, tasks created today/week/month
  - API Call: GET /api/admin2/stats/tasks
  - Dependencies: T028, T006 (needs home screen pattern and tasks API)
  - Estimated: 30 min

- [ ] **T030** [P] Implement Email Analytics screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-stats.md` (emails endpoint)
  - Action: Create screen for email import statistics
  - Display: Total imports, recent imports, users with email import
  - API Call: GET /api/admin2/stats/emails
  - Dependencies: T028, T007 (parallel with T029 - different screen)
  - Estimated: 30 min

- [ ] **T031** [P] Implement Database Monitor screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-stats.md` (database endpoint)
  - Action: Create screen for database statistics
  - Display: Database size, table sizes sorted by size, row counts
  - API Call: GET /api/admin2/stats/database
  - Dependencies: T028, T008 (parallel with T029-T030)
  - Estimated: 30 min

- [ ] **T032** [P] Implement Revenue Dashboard screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-stats.md` (revenue endpoint)
  - Action: Create screen for revenue statistics
  - Display: MRR, revenue by tier table, payment configurations list
  - API Call: GET /api/admin2/stats/revenue
  - Dependencies: T028, T009 (parallel with T029-T031)
  - Estimated: 35 min

---

## Phase 3.9: Frontend - User Management Screen

- [ ] **T033** Implement User Management HTML structure
  - File: `public/admin2.html`
  - Action: Create HTML for user management screen
  - Components: Search input (debounced), results list, user details panel
  - Layout: Split view - search/results on left, details on right
  - Dependencies: T001
  - Estimated: 40 min

- [ ] **T034** Implement User Search JavaScript
  - File: `public/admin2.js`
  - Contract: `contracts/api-admin2-users.md` (search endpoint)
  - Action: Create search functionality with 300ms debounce
  - API Call: GET /api/admin2/users/search?q={query}
  - Display: Results with email, name, tier, status
  - Click handler: Load user details
  - Dependencies: T033, T010 (needs HTML and search API)
  - Estimated: 30 min

- [ ] **T035** Implement User Details View JavaScript
  - File: `public/admin2.js`
  - Contract: `contracts/api-admin2-users.md` (details endpoint)
  - Action: Create user details view with comprehensive data
  - API Call: GET /api/admin2/users/:id
  - Display: Account info, task summary, email summary, subscription
  - Dependencies: T034, T011 (needs search working and details API)
  - Estimated: 40 min

- [ ] **T036** Implement User Management Actions
  - File: `public/admin2.js`
  - Contract: `contracts/api-admin2-users.md` (tier, trial, block, delete, reset, logout)
  - Action: Create action buttons and handlers for user management
  - Actions: Change tier (dropdown), extend trial (date picker), block/unblock (toggle), delete (confirm dialog), reset password (confirm + display), force logout (button)
  - API Calls: PUT tier, PUT trial, PUT block, DELETE user, POST reset-password, POST logout
  - Validation: Client-side validation before API call
  - Confirmation: Show confirm dialog for destructive actions
  - Dependencies: T035, T012-T017 (needs details view and all management APIs)
  - Estimated: 90 min

---

## Phase 3.10: Frontend - System Configuration Screens

- [ ] **T037** Implement System Settings screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-system.md` (settings GET/PUT)
  - Action: Create screen to view and edit system settings
  - Display: Settings table with key, value, description
  - Edit: Inline editing with validation (especially onboarding_video_url)
  - API Calls: GET /api/admin2/system/settings, PUT /api/admin2/system/settings/:key
  - Dependencies: T018, T019 (needs settings APIs)
  - Estimated: 45 min

- [ ] **T038** Implement Payment Configuration screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-system.md` (payments GET/PUT checkout-url)
  - Action: Create screen to view and edit payment configurations
  - Display: Payment configs table with plan, tier, checkout URL, prices
  - Edit: Checkout URL editing with validation (HTTPS, mollie.com domain)
  - API Calls: GET /api/admin2/system/payments, PUT /api/admin2/system/payments/:id/checkout-url
  - Dependencies: T020, T021 (needs payments APIs)
  - Estimated: 45 min

---

## Phase 3.11: Frontend - Debug Tools Screens

- [ ] **T039** Implement User Data Inspector screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-debug.md` (user-data endpoint)
  - Action: Create screen for comprehensive user data inspection
  - Input: User ID input field
  - Display: Expandable sections for user info, tasks, emails, subscription, sessions
  - API Call: GET /api/admin2/debug/user-data/:id
  - Dependencies: T022 (needs user-data API)
  - Estimated: 50 min

- [ ] **T040** Implement SQL Query Tool screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-debug.md` (sql-query endpoint)
  - Action: Create screen for custom SQL query execution
  - Input: SQL textarea, confirm_destructive checkbox
  - Display: Results table (for SELECT) or rows_affected (for UPDATE/DELETE)
  - Warnings: Show warning for destructive queries requiring confirmation
  - API Call: POST /api/admin2/debug/sql-query
  - Dependencies: T023 (needs sql-query API)
  - Estimated: 60 min

- [ ] **T041** Implement Database Cleanup screen
  - Files: `public/admin2.html`, `public/admin2.js`
  - Contract: `contracts/api-admin2-debug.md` (cleanup endpoint)
  - Action: Create screen for database cleanup operations
  - Workflow: Preview button → show what will be deleted → Execute button
  - Display: Cleanup summary with counts per category
  - API Call: POST /api/admin2/debug/cleanup-orphaned-data
  - Dependencies: T025 (needs cleanup API)
  - Estimated: 40 min

---

## Phase 3.12: Frontend - Polish & UX

- [ ] **T042** Implement navigation active state
  - File: `public/admin2.js`
  - Action: Update navigation to highlight active screen
  - Logic: On hash change, remove .active from all nav links, add to current
  - Visual: Active link styling (different background/border color)
  - Dependencies: T002 (needs admin2.js skeleton)
  - Estimated: 15 min

- [ ] **T043** Implement loading states and error handling
  - File: `public/admin2.js`
  - Action: Add loading spinners and error messages for all API calls
  - Loading: Show spinner during fetch, hide on complete
  - Errors: Display user-friendly error messages, log to console
  - Retry: Add retry button for failed requests
  - Dependencies: T002 (needs admin2.js skeleton)
  - Estimated: 30 min

- [ ] **T044** [P] Add responsive design tweaks
  - File: `public/style.css` or `public/admin2.html` inline styles
  - Action: Ensure admin dashboard works on tablet/mobile
  - Breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
  - Tweaks: Collapsible navigation on mobile, stack cards vertically, horizontal scroll for tables
  - Dependencies: T027 (needs home screen HTML as reference)
  - Estimated: 45 min

---

## Phase 3.13: Testing & Validation

- [ ] **T045** Manual testing - Statistics screens
  - Reference: `quickstart.md` (sections 2, 5, 6)
  - Action: Manually test all statistics screens per quickstart guide
  - Screens: Home, Tasks, Emails, Database, Revenue
  - Verify: All stats display correctly, charts render, no console errors
  - Performance: Page load <500ms, API responses <200ms
  - Tools: Browser DevTools, Network tab
  - Dependencies: T028-T032 (needs all stats screens complete)
  - Estimated: 30 min

- [ ] **T046** Manual testing - User Management
  - Reference: `quickstart.md` (sections 3, 4)
  - Action: Test user search, details, and all management actions
  - Test cases: Search, view details, change tier, extend trial, block, delete, reset password, force logout
  - Edge cases: Self-delete (should fail), last admin delete (should fail)
  - Verify: Audit logging works, confirmations shown, errors handled
  - Dependencies: T034-T036 (needs user management complete)
  - Estimated: 45 min

- [ ] **T047** Manual testing - System Configuration
  - Reference: `quickstart.md` (section 7)
  - Action: Test system settings and payment config screens
  - Test cases: Update onboarding video URL, update checkout URL
  - Validation: Invalid URLs rejected, valid URLs accepted
  - Verify: Changes persist in database
  - Dependencies: T037-T038 (needs system config screens)
  - Estimated: 20 min

- [ ] **T048** Manual testing - Debug Tools
  - Reference: `quickstart.md` (section 7, debug portions)
  - Action: Test user data inspector, SQL query tool, database cleanup
  - Test cases: View user data, execute SELECT query, execute UPDATE with confirmation, preview cleanup, execute cleanup
  - Safety: Verify DROP/TRUNCATE blocked, destructive queries require confirmation
  - Dependencies: T039-T041 (needs debug screens)
  - Estimated: 30 min

- [ ] **T049** Performance verification
  - Reference: `quickstart.md` (Performance Testing section)
  - Action: Measure and verify response times meet targets
  - Targets: Statistics <200ms, User search <500ms, Database stats <1000ms
  - Tools: curl with `time`, Browser Network tab
  - Optimization: If targets not met, add missing indexes from T026
  - Dependencies: T004-T025 (needs all backend endpoints), T026 (needs indexes)
  - Estimated: 30 min

---

## Phase 3.14: Documentation & Deployment

- [ ] **T050** Update changelog.html
  - File: `public/changelog.html`
  - Action: Add new version entry for Admin Dashboard v2
  - Version: Bump to next version (e.g., 0.20.0 - new feature)
  - Entry: Describe new admin2.html dashboard, list key features
  - Badge: Mark as "badge-feature"
  - Dependencies: T045-T049 (needs testing complete)
  - Estimated: 15 min

- [ ] **T051** Update package.json version
  - File: `package.json`
  - Action: Bump version number for new feature release
  - Version: Use semantic versioning (MINOR bump: 0.19.24 → 0.20.0)
  - Dependencies: T050 (needs changelog updated)
  - Estimated: 2 min

- [ ] **T052** Deploy to staging and verify
  - Action: Deploy to dev.tickedify.com staging environment
  - Commands: `git add .`, `git commit`, `git push origin 018-implementeer-de-volgende`
  - Verification: Test admin2.html on staging, verify all endpoints work
  - Reference: Use quickstart.md 15-minute workflow
  - Dependencies: T051 (needs version bumped)
  - Estimated: 20 min

- [ ] **T053** Create pull request to main
  - Action: Create PR from 018-implementeer-de-volgende → main
  - Description: Reference spec.md, list implemented features, link to testing results
  - Checklist: Include testing checklist from quickstart.md
  - Review: Wait for approval before merging
  - Dependencies: T052 (needs staging verification)
  - Estimated: 15 min

---

## Dependencies

### Critical Path
```
Setup (T001-T003)
  ↓
Backend Statistics [P] (T004-T009)
  ↓
Backend User Management (T010-T017)
  ↓
Backend System Config (T018-T021)
  ↓
Backend Debug Tools (T022-T025)
  ↓
Frontend Home (T027-T028)
  ↓
Frontend Other Screens [P] (T029-T032)
  ↓
Frontend User Management (T033-T036)
  ↓
Frontend System Config (T037-T038)
  ↓
Frontend Debug Tools (T039-T041)
  ↓
Frontend Polish (T042-T044)
  ↓
Testing (T045-T049)
  ↓
Documentation & Deployment (T050-T053)
```

### Parallel Execution Groups
```
Group 1: Statistics API Endpoints [P]
- T004, T005, T006, T007, T008, T009 can run in parallel

Group 2: Frontend Statistics Screens [P]
- T029, T030, T031, T032 can run in parallel (after T028)

Group 3: Database Optimization [P]
- T026 can run in parallel with any backend work (T004-T025)

Group 4: Frontend Polish [P]
- T044 can run in parallel with testing
```

### Sequential Constraints
```
- T010-T017: User management endpoints (modify same server.js section)
- T018-T021: System config endpoints (sequential in server.js)
- T022-T025: Debug tools endpoints (sequential in server.js)
- T027 → T028: HTML before JavaScript for home screen
- T033 → T034 → T035 → T036: User management screen (build up complexity)
```

---

## Parallel Execution Examples

### Example 1: Implement All Statistics Endpoints Together
```bash
# Launch 6 parallel tasks for statistics endpoints
Task(subagent_type: "tickedify-feature-builder",
     description: "Stats home endpoint",
     prompt: "Implement GET /api/admin2/stats/home endpoint in server.js per contracts/api-admin2-stats.md home endpoint spec and data-model.md User Statistics queries")

Task(subagent_type: "tickedify-feature-builder",
     description: "Stats growth endpoint",
     prompt: "Implement GET /api/admin2/stats/growth endpoint in server.js per contracts/api-admin2-stats.md growth endpoint spec")

Task(subagent_type: "tickedify-feature-builder",
     description: "Stats tasks endpoint",
     prompt: "Implement GET /api/admin2/stats/tasks endpoint in server.js per contracts/api-admin2-stats.md tasks endpoint spec")

# ... T007, T008, T009 similarly
```

### Example 2: Implement Frontend Statistics Screens in Parallel
```bash
# After home screen is done (T028), implement other stats screens in parallel
Task(subagent_type: "tickedify-feature-builder",
     description: "Task analytics screen",
     prompt: "Implement Task Analytics screen (HTML + JavaScript) for admin2.html per contracts/api-admin2-stats.md tasks endpoint")

Task(subagent_type: "tickedify-feature-builder",
     description: "Email analytics screen",
     prompt: "Implement Email Analytics screen for admin2.html per contracts/api-admin2-stats.md emails endpoint")

# ... T031, T032 similarly
```

---

## Validation Checklist
*GATE: Verify before marking tasks complete*

- [x] All 22 API endpoints have implementation tasks (T004-T025)
- [x] All 10 dashboard screens have frontend tasks (T027-T041)
- [x] Testing tasks cover all functional requirements (T045-T049)
- [x] Parallel tasks truly independent (different files/routes)
- [x] Each task specifies exact file path
- [x] Dependencies clearly documented
- [x] Sequential tasks properly ordered
- [x] Testing comes after implementation (not TDD due to manual testing approach)

---

## Notes

- **NOT TDD**: This project uses manual testing approach via Playwright (tickedify-testing agent)
- **Monolithic Structure**: All backend work happens in server.js (sequential within route groups)
- **Existing Database**: No new tables, only new queries and indexes
- **Session-Based Auth**: Reuse existing authentication, just add admin check
- **Vanilla JavaScript**: No build step, CDN dependencies only (Chart.js)
- **Deployment**: Vercel auto-deploys on git push
- **Testing**: Manual testing per quickstart.md, Playwright for automated scenarios

---

## Estimated Timeline

- **Backend**: 9-10 hours (22 endpoints)
- **Frontend**: 8-9 hours (10 screens + polish)
- **Testing**: 2-3 hours (manual + performance)
- **Documentation**: 1 hour (changelog, deployment)

**Total**: ~20-23 hours of development time

With parallelization:
- Statistics endpoints: 45 min (parallel vs 3 hours sequential)
- Frontend screens: 35 min (parallel vs 2 hours sequential)

**Optimized Total**: ~12-15 hours with parallel execution

---

**Ready for implementation!** 🚀

Start with T001-T003 (setup), then parallelize T004-T009 (statistics endpoints).
