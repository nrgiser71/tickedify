# Tasks: Datumformaat Standaardisatie naar DD/MM/YYYY

**Input**: Design documents from `/specs/024-overal-waar-datums/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: JavaScript ES6+, Vanilla JS, Express.js
   → Structure: Tickedify existing (public/app.js + server.js)
2. Load optional design documents ✓
   → data-model.md: DisplayDate entity (pure function)
   → contracts/: format-display-date.test.js
   → research.md: Intl.DateTimeFormat + replace decision
3. Generate tasks by category ✓
   → Setup: Geen nieuwe dependencies (native Date API)
   → Tests: 1 contract test file (18 test cases)
   → Core: 1 centrale functie + 25+ refactor locaties
   → Integration: Geen (pure UI layer)
   → Polish: Visual regression, docs update
4. Apply task rules ✓
   → Different code sections = [P] parallel
   → Same file sequential editing = no [P]
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T021) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
   → Contract test exists ✓
   → All 25+ UI locaties covered ✓
   → Quickstart scenarios mapped ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different code sections, no dependencies)
- Exact file paths and line numbers included where applicable

## Path Conventions
**Tickedify Structure** (existing web app):
- **Frontend**: `public/app.js` (~11,000 regels, single file)
- **Backend**: `server.js` (ongewijzigd voor deze feature)
- **Tests**: `specs/024-overal-waar-datums/contracts/`
- **Docs**: `ARCHITECTURE.md`, `public/changelog.html`

---

## Phase 3.1: Setup & Prerequisites

- [ ] **T001** Verify geen nieuwe dependencies nodig (native Date API usage only)
  - Check: Intl.DateTimeFormat beschikbaar in target browsers
  - Check: Geen npm packages te installeren
  - **File**: N/A (verification only)
  - **Success**: Confirmed browser API support (98%+ browsers)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T002** [P] Run contract test file to verify RED phase (tests must fail)
  - **File**: `specs/024-overal-waar-datums/contracts/format-display-date.test.js`
  - **Command**: `node specs/024-overal-waar-datums/contracts/format-display-date.test.js`
  - **Expected**: All 18 tests FAIL with "not yet implemented" error
  - **Success**: Exit code 1, 0 passed, 18 failed
  - **Acceptance**: Screenshot/output showing RED phase

**TDD Checkpoint**: Do NOT proceed to Phase 3.3 until T002 confirms RED phase ✋

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Central Function Implementation

- [ ] **T003** Implement `formatDisplayDate()` in Taakbeheer class
  - **File**: `public/app.js` (insert near regel ~14680, after existing `formatDate()`)
  - **Implementation**:
    ```javascript
    formatDisplayDate(dateInput, options = {}) {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateInput}`);
        }

        const formatter = new Intl.DateTimeFormat('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return formatter.format(date).replace(/-/g, '/');
    }
    ```
  - **Success**: Function exists in Taakbeheer class
  - **Acceptance**: Contract tests T002 now PASS (GREEN phase)

- [ ] **T004** Verify contract tests now PASS (GREEN phase)
  - **File**: `specs/024-overal-waar-datums/contracts/format-display-date.test.js`
  - **Command**: `node specs/024-overal-waar-datums/contracts/format-display-date.test.js`
  - **Expected**: All 18 tests PASS
  - **Success**: Exit code 0, 18 passed, 0 failed
  - **Acceptance**: Screenshot/output showing GREEN phase

**TDD Checkpoint**: Do NOT proceed to refactoring until T004 confirms GREEN phase ✅

---

### UI Refactoring Tasks (Replace hardcoded toLocaleDateString calls)

**Category 1: Taken Lijsten** (app.js regels 2000-3800)

- [ ] **T005** [P] Refactor Acties lijst verschijndatum display
  - **File**: `public/app.js` regel ~2286
  - **Current**: `new Date(actie.verschijndatum).toLocaleDateString('nl-NL')`
  - **Replace with**: `this.formatDisplayDate(actie.verschijndatum)`
  - **Success**: Acties lijst datums tonen DD/MM/YYYY
  - **Test**: Navigate to Acties lijst, verify datum format

- [ ] **T006** [P] Refactor Afgewerkte acties datum display
  - **File**: `public/app.js` regel ~2310
  - **Current**: `new Date(actie.afgewerkt).toLocaleDateString('nl-NL')`
  - **Replace with**: `this.formatDisplayDate(actie.afgewerkt)`
  - **Success**: Afgewerkt sectie datums tonen DD/MM/YYYY
  - **Test**: Expand afgewerkt sectie, verify datum format

