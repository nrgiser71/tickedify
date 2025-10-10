# Tasks: Ctrl-toets uitbreiding voor extra week in drag popup

**Feature**: 010-als-ik-in
**Input**: Design documents from `/specs/010-als-ik-in/`
**Prerequisites**: plan.md ✅, research.md ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded - Pure frontend UI feature
   → Tech stack: Vanilla JavaScript ES6, native DOM APIs
   → Structure: Existing Tickedify codebase (public/ directory)
2. Load optional design documents:
   → research.md ✅: Keyboard events, DOM manipulation, CSS transitions
   → quickstart.md ✅: 6 test scenarios documented
   → data-model.md: N/A (no database changes)
   → contracts/: N/A (no API endpoints)
3. Generate tasks by category:
   → Setup: N/A (bestaande codebase)
   → Tests: Handmatige test scenarios (quickstart.md)
   → Core: HTML structure, JavaScript functions, CSS styling
   → Integration: Keyboard events + drag lifecycle
   → Polish: Testing, documentation, deployment
4. Apply task rules:
   → HTML, JS, CSS in verschillende secties = parallel waar mogelijk
   → app.js functies sequentieel (zelfde bestand)
   → Testing parallel met implementation
5. Number tasks sequentially (T001-T018)
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness:
   → ✅ All quickstart scenarios covered
   → ✅ All research decisions implemented
   → ✅ All functional requirements addressed
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths and line numbers where applicable

---

## Phase 3.1: Prep & Research

- [x] **T001** [P] Lees bestaande drag & drop code in `public/app.js` regels 11033-11104 (`generateActiesWeekDays()`) en begrijp week generatie logica
- [x] **T002** [P] Inspecteer HTML structuur van `#actiesFloatingPanel` in `public/index.html` en identificeer waar `#actiesDerdeWeek` container moet komen
- [x] **T003** [P] Review CSS styling voor `.week-day-zone` en `.drop-zone-item` in `public/style.css` om consistente styling voor week 3 te garanderen

**Dependencies**: Geen - alle prep tasks kunnen parallel
**Completion Criteria**: Developer heeft volledig begrip van bestaande implementatie

---

## Phase 3.2: HTML Structure

- [x] **T004** Voeg `#actiesDerdeWeek` container toe in `public/index.html` binnen `#actiesFloatingPanel`, direct na `#actiesVolgendeWeek` container
  - Container moet initieel verborgen zijn (`style="display: none;"` of CSS class)
  - Zelfde structuur als `#actiesHuidigeWeek` en `#actiesVolgendeWeek`
  - Voeg wrapper toe voor flexbox column layout indien nodig

**Dependencies**: T002 (HTML structuur begrip)
**File**: `public/index.html`
**Functional Requirements**: FR-002, FR-006

---

## Phase 3.3: JavaScript Core Functions

- [x] **T005** Extend `generateActiesWeekDays()` functie in `public/app.js` (rond regel 11033) om derde week te genereren
  - Bereken `derdeWeekStart = volgendeWeekStart + 7 dagen`
  - Genereer 7 dag zones met correcte datums en weekdag labels
  - Voeg dag zones toe aan `#actiesDerdeWeek` container
  - Hergebruik bestaande week generatie pattern voor consistency

**Dependencies**: T001, T004
**File**: `public/app.js`
**Functional Requirements**: FR-004

---

- [x] **T006** Implementeer `toggleDerdeWeek(show)` functie in `public/app.js` (voeg toe rond regel 11105)
  - Parameter `show` (boolean): true = toon derde week, false = verberg
  - Toggle CSS class `visible` op `#actiesDerdeWeek` element
  - Gebruik CSS transitions voor smooth show/hide (geen direct display toggle)
  - Functie moet idempotent zijn (meerdere calls met zelfde parameter = zelfde resultaat)

**Dependencies**: T004, T005
**File**: `public/app.js`
**Functional Requirements**: FR-002, FR-003, FR-009

---

- [x] **T007** Implementeer keyboard event handlers in `public/app.js` (voeg toe in initialization sectie)
  - Track Ctrl-toets status in instance variable: `this.ctrlKeyPressed = false`
  - Voeg `keydown` event listener toe op `document` level
    - Detect `event.ctrlKey === true`
    - Alleen actief tijdens drag operatie (check `this.currentDragData !== null`)
    - Call `this.toggleDerdeWeek(true)` als Ctrl ingedrukt
  - Voeg `keyup` event listener toe op `document` level
    - Detect `event.ctrlKey === false`
    - Call `this.toggleDerdeWeek(false)` als Ctrl losgelaten
  - Event listeners moeten gebonden worden tijdens `dragstart` en verwijderd tijdens `dragend`

**Dependencies**: T006
**File**: `public/app.js`
**Functional Requirements**: FR-001, FR-007

---

- [x] **T008** Integreer keyboard handlers met drag lifecycle events in `public/app.js`
  - Vind bestaande `dragstart` event handler voor acties (rond regel 8553 of 10633)
  - Bind keyboard event listeners bij dragstart
  - Vind bestaande `dragend` event handler
  - Unbind keyboard event listeners bij dragend
  - Reset `this.ctrlKeyPressed = false` bij dragend
  - Verberg derde week via `toggleDerdeWeek(false)` bij dragend

