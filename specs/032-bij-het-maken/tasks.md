# Tasks: "Volgende Keer" Bericht Trigger Optie

**Feature**: 032-bij-het-maken
**Input**: Design documents from `/specs/032-bij-het-maken/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Tech stack: Node.js + Express.js + Vanilla JS
   ✓ Structure: Tickedify custom (server.js, public/)
   ✓ No new dependencies needed
2. Load optional design documents:
   ✓ data-model.md: No schema changes needed
   ✓ contracts/: API extensions documented
   ✓ research.md: 5 design decisions documented
   ✓ quickstart.md: Testing scenarios available
3. Generate tasks by category:
   ✓ Setup: Documentation only (no project init)
   ✓ Tests: Manual testing via quickstart.md
   ✓ Core: Backend trigger logic + frontend UI
   ✓ Integration: API endpoint modifications
   ✓ Polish: Changelog + deployment
4. Apply task rules:
   ✓ Backend (server.js) and Frontend (admin2.html) = sequential
   ✓ Documentation tasks = parallel [P]
   ✓ Testing follows implementation
5. Number tasks sequentially (T001-T010)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   ✓ Backend trigger logic covered
   ✓ Frontend UI covered
   ✓ Testing scenarios covered
9. Return: SUCCESS (10 tasks ready for execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Setup & Documentation

### T001 [P] Document nieuwe trigger_type in database schema documentatie ✅
**File**: `specs/032-bij-het-maken/DATABASE_NOTES.md` (nieuw)
**Description**:
- Documenteer dat `trigger_type = 'next_time'` een nieuwe geldige waarde is
- Leg uit dat geen schema wijzigingen nodig zijn (VARCHAR(50) accommodeert nieuwe waarde)
- Voeg voorbeeld INSERT statements toe voor testing
- Refereer naar specs/026-lees-messaging-system/SETUP_DATABASE.sql voor originele schema

**Acceptance Criteria**:
- Duidelijke uitleg van next_time trigger waarde
- SQL voorbeelden voor message creation met next_time
- Verwijs naar bestaande schema documentatie

---

## Phase 3.2: Backend Implementation

### T002 Implementeer next_time trigger logica in GET /api/messages/unread endpoint ✅
**File**: `server.js` (regel ~13500+, na bestaande messaging endpoints)
**Description**:
- Zoek bestaande GET /api/messages/unread endpoint implementatie
- Voeg OR clause toe aan WHERE condition voor next_time trigger evaluation:
  ```sql
  (m.trigger_type = 'next_time' AND (mi.dismissed = FALSE OR mi.message_id IS NULL))
  ```
- Zorg dat query DISTINCT results returned voor meerdere next_time berichten
- Test dat bestaande immediate en page_visit_count triggers ongewijzigd blijven
- Voeg console.log toe voor debugging: "Evaluating next_time trigger for user {userId}"

**Dependencies**: None (extends existing endpoint)

**Acceptance Criteria**:
- SQL query include next_time trigger condition
- Backend returned next_time messages in unread array
- Bestaande triggers blijven werken (backwards compatible)
- Console logging voor debugging aanwezig

**Implementation Notes**:
- Verwacht locatie: Zoek naar bestaande "app.get('/api/messages/unread'" in server.js
- Pattern: Voeg toe aan bestaande WHERE clause met OR condition
- Testing: Gebruik curl commands uit quickstart.md

---

### T003 Valideer trigger_type='next_time' in POST /api/admin/messages endpoint (optioneel) ✅
**File**: `server.js` (regel ~13230, POST /api/admin/messages)
**Description**:
- Zoek POST /api/admin/messages endpoint (regel 13230)
- Check of er trigger_type validatie is (whitelist van toegestane waarden)
- ALS validatie bestaat: voeg 'next_time' toe aan whitelist
- ALS geen validatie: skip deze task (next_time wordt automatisch geaccepteerd)
- Voeg comment toe: "// Trigger types: immediate, page_visit_count, next_time"

**Dependencies**: None (optional enhancement)

**Acceptance Criteria**:
- Als whitelist bestaat: 'next_time' is toegevoegd
- Als geen whitelist: comment toegevoegd voor documentatie
- Endpoint accepteert trigger_type='next_time' zonder errors

---

## Phase 3.3: Frontend Implementation

### T004 Voeg "Volgende keer" radio button toe aan admin message form ✅
**File**: `public/admin2.html` (trigger type section)
**Description**:
- Zoek het message creation formulier in admin2.html
- Localiseer de bestaande trigger type radio buttons (immediate, page_visit_count)
- Voeg nieuwe radio button toe:
  ```html
  <input type="radio" name="trigger_type" value="next_time" id="trigger_next_time">
  <label for="trigger_next_time">Volgende keer</label>
  ```
- Plaats tussen bestaande trigger opties (logische volgorde: immediate → next_time → page_visit_count)
- Zorg dat form submission logic de waarde correct meestuurt (check existing JavaScript)
- GEEN extra JavaScript wijzigingen nodig (bestaande form submit werkt al)

**Dependencies**: T002 (backend moet next_time ondersteunen)

**Acceptance Criteria**:
- Radio button zichtbaar in admin interface
- Selecteren van "Volgende keer" stuurt trigger_type='next_time' mee in POST body
- Form submission werkt zonder JavaScript errors
- Label tekst is "Volgende keer" (geen extra tooltip/help text nodig per spec)

**Testing**:
- Open admin2.html in browser
- Selecteer "Volgende keer" radio button
- Submit form en verify POST /api/admin/messages request in Network tab
- Verify trigger_type='next_time' in request payload

---

## Phase 3.4: Manual Testing & Verification

### T005 Voer Quickstart Scenario 1 uit: Basic "next_time" message test
**File**: `specs/032-bij-het-maken/quickstart.md` (Step 1-3)
**Description**:
- Volg quickstart.md Step 1: Create "next_time" message via admin2.html
- Volg quickstart.md Step 2: Verify message shows on "next visit" as test user
- Volg quickstart.md Step 3: Verify dismiss behavior (message verdwijnt na "Got it")
- Document resultaten in TEST_RESULTS.md (nieuw bestand in specs/032-bij-het-maken/)
- Screenshot van message modal voor visuele verificatie (optioneel)

**Dependencies**: T002, T004 (backend + frontend complete)

**Acceptance Criteria**:
- Message aangemaakt met trigger_type='next_time'
- Message verschijnt bij page load na creation
- Message verdwijnt na dismiss
- Geen console errors in browser
- TEST_RESULTS.md bevat: ✅ Basic test passed

---

### T006 [P] Voer Quickstart Scenario B uit: Backwards compatibility check
**File**: `specs/032-bij-het-maken/TEST_RESULTS.md` (append)
**Description**:
- Volg quickstart.md Scenario C: Test bestaande immediate trigger
- Volg quickstart.md Scenario C: Test bestaande page_visit_count trigger
- Verify beide triggers blijven werken naast next_time trigger
- Verify meerdere trigger types kunnen coëxisteren in /api/messages/unread response
- Document resultaten in TEST_RESULTS.md

**Dependencies**: T005 (parallel testing mogelijk na T005 complete)

**Acceptance Criteria**:
- Immediate trigger werkt: message toont instant
- Page_visit_count trigger werkt: message toont op Xe bezoek
- Geen interferentie tussen trigger types
- TEST_RESULTS.md bevat: ✅ Backwards compatibility verified

---

### T007 [P] Voer Database Verification Queries uit
**File**: `specs/032-bij-het-maken/TEST_RESULTS.md` (append)
**Description**:
- Open Neon Console SQL Editor
- Voer quickstart.md Query 1 uit: Verify message created with correct trigger
- Voer quickstart.md Query 2 uit: Check user interaction records
- Voer quickstart.md Query 3 uit: Verify message filtering logic
- Screenshot query results (optioneel)
- Documenteer alle query outputs in TEST_RESULTS.md

**Dependencies**: T005 (test messages moeten bestaan in database)

**Acceptance Criteria**:
- Query 1 toont messages met trigger_type='next_time'
- Query 2 toont interaction records met dismissed=TRUE na test
- Query 3 toont correcte filtering (dismissed messages excluded)
- TEST_RESULTS.md bevat: ✅ Database verification passed

---

## Phase 3.5: Polish & Deployment

### T008 Update CHANGELOG.md met nieuwe feature ✅
**File**: `public/changelog.html`
**Description**:
- Voeg nieuwe entry toe bovenaan changelog:
  - Versie: Volgende patch versie (check package.json voor huidige versie)
  - Datum: Vandaag
  - Categorie: ⚡ Feature
  - Tekst: "Nieuwe 'Volgende keer' trigger optie voor admin berichten - toon berichten bij eerstvolgende pagina bezoek"
- Update badge naar "badge-latest" voor nieuwe entry
- Verplaats vorige "badge-latest" naar "badge-feature"

**Dependencies**: T005, T006, T007 (testing complete, feature verified)

**Acceptance Criteria**:
- Changelog entry added met correcte versie nummer
- Beschrijving duidelijk en gebruiksvriendelijk
- Badge-latest op nieuwe entry
- HTML syntax correct (geen broken tags)

---

### T009 Bump versie nummer in package.json ✅
**File**: `package.json`
**Description**:
- Open package.json
- Increment patch version number (bijv. 1.0.19 → 1.0.20)
- Commit met message: "🎯 FEAT: Next Time Message Trigger - v1.0.X"
- Gebruik CLAUDE.md workflow: commit moet changelog + package.json bevatten

**Dependencies**: T008 (changelog update moet in zelfde commit)

**Acceptance Criteria**:
- Version number incremented
- Git commit bevat package.json + changelog.html
- Commit message volgt project conventions
- Ready for git push

---

### T010 Deploy naar staging en voer final verification uit ⚠️ MANUAL
**File**: N/A (deployment + testing)
**Description**:
- Push feature branch naar GitHub: `git push origin 032-bij-het-maken`
- Vercel deploys automatisch naar dev.tickedify.com
- Wait 15 seconds voor deployment
- Verify deployment via /api/version endpoint (check version number matches package.json)
- Run quickstart.md regression tests op dev.tickedify.com
- Als alle tests slagen: Feature is klaar voor PR/merge (maar NIET mergen ivm BÈTA FREEZE)
- Documenteer final test results in TEST_RESULTS.md

**Dependencies**: T009 (version bump + commit)

**Acceptance Criteria**:
- Deployment succesvol naar dev.tickedify.com
- /api/version toont nieuwe versie nummer
- Regression tests passed op staging
- TEST_RESULTS.md bevat: ✅ Staging deployment verified
- Feature ready voor code review (maar NIET ready voor productie merge ivm BÈTA FREEZE)

---

## Dependencies Graph

```
T001 (Documentation) [P] ─┐
                           ├─ (parallel, geen dependencies)
