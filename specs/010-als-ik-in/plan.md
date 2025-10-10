# Implementation Plan: Ctrl-toets uitbreiding voor extra week in drag popup

**Branch**: `010-als-ik-in` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-als-ik-in/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Spec loaded and analyzed
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ No NEEDS CLARIFICATION - pure UI/UX feature
   → Project Type: web (Tickedify single page app)
   → Structure Decision: Existing codebase (public/app.js + index.html + style.css)
3. Fill the Constitution Check section
   → Constitution is placeholder template - skipping formal gates
   → Feature is simple UI enhancement - no constitutional concerns
4. Evaluate Constitution Check section
   → ✅ No violations - pure additive UI feature
5. Execute Phase 0 → research.md
   → ✅ Technical approach researched and documented
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → ✅ No API contracts needed - pure frontend feature
   → ✅ No data model changes - no database modifications
   → ✅ Quickstart scenario documented for manual testing
7. Re-evaluate Constitution Check section
   → ✅ Design complete - no new violations
8. Plan Phase 2 → Task generation approach described
9. ✅ STOP - Ready for /tasks command
```

## Summary

Deze feature voegt dynamische week uitbreiding toe aan de drag popup in het acties scherm. Wanneer een gebruiker een actie sleept, verschijnt een floating panel met 2 weken (huidige + volgende week, 14 dagen). Door de Ctrl-toets ingedrukt te houden verschijnt een derde week (7 extra dagen), wat de gebruiker toegang geeft tot 21 dagen planning zonder extra navigatie.

**Technische Kern**: Keydown/keyup event listeners tijdens drag operatie + dynamische DOM manipulatie van een derde week container die wordt toegevoegd/verwijderd op basis van Ctrl-toets status.

## Technical Context

**Language/Version**: JavaScript ES6 (vanilla, geen framework)
**Primary Dependencies**: Geen externe dependencies - native DOM APIs
**Storage**: N/A (geen database wijzigingen)
**Testing**: Handmatige testing via Playwright browser automation
**Target Platform**: Moderne browsers (Chrome, Firefox, Safari, Edge) op desktop (Windows/Mac)
**Project Type**: Web (single page application - bestaande Tickedify codebase)
**Performance Goals**: Real-time responsiviteit (<50ms tussen Ctrl event en UI update)
**Constraints**:
- Mag bestaande drag & drop functionaliteit niet verstoren
- Smooth UX - geen flickers of layout jumps bij toggle
- Backward compatibility met bestaande week 1 en week 2 logica
**Scale/Scope**: UI enhancement - geen impact op backend of database

**Existing Code Locations** (from ARCHITECTURE.md analysis):
- `public/app.js` regel 11033-11104: `generateActiesWeekDays()` - Genereert week dagen voor drag popup
- `public/index.html`: `#actiesFloatingPanel` container met `#actiesHuidigeWeek` en `#actiesVolgendeWeek`
- `public/style.css`: Styling voor `.week-day-zone`, `.drop-zone-item`, floating panel layout

## Constitution Check

**Status**: ✅ PASS - No constitutional constraints applicable

Dit is een pure frontend UI enhancement zonder:
- Database schema wijzigingen
- API contract changes
- Nieuwe dependencies
- Breaking changes in bestaande functionaliteit
- Security of privacy implications

De feature is volledig backward compatible en additive.

## Project Structure

### Documentation (this feature)
```
specs/010-als-ik-in/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
public/
├── app.js              # Wijzigingen in generateActiesWeekDays() en keyboard event handlers
├── index.html          # Nieuwe div container voor derde week
└── style.css           # Styling voor derde week container + responsive layout

ARCHITECTURE.md         # Update met nieuwe functie locaties en regelnummers
CLAUDE.md               # Update met feature beschrijving (indien relevant)
```

**Structure Decision**: Bestaande web application structuur - alle wijzigingen in `public/` directory

## Phase 0: Outline & Research

**Research Topics Investigated**:
1. ✅ Bestaande drag & drop implementatie in Tickedify acties scherm
2. ✅ Keyboard event handling tijdens drag operaties
3. ✅ DOM manipulatie patterns voor dynamische week containers
4. ✅ CSS layout strategie voor 2-week vs 3-week view transitions

**Output**: ✅ research.md created with technical decisions and implementation approach

## Phase 1: Design & Contracts

**Data Model**: N/A - Geen database wijzigingen nodig

