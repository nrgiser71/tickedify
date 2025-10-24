# Implementation Plan: Admin2 Bericht Tijdstip Correctie

**Branch**: `030-als-ik-in` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-als-ik-in/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✅ Loaded successfully - timezone bug in admin2 messages
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✅ Project type: web application (frontend + backend)
   ✅ Structure: Monolithic (Express.js backend + vanilla JS frontend)
3. Fill the Constitution Check section based on constitution document
   ✅ Constitution template not yet populated - proceeding with standard checks
4. Evaluate Constitution Check section below
   ✅ No violations - simple bug fix, no complexity added
   ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   ✅ Bug analysis complete - timezone conversion issue identified
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   ✅ No API contract changes needed - frontend-only fix
7. Re-evaluate Constitution Check section
   ✅ No new violations
   ✅ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
   ✅ Task breakdown for timezone fix
9. STOP - Ready for /tasks command
```

## Summary

**Bug**: Admin2 message tijdstippen tonen 2 uur te vroeg bij het opnieuw laden voor bewerken. Wanneer admin 10:00 invoert en opslaat, toont het systeem 08:00 bij het opnieuw laden.

**Root Cause**: De `datetime-local` input verwacht lokale tijd, maar de code gebruikt `toISOString()` wat UTC tijd retourneert. Voor timezone CET/CEST (UTC+1/UTC+2) resulteert dit in een verschil van 1-2 uur.

**Technical Approach**: Converteer UTC timestamp naar lokale tijd voor datetime-local inputs, terwijl backend UTC timestamps blijft gebruiken voor opslag (best practice).

**Files Affected**:
- `/public/admin2.html` lines 2164, 2168 (load message into form)
- Frontend-only fix, geen backend wijzigingen nodig

## Technical Context

**Language/Version**: Node.js 18.x, Vanilla JavaScript ES6+
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Chart.js
**Storage**: PostgreSQL - `admin_messages` tabel met `publish_at` en `expires_at` TIMESTAMP columns
**Testing**: Manual testing via Playwright browser automation (tickedify-testing agent)
**Target Platform**: Web application - Chrome, Firefox, Safari (latest versions)
**Project Type**: Web (monolithic architecture - backend + frontend in single repo)
**Performance Goals**: Sub-100ms UI response, instant form load
**Constraints**: BÈTA FREEZE actief - geen productie deployment, alleen staging testing
**Scale/Scope**: Admin-only feature, <10 concurrent admin users, ~100 messages total

**Timezone Handling Strategy**:
- Database: Store all timestamps in UTC (current approach - correct)
- API: Send/receive ISO 8601 UTC timestamps (current approach - correct)
- Frontend: Convert UTC to local timezone for datetime-local inputs (BUG FIX NEEDED)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- ✅ Minimal change - 2 line fix for timezone conversion
- ✅ No new dependencies or libraries needed
- ✅ Maintains existing architecture patterns

**Test-First Approach**:
- ⚠️ Manual testing only (geen automated unit tests voor frontend HTML)
- ✅ Will use tickedify-testing agent for Playwright E2E verification
- ✅ Test scenarios: 10:00 → save → reload → expect 10:00 (not 08:00)

**Breaking Changes**:
- ✅ No breaking changes - pure bug fix
- ✅ No API contract changes
- ✅ No database schema changes
- ✅ Backward compatible - only affects display, not storage

**Observability**:
- ✅ Console logging for timezone debugging (development only)
- ✅ Existing error handling sufficient

## Project Structure

### Documentation (this feature)
```
specs/030-als-ik-in/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
public/
├── admin2.html          # MODIFIED: timezone conversion logic (lines 2164, 2168)
├── admin2.js            # No changes needed
└── js/
    └── message-modal.js # No changes needed

server.js                # No changes needed - API returns UTC correctly

