# Tasks: "Volgend Bezoek Aan Pagina" Bericht Trigger

**Feature**: 033-je-hebt-de
**Input**: Design documents from `/specs/033-je-hebt-de/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Tech stack: Node.js 16+ + Express.js + Vanilla JavaScript ES6
   ✓ Structure: Tickedify custom (server.js, public/)
   ✓ No new dependencies needed
2. Load optional design documents:
   ✓ data-model.md: No schema changes, reuses existing tables
   ✓ contracts/: API endpoint modifications documented
   ✓ research.md: 9 design decisions documented
   ✓ quickstart.md: 8 manual testing scenarios available
3. Generate tasks by category:
   ✓ Setup: Documentation only (no project init)
   ✓ Tests: Manual testing via quickstart.md (no automated tests)
   ✓ Core: Backend trigger logic + frontend UI
   ✓ Integration: API endpoint modifications
   ✓ Polish: Changelog + deployment
4. Apply task rules:
   ✓ Backend (server.js) and Frontend (admin2.html, app.html) = sequential
   ✓ Documentation tasks = parallel [P]
   ✓ Testing follows implementation
5. Number tasks sequentially (T001-T011)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   ✓ Backend trigger logic covered
   ✓ Frontend UI covered
   ✓ Manual testing scenarios covered
9. Return: SUCCESS (11 tasks ready for execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Setup & Documentation

### T001 [P] Document nieuwe trigger_type in database schema documentatie ✅ OPTIONAL

**File**: `specs/033-je-hebt-de/DATABASE_NOTES.md` (nieuw)

**Description**:
- Documenteer dat `trigger_type = 'next_page_visit'` een nieuwe geldige waarde is
- Leg uit dat geen schema wijzigingen nodig zijn (VARCHAR(50) accommodeert nieuwe waarde)
- Voeg voorbeeld INSERT statements toe voor testing
- Refereer naar bestaande admin_messages tabel schema

**Acceptance Criteria**:
- Duidelijke uitleg van next_page_visit trigger waarde
- SQL voorbeelden voor message creation met next_page_visit
- Verwijs naar data-model.md voor volledige schema

**Note**: Optional - data-model.md already contains all this info

---

## Phase 3.2: Backend Implementation

### T002 Implementeer next_page_visit trigger logica in GET /api/messages/unread endpoint

**File**: `server.js` (regel ~13571, bestaande GET /api/messages/unread endpoint)

**Description**:
- Zoek bestaande GET /api/messages/unread endpoint implementatie
- Voeg optional `page` query parameter toe: `const page = req.query.page;`
- Valideer page parameter format:
  ```javascript
  if (page && !page.startsWith('/')) {
      return res.status(400).json({ error: 'Page parameter must start with /' });
  }
  ```
- Voeg OR clause toe aan WHERE condition voor next_page_visit trigger evaluation:
  ```sql
  OR (m.trigger_type = 'next_page_visit' AND m.trigger_value = $page_param)
  ```
- Update query parameters array om page parameter door te geven
- Zorg dat query DISTINCT results returned voor meerdere next_page_visit berichten
- Test dat bestaande immediate en page_visit_count triggers ongewijzigd blijven
- Voeg console.log toe voor debugging: `console.log(\`📢 Evaluating messages for user \${userId}, page: \${page || 'any'}\`);`

**Dependencies**: None (extends existing endpoint)

**Acceptance Criteria**:
- SQL query include next_page_visit trigger condition met page parameter matching
- Backend returned next_page_visit messages ONLY for matching page in unread array
- Bestaande triggers blijven werken (backwards compatible)
- Console logging voor debugging aanwezig
- Endpoint werkt met EN zonder page parameter (backwards compatible)

**Implementation Notes**:
- Verwacht locatie: Zoek naar bestaande `app.get('/api/messages/unread'` in server.js
- Pattern: Voeg toe aan bestaande WHERE clause met OR condition
- Backwards compatibility: page parameter is optional
- Testing: Gebruik curl commands uit quickstart.md scenario 2

**Reference**: contracts/api-contract.md lines 18-140

---

### T003 Valideer trigger_type='next_page_visit' in POST /api/admin/messages endpoint

**File**: `server.js` (regel ~13251, POST /api/admin/messages)

**Description**:
- Zoek POST /api/admin/messages endpoint (regel 13251)
- Voeg validatie toe voor trigger_type = 'next_page_visit':
  ```javascript
  if (trigger_type === 'next_page_visit') {
      if (!trigger_value || trigger_value.trim() === '') {
          return res.status(400).json({
              error: 'Page identifier required for next_page_visit trigger'
          });
      }

      if (!trigger_value.startsWith('/')) {
          return res.status(400).json({
              error: 'Page identifier must start with / (e.g., /planning)'
          });
      }

      const validPages = ['/app', '/planning', '/taken', '/actielijst', '/profiel'];
      if (!validPages.includes(trigger_value)) {
          return res.status(400).json({
              error: \`Invalid page. Must be one of: \${validPages.join(', ')}\`
          });
      }
  }
  ```
- Voeg documentatie comment toe: `// Trigger types: immediate, days_after_signup, first_page_visit, nth_page_visit, next_page_visit`
- Test dat endpoint accepteert trigger_type='next_page_visit' met valid page
- Test dat endpoint rejects invalid page formats

**Dependencies**: None (extends existing endpoint)

**Acceptance Criteria**:
- Endpoint validates trigger_value when trigger_type = 'next_page_visit'
- 400 error returned voor missing trigger_value
- 400 error returned voor invalid page format (niet start met /)
- 400 error returned voor unknown page (not in validPages list)
- Endpoint accepteert trigger_type='next_page_visit' met valid page zonder errors
- Documentatie comment toegevoegd voor alle trigger types

**Testing**: Use quickstart.md scenario 1 (admin creates message)

**Reference**: contracts/api-contract.md lines 146-380

---

## Phase 3.3: Frontend Implementation

### T004 Voeg "Volgend bezoek aan pagina" radio button + page selector toe aan admin message form

**File**: `public/admin2.html` (trigger type section in message creation form)

**Description**:
- Zoek het message creation formulier in admin2.html
- Localiseer de bestaande trigger type radio buttons (immediate, days_after_signup, first_page_visit, nth_page_visit)
- Voeg nieuwe radio button toe:
  ```html
  <label class="form-radio-label">
      <input type="radio" name="triggerType" value="next_page_visit" id="trigger_next_page_visit">
      <span>📍 Volgend bezoek aan pagina</span>
  </label>
  ```
- Voeg page selector dropdown toe (hidden by default):
  ```html
  <div id="pageSelector" style="display: none;">
      <label for="pageSelect">Selecteer pagina:</label>
      <select name="trigger_value" id="pageSelect">
          <option value="">-- Kies een pagina --</option>
          <option value="/app">Hoofdapplicatie</option>
          <option value="/planning">Dagelijkse Planning</option>
          <option value="/taken">Takenlijst</option>
          <option value="/actielijst">Actielijst</option>
          <option value="/profiel">Profiel</option>
      </select>
  </div>
  ```
- Voeg JavaScript toe om page selector te tonen/verbergen:
  ```javascript
  document.getElementById('triggerType').addEventListener('change', (e) => {
      const triggerType = e.target.value;
      const pageSelector = document.getElementById('pageSelector');
      const pageSelect = document.getElementById('pageSelect');

      if (triggerType === 'next_page_visit') {
          pageSelector.style.display = 'block';
          pageSelect.required = true;
      } else {
          pageSelector.style.display = 'none';
          pageSelect.required = false;
          pageSelect.value = ''; // Clear selection
      }
  });
  ```
- Plaats tussen bestaande trigger opties (logische volgorde: immediate → days_after_signup → next_page_visit → first_page_visit → nth_page_visit)
- Zorg dat form submission logic de trigger_value correct meestuurt (check existing JavaScript)
- Test dat selecting "Volgend bezoek aan pagina" toont page selector dropdown

**Dependencies**: T002, T003 (backend moet next_page_visit ondersteunen)

**Acceptance Criteria**:
- Radio button zichtbaar in admin interface met label "📍 Volgend bezoek aan pagina"
- Page selector dropdown verborgen by default
- Page selector verschijnt wanneer next_page_visit radio button selected
- Page selector bevat 5 opties: /app, /planning, /taken, /actielijst, /profiel
- Page selector verdwijnt wanneer andere trigger type selected
- Selecteren van "Volgend bezoek aan pagina" + page stuurt trigger_type='next_page_visit' EN trigger_value='/planning' mee in POST body
- Form submission werkt zonder JavaScript errors
- Page selector is required wanneer next_page_visit selected

**Testing**:
- Open admin2.html in browser
- Selecteer "Volgend bezoek aan pagina" radio button → page selector should appear
- Submit form en verify POST /api/admin/messages request in Network tab
- Verify trigger_type='next_page_visit' EN trigger_value='/planning' in request payload

**Reference**: contracts/api-contract.md lines 382-550

---

### T005 Voeg page parameter toe aan message polling in frontend

**File**: `public/app.html` (or shared JavaScript file with message polling logic)

**Description**:
- Zoek bestaande message polling code (likely `setInterval(() => { fetch('/api/messages/unread') }, 30000)`)
- Modificeer fetch call om current page pathname mee te sturen:
  ```javascript
  async function fetchMessages() {
      try {
          const page = window.location.pathname; // e.g., '/planning'
          const response = await fetch(`/api/messages/unread?page=${encodeURIComponent(page)}`);

          if (!response.ok) {
              console.error('Failed to fetch messages:', response.status);
              return;
          }

          const data = await response.json();
          displayMessages(data.messages);
      } catch (error) {
          console.error('Message fetch error:', error);
          // Fail silently - messages not critical for app functionality
      }
  }

  // Poll every 30 seconds
  setInterval(fetchMessages, 30000);

  // Also fetch on initial page load
  fetchMessages();

  // Optional: Fetch on page navigation (if SPA-like behavior)
  window.addEventListener('popstate', fetchMessages);
  ```
- Ensure pathname is URL-encoded via `encodeURIComponent()`
- Add error handling (fail gracefully if API unavailable)
- Test message polling includes ?page= parameter in Network tab

**Dependencies**: T002 (backend must accept page parameter), T004 (admin can create messages)

**Acceptance Criteria**:
- Message polling includes `?page=${pathname}` in API request URL
- Pathname is correctly URL-encoded (e.g., `/planning` → `%2Fplanning`)
- Error handling prevents app crash if API fails
- Console shows no JavaScript errors
- Network tab shows GET /api/messages/unread?page=%2Fplanning when on /planning page
- Messages for current page appear in modal
- Messages for other pages do NOT appear

**Testing**: Use quickstart.md scenario 2 (user sees message on correct page)

**Reference**: contracts/api-contract.md lines 552-608

---

## Phase 3.4: Manual Testing & Verification

### T006 Voer Quickstart Scenario 1 uit: Admin creates page-specific message

**File**: `specs/033-je-hebt-de/quickstart.md` (Scenario 1)

**Description**:
- Volg quickstart.md Scenario 1 stappen 1-4
- Navigate to admin2.html, login as admin
- Create new message met trigger "Volgend bezoek aan pagina" en page "/planning"
- Verify form submission succeeds
- Verify Network tab shows POST /api/admin/messages met trigger_type='next_page_visit' en trigger_value='/planning'
- Document resultaten in TEST_RESULTS.md (nieuw bestand in specs/033-je-hebt-de/)

**Dependencies**: T002, T003, T004 (backend + admin UI complete)

**Acceptance Criteria**:
- Admin interface toont "📍 Volgend bezoek aan pagina" trigger option
- Page selector dropdown appears when trigger selected
- Form submission succeeds with 201 Created response
- Backend returns message_id in response
- No console errors in browser DevTools
- TEST_RESULTS.md bevat: ✅ Scenario 1 passed

**Reference**: quickstart.md lines 23-93

---

### T007 Voer Quickstart Scenario 2 uit: User sees message on correct page only

**File**: `specs/033-je-hebt-de/TEST_RESULTS.md` (append)

**Description**:
- Volg quickstart.md Scenario 2 steps 1-7
- Open NEW incognito window, login as test user
- Visit /app page → verify message does NOT appear
- Navigate to /planning page → verify message DOES appear
- Navigate to /taken page → verify message does NOT appear
- Verify Network tab shows correct page parameter in API requests
- Document resultaten in TEST_RESULTS.md

**Dependencies**: T005, T006 (frontend polling + test message exists)

**Acceptance Criteria**:
- Message shows ONLY on /planning page
- Message does NOT show on /app, /taken, or other pages
- Modal displays correct title and content
- "Got it" button present and clickable
- Network tab shows GET /api/messages/unread?page=%2Fplanning on /planning
- Network tab shows empty messages array on /taken page
- TEST_RESULTS.md bevat: ✅ Scenario 2 passed (page-specific filtering works)

**Reference**: quickstart.md lines 97-222

---

### T008 Voer Quickstart Scenario 3-5 uit: Dismiss, Multiple Messages, Backwards Compatibility

**File**: `specs/033-je-hebt-de/TEST_RESULTS.md` (append)

**Description**:
- **Scenario 3** (Dismiss): Dismiss message, refresh page, verify message doesn't reappear
- **Scenario 4** (Multiple): Create 3 messages for /planning, verify all 3 show on /planning only
- **Scenario 5** (Backwards Compat): Create immediate + days_after_signup messages, verify they show alongside next_page_visit
- Document alle resultaten in TEST_RESULTS.md met pass/fail status

**Dependencies**: T007 (basic functionality verified)

**Acceptance Criteria**:
- Scenario 3: Dismissed message never reappears (even after logout/login)
- Scenario 4: Multiple messages for same page all appear
- Scenario 5: Existing trigger types work unaffected
- All triggers coexist without conflicts
- TEST_RESULTS.md bevat:
  - ✅ Scenario 3 passed (dismiss works)
  - ✅ Scenario 4 passed (multiple messages work)
  - ✅ Scenario 5 passed (backwards compatible)

**Reference**: quickstart.md lines 224-428

---

### T009 [P] Voer Quickstart Scenario 6-7 uit: Edge Cases + Database Verification (optional)

**File**: `specs/033-je-hebt-de/TEST_RESULTS.md` (append)

**Description**:
- **Scenario 6** (Edge Cases):
  - Test 6.1: Admin submits without selecting page → verify validation error
  - Test 6.2: Backend receives invalid page format → verify 400 error
  - Test 6.5: New user visits page for first time → verify message appears
- **Scenario 7** (Database Verification - optional):
  - Run SQL queries from quickstart.md to verify database records
  - Check admin_messages table has correct trigger_type and trigger_value
  - Check message_interactions table tracks dismissals
- Document resultaten in TEST_RESULTS.md

**Dependencies**: T008 (core testing complete)

**Acceptance Criteria**:
- Form validation prevents submission without page selection
- Backend rejects invalid page formats with 400 error
- First-ever visit to page triggers message (confirms Decision 7 from research.md)
- Database queries show correct records
- TEST_RESULTS.md bevat:
  - ✅ Scenario 6 passed (edge cases handled)
  - ✅ Scenario 7 passed (database verification) OR ⏭️ Skipped (optional)

**Reference**: quickstart.md lines 432-658

---

## Phase 3.5: Polish & Deployment

### T010 Update CHANGELOG.html met nieuwe feature

**File**: `public/changelog.html`

**Description**:
- Voeg nieuwe entry toe bovenaan changelog:
  - Versie: 0.19.175 (increment from current 0.19.174)
  - Datum: Vandaag (2025-10-24)
  - Categorie: ⚡ FEATURE: "Volgend Bezoek Aan Pagina" Bericht Trigger
  - Beschrijving (4-5 bullet points):
    * Nieuwe trigger optie "📍 Volgend bezoek aan pagina" voor admin berichten
    * Berichten verschijnen alleen bij bezoek aan specifieke pagina (bijv. /planning)
    * Page selector dropdown in admin interface voor eenvoudige pagina selectie
    * Backwards compatible met bestaande triggers (immediate, days_after_signup, etc.)
    * Correctie van Feature 032 (die globale trigger had in plaats van page-specific)
- Update badge naar "badge-latest" voor nieuwe entry
- Verplaats vorige "badge-latest" naar "badge-feature"
- Zorg voor correcte HTML syntax (geen broken tags)

**Dependencies**: T006-T009 (testing complete, feature verified)

**Acceptance Criteria**:
- Changelog entry added met correcte versie nummer (0.19.175)
- Beschrijving duidelijk en gebruiksvriendelijk (Nederlands)
- Badge-latest op nieuwe entry
- HTML syntax correct (validate met browser)
- Entry staat bovenaan changelog (nieuwste eerst)

**Reference**: Feature 032 DEPLOYMENT_INSTRUCTIONS.md for changelog pattern

---

### T011 Bump versie nummer in package.json + commit + deploy naar staging

**File**: `package.json`

**Description**:
- Open package.json
- Increment patch version number: 0.19.174 → 0.19.175
- Commit ALL changes (server.js, admin2.html, app.html, changelog.html, package.json) met message:
  ```
  ⚡ FEAT: "Volgend Bezoek Aan Pagina" Bericht Trigger - v0.19.175

  Implementeert page-specific message trigger "Volgend bezoek aan pagina":
  - Backend: GET /api/messages/unread accepts ?page= parameter
  - Backend: POST /api/admin/messages validates next_page_visit trigger
  - Frontend: Admin page selector dropdown voor pagina selectie
  - Frontend: Message polling includes current page pathname
  - Testing: 8 manual test scenarios via quickstart.md passed

  Changes:
  - server.js: Modified GET /api/messages/unread endpoint (~line 13571)
  - server.js: Added validation to POST /api/admin/messages (~line 13251)
  - public/admin2.html: Added trigger option + page selector dropdown
  - public/app.html: Added page parameter to message polling
  - public/changelog.html: Added v0.19.175 entry
  - package.json: Bumped version 0.19.174 → 0.19.175

  Database: No schema changes (reuses existing admin_messages table)
  Backwards Compatible: All existing triggers work unchanged

  Feature 033: Corrects Feature 032 (which was global trigger, not page-specific)
  Branch: 033-je-hebt-de
  Spec: specs/033-je-hebt-de/spec.md

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- Push branch naar GitHub: `git push origin 033-je-hebt-de`
- Wacht 30-60 seconden voor Vercel auto-deploy naar staging (dev.tickedify.com)
- Verify deployment via /api/version endpoint:
  ```bash
  curl -s https://dev.tickedify.com/api/version
  ```
  Expected: `{"version":"0.19.175",...}`
- Run quickstart.md regression tests op dev.tickedify.com (quick smoke test)
- Als alle tests slagen: Feature is klaar voor PR review
- Documenteer final test results in TEST_RESULTS.md

**Dependencies**: T010 (changelog update moet in zelfde commit)

**Acceptance Criteria**:
- Version number incremented to 0.19.175
- Git commit bevat alle gewijzigde bestanden (server.js, admin2.html, app.html, changelog.html, package.json, specs/)
- Commit message volgt project conventions (emoji + detailed description)
- Branch gepusht naar GitHub
- Vercel deployment succesvol naar dev.tickedify.com
- /api/version returns 0.19.175
- Smoke test passed op staging (at least scenario 1 + 2)
- TEST_RESULTS.md bevat: ✅ Staging deployment verified v0.19.175
- Ready for PR creation (maar NIET mergen ivm BÈTA FREEZE)

**BÈTA FREEZE Reminder**:
- ❌ DO NOT merge naar main branch
- ❌ DO NOT deploy to production (tickedify.com blijft ongewijzigd)
- ✅ PR aanmaken voor code review is OK
- ✅ Feature blijft beschikbaar op staging voor verder testen

**Reference**: Feature 032 DEPLOYMENT_INSTRUCTIONS.md for deployment workflow

---

## Dependencies Graph

```
T001 (Documentation) [P] ─┐
                           ├─ (optional, parallel, geen dependencies)
T002 (Backend GET logic) ──┼─> T003 (Backend POST validation) ─┐
                           │                                     │
                           │                                     ├─> T004 (Admin UI) ──┐
                           │                                     │                      │
                           │                                     │                      ├─> T005 (Message polling) ──┐
                           │                                     │                      │                             │
                           └─────────────────────────────────────┘                      │                             │
                                                                                         │                             │
                                                                                         └─> T006 (Scenario 1) ──┬─────┤
                                                                                                                  │     │
                                                                                                                  ├─> T007 (Scenario 2) ──┬─> T010 (Changelog)
                                                                                                                  │                        │
                                                                                                                  ├─> T008 (Scenarios 3-5) ┤
                                                                                                                  │                        │
                                                                                                                  └─> T009 [P] (Scenarios 6-7) ┘
                                                                                                                                             │
                                                                                                                                             └─> T011 (Version + Deploy)
```

**Critical Path**: T002 → T003 → T004 → T005 → T006 → T007 → T008 → T010 → T011 (9 tasks, ~3-4 hours)

---

## Parallel Execution Examples

### Parallel Group 1: Setup (Optional)
```bash
# Can run independently (but optional, data-model.md already sufficient)
Task(description="Document trigger_type",
     prompt="Create DATABASE_NOTES.md per T001 specification")
```

### Parallel Group 2: Testing Phase (After T007)
```bash
# Can run simultaneously after basic scenarios pass:
Task(description="Edge cases + database verification",
     prompt="Execute quickstart Scenarios 6-7 per T009")
```

**Note**: Most tasks are sequential because they modify same files (server.js, admin2.html)

---

## Task Validation Checklist

*Verified during task generation*

- [x] Backend trigger logic covered (T002, T003)
- [x] Frontend UI covered (T004, T005)
- [x] Manual testing scenarios covered (T006, T007, T008, T009)
- [x] Deployment covered (T010, T011)
- [x] Documentation covered (T001 optional, TEST_RESULTS.md via testing tasks)
- [x] Parallel tasks truly independent (T001 can run anytime, T009 optional)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Tests come before Polish (T006-T009 before T010-T011)
- [x] Dependencies explicitly documented

---

## Estimated Timeline

**Total Tasks**: 11 (T001 optional = 10 required)
**Critical Path**: 9 tasks (T002 → T003 → T004 → T005 → T006 → T007 → T008 → T010 → T011)
**Parallel Opportunities**: 2 tasks (T001 optional, T009 can run alongside other testing)

**Estimated Effort**:
- Setup (T001): 15 min (optional, skip if data-model.md sufficient)
- Backend implementation (T002, T003): 45-60 min
- Frontend implementation (T004, T005): 30-45 min
- Manual testing (T006, T007, T008, T009): 60-90 min (8 scenarios total)
- Deployment (T010, T011): 30-45 min

**Total Estimated Time**: 3-4 hours voor volledige implementatie + testing + deployment

---

## Notes

- ✅ Geen database migrations nodig (bestaand schema accommodeert next_page_visit)
- ✅ Backwards compatible - bestaande triggers blijven ongewijzigd
- ✅ Additive change - geen breaking changes
- ⚠️ **BÈTA FREEZE ACTIEF** - deploy naar staging only, NIET naar productie
- ✅ Manual testing workflow (geen automated tests in project)
- ✅ Quickstart.md bevat alle test scenarios en SQL queries
- ✅ Feature 032 abandoned - deze implementatie is de correcte versie

---

## BÈTA FREEZE COMPLIANCE

**KRITIEK**: Deze feature mag NIET naar productie (main branch) gemerged worden tijdens de bèta freeze periode.

**Toegestane acties**:
- ✅ T001-T011: Alle implementatie en testing op feature branch 033-je-hebt-de
- ✅ T011: Deploy naar dev.tickedify.com (staging)
- ✅ Pull Request aanmaken voor code review
- ❌ Merge naar main branch (GEBLOKKEERD)
- ❌ Productie deployment (tickedify.com blijft ongewijzigd)

**Na BÈTA FREEZE opheffing**:
- Merge PR naar main
- Vercel deploys automatisch naar tickedify.com
- Final regression test op productie
- Feature 032 branch kan worden verwijderd (incorrect implementation)

---

**Task List Generated**: 2025-10-24
**Status**: Ready for execution
**Next Step**: Begin met T002 (backend GET endpoint) of T001 (optional documentation)
**Ready for /implement command**: Yes

---

## Implementation Order Recommendation

**Fast Track** (skip optional tasks):
1. T002 → T003 (Backend: 1 hour)
2. T004 → T005 (Frontend: 45 min)
3. T006 → T007 → T008 (Core testing: 1 hour)
4. T010 → T011 (Deploy: 45 min)
Total: ~3.5 hours

**Thorough** (all tasks):
1. T001 (Optional doc: 15 min)
2. T002 → T003 (Backend: 1 hour)
3. T004 → T005 (Frontend: 45 min)
4. T006 → T007 → T008 (Core testing: 1 hour)
5. T009 (Edge cases: 30 min)
6. T010 → T011 (Deploy: 45 min)
Total: ~4 hours
