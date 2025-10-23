# Research: In-App Admin-to-User Messaging System

**Feature**: 026-lees-messaging-system
**Date**: 2025-01-23

## Research Areas

### 1. Database Design for Messaging System

**Decision**: Three-table design met composite keys en cascading deletes

**Rationale**:
- `admin_messages`: Hoofdtabel voor message metadata, targeting, triggering en styling
- `message_interactions`: Junction table met composite PK (message_id, user_id) voor user interactions
- `user_page_visits`: Tracking tabel voor page visit counts (gebruikt door trigger logica)
- Alle foreign keys met CASCADE DELETE voor data consistency
- Indexes op frequent query patterns: active messages, user interactions, page visits

**Alternatives Considered**:
- **Single messages table met embedded JSON**: Verworpen - geen query efficiency voor targeting
- **Separate tables per message type**: Verworpen - te complex, geen shared patterns
- **NoSQL document store**: Verworpen - PostgreSQL is bestaande stack, relational model past beter

**Implementation Details**:
- Array types voor multi-value fields (target_subscription, target_users, snooze_durations)
- Timestamp fields voor scheduling (publish_at, expires_at) en tracking (first_shown_at, snoozed_until)
- Boolean flags voor behavior control (active, dismissible, snoozable, dismissed, button_clicked)
- Indexes voor performance: active messages, publish/expire dates, user interactions, snoozed messages

---

### 2. Message Targeting Architecture

**Decision**: Server-side filtering met dynamic query building

**Rationale**:
- Targeting filters applied in SQL query building (niet frontend filtering)
- Three target types: 'all', 'filtered' (subscription), 'specific_users' (ID array)
- User search API endpoint voor admin UI met ILIKE matching op name/email
- Preview endpoint toont count + sample users (eerste 5) voor targeting verification

**Alternatives Considered**:
- **Client-side filtering**: Verworpen - security risk, niet schaalbaar
- **Pre-computed message assignments**: Verworpen - te complex, moeilijk te updaten
- **User segments table**: Verworpen - overkill voor current scope

**Implementation Details**:
- Dynamic SQL query met conditional WHERE clauses gebaseerd op target_type
- Array membership checks: `subscription_type = ANY($1)` en `id = ANY($1)`
- ILIKE voor case-insensitive search: `name ILIKE '%' || $1 || '%'`
- Preview query gebruikt zelfde logic als unread message query voor consistency

---

### 3. Trigger System Design

**Decision**: Event-driven triggers met page visit tracking en time-based evaluation

**Rationale**:
- Four trigger types: immediate, days_after_signup, first_page_visit, nth_page_visit
- Page visits tracked via POST endpoint, upsert pattern met visit_count increment
- Trigger evaluation happens in GET /api/messages/unread met dynamic SQL filters
- Days since signup calculated server-side: `(NOW() - user.created_at) / 86400`

**Alternatives Considered**:
- **Cron job evaluation**: Verworpen - real-time triggers gewenst, geen scheduling delay
- **Frontend trigger tracking**: Verworpen - security risk, inconsistent tracking
- **Event queue system**: Verworpen - overkill voor current scale

**Implementation Details**:
- Page identifier convention: 'dagelijkse-planning', 'edit-task-modal', 'actielijst', etc.
- Trigger value encoding:
  - days_after_signup: integer (e.g., "3")
  - first_page_visit: page identifier (e.g., "dagelijkse-planning")
  - nth_page_visit: "count:page" format (e.g., "5:edit-task-modal")
- Upsert pattern voor page visits: `ON CONFLICT (user_id, page_identifier) DO UPDATE`

---

### 4. Message Modal UI Architecture

**Decision**: Vanilla JavaScript met carousel pattern en modal overlay

**Rationale**:
- Single modal overlay met dynamic content loading (niet meerdere modals)
- Carousel pattern voor multiple messages: prev/next buttons + indicator "1 / 3"
- Priority sorting: important > warning > feature > educational > tip > information
- Type-specific styling: border colors + gradient backgrounds + icons
- Modal HTML injected in app.html, JavaScript in separate message-modal.js file

**Alternatives Considered**:
- **React component**: Verworpen - Tickedify gebruikt Vanilla JS, geen framework introduceren
- **Multiple modal instances**: Verworpen - DOM overhead, complex state management
- **Toast notifications**: Verworpen - te subtiel voor important messages

**Implementation Details**:
- z-index: 10000 voor modal overlay (boven alle andere UI elementen)
- Flex center alignment voor responsive positioning
- Markdown link parsing: regex replace `[text](url)` naar `<a href>` tags
- Snooze durations in seconds: 3600 (1h), 14400 (4h), 86400 (1d)
- Button actions: 'navigate' (window.location), 'external' (window.open new tab)

---

### 5. Admin Dashboard Design

**Decision**: Tabbed interface met message list + create form + analytics modal

**Rationale**:
- Two main tabs: "Create Message" (form) en "All Messages" (list table)
- Message table toont: title, type, targeting, trigger, stats, status, actions
- Analytics als separate modal overlay met detailed stats + user interaction table
- Preview functie hergebruikt message modal component met dummy data
- Live target preview tijdens message creation (debounced, 500ms delay)

**Alternatives Considered**:
- **Separate pages per function**: Verworpen - te veel navigation, contextwissel overhead
- **Inline editing in table**: Verworpen - form complexity past niet in table rows
- **Full-screen analytics**: Verworpen - modal geeft betere context preservation

