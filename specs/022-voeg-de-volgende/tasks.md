# Tasks: Sidebar Taak Tellers

**Input**: Design documents from `/specs/022-voeg-de-volgende/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ SUCCESS: Tech stack: Vanilla JS, Node.js, Express, PostgreSQL
   ✅ Structure: Web app (public/app.js frontend, server.js backend)
2. Load optional design documents:
   ✅ data-model.md: No new entities, uses existing 'taken' table
   ✅ contracts/: 1 contract file (api-counts-sidebar.yaml)
   ✅ research.md: API design, debouncing, error handling strategy
   ✅ quickstart.md: 10 test scenarios extracted
3. Generate tasks by category:
   ✅ Setup: Version bump, git branch check
   ✅ Tests: Contract tests not applicable (will test via Playwright)
   ✅ Core: Backend endpoint, Frontend UI, JavaScript logic
   ✅ Integration: Hook updates into existing operations
   ✅ Polish: Testing, styling, regression checks
4. Apply task rules:
   ✅ Backend and frontend are different files → can be parallel where applicable
   ✅ app.js modifications are sequential (same file)
   ✅ Tests after implementation (manual testing via quickstart)
5. Number tasks sequentially (T001, T002...)
6. Dependencies mapped
7. Parallel execution opportunities identified
8. Validation:
   ✅ Contract has implementation task (GET /api/counts/sidebar)
   ✅ All 10 quickstart scenarios covered in testing tasks
   ✅ All key operations (create, move, delete, complete, bulk) integrated
9. SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute from repository root

## Path Conventions
- **Frontend**: `public/app.js` (~10,500 regels), `public/index.html`, `public/styles.css`
- **Backend**: `server.js` (Express API routes)
- **Testing**: Manual via `quickstart.md` scenarios + optional Playwright automation

---

## Phase 3.1: Setup & Preparation

- [x] **T001** Verify current branch is `022-voeg-de-volgende` (run `git branch --show-current`)

- [x] **T002** Bump version in `package.json` (increment patch version, e.g., 0.19.101 → 0.19.102)

- [x] **T003** [P] Backup current `public/index.html` and `public/app.js` (create copies voor veiligheid)

---

## Phase 3.2: Backend Implementation

- [x] **T004** Implement GET /api/counts/sidebar endpoint in `server.js`
  - **Location**: Add route handler na andere `/api/*` routes
  - **Implementation**:
    - SQL query met COUNT CASE statements voor alle 5 categorieën
    - Filter: `status = 'actief'` EN user_id matching
    - Return format: `{inbox: N, acties: N, projecten: N, opvolgen: N, uitgesteld: N}`
  - **SQL Template**:
    ```sql
    SELECT
      COUNT(CASE WHEN lijst = 'inbox' AND status = 'actief' THEN 1 END) as inbox,
      COUNT(CASE WHEN lijst = 'acties' AND status = 'actief' THEN 1 END) as acties,
      COUNT(CASE WHEN project_id IS NOT NULL AND status = 'actief' THEN 1 END) as projecten,
      COUNT(CASE WHEN lijst = 'opvolgen' AND status = 'actief' THEN 1 END) as opvolgen,
      COUNT(CASE WHEN lijst LIKE 'uitgesteld-%' AND status = 'actief' THEN 1 END) as uitgesteld
    FROM taken
    WHERE user_id = $1;
    ```
  - **Error Handling**: Try-catch met 500 response bij database errors
  - **Auth**: Gebruik bestaande session middleware (req.session.userId)
  - **Testing**: Test met `curl -s -L -k https://dev.tickedify.com/api/counts/sidebar` (na deployment)

- [ ] **T005** Test backend endpoint lokaal
  - Start server lokaal
  - Test endpoint met curl: `curl http://localhost:3000/api/counts/sidebar`
  - Verify response heeft alle 5 velden
  - Verify counts kloppen met database queries

---

## Phase 3.3: Frontend UI Structure

- [x] **T006** Add counter spans to sidebar menu items in `public/index.html`
  - **Modify 5 menu items**:
    1. `#menu-inbox`: Add `<span class="task-count"></span>` binnen link
    2. `#menu-acties`: Add `<span class="task-count"></span>` binnen link
    3. `#menu-projecten`: Add `<span class="task-count"></span>` binnen link
    4. `#menu-opvolgen`: Add `<span class="task-count"></span>` binnen link
    5. `#menu-uitgesteld`: Add `<span class="task-count"></span>` binnen link
  - **HTML Format**: `<a href="#" id="menu-inbox">📥 Inbox <span class="task-count"></span></a>`
  - **Important**: ALLEEN deze 5 items, NIET Dagelijkse Planning, Wachten Op, Misschien, etc.

- [x] **T007** Add CSS styling voor task counters in `public/style.css`
  - **Styling Requirements**:
    - `.task-count`: gray color, smaller font, margin-left
    - Align met bestaande sidebar styling
    - Responsive: blijft leesbaar op mobile
  - **Suggested CSS**:
    ```css
    .task-count {
      color: #888;
      font-size: 0.9em;
      margin-left: 4px;
      font-weight: normal;
    }
    ```

---

## Phase 3.4: Frontend JavaScript Core Logic

- [x] **T008** Implement `updateSidebarCounters()` functie in `public/app.js`
  - **Location**: Add na `laadHuidigeLijst()` functie (~regel 500)
  - **Functionality**:
    - Fetch `/api/counts/sidebar` endpoint
    - Parse JSON response
    - Update DOM voor alle 5 counters: `document.querySelector('#menu-inbox .task-count').textContent = '(' + counts.inbox + ')'`
    - Error handling: Bij failure, toon "(?) " in alle counters
    - Console logging voor debugging
  - **Debouncing**: Use `setTimeout` met 300ms delay (zie T009)
  - **Function Signature**: `async function updateSidebarCounters()`

- [x] **T009** Implement debouncing voor `updateSidebarCounters()`
  - **Location**: In `public/app.js`, boven `updateSidebarCounters()` definitie
  - **Implementation**:
    - Create debounce timer variable: `let counterUpdateTimer = null;`
    - Wrapper functie `debouncedUpdateCounters()` die timer reset
    - Clear bestaande timer, start nieuwe 300ms timer
  - **Rationale**: Voorkom spam bij rapid successive actions
  - **Code Template**:
    ```javascript
    let counterUpdateTimer = null;

    function debouncedUpdateCounters() {
      if (counterUpdateTimer) clearTimeout(counterUpdateTimer);
      counterUpdateTimer = setTimeout(() => {
        updateSidebarCounters();
      }, 300);
    }
    ```

- [x] **T010** Call `updateSidebarCounters()` bij app initialization
  - **Location**: In `public/app.js`, in Taakbeheer constructor of initialization functie
  - **Timing**: Na succesvolle login, bij eerste lijst load
  - **Implementation**: Call `debouncedUpdateCounters()` in `init()` of equivalent
  - **Verify**: Counters verschijnen direct bij page load (Quickstart Scenario 1)

---

## Phase 3.5: Integration Met Bestaande Operaties

- [ ] **T011** Integrate counter updates na task creation
  - **Locations in `public/app.js`**:
    - `createNewTask()` functie - call `debouncedUpdateCounters()` na succesvolle POST
    - Mogelijk andere create functies (search for "POST /api/taak")
  - **Implementation**: Add `debouncedUpdateCounters();` na task creation success
  - **Test**: Quickstart Scenario 2 (create task increments counter)

- [ ] **T012** Integrate counter updates na task move/verplaats
  - **Locations in `public/app.js`**:
    - `verplaatsTaak()` functie (~regel 1,000)
    - `handlePlanningDrop()` functie (voor planning naar lijst moves)
    - Drag & drop handlers
  - **Implementation**: Add `debouncedUpdateCounters();` na succesvolle move
  - **Test**: Quickstart Scenario 3 (move updates beide counters)

- [ ] **T013** Integrate counter updates na task deletion
  - **Locations in `public/app.js`**:
    - `verwijderTaak()` functie (~regel 3,921)
    - `verwijderInboxTaak()` functie (~regel 4,036)
    - Bulk delete handlers
  - **Implementation**: Add `debouncedUpdateCounters();` na succesvolle DELETE
  - **Test**: Quickstart Scenario 5 (delete decrements counter)

- [ ] **T014** Integrate counter updates na task completion
  - **Locations in `public/app.js`**:
    - Task completion checkbox handler
    - `markTaskCompleted()` of equivalent functie
  - **Implementation**: Add `debouncedUpdateCounters();` na status update naar 'afgewerkt'
  - **Test**: Quickstart Scenario 4 (complete decrements counter)

- [ ] **T015** Integrate counter updates na bulk operations
  - **Locations in `public/app.js`**:
    - Bulk move functionaliteit
    - Bulk delete functionaliteit
    - Multi-select operaties
  - **Implementation**: Add `debouncedUpdateCounters();` na succesvolle bulk action
  - **Test**: Quickstart Scenario 6 (bulk move updates beide counters correct)

---

## Phase 3.6: Error Handling & Edge Cases

- [ ] **T016** Implement error handling voor API failures in `updateSidebarCounters()`
  - **Implementation**:
    - Try-catch rond fetch call
    - Bij error: Set alle counters naar "(?)" fallback
    - Console.error voor debugging
    - Implementeer retry logic (max 3 retries, 5 seconden delay)
  - **Code Template**:
    ```javascript
    try {
      const response = await fetch('/api/counts/sidebar');
      if (!response.ok) throw new Error('API failed');
      const counts = await response.json();
      // Update counters...
    } catch (error) {
      console.error('Counter update failed:', error);
      // Set all to "(?) "
      document.querySelectorAll('.task-count').forEach(el => el.textContent = '(?) ');
      // Schedule retry...
    }
    ```
  - **Test**: Quickstart Scenario 9 (API error handling)

- [ ] **T017** Handle zero tasks edge case
  - **Implementation**: In `updateSidebarCounters()`, ensure "(0)" is displayed voor empty categories
  - **Verify**: Zero is valid en wordt correct getoond (niet hidden of leeg)
  - **Test**: Quickstart Scenario 7 (zero tasks shows "(0)")

---

## Phase 3.7: Testing & Validation

- [ ] **T018** Deploy naar staging (dev.tickedify.com)
  - Commit alle wijzigingen met descriptive message
  - Push naar git: `git push origin 022-voeg-de-volgende`
  - Wait voor Vercel deployment
  - Verify deployment via `/api/version` endpoint

- [ ] **T019** Execute Quickstart Scenario 1: Initial Display
  - Open dev.tickedify.com in browser
  - Login met test credentials
  - Verify alle 5 counters zichtbaar
  - Verify format: "(N)" met correcte getallen
  - Verify GEEN counters bij andere menu items
  - ✅ Pass: All counters display correctly

- [ ] **T020** Execute Quickstart Scenario 2-6: Core Functionality
  - **Scenario 2**: Create task → counter increments
  - **Scenario 3**: Move task → beide counters update
  - **Scenario 4**: Complete task → counter decrements
  - **Scenario 5**: Delete task → counter decrements
  - **Scenario 6**: Bulk move → counters update correct
  - ✅ Pass: All core operations update counters correctly

- [ ] **T021** Execute Quickstart Scenario 7-8: Edge Cases
  - **Scenario 7**: Zero tasks edge case
  - **Scenario 8**: Rapid actions performance test
  - Verify debouncing works (check Network tab - 1 API call na 300ms)
  - ✅ Pass: Edge cases handled correctly

- [ ] **T022** Execute Quickstart Scenario 9: Error Handling
  - Simulate API failure in console (zie quickstart.md)
  - Verify fallback "(?) " display
  - Verify retry mechanism
  - Restore normal operation
  - ✅ Pass: Error handling graceful

- [ ] **T023** Execute Quickstart Scenario 10: Cross-Browser Testing
  - Test in Chrome/Edge
  - Test in Firefox
  - Test in Safari (macOS/iOS)
  - Verify styling consistent
  - Verify functionality works
  - ✅ Pass: Cross-browser compatible

---

## Phase 3.8: Regression Testing & Polish

- [ ] **T024** Regression testing: Verify bestaande features werken nog
  - **Test List**:
    - [ ] Drag & drop tussen lijsten
    - [ ] Dagelijkse planning functionality
    - [ ] Filter functionaliteit
    - [ ] Zoeken
    - [ ] Bulk acties
    - [ ] Mobile responsive layout
  - ✅ Pass: No regressions introduced

- [ ] **T025** Performance validation
  - **Metrics** (via Chrome DevTools):
    - Page load: Counters visible < 1 seconde
    - Update latency: Counter update < 500ms na actie
    - API response: GET /api/counts/sidebar < 200ms
    - Debounce delay: 300ms tussen laatste actie en API call
  - Use Performance API voor measurements (zie quickstart.md)
  - ✅ Pass: Performance targets met

- [ ] **T026** Update changelog.html
  - Add entry voor nieuwe versie
  - Beschrijving: "⚡ Taak tellers toegevoegd aan sidebar (Inbox, Acties, Projecten, Opvolgen, Uitgesteld)"
  - Mark as "badge-feature"
  - Set previous version badge to "badge-feature" of "badge-fix"
  - ✅ Complete: Changelog updated

- [ ] **T027** Final code review & cleanup
  - Remove debug console.logs (behoud alleen belangrijke logs)
  - Verify code formatting consistent
  - Check for duplication
  - Ensure comments zijn duidelijk
  - ✅ Complete: Code clean and documented

---

## Phase 3.9: Production Deployment

### 🚨 BÈTA FREEZE - PRODUCTIE DEPLOYMENT GEBLOKKEERD

**KRITIEK**: Tickedify is nu in bèta met echte gebruikers. Productie deployments zijn BEVROREN.

- [ ] **T028** ~~Merge naar main branch~~ **NIET UITVOEREN - BÈTA FREEZE**
  - ❌ **GEBLOKKEERD**: Geen productie deployments toegestaan tijdens bèta
  - Feature blijft op `022-voeg-de-volgende` branch
  - Alleen staging testing (dev.tickedify.com) toegestaan
  - Wacht op expliciete bèta freeze lift van gebruiker

- [ ] **T029** ~~Deploy naar productie~~ **NIET UITVOEREN - BÈTA FREEZE**
  - ❌ **GEBLOKKEERD**: Main branch is BEVROREN
  - Productie (tickedify.com) blijft ongewijzigd
  - Feature moet getest blijven op staging

- [ ] **T030** ~~Post-deployment productie verificatie~~ **NIET UITVOEREN - BÈTA FREEZE**
  - ❌ **GEBLOKKEERD**: Geen productie deployment = geen verificatie nodig
  - **Alternatief**: Staging verificatie is voldoende voor nu

### Toegestane Acties Tijdens Bèta Freeze
- ✅ Ontwikkelen op feature branches
- ✅ Testen op staging (dev.tickedify.com)
- ✅ Pull Requests aanmaken (maar NIET mergen naar main)
- ✅ Code reviews
- ✅ Documentatie updates
- ❌ Mergen naar main branch
- ❌ Productie deployments
- ❌ Live database wijzigingen

---

## Dependencies

### Sequential Dependencies
```
Setup (T001-T003)
  ↓
Backend (T004-T005) → must complete before T018
  ↓
Frontend UI (T006-T007) → must complete before T008
  ↓
Core Logic (T008-T010) → must complete before T011
  ↓
Integration (T011-T015) → must complete before T018
  ↓
Error Handling (T016-T017)
  ↓
Deployment & Testing (T018-T023)
  ↓
Polish (T024-T027)
  ↓
Production (T028-T030) ← requires explicit approval
```

### Parallel Opportunities
- **T003** kan parallel met T004 (backend work)
- **T006 & T007** kunnen parallel (HTML & CSS)
- **T019-T023** kunnen deels parallel (verschillende test scenarios)
- **T024** regression tests kunnen parallel uitgevoerd worden

---

## Parallel Execution Example

```bash
# After T005 complete, run T006 and T007 together:
# Terminal 1: HTML wijzigingen
# Terminal 2: CSS styling

# After T015 complete, run testing scenarios parallel:
Task: "Execute Quickstart Scenario 1: Initial Display"
Task: "Execute Quickstart Scenario 2-6: Core Functionality"
Task: "Execute Quickstart Scenario 7-8: Edge Cases"
# (Scenarios kunnen parallel in verschillende browser tabs)
```

---

## Notes

### Important Reminders
- ✅ **Debouncing**: 300ms delay om spam te voorkomen
- ✅ **Error Handling**: Always show fallback bij API failures
- ✅ **User Auth**: Endpoint gebruikt bestaande session middleware
- ✅ **Status Filter**: ALLEEN `status = 'actief'` taken tellen
- ✅ **Versioning**: Version bump VOOR elke deployment
- ✅ **Production Safety**: NEVER push naar main zonder approval

### Testing Strategy
- Manual testing via quickstart.md scenarios
- Playwright automation optioneel (tickedify-testing agent beschikbaar)
- Regression testing kritiek (feature mag niets breken)

### Performance Targets
- Page load: < 1 seconde voor counter visibility
- API response: < 200ms voor counts endpoint
- Update latency: < 500ms tussen actie en counter update
- Debounce: 300ms delay tussen rapid actions

---

## Validation Checklist
*GATE: Checked before marking tasks complete*

- [x] Contract (api-counts-sidebar.yaml) heeft implementation task (T004)
- [x] All 10 quickstart scenarios covered in testing tasks (T019-T023)
- [x] All core operations integrated (T011-T015): create, move, delete, complete, bulk
- [x] Error handling implemented (T016-T017)
- [x] Performance validated (T025)
- [x] Regression testing included (T024)
- [x] Production deployment gated by approval (T028)
- [x] Each task has exact file path and implementation details
- [x] Dependencies clearly mapped
- [x] Parallel opportunities identified

---

## Success Criteria

Feature is DONE when:
- ✅ All 5 counters display correctly bij page load
- ✅ Counters update binnen 1 seconde na elke taak operatie
- ✅ Error handling graceful (fallback display)
- ✅ Performance targets bereikt (<200ms API, <500ms update)
- ✅ Cross-browser compatible (Chrome, Firefox, Safari)
- ✅ No regressions in bestaande functionaliteit
- ✅ Changelog updated
- ✅ Deployed to production en verified working

**Total Tasks**: 30 (Setup: 3, Backend: 2, Frontend: 9, Testing: 6, Polish: 4, Production: 3, Meta: 3)