tests/
└── playwright/          # E2E test for timezone handling
```

**Structure Decision**: Option 1 (Monolithic) - single codebase, frontend fix only

## Phase 0: Outline & Research

**Research Tasks**:
1. ✅ **Identify bug location**: admin2.html lines 2164, 2168 in `loadMessageForEdit()` function
2. ✅ **Analyze current implementation**:
   - Database stores UTC timestamps (correct)
   - API returns UTC ISO strings (correct)
   - Frontend uses `new Date(msg.publish_at).toISOString().slice(0, 16)` (INCORRECT)
   - Problem: `toISOString()` converts to UTC string, but `datetime-local` expects local time string
3. ✅ **Research solution**: Convert UTC to local timezone for datetime-local
   - Use `new Date()` to parse UTC timestamp
   - Get local ISO string by adjusting for timezone offset
   - Method: `new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)`
4. ✅ **Edge cases identified**:
   - Daylight Saving Time transitions (CET ↔ CEST)
   - Midnight boundary crossings
   - Different user timezones (if international admins in future)

**Output**: research.md

### Research Findings

**Current Bug Code (lines 2164, 2168)**:
```javascript
// INCORRECT - converts to UTC string
const publishDate = new Date(msg.publish_at);
document.getElementById('publishAt').value = publishDate.toISOString().slice(0, 16);
```

**Fixed Code**:
```javascript
// CORRECT - converts to local timezone string for datetime-local
const publishDate = new Date(msg.publish_at);
const localISOString = new Date(publishDate.getTime() - publishDate.getTimezoneOffset() * 60000)
  .toISOString().slice(0, 16);
document.getElementById('publishAt').value = localISOString;
```

**How It Works**:
1. `new Date(msg.publish_at)` - Parse UTC timestamp from database (e.g., "2025-10-24T08:00:00Z")
2. `getTimezoneOffset()` - Returns offset in minutes (e.g., -120 for CEST = UTC+2)
3. `date.getTime() - offset * 60000` - Adjust timestamp to local time
4. `toISOString().slice(0, 16)` - Format as "YYYY-MM-DDTHH:MM" for datetime-local
5. Result: "2025-10-24T10:00" instead of "2025-10-24T08:00"

**Alternatives Considered**:
- ❌ Intl.DateTimeFormat - More complex, requires manual string building
- ❌ Moment.js/date-fns - Unnecessary dependency for simple fix
- ✅ Native Date API with timezone offset - Simple, no dependencies, works cross-browser

**Best Practice Validation**:
- ✅ MDN Web Docs confirms datetime-local expects local time string
- ✅ PostgreSQL TIMESTAMP WITH TIME ZONE stores UTC (current DB approach correct)
- ✅ ISO 8601 for API transport (current API approach correct)
- ✅ Local timezone conversion only for UI display (our fix)

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### Data Model

**No data model changes needed** - this is a frontend display bug fix only.

**Existing Schema** (unchanged):
```sql
-- admin_messages table
publish_at TIMESTAMP WITH TIME ZONE  -- Stored in UTC (correct)
expires_at TIMESTAMP WITH TIME ZONE  -- Stored in UTC (correct)
```

### API Contracts

**No API contract changes needed** - backend is working correctly.

**Existing API** (unchanged, working correctly):
```
GET /api/admin/messages/:id
Response: {
  message: {
    id: number,
    publish_at: "2025-10-24T08:00:00.000Z",  // UTC ISO string (correct)
    expires_at: "2025-10-24T18:00:00.000Z",  // UTC ISO string (correct)
    ...
  }
}

PUT /api/admin/messages/:id
Request: {
  publish_at: "2025-10-24T08:00:00.000Z",  // UTC ISO string (correct)
  expires_at: "2025-10-24T18:00:00.000Z",  // UTC ISO string (correct)
  ...
}
```

**Frontend Form Submit** (unchanged, working correctly):
```javascript
// admin2.html line 2234-2235
const publishAt = document.getElementById('publishAt').value;  // "2025-10-24T10:00"
const expiresAt = document.getElementById('expiresAt').value;  // "2025-10-24T18:00"

// Converts to UTC ISO string for API
publish_at: publishAt ? new Date(publishAt).toISOString() : null,  // "2025-10-24T08:00:00.000Z"
expires_at: expiresAt ? new Date(expiresAt).toISOString() : null   // "2025-10-24T16:00:00.000Z"
```

**Analysis**: The round-trip is correct:
1. User enters 10:00 in form (local time CET+1)
2. JS converts to UTC for API: 08:00 UTC ✅
3. Backend stores 08:00 UTC ✅
4. API returns 08:00 UTC ✅
5. Frontend converts back to local for display: **BUG - shows 08:00 instead of 10:00** ❌

### Contract Tests

**No contract tests needed** - API is working correctly, this is a UI display bug.

### Integration Tests

**Test Scenario**: Admin Message Timezone Display
```gherkin
Feature: Admin Message Scheduling Display
  As an admin user
  I want to see the correct scheduled time when editing a message
  So that I can verify and modify the publication schedule accurately

