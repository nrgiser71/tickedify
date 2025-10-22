# Implementation Plan: Datumformaat Standaardisatie naar DD/MM/YYYY

**Branch**: `024-overal-waar-datums` | **Date**: 2025-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-overal-waar-datums/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
   → Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✓
   → Project Type: web (frontend JavaScript + backend Node.js)
   → Structure Decision: Tickedify existing structure (public/ + server.js)
3. Fill the Constitution Check section ✓
   → Constitution is template - proceeding with best practices
4. Evaluate Constitution Check section ✓
   → No violations - simple refactoring naar centrale functie
5. Execute Phase 0 → research.md ✓
   → Research completed and documented
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ✓
   → Design artifacts generated
7. Re-evaluate Constitution Check ✓
   → Design aligns with simplicity principles
8. Plan Phase 2 → Task generation approach described ✓
9. STOP - Ready for /tasks command ✓
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 is executed by /tasks command.

## Summary

**Primary Requirement**: Standaardiseer alle datumweergaves in Tickedify naar consistent DD/MM/YYYY formaat voor verbeterde gebruikerservaring en toekomstige uitbreidbaarheid naar user preferences.

**Technical Approach**:
1. Creëer centrale `formatDisplayDate()` utility functie in Taakbeheer class
2. Refactor 25+ hardcoded `toLocaleDateString()` calls naar centrale functie
3. Implementeer DD/MM/YYYY als standaard formaat via nl-NL locale met expliciete format options
4. Behoud week dag afkortingen in floating panels (Engels, 2-letter)
5. Architectuur ondersteunt toekomstige user preference extensie (1 functie aanpassen vs 25+ locaties)

## Technical Context

**Language/Version**: JavaScript ES6+ (Browser-side), Node.js 18+ (Server-side)
**Primary Dependencies**:
- Frontend: Vanilla JavaScript (geen framework)
- Backend: Express.js, PostgreSQL (Neon)
- Browser APIs: Date, Intl.DateTimeFormat

**Storage**: N/A (pure display layer wijziging, geen database schema changes)
**Testing**:
- Manual browser testing
- Visual regression testing
- Playwright end-to-end tests (via tickedify-testing agent)

**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge - laatste 2 versies)
**Project Type**: web (Tickedify bestaande structuur: public/app.js + server.js)

**Performance Goals**:
- <5ms per datum formatting call (negligible impact)
- Geen merkbare UI lag bij lijstweergaves met 100+ taken
- Backward compatible met bestaande datum data (YYYY-MM-DD in database)

**Constraints**:
- Geen database wijzigingen toegestaan (pure UI refactoring)
- Week dag afkortingen moeten Engels blijven (UI compactheid)
- Moet werken op bestaande nl-NL locale support in browsers
- Backward compatible met bestaande datum parsing logica

**Scale/Scope**:
- 25+ code locaties in app.js te refactoren
- ~11,000+ regels app.js bestand (grote single file applicatie)
- Meerdere UI contexts: taken lijsten, dagelijkse planning, floating panels, toasts, context menu

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitutional Principles Applied**:
1. **Simplicity**: Centrale functie voorkomt code duplication (25+ → 1)
2. **Testability**: Isolated functie is makkelijk unit testbaar
3. **Maintainability**: Single source of truth voor datum formatting
4. **Extensibility**: Toekomstige user preferences vereisen 1 wijziging ipv 25+

**No Violations Detected**:
- Geen nieuwe libraries nodig (gebruik native Date API)
- Geen database schema changes (pure UI layer)
- Geen breaking changes (intern refactoring)
- TDD mogelijk via contract tests voor formatting functie

**Status**: ✅ PASS - Simple refactoring aligned with best practices

## Project Structure