T002 (Backend logic) ──────┼─> T004 (Frontend UI) ──┐
                           │                         │
T003 (Validation) [P] ─────┘                         │
                                                      ├─> T005 (Basic test) ──┬─> T008 (Changelog)
                                                      │                        │
                                                      │                        ├─> T006 [P] (Compat test)
                                                      │                        │
                                                      └────────────────────────┴─> T007 [P] (DB verify)
                                                                                    │
                                                                                    └─> T009 (Version bump) ──> T010 (Deploy)
```

**Critical Path**: T002 → T004 → T005 → T008 → T009 → T010 (6 tasks, ~2-3 hours)

---

## Parallel Execution Examples

### Parallel Group 1: Documentation & Validation (Start)
```bash
# Can run simultaneously:
Task(description="Document trigger_type",
     prompt="Create DATABASE_NOTES.md per T001 specification")

Task(description="Validate trigger_type whitelist",
     prompt="Check and update POST /api/admin/messages per T003")
```

### Parallel Group 2: Testing Phase (After T005)
```bash
# Can run simultaneously after basic test passes:
Task(description="Backwards compatibility test",
     prompt="Execute quickstart Scenario C per T006")

Task(description="Database verification",
     prompt="Run SQL queries per T007 in Neon Console")
```

---

## Task Validation Checklist

*Verified during task generation*

- [x] Backend trigger logic covered (T002)
- [x] Frontend UI covered (T004)
- [x] Testing scenarios covered (T005, T006, T007)
- [x] Documentation covered (T001, T008)
- [x] Deployment covered (T009, T010)
- [x] Parallel tasks truly independent (T001/T003 parallel, T006/T007 parallel)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Tests come before Polish (T005-T007 before T008-T010)
- [x] Dependencies explicitly documented

---

## Estimated Timeline

**Total Tasks**: 10
**Critical Path**: 6 tasks (T002 → T004 → T005 → T008 → T009 → T010)
**Parallel Opportunities**: 2 groups (4 tasks can be parallelized)

**Estimated Effort**:
- Backend implementation (T002, T003): 30-45 min
- Frontend implementation (T004): 15-20 min
- Testing phase (T005, T006, T007): 45-60 min
- Polish & deploy (T008, T009, T010): 30-45 min

**Total Estimated Time**: 2-3 hours voor volledige implementatie + testing

---

## Notes

- ✅ Geen database migrations nodig (bestaand schema accommodeert next_time)
- ✅ Backwards compatible - bestaande triggers blijven ongewijzigd
- ✅ Additive change - geen breaking changes
- ⚠️ BÈTA FREEZE ACTIEF - deploy naar staging only, NIET naar productie
- ✅ Manual testing workflow (geen automated tests in project)
- ✅ Quickstart.md bevat alle test scenarios en SQL queries

---

## BÈTA FREEZE COMPLIANCE

**KRITIEK**: Deze feature mag NIET naar productie (main branch) gemerged worden tijdens de bèta freeze periode.

**Toegestane acties**:
- ✅ T001-T010: Alle implementatie en testing op feature branch
- ✅ T010: Deploy naar dev.tickedify.com (staging)
- ✅ Pull Request aanmaken voor code review
- ❌ Merge naar main branch (GEBLOKKEERD)
- ❌ Productie deployment (tickedify.com blijft ongewijzigd)

**Na BÈTA FREEZE opheffing**:
- Merge PR naar main
- Vercel deploys automatisch naar tickedify.com
- Final regression test op productie

---

**Task List Generated**: 2025-10-24
**Status**: Ready for execution
**Next Step**: Begin met T001 of T002 (T001 kan parallel met backend development)