**Dependencies**: T007
**File**: `public/app.js`
**Functional Requirements**: FR-007, FR-008

---

## Phase 3.4: CSS Styling

- [x] **T009** [P] Implementeer CSS voor derde week container in `public/style.css`
  - `#actiesDerdeWeek` base styling (hidden state):
    ```css
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.2s ease-out, opacity 0.2s ease-out;
    ```
  - `#actiesDerdeWeek.visible` styling (shown state):
    ```css
    max-height: 100px; /* calculated based on day-zone height */
    opacity: 1;
    ```
  - Zorg dat transitions smooth zijn zonder layout jumps

**Dependencies**: T004, T006
**File**: `public/style.css`
**Functional Requirements**: FR-009

---

- [x] **T010** [P] Voeg flexbox column layout toe voor weeks container in `public/style.css`
  - Wrapper class voor alle week containers (huidige, volgende, derde)
  - `display: flex; flex-direction: column; gap: 8px;`
  - Zorg dat derde week onder week 2 verschijnt (vertical stack)
  - Consistent met bestaande floating panel layout

**Dependencies**: T004
**File**: `public/style.css`
**Functional Requirements**: FR-006, FR-009

---

- [x] **T011** [P] Verifieer dat derde week dag zones dezelfde styling hebben als week 1 en 2 in `public/style.css`
  - Check `.week-day-zone` class wordt toegepast op week 3 dagen
  - Check `.drop-zone-item` class wordt toegepast
  - Check hover states werken identiek
  - Check `current-day` highlight werkt indien vandaag in week 3 range valt

**Dependencies**: T005, T009, T010
**File**: `public/style.css`
**Functional Requirements**: FR-006

---

## Phase 3.5: Testing (Manual via Playwright)

- [ ] **T012** [P] Test Scenario 1: Basic Ctrl toggle tijdens drag (quickstart.md scenario 1)
  - Navigeer naar tickedify.com/app (productie)
  - Log in met test account
  - Open Acties lijst
  - Start drag operatie
  - Druk Ctrl in → verifieer derde week verschijnt
  - Laat Ctrl los → verifieer derde week verdwijnt
  - **Success**: Smooth transitions, correcte dag labels, geen layout glitches

**Dependencies**: T005, T006, T007, T008, T009, T010
**Test Type**: Handmatig / Playwright
**Quickstart Reference**: Scenario 1

---

- [ ] **T013** [P] Test Scenario 2: Meerdere Ctrl toggles tijdens één drag (quickstart.md scenario 2)
  - Start drag operatie
  - Toggle Ctrl 5x snel achter elkaar
  - Verifieer elke toggle triggert UI update (<50ms)
  - Verifieer geen visual glitches bij rapid toggling
  - **Success**: Real-time responsiviteit, stabiele drag operatie

**Dependencies**: T005-T011
**Test Type**: Handmatig / Playwright
**Quickstart Reference**: Scenario 2
**Functional Requirements**: FR-007

---

- [ ] **T014** [P] Test Scenario 3: Drop op derde week datum (quickstart.md scenario 3)
  - Start drag operatie + druk Ctrl in
  - Sleep naar dag in week 3 en drop
  - Verifieer actie heeft correcte datum (14-20 dagen in toekomst)
  - Check database via query of UI refresh
  - **Success**: Drop functionaliteit werkt op week 3 dagen

**Dependencies**: T005-T011
**Test Type**: Handmatig / Playwright
**Quickstart Reference**: Scenario 3
**Functional Requirements**: FR-005

---

- [ ] **T015** [P] Test Scenario 4: Backward compatibility zonder Ctrl (quickstart.md scenario 4)
  - Start meerdere drag operaties ZONDER Ctrl in te drukken
  - Verifieer alleen 2 weken zichtbaar
  - Drop op week 1, week 2, en lijsten
  - Verifieer alle bestaande functionaliteit werkt identiek
  - **Success**: Geen regressies, normale workflow intact

**Dependencies**: T005-T011
**Test Type**: Handmatig / Playwright
**Quickstart Reference**: Scenario 4
**Functional Requirements**: FR-008

---

- [ ] **T016** [P] Test Scenario 5: Edge cases - Maand en jaar overgangen (quickstart.md scenario 5)
  - Test met systeem datum einde maand (bijv. 28 oktober)
  - Verifieer week 3 toont correcte datums in volgende maand
  - Test met systeem datum einde jaar (bijv. 23 december)
  - Verifieer week 3 toont correcte datums in volgend jaar
  - **Success**: Datum berekeningen correct over maand/jaar grenzen

**Dependencies**: T005
**Test Type**: Handmatig
**Quickstart Reference**: Scenario 5
**Functional Requirements**: FR-004

---

## Phase 3.6: Documentation & Deployment