**Implementation Details**:
- Tab switching via CSS display: none/block toggle
- Message table row highlighting voor inactive messages (opacity: 0.5)
- Toggle button voor activate/deactivate (geen permanent delete in UI)
- Analytics modal: grid layout voor stat cards, table voor user interactions
- Form validation: max length checks, required fields, email format

---

### 6. Performance Optimization Strategy

**Decision**: Database indexes + async operations + query optimization

**Rationale**:
- Indexes op frequently queried columns: active, publish_at, expires_at, user_id, snoozed_until
- Page visit tracking via async fetch (no blocking UI)
- Message check on DOMContentLoaded (parallél met andere page loads)
- Analytics queries optimized met JOINs en aggregations (niet N+1 queries)
- Target preview debounced (500ms) om excessive database hits te voorkomen

**Alternatives Considered**:
- **Redis caching**: Verworpen - huidige scale maakt dit niet nodig
- **Pre-computed analytics**: Verworpen - real-time data gewenst
- **Client-side caching**: Verworpen - stale data risk voor targeting changes

**Implementation Details**:
- Composite index: `(user_id, dismissed, snoozed_until)` voor interaction queries
- Conditional index: `WHERE snoozed_until IS NOT NULL` voor snoozed messages
- Query optimization: gebruik COUNT(*) FILTER voor conditional aggregations
- Async/await pattern in frontend voor non-blocking API calls
- Loading indicators via LoadingManager class (bestaande Tickedify utility)

---

### 7. Security & Authorization

**Decision**: Server-side admin checks + input validation + parameterized queries

**Rationale**:
- Admin-only endpoints protected met middleware: `requireAdmin(req, res, next)`
- Admin check: `req.session.userId === 1` (current implementation) of role-based
- Input validation: maxlength checks, type validation, array validation
- Parameterized queries: geen string concatenation, altijd $1, $2, etc placeholders
- XSS prevention: markdown links rendering via regex, geen innerHTML direct

**Alternatives Considered**:
- **JWT tokens**: Verworpen - session-based auth is bestaande Tickedify pattern
- **Role-based permissions**: Future enhancement - nu simple admin check voldoende
- **Rate limiting**: Future enhancement - huidige scale maakt dit niet nodig

**Implementation Details**:
- Validation function: `validateMessageInput(data)` checks alle required fields
- SQL injection prevention: always use parameterized queries via pool.query($1, [params])
- Admin routes: `/api/admin/messages`, `/api/admin/users/search`, `/api/admin/messages/:id/analytics`
- User routes: `/api/messages/unread`, `/api/messages/:id/dismiss`, `/api/messages/:id/snooze`
- Button target validation: URL format check voor external links, path check voor navigate

---

### 8. Testing Strategy

**Decision**: Manual testing op staging + phase-based validation + analytics verification

**Rationale**:
- Staging environment: dev.tickedify.com voor volledige feature testing
- Phase-based testing: elke phase heeft eigen test checklist
- End-to-end scenarios: 6 hoofdscenarios uit spec.md (broadcast, onboarding, targeting, etc.)
- Analytics verification: check counts, percentages, user interactions na elke test run
- BETA FREEZE: geen productie testing tot freeze wordt opgeheven

**Alternatives Considered**:
- **Automated testing**: Future enhancement - geen test framework in huidige Tickedify
- **Unit tests**: Future enhancement - focus ligt nu op integration testing
- **Load testing**: Out of scope - beta heeft ~245 users

**Implementation Details**:
- Test users: jan@buskens.be (admin), test accounts voor user scenarios
- Test data: creëer messages voor elk scenario type
- Verification: check database direct via Neon console voor interaction tracking
- Edge case testing: expired messages, non-dismissible, snoozed timing, carousel navigation
- Performance testing: Chrome DevTools Network tab voor <500ms constraint

---

### 9. Deployment Workflow

**Decision**: Git-based deployment naar Vercel staging met version tracking

**Rationale**:
- Feature branch: 026-lees-messaging-system (already created)
- Development: commit + push naar feature branch triggers Vercel staging deploy
- Version bump: package.json version increment bij elke significante wijziging
- Changelog: update public/changelog.html met feature progress
- BETA FREEZE: pull request aanmaken maar NIET mergen naar main (productie blocked)

**Alternatives Considered**:
- **Direct main push**: VERBODEN - BETA FREEZE actief
- **Manual staging deployment**: Verworpen - Vercel automation is bestaande workflow
- **Feature flags**: Out of scope - geen flag systeem in Tickedify

**Implementation Details**:
- Version format: MAJOR.MINOR.PATCH (e.g., 0.19.134)
- Commit message format: emoji + description (e.g., "📢 FEATURE: Phase 1 messaging foundation - v0.19.134")
- Deployment verification: curl -s -L -k https://dev.tickedify.com/api/version
- Staging testing: nav naar dev.tickedify.com/app met test credentials
- Changelog entry: datum, versie, emoji, feature beschrijving

---

## Research Completion Summary

**All Technical Decisions Made** ✅
- Database schema design finalized
- Targeting architecture specified
- Trigger system design complete
- UI/UX patterns chosen
- Performance strategy defined
- Security approach documented
- Testing strategy outlined
- Deployment workflow confirmed

**No Remaining NEEDS CLARIFICATION** ✅
- Alle technische details zijn gespecificeerd in MESSAGING_SYSTEM_SPEC.md
- Feature spec heeft geen ambiguïteiten
- Implementation kan direct beginnen na Phase 1 design

**Ready for Phase 1: Design & Contracts** ✅