Scenario: Create and edit message with scheduled time
  Given I am logged into admin2 dashboard
  And I navigate to the Messages section
  When I create a new message with title "Test Timezone"
  And I set publish time to "10:00" on today's date
  And I save the message
  And I reload the messages list
  And I click edit on the "Test Timezone" message
  Then the publish time field should display "10:00"
  And NOT "08:00" or any other time

Scenario: Edit message with expiration time
  Given I am editing an existing message
  When I set expiration time to "14:30" on tomorrow's date
  And I save the message
  And I reload and edit the message again
  Then the expiration time field should display "14:30"
  And NOT "12:30" or any other time

Scenario: Midnight boundary handling
  Given I am editing a message
  When I set publish time to "23:00" today
  And I save and reload the message
  Then the publish time should still show "23:00"
  And the date should remain today (not tomorrow)
```

**Playwright Test Implementation** (will be executed by tickedify-testing agent):
```javascript
// tests/playwright/admin-message-timezone.spec.js
test('admin message timezone displays correctly after edit', async ({ page }) => {
  // Login as admin
  await page.goto('https://tickedify.com/admin2-login.html');
  await page.fill('#email', 'jan@buskens.be');
  await page.fill('#password', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');

  // Navigate to messages
  await page.waitForSelector('.admin-nav-link');
  await page.click('text=Berichten');

  // Create new message
  await page.click('text=📢 Nieuw Bericht');

  // Fill form with specific time
  await page.fill('#msg-title', 'Timezone Test Message');
  await page.fill('#msg-content', 'Testing timezone handling');

  // Set publish time to 10:00 today
  const today = new Date();
  const timeString = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}T10:00`;
  await page.fill('#publishAt', timeString);

  // Save message
  await page.click('#message-modal-submit');
  await page.waitForSelector('text=Bericht aangemaakt');

  // Close modal and reload
  await page.click('text=Annuleren');
  await page.waitForTimeout(500);

  // Find and edit the message
  await page.click('text=Timezone Test Message');

  // Verify publish time is still 10:00 (not 08:00)
  const publishValue = await page.inputValue('#publishAt');
  expect(publishValue).toContain('10:00');
  expect(publishValue).not.toContain('08:00');
});
```

### Quickstart Guide

**Output**: `quickstart.md` - Manual testing steps for timezone fix

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Setup Tasks**:
   - Create feature branch (already done)
   - Review current implementation
   - Create backup of admin2.html

2. **Implementation Tasks**:
   - Fix publishAt timezone conversion (line 2164)
   - Fix expiresAt timezone conversion (line 2168)
   - Add helper function for timezone conversion (DRY principle)
   - Update changelog with bug fix

3. **Testing Tasks**:
   - Manual test: Create message with 10:00, verify displays 10:00 on reload
   - Manual test: Create message with 14:30, verify displays 14:30 on reload
   - Manual test: Edge case - midnight (23:00) displays correctly
   - Manual test: Edge case - early morning (01:00) displays correctly
   - Playwright E2E test: Automated timezone verification

4. **Deployment Tasks**:
   - Version bump in package.json
   - Git commit with descriptive message
   - Push to staging branch
   - Deploy to dev.tickedify.com
   - Verify deployment via /api/version
   - Run regression tests on staging
   - **WAIT for BÈTA FREEZE lift** before production deployment

**Ordering Strategy**:
- Sequential: Implementation → Manual Testing → Playwright Testing → Deployment
- No parallel tasks (simple 2-line fix)
- TDD not applicable (fixing existing code, not adding new feature)

**Estimated Output**: 15-18 numbered tasks in tasks.md

**Task Dependencies**:
```
1. Setup
   ↓
2. Implementation (lines 2164, 2168)
   ↓
3. Manual Testing
   ↓
4. Playwright Testing
   ↓
5. Deployment to Staging
   ↓
6. Wait for BÈTA FREEZE lift
   ↓
7. Production Deployment
```

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md - fix timezone conversion)
**Phase 5**: Validation (Playwright tests, manual verification, staging deployment)

## Complexity Tracking

*No complexity violations - simple bug fix*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Tickedify development practices - See `CLAUDE.md` and `ARCHITECTURE.md`*