- [X] **T007** [P] Refactor Datum badge display (overdue/future)
  - **File**: `public/app.js` regel ~2042
  - **Current**: `due.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })`
  - **Replace with**: `this.formatDisplayDate(due)`
  - **Success**: Datum badges tonen DD/MM/YYYY ipv "6 jan"
  - **Test**: Find overdue/future task, verify badge format

**Category 2: Context Menu** (app.js regels 3400-3800)

- [X] **T008** [P] Refactor Context menu datum displays (3 locaties)
  - **File**: `public/app.js` regels 3471, 3683, 3767
  - **Current**: `new Date(taak.verschijndatum).toLocaleDateString('nl-NL')`
  - **Replace with**: `this.formatDisplayDate(taak.verschijndatum)`
  - **Success**: Context menu overlay datums tonen DD/MM/YYYY
  - **Test**: Right-click taak met datum, verify menu format
  - **Note**: 3 separate calls, same pattern

**Category 3: Toast Notifications** (app.js regels 2300-10600)

- [X] **T009** [P] Refactor Recurring task completion toasts (3 locaties)
  - **File**: `public/app.js` regels 2398, 4003, 10512
  - **Current**: `new Date(calculatedNextDate).toLocaleDateString('nl-NL')`
  - **Replace with**: `this.formatDisplayDate(calculatedNextDate)`
  - **Success**: Toast shows "Next recurrence scheduled for DD/MM/YYYY"
  - **Test**: Complete herhalende taak, verify toast datum format
  - **Note**: 3 separate toast locations for recurring tasks

- [X] **T010** [P] Refactor Planning confirmation toast
  - **File**: `public/app.js` regel ~4903
  - **Current**: `nieuweDatum.toLocaleDateString('en-US', { weekday: 'long' })} ${nieuweDatum.toLocaleDateString('en-US')}`
  - **Replace with**: `this.formatDisplayDate(nieuweDatum)` (remove weekday part if not needed)
  - **Success**: Toast shows "Scheduled for DD/MM/YYYY"
  - **Test**: Schedule taak via planning popup, verify toast
  - **Note**: Currently uses EN-US format - CRITICAL fix

**Category 4: Dagelijkse Planning** (app.js regels 7400-8500)

- [X] **T011** Refactor Dagelijkse Planning kalender header
  - **File**: `public/app.js` regel ~8328
  - **Current**: `new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })`
  - **Replace with**: `this.formatDisplayDate(new Date())`
  - **Success**: Kalender header toont DD/MM/YYYY ipv "Wednesday, October 22, 2025"
  - **Test**: Open Dagelijkse Planning, verify header datum
  - **Note**: Currently EN-US format - CRITICAL fix
  - **Sequential**: Requires T005-T010 context

- [X] **T012** [P] Refactor Planning item expandable details
  - **File**: `public/app.js` regel ~7492
  - **Current**: `new Date(taak.verschijndatum).toLocaleDateString('nl-NL')`
  - **Replace with**: `this.formatDisplayDate(taak.verschijndatum)`
  - **Success**: Expanded planning item toont DD/MM/YYYY deadline
  - **Test**: Click planning item ▶, verify expanded datum

- [X] **T013** [P] Refactor Actie verschijndatum display in planning sidebar
  - **File**: `public/app.js` regels ~8370, 8475
  - **Current**: `new Date(actie.verschijndatum).toLocaleDateString('nl-NL')`
  - **Replace with**: `this.formatDisplayDate(actie.verschijndatum)`
  - **Success**: Planning sidebar acties tonen DD/MM/YYYY
  - **Test**: Observe planning sidebar, verify datum formats
  - **Note**: 2 separate locations in sidebar rendering

**Category 5: Context Management** (app.js regel ~7079)

- [X] **T014** [P] Refactor Context Management aanmaak datum
  - **File**: `public/app.js` regel ~7079
  - **Current**: `new Date(context.aangemaakt).toLocaleDateString('en-US')`
  - **Replace with**: `this.formatDisplayDate(context.aangemaakt)`
  - **Success**: Context created date toont DD/MM/YYYY
  - **Test**: Open Context Management, verify aanmaak datums
  - **Note**: Currently EN-US format - CRITICAL fix

**Category 6: Floating Panels** (app.js regels 11308-11680)