### Documentation (this feature)
```
specs/024-overal-waar-datums/
├── spec.md              # Feature specification
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   └── format-display-date.test.js
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root - Tickedify existing structure)
```
public/
├── app.js               # Hoofdbestand (~11,000 regels) - REFACTOR TARGET
│   ├── class Taakbeheer # Hoofdklasse
│   │   └── formatDisplayDate() # NIEUWE centrale functie (toevoegen)
│   ├── Regel 2042       # Datum badge display (REFACTOR)
│   ├── Regel 2286       # Acties lijst verschijndatum (REFACTOR)
│   ├── Regel 2310       # Afgewerkte acties datum (REFACTOR)
│   ├── Regel 2398       # Recurring task toast (REFACTOR)
│   ├── Regels 3471, 3683, 3767 # Context menu datums (REFACTOR)
│   ├── Regel 4003       # Recurring completion toast (REFACTOR)
│   ├── Regel 4903       # Planning dag naam (REFACTOR - en-US!)
│   ├── Regel 7079       # Context aanmaak datum (REFACTOR - en-US!)
│   ├── Regel 7492       # Planning item expandable (REFACTOR)
│   ├── Regel 8328       # Dagelijkse Planning header (REFACTOR - en-US!)
│   ├── Regel 8370       # Actie verschijndatum (REFACTOR)
│   ├── Regel 8475       # Planning deadline (REFACTOR)
│   ├── Regels 11308-11414 # Floating Panel weeks (REFACTOR)
│   └── Regel 14668-14677 # Bestaande formatDate() (HERGEBRUIK/EXTEND)
└── style.css            # Geen wijzigingen nodig

server.js                # Geen wijzigingen nodig (backend ongewijzigd)
database.js              # Geen wijzigingen nodig (data layer ongewijzigd)
```

**Structure Decision**: Gebruik bestaande Tickedify architectuur (geen nieuwe bestanden nodig, pure refactoring van app.js)

## Phase 0: Outline & Research

### Research Questions Resolved

**Q1: Hoe moet DD/MM/YYYY exact geformatteerd worden met JavaScript Date API?**
- **Decision**: `toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })`
- **Rationale**:
  - Produceert format: "22-10-2025" (met streepjes, niet slashes!)
  - Voor slashes: custom formatter nodig: `dd/MM/yyyy` template
- **Implementation**: Gebruik `Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date).replace(/-/g, '/')`
- **Alternative Considered**: Manual string parsing → verworpen (error-prone, geen timezone support)

**Q2: Kunnen we bestaande formatDate() functie hergebruiken?**
- **Current Implementation** (regel 14668-14677):
  ```javascript
  formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: 'short',  // ← PROBLEEM: "jan", "feb" (kort formaat)
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      });
  }
  ```
- **Decision**: NIET hergebruiken, nieuwe functie maken
- **Rationale**:
  - Bestaande functie includeert tijd (hour, minute) → niet gewenst voor datum-only displays
  - Gebruikt `month: 'short'` → produceert "6 jan 2025" ipv "06/01/2025"
  - Mogelijk gebruikt voor specifieke contexten (bijlagen timestamps?)
- **Alternative**: Refactor bestaande functie → verworpen (te risicovol, mogelijk breaking changes)

**Q3: Hoe behouden we week dag afkortingen in floating panels?**
- **Current Implementation** (regel 11319):
  ```javascript
  const weekdagen = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  ```
- **Decision**: Niet wijzigen - blijft Engels
- **Rationale**:
  - Compacte UI design (2 letters)
  - Internationaal herkenbaar
  - Geen conflict met DD/MM/YYYY formaat (dag nummer apart weergegeven)
- **No action required** voor FR-010

**Q4: Wat is de impact op performance bij 100+ taken?**
- **Analysis**:
  - Date formatting per taak: ~0.1-0.5ms (Intl.DateTimeFormat caching)
  - 100 taken × 0.5ms = 50ms total (negligible)
  - Browser render time dominanter dan formatting
- **Decision**: Geen performance optimalisaties nodig
- **Rationale**: Modern browser Date API is geoptimaliseerd, caching via Intl.DateTimeFormat

**Q5: Hoe testen we visuele consistentie van datums?**
- **Decision**: 3-tier testing strategie:
  1. **Contract tests**: Unit tests voor `formatDisplayDate()` functie
  2. **Visual regression**: Screenshot comparison van lijsten met datums
  3. **Manual testing**: Gebruiker test in browser (tickedify.com/app)
- **Rationale**:
  - Contract tests vangen formatting bugs
  - Visual regression vangt UI rendering bugs
  - Manual testing valideert UX consistency
- **Tool**: Playwright voor automated visual testing (via tickedify-testing agent)

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts

### Data Model
*See: data-model.md*

**Core Entity**: `DisplayDate`
- **Input**: JavaScript Date object of ISO string (YYYY-MM-DD)
- **Output**: Formatted string "DD/MM/YYYY"
- **Validation**: Must be valid Date, no NaN handling
- **State**: Stateless pure function (no side effects)

**No Database Changes Required**: Pure UI transformation layer

### API Contracts
*See: contracts/format-display-date.test.js*

**Function Signature**:
```javascript
/**
 * Formats a date for display in DD/MM/YYYY format
 * @param {Date|string} dateInput - Date object or ISO string (YYYY-MM-DD)
 * @param {Object} options - Optional formatting options
 * @param {boolean} options.includeWeekday - Include weekday name (default: false)
 * @returns {string} Formatted date string "DD/MM/YYYY"
 */
