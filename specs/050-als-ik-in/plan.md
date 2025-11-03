
# Implementation Plan: Filter Persistentie bij Taak Completion

**Branch**: `050-als-ik-in` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/050-als-ik-in/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Probleem**: Wanneer een gebruiker in het daily planning scherm een filter instelt op de acties lijst en vervolgens een taak afvinkt, wordt de filter state gereset. De filter UI blijft visueel wel actief (filter bar toont nog steeds de instellingen), maar de taken lijst toont weer alle taken in plaats van alleen de gefilterde taken.

**Root Cause**: In de `taakAfwerken()` functie (app.js:4096) wordt na het verwijderen van een taak uit de DOM geen `filterActies()` call gedaan om de filter opnieuw toe te passen. De DOM element removal logic (regels 4177-4189) verwijdert individuele taken, maar laat andere taken ongewijzigd - inclusief taken die door de filter verborgen zouden moeten zijn. Ook andere flows die `renderActiesLijst()` aanroepen (drag&drop, bulk mode toggle) hebben geen automatische filter re-application.

**Technische Aanpak**: Twee `this.filterActies()` calls toevoegen:
1. **Aan einde van `renderActiesLijst()`** (regel ~3951) - lost filter persistentie op voor alle flows die de lijst re-renderen (drag&drop naar uitgesteld/datum, bulk mode toggle, filter restoration)
2. **In `taakAfwerken()` na DOM removal** (regel ~4189) - lost filter persistentie op voor taak completion flow, die bewust geen volledige re-render doet (performance optimalisatie, zie comment regel 4235)

Beide calls zijn conditioneel (`if (this.huidigeLijst === 'acties')`) om onnodige filter operations te voorkomen op andere lijsten.

## Technical Context
**Language/Version**: Vanilla JavaScript (ES6+), Node.js backend
**Primary Dependencies**: Frontend: Vanilla JS (geen frameworks), Backend: Express.js + PostgreSQL (Neon)
**Storage**: PostgreSQL (Neon cloud database) voor taken data, geen database wijzigingen nodig
**Testing**: Playwright browser automation via tickedify-testing sub-agent, API testing via curl
**Target Platform**: Web application (Vercel deployment), responsive design (desktop, tablet, mobiel)
**Project Type**: Web (frontend + backend, maar deze fix is frontend-only)
**Performance Goals**: Instant filter re-application (<50ms), geen zichtbare lag na taak completion
**Constraints**: Geen full page refresh, scroll position preservation, geen filter UI reset
**Scale/Scope**: Single file change (app.js), 1-2 lines code toevoeging, backward compatible

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅
- **Status**: COMPLIANT
- **Rationale**: Deze fix wordt ontwikkeld op feature branch `050-als-ik-in`, getest op staging (dev.tickedify.com), en blijft op staging tot bèta freeze wordt opgeheven. Geen productie deployment tijdens freeze.

### Staging-First Deployment ✅
- **Status**: COMPLIANT
- **Rationale**: Feature branch → staging merge → dev.tickedify.com testing → wacht op freeze lift voor productie.

### Gespecialiseerde Sub-Agents ✅
- **Status**: COMPLIANT
- **Planning**: tickedify-bug-hunter voor debugging/implementation, tickedify-testing voor Playwright verification

### Versioning & Changelog Discipline ✅
- **Status**: COMPLIANT
- **Planning**: Version bump (patch) + changelog entry met 🔧 fix category in dezelfde commit

### Deployment Verification Workflow ✅
- **Status**: COMPLIANT
- **Planning**: Iterative `/api/version` checks (15s intervals) op dev.tickedify.com via Vercel MCP tools

### Test-First via API ✅
- **Status**: COMPLIANT with UI Testing Exception
- **Rationale**: Dit is een UI-specifieke bug (filter display state) die niet via API getest kan worden. Playwright browser automation is de juiste testing approach voor deze feature. Filter logic is client-side JavaScript, geen backend component.