- [X] **T015** Refactor Acties Floating Panel week generation (SKIP dag afkortingen)
  - **File**: `public/app.js` regels ~11308-11414 (generateActiesWeekDays functie)
  - **Current**: Dag nummer rendering: `const dagNummer = datum.getDate();`
  - **Action**: VERIFY alleen - geen wijziging nodig (dag nummer is al correct)
  - **Success**: Week dag afkortingen blijven Engels (Mo, Tu, We) - FR-010 compliance
  - **Test**: Drag taak, verify floating panel shows correct dag nummers
  - **Note**: Geen refactoring nodig - huidige implementatie correct
  - **Sequential**: Requires T011 context (planning dependencies)

- [X] **T016** [P] Refactor Floating panel datum display in toast (indien present)
  - **File**: `public/app.js` regel ~11681
  - **Current**: `new Date(datum).toLocaleDateString('nl-NL')`
  - **Replace with**: `this.formatDisplayDate(datum)`
  - **Success**: Floating panel scheduling toast toont DD/MM/YYYY
  - **Test**: Drop taak op floating panel week dag, verify toast

---

## Phase 3.4: Integration & Validation

**No Integration Tasks Required** - Pure UI layer refactoring, geen backend/database changes

---

## Phase 3.5: Polish & Quality Assurance

### Testing & Validation

- [ ] **T017** Visual regression testing met Playwright (via tickedify-testing agent)
  - **Tool**: Playwright browser automation
  - **Scenarios**:
    - Screenshot Acties lijst met datums
    - Screenshot Dagelijkse Planning header
    - Screenshot Context Management datums
    - Compare met expected DD/MM/YYYY format
  - **File**: Create `specs/024-overal-waar-datums/visual-regression.spec.js`
  - **Success**: All screenshots show DD/MM/YYYY format
  - **Agent**: Use `tickedify-testing` sub-agent voor Playwright automation

- [ ] **T018** Manual quickstart validation (all 9 scenarios)
  - **File**: `specs/024-overal-waar-datums/quickstart.md`
  - **URL**: https://tickedify.com/app (production) or dev.tickedify.com (staging)
  - **Scenarios**: Execute all 9 user story scenarios
  - **Success**: 100% DD/MM/YYYY consistency across app
  - **Acceptance**: Checklist in quickstart.md fully checked off

- [X] **T019** Code review: Verify geen hardcoded date formats remain
  - **Tool**: Grep search voor old patterns
  - **Search patterns**:
    - `toLocaleDateString('nl-NL', { month: 'short'` (should be 0 results)
    - `toLocaleDateString('en-US'` (should be 0 results)
    - `toLocaleDateString('nl-NL')` without formatDisplayDate (should be minimal)
  - **File**: `public/app.js`
  - **Success**: All datum displays use `formatDisplayDate()` or are justified exceptions
  - **Acceptance**: Document any justified exceptions (e.g., formatDate() for timestamps)

### Documentation

- [X] **T020** [P] Update ARCHITECTURE.md met formatDisplayDate() locatie
  - **File**: `ARCHITECTURE.md`
  - **Section**: "🗂️ File Structuur & Belangrijke Locaties" → "app.js" → "Utility Functions"
  - **Add**:
    ```
    - `formatDisplayDate()` - regel ~14680 - Centrale datum formatting DD/MM/YYYY
    - Used by: 25+ UI locaties voor consistente datum weergave
    - Future: User preference extensibility (FR-011)
    ```
  - **Success**: ARCHITECTURE.md updated met nieuwe functie
  - **Test**: Grep ARCHITECTURE.md voor "formatDisplayDate"

- [X] **T021** [P] Update changelog met versie bump en feature beschrijving
  - **File**: `public/changelog.html`
  - **Version**: Increment patch version (bijv. 0.19.128 → 0.19.129)
  - **Entry**:
    ```html
    <div class="changelog-entry">
        <div class="version-header">
            <span class="badge badge-latest">v0.19.129</span>
            <span class="date">22 oktober 2025</span>
        </div>
        <h3>🎯 Datumformaat Standaardisatie</h3>
        <ul>
            <li><strong>Consistente datums:</strong> Alle datums in de applicatie tonen nu DD/MM/YYYY formaat</li>
            <li><strong>Verbeterde leesbaarheid:</strong> Nederlands datumformaat met leading zeros (01/01/2025)</li>
            <li><strong>Toekomstbestendig:</strong> Centrale formatting functie voor toekomstige user preferences</li>
        </ul>
    </div>
    ```
  - **Success**: Changelog entry exists with correct version
  - **Test**: Open changelog.html in browser, verify entry visible

