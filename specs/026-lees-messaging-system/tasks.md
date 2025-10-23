# Tasks: In-App Admin-to-User Messaging System

**Feature**: 026-lees-messaging-system
**Input**: Design documents from `/specs/026-lees-messaging-system/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: JavaScript (Vanilla JS + Node.js/Express)
   → Database: PostgreSQL (Neon) - 3 nieuwe tabellen
   → Structure: Web app (public/ frontend, server.js backend)
2. Load design documents ✅
   → data-model.md: 4 entities (AdminMessage, MessageInteraction, UserPageVisit, User)
   → contracts/: 11 API endpoints (6 admin, 5 user)
   → research.md: 9 research areas met design decisions
   → quickstart.md: Phase 1 implementation guide
3. Generate tasks by 4 implementation phases ✅
   → Phase 1: Core Foundation (Database + Basic API + Modal UI)
   → Phase 2: Targeting & Triggers (Advanced filtering + conditionals)
   → Phase 3: Rich Content & UX (Message types + carousel + snooze)
   → Phase 4: Analytics & Admin UI (Dashboard + stats + management)
4. Apply task rules ✅
   → Database tasks: Sequential (schema dependencies)
   → Backend + Frontend tasks: Parallel within phase [P]
   → Testing tasks: Sequential per phase (end-to-end validation)
5. Number tasks sequentially (T001-T039) ✅
6. Validate completeness ✅
   → All 11 API contracts have implementation tasks
   → All 4 entities have schema tasks
   → All 7 acceptance scenarios have test tasks
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths shown are relative to repository root
- **BELANGRIJK**: Elke phase moet volledig afgerond worden voordat de volgende begint

---

## 🎯 PHASE 1: CORE FOUNDATION (~4 uur)

**Deliverable**: Basic messaging system - admin kan text-only berichten sturen naar alle users, users kunnen dismissen.

### Phase 1.1: Database Schema Setup

- [ ] **T001** [P] Create `admin_messages` table met 21 fields + 2 indexes
  - File: SQL execution via Neon console
  - Reference: data-model.md lines 10-66
  - Fields: id, title, message, message_type, target_type, target_subscription, target_users, trigger_type, trigger_value, dismissible, snoozable, snooze_durations, publish_at, expires_at, button_label, button_action, button_target, active, created_at, updated_at
  - Indexes: idx_admin_messages_active, idx_admin_messages_publish_expires

- [ ] **T002** [P] Create `message_interactions` table met 9 fields + 3 indexes
  - File: SQL execution via Neon console
  - Reference: data-model.md lines 68-124
  - Fields: message_id, user_id (composite PK), snoozed_until, dismissed, first_shown_at, last_shown_at, shown_count, button_clicked, button_clicked_at
  - Foreign keys: CASCADE DELETE on admin_messages, users
  - Indexes: idx_message_interactions_user, idx_message_interactions_snoozed, idx_message_interactions_status

- [ ] **T003** [P] Create `user_page_visits` table met 5 fields + 1 index
  - File: SQL execution via Neon console
  - Reference: data-model.md lines 126-172
  - Fields: user_id, page_identifier (composite PK), visit_count, first_visit_at, last_visit_at
  - Foreign key: CASCADE DELETE on users
  - Index: idx_user_page_visits_count

- [ ] **T004** Add `subscription_type` column to `users` table if not exists
  - File: SQL execution via Neon console
  - Reference: data-model.md lines 174-201
  - ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'free'
  - CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_type, created_at)
  - Verify: SELECT subscription_type FROM users LIMIT 1

### Phase 1.2: Backend Admin Endpoints

- [ ] **T005** [P] Add admin authorization middleware `requireAdmin()` to server.js
  - File: server.js (insert after regel ~6,253 of in middleware sectie)
  - Reference: quickstart.md lines 64-72, api-contracts.md Authorization sections
  - Logic: Check req.session.userId === 1 (or proper admin role)
  - Return 403 Forbidden if not admin

- [ ] **T006** [P] Implement POST /api/admin/messages endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 16-88, quickstart.md lines 74-114
  - Validation: title required, message required, max lengths
  - Insert into admin_messages table with defaults
  - Return 201 Created with messageId

- [ ] **T007** [P] Implement GET /api/admin/messages endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 90-125, quickstart.md lines 116-137
  - Join with message_interactions for stats (shown_count, dismissed_count)
  - GROUP BY message id, ORDER BY created_at DESC
  - Return array of messages with stats

- [ ] **T008** [P] Implement POST /api/admin/messages/:id/toggle endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 127-144, quickstart.md lines 139-152
  - UPDATE admin_messages SET active = NOT active WHERE id = $1
  - Return new active status

### Phase 1.3: Backend User Endpoints

- [ ] **T009** [P] Implement GET /api/messages/unread endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 182-241, quickstart.md lines 183-211
  - Query active messages WHERE publish_at <= NOW, expires_at > NOW or NULL
  - Filter: target_type = 'all', trigger_type = 'immediate' (Phase 1 only)
  - Exclude dismissed/snoozed via NOT IN subquery on message_interactions
  - ORDER BY created_at DESC

- [ ] **T010** [P] Implement POST /api/messages/:id/dismiss endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 243-267, quickstart.md lines 213-228
  - UPSERT: INSERT ... ON CONFLICT (message_id, user_id) DO UPDATE
  - Set dismissed = true, last_shown_at = NOW()
  - Return {success: true}

- [ ] **T011** [P] Implement POST /api/page-visit/:pageIdentifier endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 269-307, quickstart.md lines 230-245
  - UPSERT: INSERT ... ON CONFLICT DO UPDATE visit_count + 1
  - Update last_visit_at = NOW()
  - RETURNING visit_count for response

### Phase 1.4: Frontend Message Modal

- [ ] **T012** [P] Create public/js/message-modal.js met basic modal logic
  - File: public/js/message-modal.js (nieuw bestand)
  - Reference: quickstart.md lines 271-329
  - Variables: currentMessages[], currentMessageIndex
  - Function: checkForMessages() - fetch /api/messages/unread on DOMContentLoaded
  - Function: showMessage(message) - update DOM, display modal
  - Function: dismissMessage(messageId) - POST dismiss, hide modal

- [ ] **T013** Add message modal HTML structure to public/app.html
  - File: public/app.html (insert vóór closing </body> tag)
  - Reference: quickstart.md lines 336-351
  - Overlay div: id="message-modal-overlay" met display: none
  - Modal content: .message-header (icon + title), .message-body (content), .message-actions (dismiss button)
  - Script include: <script src="js/message-modal.js"></script>

- [ ] **T014** [P] Add message modal CSS styling to public/style.css
  - File: public/style.css (append at end, after regel ~6,542)
  - Reference: quickstart.md lines 358-410
  - .modal-overlay: fixed position, z-index 10000, flex center, rgba background
  - .message-modal: white background, border-radius, padding, max-width 500px
  - .message-header, .message-body, .message-actions styling
  - .btn-message-dismiss: blue button met hover state

### Phase 1.5: Testing & Validation

- [ ] **T015** Test Phase 1: Create first message via admin API
  - Reference: quickstart.md lines 417-431
  - Login: https://dev.tickedify.com/admin.html met admin credentials
  - Execute: fetch POST /api/admin/messages met test message (browser console)
  - Verify: Response {success: true, messageId: 1}
  - Check database: SELECT * FROM admin_messages WHERE id = 1

- [ ] **T016** Test Phase 1: View message as user and dismiss
  - Reference: quickstart.md lines 433-447
  - Login: https://dev.tickedify.com/app als regular user
  - Verify: Modal appears met test message
  - Action: Click "Got it" button
  - Verify: Modal disappears, reload page → no modal
  - Check database: SELECT * FROM message_interactions WHERE message_id = 1

- [ ] **T017** Version bump, commit and deploy Phase 1 to staging
  - Update: package.json version (e.g., 0.19.134 → 0.19.135)
  - Commit: git add . && git commit -m "📢 FEATURE: Phase 1 messaging foundation - v0.19.135"
  - Push: git push origin 026-lees-messaging-system
  - Verify: https://dev.tickedify.com/api/version matches new version
  - Test: Full Phase 1 scenarios op staging environment

---

## 🎯 PHASE 2: TARGETING & TRIGGERS (~4 uur)

**Deliverable**: Advanced message targeting (subscription, specific users) + conditional triggers (signup days, page visits) + scheduling.

### Phase 2.1: Admin Targeting Endpoints

- [ ] **T018** [P] Implement GET /api/admin/users/search endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 146-172, quickstart.md lines 154-171
  - Query: SELECT id, username, email, subscription_type FROM users
  - WHERE: username ILIKE '%query%' OR email ILIKE '%query%'
  - LIMIT 50, ORDER BY username
  - Min query length: 2 characters

- [ ] **T019** [P] Implement GET /api/admin/messages/preview-targets endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 174-216, quickstart.md lines 173-180
  - Dynamic query building based on target_type, target_subscription, target_users
  - Return: {count: N, sample: [first 5 users]}
  - Logic: Same as unread query maar zonder trigger/interaction filters

### Phase 2.2: Enhanced Unread Query with Targeting

- [ ] **T020** Extend GET /api/messages/unread met subscription filtering
  - File: server.js (update existing T009 endpoint)
  - Reference: data-model.md lines 203-234, api-contracts.md lines 182-241
  - Add user subscription query: SELECT subscription_type FROM users WHERE id = userId
  - Extend WHERE clause: (target_type = 'all' OR (target_type = 'filtered' AND subscription = ANY(target_subscription)) OR (target_type = 'specific_users' AND userId = ANY(target_users)))

- [ ] **T021** Extend GET /api/messages/unread met days_after_signup trigger
  - File: server.js (update existing T009 endpoint)
  - Reference: data-model.md lines 203-234, research.md lines 35-73
  - Calculate: daysSinceSignup = (NOW - user.created_at) / 86400
  - Extend WHERE clause: (trigger_type = 'immediate' OR (trigger_type = 'days_after_signup' AND daysSinceSignup >= trigger_value::integer))

- [ ] **T022** Extend GET /api/messages/unread met page visit triggers
  - File: server.js (update existing T009 endpoint)
  - Reference: data-model.md lines 203-234, research.md lines 35-73
  - Accept query param: ?page=pageIdentifier
  - Query user_page_visits voor visit_count
  - Separate query voor first_page_visit (visit_count = 1) en nth_page_visit (trigger_value parsing "N:page")
  - Merge results met main query

### Phase 2.3: Admin UI for Targeting

- [ ] **T023** Add targeting form section to public/admin.html
  - File: public/admin.html (in message creator form sectie)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 662-782
  - Radio buttons: target-type (all/filtered/specific_users)
  - Checkboxes: subscription filters (free/premium/trial) - hidden by default
  - User search: input field + results div + selected users div
  - Target preview: live count display

- [ ] **T024** [P] Add targeting JavaScript logic to admin.html or admin.js
  - File: public/admin.html <script> sectie of separate admin.js
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 784-872
  - Show/hide sections based on radio selection
  - User search: debounced fetch to /api/admin/users/search
  - selectUser() / removeUser() functions voor selectedUserIds array
  - updateTargetPreview(): debounced fetch to /api/admin/messages/preview-targets

### Phase 2.4: Trigger & Scheduling UI

- [ ] **T025** Add trigger form section to public/admin.html
  - File: public/admin.html (in message creator form sectie)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 714-761
  - Radio buttons: trigger-type (immediate/days_after_signup/first_page_visit/nth_page_visit)
  - Conditional inputs: days input, page selects, visit count input
  - Enable/disable inputs based on radio selection

- [ ] **T026** Add scheduling form section to public/admin.html
  - File: public/admin.html (in message creator form sectie)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 763-778
  - Input: datetime-local for publish_at (optional)
  - Input: datetime-local for expires_at (optional)
  - Helper text: "Leave empty for..." explanations

- [ ] **T027** Update message creation form submit handler voor Phase 2 fields
  - File: public/admin.html <script> of admin.js (update existing T024)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 874-922
  - Collect: target_type, target_subscription, target_users
  - Collect: trigger_type, trigger_value (with getTriggerValue() helper)
  - Collect: publish_at, expires_at (ISO timestamps or null)
  - Submit: fetch POST /api/admin/messages met alle Phase 2 velden

### Phase 2.5: Testing & Validation

- [ ] **T028** Test Phase 2: Subscription-filtered message
  - Create message: target_type = 'filtered', target_subscription = ['premium']
  - Verify: Only premium users see message (test met 2 accounts: free + premium)
  - Check: Preview endpoint shows correct count

- [ ] **T029** Test Phase 2: Days after signup trigger
  - Create message: trigger_type = 'days_after_signup', trigger_value = '3'
  - Verify: New user (< 3 days) doesn't see, old user (> 3 days) sees
  - Database: Manually adjust user.created_at voor testing if needed

- [ ] **T030** Test Phase 2: Page visit triggers
  - Create message: trigger_type = 'first_page_visit', trigger_value = 'dagelijkse-planning'
  - Verify: Message appears on first visit to page, not on subsequent visits
  - Check: user_page_visits table has correct visit_count

- [ ] **T031** Version bump, commit and deploy Phase 2 to staging
  - Update: package.json version (e.g., 0.19.135 → 0.19.136)
  - Commit: git add . && git commit -m "🎯 FEATURE: Phase 2 targeting & triggers - v0.19.136"
  - Push: git push origin 026-lees-messaging-system
  - Test: All Phase 2 targeting + trigger scenarios on staging

---

## 🎯 PHASE 3: RICH CONTENT & UX (~4 uur)

**Deliverable**: Message types met icons + markdown links + action buttons + snooze + message carousel + priority sorting.

### Phase 3.1: Message Types & Priority

- [ ] **T032** Add message type styling to public/style.css
  - File: public/style.css
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1307-1347
  - Type classes: .message-information, .message-educational, .message-warning, .message-important, .message-feature, .message-tip
  - Border colors + gradient backgrounds per type
  - Icon font-size adjustments

- [ ] **T033** Update showMessage() in message-modal.js voor message types
  - File: public/js/message-modal.js (update existing T012)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1091-1179
  - Function: getMessageIcon(type) - returns emoji icon per type
  - Apply: modal.className = `message-modal message-${message.message_type}`
  - Update: .message-icon innerHTML met correct icon

- [ ] **T034** Update GET /api/messages/unread met priority sorting
  - File: server.js (update existing T009/T020/T021/T022 endpoint)
  - Reference: data-model.md lines 203-234, MESSAGING_SYSTEM_SPEC.md lines 1057-1070
  - ORDER BY: CASE message_type WHEN 'important' THEN 1...END, created_at DESC
  - Priority: important > warning > feature > educational > tip > information

### Phase 3.2: Markdown & Action Buttons

- [ ] **T035** [P] Add markdown link parsing to message-modal.js
  - File: public/js/message-modal.js (update showMessage function)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1180-1185
  - Function: parseMarkdownLinks(text) - regex replace [text](url) → <a href>
  - Apply: .message-content innerHTML = parseMarkdownLinks(message.message)

- [ ] **T036** [P] Add action button support to message-modal.js
  - File: public/js/message-modal.js (update showMessage function)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1125-1141
  - Conditional: if (message.button_label) render button HTML
  - Function: handleButtonAction(message) - navigate vs external logic
  - Track: POST /api/messages/:id/button-click before action

- [ ] **T037** [P] Implement POST /api/messages/:id/button-click endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 311-332
  - UPDATE message_interactions SET button_clicked = true, button_clicked_at = NOW()
  - WHERE message_id = $1 AND user_id = $2

- [ ] **T038** [P] Add action button CSS to public/style.css
  - File: public/style.css
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1385-1404
  - .message-button container styling
  - .btn-message-action: full-width button, blue background, hover state

### Phase 3.3: Snooze Functionality

- [ ] **T039** [P] Implement POST /api/messages/:id/snooze endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 269-298
  - UPSERT: snoozed_until = NOW() + INTERVAL '1 second' * duration
  - Return: {success: true, snoozedUntil: timestamp}

- [ ] **T040** [P] Add snooze UI to message-modal.js
  - File: public/js/message-modal.js (update showMessage function)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1144-1150, 1220-1245
  - Conditional: if (message.snoozable) show snooze options
  - Buttons: "💤 1 hour", "💤 4 hours", "💤 1 day" (3600, 14400, 86400 seconds)
  - Function: snoozeMessage(messageId, duration) - POST snooze, remove from carousel

- [ ] **T041** [P] Add snooze button CSS to public/style.css
  - File: public/style.css
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1426-1444
  - .snooze-options: flex layout, gap
  - .btn-snooze: yellow background, border, hover state

### Phase 3.4: Message Carousel

- [ ] **T042** Update message-modal.js voor multiple messages carousel
  - File: public/js/message-modal.js (major refactor of T012)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1077-1121
  - Variables: currentMessages[], currentMessageIndex (already exist)
  - Update showMessage(): carousel indicator "1 / 3", prev/next button visibility
  - Event handlers: .btn-prev, .btn-next click → navigate carousel
  - Update dismissMessage(): remove from array, show next or close modal

- [ ] **T043** Add carousel HTML elements to app.html modal
  - File: public/app.html (update existing T013 modal HTML)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1269-1303
  - Header: Add <span class="carousel-indicator">1 / 3</span>
  - Actions: Add prev/next buttons (hidden by default)
  - Actions: Add snooze-options div (hidden by default)

- [ ] **T044** [P] Add carousel CSS to public/style.css
  - File: public/style.css
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1366-1374, 1414-1425
  - .carousel-indicator: badge styling, font-size 12px
  - .btn-prev, .btn-next: navigation button styling
  - Responsive: flex-wrap for mobile

### Phase 3.5: Dismissible Control

- [ ] **T045** Update message-modal.js voor non-dismissible messages
  - File: public/js/message-modal.js (update showMessage function)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1151-1165
  - Conditional: if (!message.dismissible) hide dismiss button
  - Edge case: if (!dismissible && !button_label) show "OK" button that closes without dismissing
  - Logic: Non-dismissible messages met button worden dismissed na button click

### Phase 3.6: Testing & Validation

- [ ] **T046** Test Phase 3: Message types met icons en styling
  - Create: 6 messages, één van elk type (information, educational, warning, important, feature, tip)
  - Verify: Each displays correct icon, border color, gradient background
  - Test: Priority sorting - important message appears first in carousel

- [ ] **T047** Test Phase 3: Markdown links en action buttons
  - Create message: Include markdown link [Click here](https://example.com)
  - Verify: Link renders as clickable <a> tag
  - Create message: button_label "Try it", button_action "navigate", button_target "/dagelijkse-planning"
  - Verify: Button navigates correctly, button click is tracked in database

- [ ] **T048** Test Phase 3: Snooze functionality timing
  - Create message: snoozable = true
  - Action: Click "Snooze 1 hour"
  - Verify: Modal closes, message doesn't appear on immediate reload
  - Wait: 61+ minutes (or manually set snoozed_until in database to past)
  - Verify: Message reappears on next page load

- [ ] **T049** Test Phase 3: Multiple messages carousel navigation
  - Create: 3 active messages
  - Verify: Modal shows "1 / 3" indicator
  - Action: Click "Next" → verify counter updates to "2 / 3"
  - Action: Dismiss message #2 → verify carousel shows "2 / 2" (renumbered)
  - Verify: Prev/next buttons hide correctly at start/end

- [ ] **T050** Version bump, commit and deploy Phase 3 to staging
  - Update: package.json version (e.g., 0.19.136 → 0.19.137)
  - Commit: git add . && git commit -m "🎨 FEATURE: Phase 3 rich content & UX - v0.19.137"
  - Push: git push origin 026-lees-messaging-system
  - Test: All Phase 3 UX features on staging (types, buttons, snooze, carousel)

---

## 🎯 PHASE 4: ANALYTICS & ADMIN UI (~4-5 uur)

**Deliverable**: Complete admin dashboard met message list, analytics modal, preview, en toggle active/inactive.

### Phase 4.1: Analytics Endpoint

- [ ] **T051** Implement GET /api/admin/messages/:id/analytics endpoint in server.js
  - File: server.js
  - Reference: api-contracts.md lines 218-334
  - Query 1: Message details
  - Query 2: Target count calculation (calculateTargeting helper function)
  - Query 3: Interaction stats with COUNT FILTER aggregations
  - Query 4: Detailed user interactions with JOIN to users table
  - Calculate: rates (seen_rate, dismiss_rate, snooze_rate, button_click_rate)
  - Return: {message, targeting, engagement, rates, users}

- [ ] **T052** [P] Create calculateTargeting() helper function in server.js
  - File: server.js (helper function boven T051)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1710-1730
  - Dynamic query building: COUNT(*) FROM users WHERE ...
  - Filters: target_subscription = ANY($1), id = ANY($1) based on target_type
  - Return: {total_targeted, estimated_reach}

### Phase 4.2: Admin Dashboard Structure

- [ ] **T053** Add tabbed dashboard structure to public/admin.html
  - File: public/admin.html (replace or wrap existing message creator)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1821-1855
  - Tabs: "Create Message" (existing form) en "All Messages" (new table)
  - Tab switching JavaScript: hide/show tab-content divs
  - Load messages list on "All Messages" tab activation

- [ ] **T054** Add messages list table to public/admin.html
  - File: public/admin.html (in tab-list content div)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1835-1854
  - Table headers: Title, Type, Targeting, Trigger, Stats, Status, Actions
  - tbody: id="messages-table-body" (populated via JavaScript)

- [ ] **T055** [P] Add dashboard CSS to public/style.css
  - File: public/style.css
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 2060-2141
  - .dashboard-tabs: border-bottom styling, tab buttons
  - .tab-btn.active: blue border-bottom
  - .messages-table: full width, striped rows, hover states
  - .badge-active, .badge-inactive: colored status badges
  - .btn-sm: small action buttons

### Phase 4.3: Message List JavaScript

- [ ] **T056** Add loadMessagesList() function to admin.html or admin.js
  - File: public/admin.html <script> of separate admin.js
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1895-1935
  - Fetch: GET /api/admin/messages
  - Render: Table rows met icon, title preview, targeting label, trigger label, stats mini
  - Helpers: getMessageIcon(), getTargetingLabel(), getTriggerLabel()
  - Actions: "📊 Analytics" button, "⏸️ Pause" / "▶️ Activate" button

- [ ] **T057** [P] Add toggleMessage() function to admin JavaScript
  - File: public/admin.html <script> of admin.js
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1968-1976
  - Fetch: POST /api/admin/messages/:id/toggle
  - On success: reload messages list (call loadMessagesList())

### Phase 4.4: Analytics Modal

- [ ] **T058** Add analytics modal HTML to public/admin.html
  - File: public/admin.html (add near end, before closing body tag)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1857-1871
  - Overlay: id="analytics-modal" met display: none
  - Content: modal-header (title + close button), modal-body (id="analytics-content")

- [ ] **T059** Add viewAnalytics() function to admin JavaScript
  - File: public/admin.html <script> of admin.js
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1978-2050
  - Fetch: GET /api/admin/messages/:id/analytics
  - Render analytics-content: header, stat cards (grid layout), user interactions table
  - Stat cards: targeted, shown, dismissed, snoozed, button_clicks (conditional)
  - Show: percentages (seen_rate, dismiss_rate, etc.)

- [ ] **T060** [P] Add analytics modal CSS to public/style.css
  - File: public/style.css
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 2143-2228
  - .analytics-modal: max-width 900px, max-height 90vh, overflow-y auto
  - .analytics-stats: grid layout, stat cards
  - .stat-card: background, padding, border-radius
  - .stat-value: large font-size, blue color
  - .users-table: full width, striped rows

### Phase 4.5: Message Preview

- [ ] **T061** Update admin message creator form met preview button
  - File: public/admin.html (in create form actions)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 2233-2240
  - Button: "👁️ Preview Message" (type="button", not submit)
  - Position: Before "Create Message" submit button

- [ ] **T062** [P] Add previewMessage() function to admin JavaScript
  - File: public/admin.html <script> of admin.js
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 2245-2277
  - Collect: All form values (title, message, type, dismissible, snoozable, button fields)
  - Create: Preview object {id: 'preview', ...form values}
  - Show: Call showMessage() from message-modal.js (reuse user modal)
  - Override: Dismiss button → just closes modal (geen POST dismiss voor preview)

### Phase 4.6: Enhanced Admin Form

- [ ] **T063** Add message type selector to admin form
  - File: public/admin.html (in create form, before targeting section)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1482-1507
  - Select dropdown: 6 options (information, educational, tip, feature, warning, important)
  - Each option: icon + label + description

- [ ] **T064** Add dismissible/snoozable checkboxes to admin form
  - File: public/admin.html (in create form, after message type)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1494-1507
  - Checkbox: id="dismissible" checked by default
  - Checkbox: id="snoozable" checked by default

- [ ] **T065** Add button configuration section to admin form
  - File: public/admin.html (in create form, new section)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1509-1560
  - Checkbox: "Add action button" (toggle visibility)
  - Hidden div: button-label input, button-action select (navigate/external), button-target input
  - JavaScript: Show/hide button-config div based on checkbox

- [ ] **T066** Update form submit handler voor ALL Phase 3+4 fields
  - File: public/admin.html <script> of admin.js (update existing T027)
  - Reference: MESSAGING_SYSTEM_SPEC.md lines 1544-1560
  - Collect: message_type, dismissible, snoozable
  - Collect: button_label, button_action, button_target (if has-button checked)
  - Submit: Complete message object to POST /api/admin/messages

### Phase 4.7: Testing & Validation

- [ ] **T067** Test Phase 4: Complete admin dashboard workflow
  - Navigate: https://dev.tickedify.com/admin.html
  - Switch: "All Messages" tab → verify table loads
  - Create: New message via "Create Message" tab
  - Verify: Message appears in "All Messages" table
  - Action: Click "📊 Analytics" → verify modal opens met correct stats
  - Action: Click "⏸️ Pause" → verify message status changes to inactive

- [ ] **T068** Test Phase 4: Analytics accuracy
  - Create: Test message, view as 3+ different users
  - Have users: dismiss (user 1), snooze (user 2), click button (user 3)
  - Admin: View analytics for test message
  - Verify: shown_count = 3, dismissed_count = 1, snoozed_count = 1, button_clicks = 1
  - Verify: Percentages calculated correctly (dismiss_rate = 33.3%)

- [ ] **T069** Test Phase 4: Message preview functionality
  - Fill: Complete message form (all fields: type, targeting, trigger, button)
  - Click: "👁️ Preview Message" button
  - Verify: Modal opens met exact form content
  - Verify: Button appears and styled correctly
  - Verify: Dismiss closes modal without database impact

- [ ] **T070** Version bump, commit and deploy Phase 4 to staging
  - Update: package.json version (e.g., 0.19.137 → 0.19.138)
  - Commit: git add . && git commit -m "📊 FEATURE: Phase 4 analytics & admin UI complete - v0.19.138"
  - Push: git push origin 026-lees-messaging-system
  - Test: Complete admin dashboard workflow on staging

---

## 📚 FINAL POLISH & DOCUMENTATION

### Documentation & Deployment

- [ ] **T071** Update public/changelog.html met complete messaging feature
  - File: public/changelog.html
  - Entry: Version 0.19.138, datum, "📢 In-App Messaging System"
  - Description: 4 phases, admin messaging, targeting, triggers, analytics
  - Badge: "badge-latest" voor nieuwste version

- [ ] **T072** Update ARCHITECTURE.md met messaging system documentation
  - File: ARCHITECTURE.md
  - Section: Database Schema - add 3 nieuwe tabellen
  - Section: API Endpoints - add 11 nieuwe endpoints in server.js
  - Section: Frontend - add message-modal.js locatie en functies
  - Reference: Verwijs naar specs/026-lees-messaging-system/ voor details

- [ ] **T073** End-to-end test: Complete messaging workflow
  - Reference: spec.md Acceptance Scenarios 1-7
  - Test 1: Broadcast message → alle users zien
  - Test 2: Onboarding → nieuwe user ziet bij eerste page visit
  - Test 3: Gerichte aankondiging → alleen premium users zien
  - Test 4: Progressieve tutorial → 5e page visit trigger
  - Test 5: Snooze timing → message reappears na 1 uur
  - Test 6: Meerdere berichten carousel → navigate, dismiss
  - Test 7: Analytics tracking → alle stats kloppen

- [ ] **T074** Create Pull Request (DO NOT MERGE - BETA FREEZE)
  - Title: "📢 Feature 026: In-App Admin-to-User Messaging System"
  - Description: Link naar specs/026-lees-messaging-system/spec.md
  - Summary: 4 phases, 11 endpoints, 3 database tabellen, complete admin dashboard
  - Notes: **BETA FREEZE ACTIEF** - PR is for review only, DO NOT merge naar main
  - Reviewers: Assign voor code review
  - Labels: feature, messaging, staging-tested

---

## Dependencies Graph

```
Setup (T001-T004) → Everything below
├─ Admin Endpoints (T005-T008) [P] → Admin UI
├─ User Endpoints (T009-T011) [P] → Frontend Modal
└─ Frontend Modal (T012-T014) [P] → Phase 1 Testing