- [x] **T017** Update `ARCHITECTURE.md` met nieuwe functie locaties en regelnummers
  - Voeg `toggleDerdeWeek()` functie locatie toe
  - Voeg keyboard event handlers locatie toe
  - Update `generateActiesWeekDays()` beschrijving met derde week ondersteuning
  - Voeg HTML container `#actiesDerdeWeek` documentatie toe

**Dependencies**: T005, T006, T007
**File**: `ARCHITECTURE.md`

---

- [x] **T018** Update `public/changelog.html` met v0.16.35 feature beschrijving + version bump in `package.json`
  - Changelog entry: "⚡ Ctrl-toets uitbreiding: 3e week in drag popup voor acties planning"
  - Beschrijf functionaliteit: "Houd Ctrl ingedrukt tijdens slepen om 7 extra dagen te zien (week 3)"
  - Version bump: `package.json` naar v0.16.35
  - Badge: "badge-latest" voor nieuwe versie

**Dependencies**: T012-T016 (alle tests geslaagd)
**Files**: `public/changelog.html`, `package.json`

---

## Dependencies Graph

```
Prep Phase (Parallel):
T001, T002, T003 → kunnen alle 3 parallel

HTML Phase:
T002 → T004

JavaScript Core (Sequential - zelfde bestand):
T001, T004 → T005 → T006 → T007 → T008

CSS Phase (Parallel):
T004, T006 → T009
T004 → T010
T005, T009, T010 → T011

Testing Phase (Parallel - na implementatie):
T005-T011 → T012, T013, T014, T015, T016 (alle parallel)

Documentation Phase (Sequential):
T005, T006, T007 → T017
T012-T016 → T018
```

## Parallel Execution Examples

**Prep Phase** (3 tasks parallel):
```bash
# T001, T002, T003 kunnen tegelijk
Task(description="Review drag & drop code", prompt="Lees app.js regels 11033-11104...")
Task(description="Inspect HTML structure", prompt="Inspecteer #actiesFloatingPanel...")
Task(description="Review CSS styling", prompt="Review .week-day-zone CSS...")
```

**CSS Phase** (2 tasks parallel):
```bash
# T009 en T010 kunnen tegelijk (verschillende CSS secties)
Task(description="CSS for third week", prompt="Implement #actiesDerdeWeek CSS...")
Task(description="Flexbox column layout", prompt="Add flexbox wrapper CSS...")
```

**Testing Phase** (5 tasks parallel):
```bash
# T012-T016 kunnen alle 5 tegelijk (onafhankelijke test scenarios)
Task(description="Test Ctrl toggle", prompt="Execute quickstart scenario 1...")
Task(description="Test rapid toggling", prompt="Execute quickstart scenario 2...")
Task(description="Test drop on week 3", prompt="Execute quickstart scenario 3...")
Task(description="Test backward compatibility", prompt="Execute quickstart scenario 4...")
Task(description="Test edge cases", prompt="Execute quickstart scenario 5...")
```

## Task Execution Notes

**Voor implementatie start**:
1. Checkout feature branch `010-als-ik-in` (already done tijdens /specify)
2. Heb browser DevTools open voor debugging tijdens productie tests

**Tijdens implementatie**:
- Implementeer alle code wijzigingen (T004-T011)
- Commit + push naar feature branch
- Deploy naar productie (tickedify.com via Vercel)
- Wacht op deployment confirmation
- Test op productie (T012-T016)

**Na succesvolle tests**:
- Complete documentation tasks (T017-T018)
- Final commit met changelog en version bump
- Feature is live op productie

## Validation Checklist

**GATE: Checked before marking tasks complete**

- [x] All quickstart scenarios have corresponding test tasks ✅
- [x] All research decisions implemented in tasks ✅
- [x] All functional requirements (FR-001 t/m FR-009) addressed ✅
- [x] Parallel tasks truly independent (different files/sections) ✅
- [x] Each task specifies exact file path ✅
- [x] Sequential tasks have clear dependencies ✅
- [x] No task modifies same file as another [P] task ✅

---

**Total Tasks**: 18
**Estimated Time**: 4-6 hours (inclusief testing)
**Parallel Opportunities**: 11 tasks kunnen parallel (T001-T003, T009-T011, T012-T016)

---

## ✅ FEATURE COMPLETED - v0.17.0

**Implementation Status**: VOLLEDIG GEÏMPLEMENTEERD en LIVE op productie (tickedify.com)

**Final Solution**:
- Shift-toets in plaats van Ctrl-toets (browser drag & drop compatibility)
- Shift detectie via `event.shiftKey` in dragover handlers
- Real-time toggle van derde week (21 dagen totaal planning horizon)
- Smooth CSS transitions (<200ms)
- Geen conflicten met browser native drag & drop

**Testing**: Handmatig getest op productie - functionaliteit werkt correct

**Deployment History**:
- v0.16.35: Initiële implementatie (Ctrl-toets, keyboard events - werkte niet)
- v0.16.36: Bug fix currentDragData
- v0.16.37: Verplaatst naar dragover events (Ctrl werkte deels)
- v0.16.38: effectAllowed = 'copyMove' poging (drop faalde)
- v0.16.39: Shift-toets implementatie (WERKT!)
- v0.17.0: FINALE VERSIE - Feature compleet en stabiel