**API Contracts**: N/A - Pure frontend feature, geen backend API calls

**UI Contracts** (internal component interface):
- **Keyboard Event Handler**: Detecteert Ctrl key status tijdens drag operatie
- **Week Generator**: Genereert derde week DOM elementen met correcte datums
- **Layout Manager**: Toggle visibility van derde week container zonder layout glitches

**Quickstart Scenario**: ✅ Documented in quickstart.md met handmatige teststappen

**Agent File Update**: Niet nodig - feature is eenmalige UI enhancement zonder complexe patterns

**Output**: ✅ quickstart.md created, no contracts/ directory (pure frontend), no data-model.md (no data changes)

## Phase 2: Task Planning Approach

**Task Generation Strategy** (voor /tasks command):

De /tasks command zal tasks.md genereren volgens deze strategie:

1. **Prep Tasks** (dependency ordering):
   - Research bestaande keyboard event handlers in app.js
   - Identificeer CSS selectors en layout structuur van floating panel
   - Review generateActiesWeekDays() functie structuur

2. **Implementation Tasks** (TDD waar mogelijk):
   - Voeg derde week container toe in HTML (`#actiesDerdeWeek`)
   - Implementeer keyboard event listeners (keydown/keyup voor Ctrl)
   - Extend generateActiesWeekDays() voor derde week generatie
   - Implement toggleDerdeWeek() functie voor show/hide logica
   - CSS styling voor 3-week layout met smooth transitions
   - Integreer keyboard handlers met drag lifecycle events
   - Update ARCHITECTURE.md met nieuwe functie locaties

3. **Testing Tasks**:
   - Handmatige test: Basic Ctrl toggle tijdens drag (quickstart scenario 1)
   - Handmatige test: Meerdere Ctrl toggles tijdens één drag (edge case)
   - Handmatige test: Drop op derde week datum (functional requirement FR-005)
   - Handmatige test: Backward compatibility zonder Ctrl (FR-008)
   - Playwright automated test: Complete workflow end-to-end

4. **Documentation Tasks**:
   - Update changelog met v0.16.35 feature beschrijving
   - Version bump in package.json
   - Git commit + push naar feature branch
   - Staging deployment test op dev.tickedify.com

**Ordering Strategy**:
- HTML eerst (structural foundation)
- JavaScript functies (business logic)
- CSS laatste (visual polish)
- Testing parallel waar mogelijk [P]
- Documentation en deployment sequentieel na implementatie

**Estimated Output**: 15-18 geordende, genummerde tasks in tasks.md

**IMPORTANT**: Deze fase wordt uitgevoerd door de /tasks command, NIET door /plan

## Phase 3+: Future Implementation

**Phase 3**: Task execution (implementatie van T001-T011)
**Phase 4**: Productie deployment naar tickedify.com via Vercel
**Phase 5**: Productie testing (T012-T016) - geen gebruikers actief, veilig om direct te testen

## Complexity Tracking

**Status**: ✅ No complexity violations

Dit is een straightforward UI enhancement zonder architecturale complexiteit.

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [x] Phase 4: Implementation complete ✅
- [x] Phase 5: Validation passed ✅

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented: N/A ✅
- [x] Production deployment: v0.17.0 LIVE ✅

---

## ✅ FEATURE 010 COMPLEET - v0.17.0

**Final Implementation**: Shift-toets uitbreiding voor derde week in acties planning popup

**What Was Built**:
- HTML structure: `#actiesDerdeWeekSection` met dynamische dag zones (index.html:894-899)
- JavaScript: `generateActiesWeekDays()` genereert 3 weken (app.js:11044)
- Toggle functie: `toggleDerdeWeek(show)` met CSS transitions (app.js:11147)
- Shift detectie: via `event.shiftKey` in dragover handlers (app.js:11221-11227)
- CSS: Smooth max-height + opacity transitions (style.css:8853-8866)

**Key Learnings**:
1. Keyboard events (keydown/keyup) worden NIET gefired tijdens HTML5 drag operaties
2. Ctrl-toets conflicteert met browser native drag & drop (copy/move switching)
3. Oplossing: Shift-toets via dragover events werkt perfect
4. dragover events worden continu gefired tijdens drag, ideaal voor real-time UI updates

**Production Status**: LIVE op tickedify.com sinds v0.17.0 (10 oktober 2025)