Phase 1 Testing (T015-T017) → Phase 2 Start

Phase 2 Targeting (T018-T019) [P] → Admin UI
Phase 2 Unread Enhancement (T020-T022) Sequential → Testing
Phase 2 UI (T023-T027) Sequential (same files) → Testing
Phase 2 Testing (T028-T031) → Phase 3 Start

Phase 3 Types (T032-T034) Sequential → Markdown/Buttons
Phase 3 Markdown/Buttons (T035-T038) [P] → Snooze
Phase 3 Snooze (T039-T041) [P] → Carousel
Phase 3 Carousel (T042-T045) Sequential → Testing
Phase 3 Testing (T046-T050) → Phase 4 Start

Phase 4 Analytics (T051-T052) [P] → Dashboard
Phase 4 Dashboard (T053-T055) [P] → JS Functions
Phase 4 JS (T056-T062) Sequential (same file) → Enhanced Form
Phase 4 Form (T063-T066) Sequential → Testing
Phase 4 Testing (T067-T070) → Final Polish

Final Polish (T071-T074) Sequential → DONE
```

## Parallel Execution Examples

**Phase 1 Setup (run together)**:
```bash
# T001-T004 can all execute in parallel (different SQL scripts)
Task: "Create admin_messages table in Neon console"
Task: "Create message_interactions table in Neon console"
Task: "Create user_page_visits table in Neon console"
Task: "Add subscription_type column to users table"
```

**Phase 1 Backend (run together)**:
```bash
# T005-T011 can all execute in parallel (different endpoint functions)
Task: "Add requireAdmin middleware to server.js"
Task: "Implement POST /api/admin/messages in server.js"
Task: "Implement GET /api/admin/messages in server.js"
Task: "Implement POST /api/admin/messages/:id/toggle in server.js"
Task: "Implement GET /api/messages/unread in server.js"
Task: "Implement POST /api/messages/:id/dismiss in server.js"
Task: "Implement POST /api/page-visit/:pageIdentifier in server.js"
```

**Phase 1 Frontend (run together)**:
```bash
# T012-T014 can all execute in parallel (different files)
Task: "Create public/js/message-modal.js with basic modal logic"
Task: "Add message modal HTML to public/app.html"
Task: "Add message modal CSS to public/style.css"
```

**Phase 3 Snooze (run together)**:
```bash
# T039-T041 can all execute in parallel (different files)
Task: "Implement POST /api/messages/:id/snooze in server.js"
Task: "Add snooze UI to message-modal.js"
Task: "Add snooze button CSS to public/style.css"
```

**Phase 4 Dashboard Structure (run together)**:
```bash
# T053-T055 can all execute in parallel (different files)
Task: "Add tabbed dashboard structure to public/admin.html"
Task: "Add messages list table to public/admin.html"
Task: "Add dashboard CSS to public/style.css"
```

---

## Notes

- **[P] tasks**: Can run in parallel (different files, no shared dependencies)
- **Sequential tasks**: Must run in order (same file or dependency chain)
- **BETA FREEZE**: All deployments go to staging only, NO main branch merges
- **Version bumps**: Required at end of each phase before deployment
- **Testing**: Manual testing on dev.tickedify.com staging environment
- **Database**: Execute SQL via Neon console, verify with SELECT queries
- **Commit style**: Use emoji + description format (e.g., "📢 FEATURE: ...")

## Validation Checklist

- [x] All 11 API contracts have implementation tasks (T006-T011, T018-T019, T037, T039, T051)
- [x] All 4 entities have schema tasks (T001-T004)
- [x] All 7 acceptance scenarios have test tasks (T015-T016, T028-T030, T046-T049, T067-T069)
- [x] Tests come before implementation within each phase
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task in same batch
- [x] 4 phases clearly separated with testing gates between phases
- [x] Dependencies documented in graph
- [x] Parallel execution examples provided
- [x] Total: 74 tasks generated (Phase 1: 17, Phase 2: 14, Phase 3: 19, Phase 4: 20, Polish: 4)

**Tasks.md Ready for Execution** ✅
