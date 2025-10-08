# Implementation Plan: Sidebar Tools Section Verwijderen

**Branch**: `009-in-de-side` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-in-de-side/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
   → Feature spec loaded successfully
2. Fill Technical Context ✓
   → No NEEDS CLARIFICATION detected in technical stack (simple frontend change)
   → Project Type: web (frontend HTML/CSS/JS + backend Express)
   → Structure Decision: Existing web application structure
3. Fill Constitution Check section ✓
   → Constitution is placeholder template - no violations to check
4. Evaluate Constitution Check section ✓
   → No violations exist - simple UI reorganization
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md ✓
   → Simple UI change, no unknowns - research minimal
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ✓
   → No API contracts needed (frontend-only change)
   → No data model changes (UI reorganization)
   → Quickstart describes manual testing steps
7. Re-evaluate Constitution Check section ✓
   → No new violations - design complete
   → Update Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Describe task generation approach ✓
9. STOP - Ready for /tasks command ✓
```

## Summary
Vereenvoudig sidebar navigatie door het openklapbaar "Tools" menu te verwijderen en alle menu items (Dagelijkse Planning, Contexten Beheer, CSV Import, Zoeken) direct zichtbaar te maken onder het "Afgewerkt" menu item. Voeg visuele spacing toe tussen "Afgewerkt" en "Dagelijkse Planning" voor betere visuele hiërarchie.

**Technische aanpak**: HTML structuur aanpassen (verwijder dropdown wrapper), CSS styling toevoegen voor extra spacing, JavaScript dropdown logica verwijderen.

## Technical Context
**Language/Version**: JavaScript (ES6+), HTML5, CSS3
**Primary Dependencies**: Vanilla JavaScript (geen frameworks), Font Awesome icons
**Storage**: N/A (geen database wijzigingen)
**Testing**: Handmatig browser testing (Chrome, Safari, Firefox)
**Target Platform**: Web browsers (desktop + mobile responsive)
**Project Type**: web (existing structure: public/index.html, public/style.css, public/app.js)
**Performance Goals**: N/A (statische UI wijziging)
**Constraints**: Behoud functionaliteit van alle menu items, responsive design moet blijven werken
**Scale/Scope**: Eén pagina wijziging (index.html), CSS updates, minimale JavaScript cleanup

**User Context**: Deployment moet automatisch naar productie zonder expliciete approval (zoals aangegeven in user input)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - Constitution file is placeholder template, geen specifieke projecteisen gedefinieerd.

**Rationale**:
- Geen architecturale principes gedefinieerd in constitution
- Feature is eenvoudige UI reorganisatie zonder architectuur impact
- Geen nieuwe dependencies, geen nieuwe patterns
- Bestaande code patterns worden gevolgd

## Project Structure

### Documentation (this feature)
```
specs/009-in-de-side/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

**Note**: `data-model.md` en `contracts/` niet nodig - geen data/API wijzigingen

### Source Code (repository root)
```
public/
├── index.html           # Sidebar HTML structuur wijziging
├── style.css            # Extra spacing CSS toevoegen
└── app.js               # Dropdown logic verwijderen

Existing structure - no new files needed
```

**Structure Decision**: Gebruik bestaande web application structuur. Geen nieuwe bestanden, alleen wijzigingen in bestaande frontend files.

## Phase 0: Outline & Research

**Research bevindingen**:

### 1. Huidige Implementatie Analyse
**Beslissing**: Dropdown implementatie gebruikt:
- HTML: `.sectie-header.dropdown-header` met `.dropdown-content` wrapper
- CSS: `.dropdown-header`, `.dropdown-arrow`, `.dropdown-content` styling
- JavaScript: Click handlers op `#tools-dropdown` element

**Items onder Tools** (regels 126-141 in index.html):
1. Dagelijkse Planning (`data-lijst="dagelijkse-planning"`)
2. Contexten Beheer (`data-tool="contextenbeheer"`)
3. CSV Import (`data-tool="csv-import"`)
4. Zoeken (`data-tool="zoeken"`)

**Positie**: Tools sectie bevindt zich tussen "Afgewerkt" (regel 114-116) en "Feedback & Support" (regel 146-158)