### Conclusion
**All constitutional requirements PASS**. No complexity violations, no deviations requiring justification.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Tickedify heeft frontend (public/) en backend (server.js), maar deze fix is frontend-only (public/app.js wijziging).

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE - Geen research nodig

**Rationale**: Dit is een straightforward bugfix met duidelijke root cause:
- Bug locatie: `taakAfwerken()` functie, app.js:4096-4262
- Probleem: Ontbrekende `filterActies()` call na DOM manipulation
- Oplossing: Toevoegen `this.filterActies()` na removal logic (na regel ~4189)
- Geen unknowns, geen nieuwe dependencies, geen architectuur wijzigingen

**Technical Context Analysis**:
- ✅ Filter logic bestaat al (`filterActies()` method, regel 6867)
- ✅ Filter state wordt al bewaard (input field values blijven behouden)
- ✅ DOM manipulation pattern is consistent met bestaande code
- ✅ Scroll preservation pattern is al geïmplementeerd (geen refresh nodig)

**No research.md needed** - Dit is een 1-line bugfix met volledige codebase kennis.

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

**Status**: ✅ COMPLETE - Simplified for bugfix scope

### 1. Data Model
**Not applicable** - Geen database wijzigingen, geen nieuwe entities. Dit is een frontend UI state management fix.

### 2. API Contracts
**Not applicable** - Geen nieuwe API endpoints, geen wijzigingen aan bestaande endpoints. Filter logic is volledig client-side.

### 3. Contract Tests
**Not applicable** - Geen API wijzigingen betekent geen nieuwe contract tests nodig.

### 4. Test Scenarios (Quickstart)
Test scenarios worden gedocumenteerd in `quickstart.md` voor Playwright browser testing:
- Scenario 1: Filter instellen → taak afvinken → filter blijft actief
- Scenario 2: Meerdere filters → taak afvinken → alle filters blijven actief
- Scenario 3: Laatste gefilterde taak afvinken → lege lijst met filter actief
- Scenario 4: Meerdere taken achter elkaar afvinken → filter blijft persistent

### 5. Agent Context Update
Will run `.specify/scripts/bash/update-agent-context.sh claude` after writing quickstart.md

**Output**: quickstart.md (test scenarios), CLAUDE.md update (incrementeel)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
Dit is een eenvoudige bugfix, dus tasks worden gegenereerd vanuit:
- Quickstart.md test scenarios → Playwright test tasks
- Implementation task: Toevoegen `this.filterActies()` call in `taakAfwerken()`
- Verification task: Manual testing op staging
- Deployment tasks: Version bump, changelog, staging deployment

**Ordering Strategy**:
1. **Locate bug** - Bevestig exact waar `filterActies()` call ontbreekt [P]
2. **Implement fix** - Voeg `this.filterActies()` toe na DOM removal logic [P]
3. **Write Playwright test** - Scenario 1: Single filter + completion
4. **Write Playwright test** - Scenario 2: Multiple filters + completion
5. **Write Playwright test** - Scenario 3: Last task completion
6. **Write Playwright test** - Scenario 4: Sequential completions
7. **Version bump** - package.json patch increment
8. **Changelog update** - 🔧 fix entry
9. **Git commit** - Descriptive commit message
10. **Staging deployment** - Merge to staging, push, verify dev.tickedify.com
11. **Run Playwright tests** - All 4 scenarios via tickedify-testing agent
12. **Regression verification** - Check filter reset, bulk mode, lijst switches

**Estimated Output**: 12 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All constitutional requirements passed. No complexity deviations to document.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - No research needed for straightforward bugfix
- [x] Phase 1: Design complete (/plan command) - quickstart.md created, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - 12 tasks strategy defined
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 12 numbered tasks
- [ ] Phase 4: Implementation complete - READY FOR EXECUTION
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All 6 principles compliant
- [x] Post-Design Constitution Check: PASS - No new violations
- [x] All NEEDS CLARIFICATION resolved - No unknowns in Technical Context
- [x] Complexity deviations documented - No deviations

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