formatDisplayDate(dateInput, options = {})
```

**Contract Test Scenarios**:
1. ✓ Valid ISO string → "22/10/2025"
2. ✓ Valid Date object → "22/10/2025"
3. ✓ Edge case: 01/01/2025 (leading zeros)
4. ✓ Edge case: 31/12/2099 (future date)
5. ✓ Invalid input → throw Error (fail fast)
6. ✓ Null/undefined → throw Error

### Quickstart Test
*See: quickstart.md*

**User Story Validation**:
1. Open tickedify.com/app
2. Navigate to Acties lijst
3. Verify all verschijndatums show "DD/MM/YYYY"
4. Open Dagelijkse Planning
5. Verify kalender header shows "DD/MM/YYYY"
6. Complete herhalende taak
7. Verify toast shows next occurrence in "DD/MM/YYYY"
8. Open Acties Floating Panel
9. Verify week days show dag nummer (consistent format)

**Expected Result**: ALL datums in application show DD/MM/YYYY format

### Agent Context Update
*IMPORTANT: Run exactly as specified*
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Output**: CLAUDE.md updated with:
- New formatDisplayDate() function location
- Recent change: Centralized date formatting voor DD/MM/YYYY
- Tech: Intl.DateTimeFormat API usage

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Contract Test Tasks** (TDD first):
   - Task 1: Write contract tests voor formatDisplayDate() [P]
   - Task 2: Verify tests fail (no implementation yet)

2. **Implementation Tasks**:
   - Task 3: Implement formatDisplayDate() in Taakbeheer class
   - Task 4: Verify contract tests pass

3. **Refactoring Tasks** (per UI context):
   - Task 5: Refactor Acties lijst datum displays (regels 2286, 2310) [P]
   - Task 6: Refactor Context menu datums (regels 3471, 3683, 3767) [P]
   - Task 7: Refactor Toast notifications (regels 2398, 4003, 10512) [P]
   - Task 8: Refactor Dagelijkse Planning header (regel 8328)
   - Task 9: Refactor Planning item details (regels 7492, 8370, 8475) [P]
   - Task 10: Refactor Context Management (regel 7079)
   - Task 11: Refactor Datum badges (regel 2042)
   - Task 12: Refactor Floating Panel weeks (regels 11308-11414)
   - Task 13: Refactor Planning dag naam (regel 4903)

4. **Testing Tasks**:
   - Task 14: Visual regression tests met Playwright
   - Task 15: Manual quickstart validation
   - Task 16: Code review - verify geen hardcoded formats remain

5. **Documentation Tasks**:
   - Task 17: Update ARCHITECTURE.md met nieuwe formatDisplayDate() locatie
   - Task 18: Update changelog met versie bump

**Ordering Strategy**:
- TDD order: Contract tests (1-2) → Implementation (3-4) → Refactoring (5-13) → Validation (14-16)
- [P] markers: Tasks 5-7, 9 kunnen parallel (verschillende code secties)
- Sequential: Task 8 na 5-7 (kalender header gebruikt planning data)
- Sequential: Task 12 na 11 (floating panel gebruikt badge logic)

**Dependency Graph**:
```
1,2 → 3 → 4 → [5,6,7,9 parallel] → 8 → 11 → 12 → 13 → 14,15,16 → 17,18
```

**Estimated Output**: 18 numbered, dependency-ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation
  - Run contract tests (must all pass)
  - Execute quickstart.md (manual browser testing)
  - Visual regression validation (Playwright screenshots)
  - Performance validation (100+ taken lijst render time <500ms)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No Violations** - This is a simple refactoring naar centrale utility functie. No complexity deviations.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command - NEXT STEP)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Implementation plan ready for /tasks command execution*
