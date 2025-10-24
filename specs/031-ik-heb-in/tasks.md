# Tasks: Admin Message Display Debug & Validatie Verbetering

**Feature**: 031-ik-heb-in
**Branch**: `031-ik-heb-in`
**Input**: Design documents from `/specs/031-ik-heb-in/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Summary

Deze feature heeft een pragmatische implementatie aanpak:
- **No database migrations**: Existing schema gebruikt
- **No automated tests**: Manual staging testing workflow
- **Monolith architecture**: Changes in server.js en admin2.html
- **Enhancement only**: Backwards compatible, geen breaking changes

**Tech Stack**:
- Backend: Node.js + Express.js (server.js)
- Frontend: Vanilla JavaScript (admin2.html)
- Database: PostgreSQL (geen schema changes)
- Testing: Manual op staging (dev.tickedify.com)

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Backend Validation (Hoogste Prioriteit)

**Goal**: Prevent berichten zonder gebruiker selectie, blokkeer op server-side

- [x] **T001** [CRITICAL] Add backend validation in `server.js:13243-13248`
  - Location: POST /api/admin/messages endpoint validation block
  - Check: `if (target_type === 'specific_users' && (!target_users || target_users.length === 0))`
  - Return: 400 error met Nederlandse message: "Geen gebruikers geselecteerd. Selecteer minimaal één gebruiker voor dit bericht."
  - Test: Verify validation blocks empty array and null values
  - Files: `server.js` (single edit in validation section)

## Phase 3.2: Frontend UX - Email Display (Preventie)

**Goal**: Toon email adressen zodat admin correcte gebruiker kan kiezen

- [x] **T002** [P] Display email addresses in user search results in `admin2.html`
  - Location: User search results rendering (~regel 1800-1900)
  - Update: Add email display to search result items
  - Format: `<span class="user-email">${user.email}</span>`
  - Style: Ensure email is visible (niet hidden by CSS)
  - Files: `public/admin2.html` (user search section)

- [x] **T003** [P] Display email addresses in selected users list in `admin2.html`
  - Location: Selected users display function (`updateSelectedUsersDisplay()`)
  - Update: Show both naam AND email for each selected user
  - Format: "Jan Buskens (jan@buskens.be)" of vergelijkbaar
  - Files: `public/admin2.html` (selected users section)

## Phase 3.3: Frontend UX - Warning Badges (Polish)

**Goal**: Warn admin over suboptimale configuratie (niet blokkeren, alleen waarschuwen)

- [x] **T004** [P] Add inactive warning badge in `admin2.html`
  - Location: Message form active toggle section
  - Add: Warning div met id="inactive-warning"
  - Show when: `active` checkbox is unchecked
  - Message: "⚠️ Bericht is niet actief - gebruikers zullen dit niet zien"
  - Style: Orange/yellow warning badge
  - Files: `public/admin2.html` (form warnings section)

- [x] **T005** [P] Add future publish date warning in `admin2.html`
  - Location: Message form publish_at date picker section
  - Add: Warning div met id="future-publish-warning"
  - Show when: `publish_at` > NOW()
  - Message: "📅 Bericht wordt pas zichtbaar vanaf {datum}"
  - Update: On date picker change event
  - Files: `public/admin2.html` (form warnings section)

## Phase 3.4: Frontend UX - Submit Button State (Optional)

**Goal**: Disable submit voor better UX (backup voor server validation)

- [ ] **T006** Disable submit button when no users selected in `admin2.html`
  - Location: Message form submit button logic
  - Check: If `target_type === 'specific_users' && selectedUserIds.length === 0`
  - Action: Set `submitBtn.disabled = true`
  - Update: On user selection change and target_type change
  - Fallback: Backend validation still enforces (T001)
  - Files: `public/admin2.html` (form submit logic)

## Phase 3.5: Frontend Enhancement - Preview Functionality (Optional)

**Goal**: Toon admin welke gebruikers bericht zullen ontvangen (before submit)

- [ ] **T007** [OPTIONAL] Add client-side targeting preview in `admin2.html`
  - Location: Message form, below target type selection
  - Add: Preview div showing count and emails of targeted users
  - Update: When target_type changes or users are selected
  - Display: "Dit bericht wordt verstuurd naar X gebruiker(s): email1, email2..."
  - Files: `public/admin2.html` (targeting preview section)

## Phase 3.6: Deployment & Testing

**Goal**: Deploy naar staging en manual testing volgens quickstart.md

- [x] **T008** Version bump en changelog update
  - Update: `package.json` version (0.19.172 → 0.19.173)
  - Update: `public/changelog.html` met nieuwe versie entry
  - Entry: "🔧 FIX: Admin Message Validation - v0.19.173"
  - Details: Beschrijf validatie en UX improvements
  - Badge: "badge-fix" voor deze versie
  - Files: `package.json`, `public/changelog.html`

- [x] **T009** Git commit en push naar develop branch
  - Commit message: "🔧 FIX: Admin Message Validation & UX Improvements - v0.19.173"
  - Description:
    ```
    - Backend validation prevents empty target_users
    - Email addresses shown in user selection
    - Warning badges for inactive/future-publish
    - Improved admin UX voor message targeting

    Fixes #031 - Admin berichten verschijnen niet issue
    ```
  - Push to: `origin 031-ik-heb-in` (feature branch)
  - Flags: Use `-s -L -k` voor curl commands indien nodig

- [ ] **T010** Manual staging testing volgens quickstart.md
  - Environment: dev.tickedify.com (staging deployment)
  - Test scenarios: Execute alle 7 test cases uit quickstart.md
    1. Backend validation - empty target_users (MUST fail met 400)
    2. UX improvement - email display (MUST be visible)
    3. Complete workflow - valid message creation (MUST succeed)
    4. Warning - inactive message (MUST show warning)
    5. Warning - future publish date (MUST show warning)
    6. User search - partial match (MUST work)
    7. Regression - existing functionality (MUST still work)
  - Document: Test results, screenshots indien bugs
  - Report: Naar gebruiker voor approval of bug fixes

## Dependencies

```
Setup/Planning:
  ↓