---

## Dependencies

**Dependency Graph**:
```
T001 (verify) → T002 (RED tests) → T003 (implement) → T004 (GREEN tests) → Refactoring
                                                                               ↓
                                          [T005, T006, T007, T008, T009, T010, T012, T013, T014, T016 - PARALLEL]
                                                                               ↓
                                                              T011 (kalender header - uses planning context)
                                                                               ↓
                                                              T015 (floating panel verify)
                                                                               ↓
                                                    [T017, T019, T020, T021 - PARALLEL]
                                                                               ↓
                                                              T018 (manual validation - FINAL)
```

**Critical Path**:
1. Tests (T001-T004) MUST complete first (TDD)
2. Refactoring tasks (T005-T016) after implementation
3. Validation (T017-T021) after all refactoring complete

**Blocking Dependencies**:
- T003 blocks ALL refactoring tasks (centrale functie moet bestaan)
- T011 blocked by T005-T010 (requires planning context setup)
- T015 blocked by T011 (floating panel uses planning data)
- T018 blocked by T017-T021 (manual test is FINAL validation)

---

## Parallel Execution Examples

### Parallel Group 1: Refactoring (Different Code Sections)
```bash
# Launch T005-T010, T012-T014, T016 together (11 tasks parallel):
# Different UI contexts, no overlapping code sections
Task(description="Refactor Acties lijst", ...)
Task(description="Refactor Afgewerkt sectie", ...)
Task(description="Refactor Datum badges", ...)
Task(description="Refactor Context menu", ...)
Task(description="Refactor Recurring toasts", ...)
Task(description="Refactor Planning toast", ...)
Task(description="Refactor Planning expandable", ...)
Task(description="Refactor Planning sidebar", ...)
Task(description="Refactor Context Management", ...)
Task(description="Refactor Floating panel toast", ...)
```

### Parallel Group 2: Documentation (Different Files)
```bash
# Launch T020-T021 together:
Task(description="Update ARCHITECTURE.md", ...)
Task(description="Update changelog.html", ...)
```

---

## Notes

**Implementation Strategy**:
- ✅ TDD workflow: RED (T002) → GREEN (T003-T004) → REFACTOR (T005-T016)
- ✅ [P] tasks = different code sections in app.js (safe parallel editing)
- ✅ Sequential tasks share context (T011 uses planning setup from T005-T010)
- ✅ Verification tasks (T015, T019) ensure completeness

**BÈTA FREEZE Compliance**:
- ⚠️ This is a **staging-only** feature during bèta freeze
- Deploy to dev.tickedify.com for testing (T017, T018)
- Do NOT merge to main / deploy to production until freeze lifted
- See CLAUDE.md BÈTA FREEZE section for deployment rules

**Performance Considerations**:
- Intl.DateTimeFormat caching reduces overhead (<0.5ms per call)
- 100 tasks × 0.5ms = 50ms total formatting time (negligible)
- No performance optimizations needed (research.md Q4)

**Future Extensibility** (NOT in this task list):
- User preference support requires only T003 function modification
- Database schema change (users.date_format_preference)
- Settings UI page (separate feature)

---

## Task Generation Rules Applied

1. **From Contracts**: ✓
   - format-display-date.test.js → T002 (verify RED), T003 (implement), T004 (verify GREEN)

2. **From Data Model**: ✓
   - DisplayDate entity → T003 (central function implementation)
   - 25+ UI locations → T005-T016 (refactoring tasks)

3. **From User Stories** (quickstart.md): ✓
   - 9 scenarios → T018 (manual validation covers all)
   - Visual regression → T017 (automated validation)

4. **Ordering**: ✓
   - Setup (T001) → Tests (T002-T004) → Refactoring (T005-T016) → Validation (T017-T019) → Docs (T020-T021)

---

## Validation Checklist

*GATE: Verified before task list finalization*

- [x] All contracts have corresponding tests (T002, T004)
- [x] DisplayDate entity has implementation task (T003)
- [x] All tests come before implementation (T002 before T003)
- [x] Parallel tasks truly independent (different code sections verified)
- [x] Each task specifies exact file path and regel numbers
- [x] No task modifies same code section as another [P] task
- [x] All 25+ UI locations covered in refactoring tasks
- [x] Quickstart scenarios mapped to validation tasks
- [x] TDD checkpoints enforce RED → GREEN → REFACTOR flow

---

**Tasks Status**: ✅ READY FOR EXECUTION (21 tasks, dependency-ordered, TDD-compliant)