### 2. Spacing Strategie
**Beslissing**: Gebruik CSS margin-top op "Dagelijkse Planning" item
**Rationale**:
- Consistente spacing met andere sidebar secties
- Bestaande `.lijst-sectie` gebruikt al margin tussen secties
- Extra 20px margin-top op eerste item na "Afgewerkt" creëert visuele scheiding

**Alternatieven overwogen**:
- Spacer div element → afgewezen (onnodige DOM element)
- Padding op parent → afgewezen (minder flexibel)

### 3. JavaScript Cleanup
**Beslissing**: Verwijder Tools dropdown event listeners
**Locatie**: `app.js` bevat dropdown toggle logic
**Impact**: Minimaal - dropdown code is geïsoleerd per dropdown instance

### 4. Responsive Gedrag
**Bevinding**: Sidebar gebruikt bestaande responsive patterns
**Actie**: Geen wijzigingen nodig - flat items werken binnen bestaande mobile layout

**Output**: research.md met implementatie strategie

## Phase 1: Design & Contracts

### Data Model
**Conclusie**: Geen data model wijzigingen - puur frontend UI reorganisatie.

### API Contracts
**Conclusie**: Geen API wijzigingen nodig - alle menu items behouden bestaande functionaliteit.

### Quickstart Testing Scenario
**Manual test scenario** (beschreven in quickstart.md):

1. **Visuele verificatie**:
   - Open tickedify.com/app
   - Controleer dat "Tools" dropdown niet meer zichtbaar is
   - Controleer dat 4 items direct zichtbaar zijn onder "Afgewerkt"
   - Controleer extra ruimte tussen "Afgewerkt" en "Dagelijkse Planning"

2. **Functionaliteit verificatie**:
   - Klik "Dagelijkse Planning" → dagelijkse planning view opent
   - Klik "Contexten Beheer" → contexten beheer modal opent
   - Klik "CSV Import" → CSV import modal opent
   - Klik "Zoeken" → zoek functionaliteit activeert

3. **Responsive verificatie**:
   - Test op desktop (1920px)
   - Test op tablet (768px)
   - Test op mobile (375px)
   - Controleer sidebar scroll gedrag

**Agent Context Update**:
Run `.specify/scripts/bash/update-agent-context.sh claude` om CLAUDE.md bij te werken met nieuwe UI structuur info.

**Output**: quickstart.md met test scenario, CLAUDE.md update

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **HTML Restructuring** (index.html):
   - Remove Tools dropdown wrapper (regels 119-143)
   - Move 4 menu items to flat structure
   - Position directly after "Afgewerkt" item

2. **CSS Styling** (style.css):
   - Add spacing class/style for visual separation
   - Remove unused dropdown CSS if isolated
   - Ensure responsive breakpoints still work

3. **JavaScript Cleanup** (app.js):
   - Remove Tools dropdown event listeners
   - Remove dropdown toggle functions if Tools-specific
   - Keep other dropdown logic intact (if any)

4. **Testing Tasks**:
   - Manual browser testing per quickstart.md
   - Responsive testing (desktop/tablet/mobile)
   - Regression test: all menu items still functional

5. **Deployment Tasks**:
   - Version bump in package.json
   - Changelog update met feature beschrijving
   - Git commit en push naar develop
   - Automatische deployment naar productie (geen approval nodig per user input)
   - Deployment verificatie via /api/version endpoint

**Ordering Strategy**:
1. HTML wijzigingen (core structure first)
2. CSS wijzigingen (styling after structure)
3. JavaScript cleanup (behavior after UI)
4. Testing (verify changes work)
5. Deployment (push to production)

**Estimated Output**: 8-10 sequentieel geordende tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks following TDD where applicable)
**Phase 5**: Validation (manual testing per quickstart.md, deployment verification)

## Complexity Tracking
*No constitutional violations - section not needed*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete ✅
- [x] Phase 5: Validation passed ✅

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (one spec clarification about spacing - resolved to 20px)
- [x] Complexity deviations documented (none - simple UI change)

---
*Ready for /tasks command - implementation planning complete*