T001 (Backend Validation) ← HIGHEST PRIORITY, blocks invalid data entry
  ↓
T002, T003 (Email Display) ← PARALLEL [P], prevent user errors
  ↓
T004, T005 (Warnings) ← PARALLEL [P], UX polish
  ↓
T006 (Submit Button) ← Optional, depends on T002/T003 context
  ↓
T007 (Preview) ← OPTIONAL, nice-to-have enhancement
  ↓
T008, T009 (Deployment) ← Sequential, version bump before commit
  ↓
T010 (Testing) ← LAST, requires full deployment
```

**Critical Path**: T001 → T002/T003 → T008 → T009 → T010

**Optional Tasks**: T006 (submit button), T007 (preview)

## Parallel Execution Examples

### Example 1: Email Display Tasks (T002 + T003)
```bash
# These modify different sections of admin2.html and can run in parallel
Task 1: "Display email in search results - admin2.html user search section"
Task 2: "Display email in selected users list - admin2.html updateSelectedUsersDisplay"
```

### Example 2: Warning Badges (T004 + T005)
```bash
# Different form sections, can run in parallel
Task 1: "Add inactive warning badge - admin2.html active toggle section"
Task 2: "Add future publish warning - admin2.html date picker section"
```

**Note**: T001 (backend) MUST complete first before frontend tasks, maar T002-T007 kunnen grotendeels parallel als ze verschillende code secties wijzigen.

## Task Details & File Locations

### Backend Changes
- **server.js:13243-13248**: Validation block in POST /api/admin/messages endpoint

### Frontend Changes
- **admin2.html:1800-1900** (approx): User search results rendering
- **admin2.html:2200-2300**: Message form handling en submit logic
- **admin2.html**: Various form sections voor warnings en preview

### Configuration Changes
- **package.json**: Version bump
- **public/changelog.html**: Version entry toevoegen

## Testing Verification

**Manual Test Locations**:
- **Staging**: dev.tickedify.com/admin2.html (admin interface)
- **Production**: tickedify.com/app (user message display)
- **Test User**: jan@buskens.be / qyqhut-muDvop-fadki9

**Success Criteria** (from quickstart.md):
1. ✅ Backend blocks empty target_users met 400 error
2. ✅ Email addresses visible in alle user selection interfaces
3. ✅ Warnings shown voor inactive en future-publish
4. ✅ Valid messages created successfully
5. ✅ Messages verschijnen correct voor gebruikers
6. ✅ Backwards compatibility maintained (existing features work)

## Notes

### Why No Automated Tests?
- Tickedify has no test framework setup (geen Jest/Mocha/Playwright)
- Manual staging testing is established workflow
- Focus op rapid iteration met user feedback
- Future enhancement: Add test framework for critical paths

### Why No TDD?
- Existing codebase, enhancement (niet greenfield)
- Manual testing preferred door gebruiker
- Tests would need to be written retroactively
- Contract tests documented voor future reference

### Beta Freeze Compliance
- ✅ All changes stay on feature branch (031-ik-heb-in)
- ✅ Deploy to staging only (dev.tickedify.com)
- ✅ NO merge to main until freeze lift
- ✅ NO production deployment tijdens beta periode

### Backwards Compatibility
- ✅ No database schema changes
- ✅ No breaking API changes
- ✅ Only adds validation (blocks invalid, allows valid)
- ✅ Existing messages unaffected

## Validation Checklist

*GATE: Verify before marking feature complete*

- [x] All contracts have validation documented (api-validation.md)
- [x] All entities documented (data-model.md - no new entities)
- [x] Backend validation comes before frontend (T001 first)
- [x] Parallel tasks truly independent (different code sections)
- [x] Each task specifies exact file path
- [x] No task modifies same file section as another [P] task
- [x] Testing plan complete (quickstart.md with 7 scenarios)
- [x] Deployment process documented (T008-T010)

## Execution Status

- [x] Phase 3.1: Backend Validation (T001) - COMPLETED
- [x] Phase 3.2: Email Display (T002-T003) - COMPLETED
- [x] Phase 3.3: Warning Badges (T004-T005) - COMPLETED
- [x] Phase 3.4: Submit Button (T006) - SKIPPED (optional)
- [ ] Phase 3.5: Preview (T007) - SKIPPED (optional)
- [x] Phase 3.6: Deployment (T008-T009) - COMPLETED

**Current Status**: ✅ Implementation COMPLETE - Ready for manual staging testing (T010)

---

**Generated**: 2025-10-24
**Based on**: plan.md, research.md, data-model.md, contracts/api-validation.md, quickstart.md
