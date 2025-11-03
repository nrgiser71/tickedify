
# Implementation Plan: Filter Persistentie Fix voor Herhalende Taken

**Branch**: `052-daarstraks-hebben-we` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/052-daarstraks-hebben-we/spec.md`

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
Fix filter persistentie voor herhalende taken in dagelijkse planning scherm. De huidige fix (Feature 050) werkt correct voor normale taken, maar bij herhalende taken wordt de filter state vergeten wanneer een taak wordt afgevinkt en een nieuwe instantie wordt aangemaakt. De fix voegt een `filterPlanningActies()` call toe na het render proces specifiek voor de herhalende taken flow.

## Technical Context
**Language/Version**: JavaScript (Vanilla ES6+), Node.js 18+
**Primary Dependencies**: Express.js (backend), PostgreSQL via Neon (database), Vercel (hosting)
**Storage**: PostgreSQL database (taken table with herhaling_actief, herhaling_type fields)
**Testing**: Playwright browser automation (via tickedify-testing sub-agent), manual testing on dev.tickedify.com
**Target Platform**: Web application (responsive design, desktop/tablet/mobile)
**Project Type**: Web (frontend: public/app.js, backend: server.js)
**Performance Goals**: Instant UI response (<50ms), filter state preservation across async operations
**Constraints**: No filter state loss during herhalende taak completion flow, consistent with Feature 050 fix pattern
**Scale/Scope**: Single function modification in app.js (~10,762 lines), minimal change impact

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Beta Freeze Compliance**: ✅ PASS
- Dit is een bug fix, geen nieuwe feature deployment naar productie
- Development gebeurt op feature branch `052-daarstraks-hebben-we`
- Testing gebeurt op staging (dev.tickedify.com)
- GEEN merge naar main gepland tijdens bèta freeze

**Staging-First Deployment**: ✅ PASS
- Feature branch wordt gemerged naar staging
- Testing op dev.tickedify.com via Vercel deployment
- Deployment verificatie via `/api/version` endpoint
- Playwright testing via tickedify-testing sub-agent

**Gespecialiseerde Sub-Agents**: ✅ PASS
- tickedify-testing agent voor browser automation testing
- Testing van filter persistentie via Playwright scenarios
- Verificatie van herhalende taken flow

**Versioning & Changelog**: ✅ PASS
- Package.json version bump (patch level: 0.21.x → 0.21.x+1)
- Changelog update met 🔧 fix category
- Changelog entry beschrijft filter persistentie fix

**Deployment Verification**: ✅ PASS
- Curl met `-s -L -k` flags voor API testing
- 15-seconden intervallen voor version check
- Pre-computed date variables (geen command substitution)

**Test-First via API**: ✅ PASS (met nuance)
- Dit is een UI filter state issue, vereist browser testing
- Playwright browser automation voor UI verificatie
- API calls kunnen filter state niet testen (pure frontend state)
- Testing strategie: Playwright scenarios voor filter persistentie

**Conclusion**: Alle constitution checks PASS. Geen complexity deviations vereist.

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

**Structure Decision**: Option 2 (Web application) - Tickedify has frontend (public/) and backend (server.js) structure. Dit is een frontend-only fix in public/app.js.

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

**Research Questions Addressed**:
1. ✅ Waar wordt de filter vergeten bij herhalende taken?
   - **Answer**: Regel 10762-10763 in completePlanningTask() - dead code call
2. ✅ Waar is de eerdere filter fix (Feature 050) toegepast?
   - **Answer**: Regel 10781-10782, alleen voor tweede render flow
3. ✅ Zijn er andere plekken waar herhalende taken worden afgevinkt?
   - **Answer**: 3 plekken, alleen completePlanningTask() heeft probleem
4. ✅ Wat is de correcte timing voor filter call?
   - **Answer**: Filter call na render, maar dead code moet verwijderd worden
5. ✅ Moet renderPlanningActies() call verwijderd worden?
   - **Answer**: JA - functie bestaat niet, is no-op

**Key Findings**:
- Dead code geïdentificeerd: regel 10762-10763 `renderPlanningActies()` bestaat niet
- Fix is simpeler dan gedacht: verwijder dead code, bestaande filter call op 10782 werkt
- Geen nieuwe code nodig, alleen code cleanup
- Performance verbetering: 1 render ipv 2

**Output**: research.md created with all findings documented

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

**Artifacts Created**:

1. ✅ **data-model.md**:
   - No database entities (pure frontend state fix)
   - Filter State runtime model documented
   - State lifecycle diagrams (before/after fix)
   - Performance considerations documented

2. ✅ **contracts/README.md**:
   - No API contracts needed (pure frontend fix)
   - Documented existing API endpoints (unchanged)
   - No contract tests (no API changes)

3. ✅ **quickstart.md**:
   - 7 comprehensive test scenarios
   - Playwright automation guidance
   - Manual testing checklist
   - Rollback plan
   - Success criteria defined

4. ✅ **CLAUDE.md update**:
   - Executed `.specify/scripts/bash/update-agent-context.sh claude`
   - Added language: JavaScript (Vanilla ES6+), Node.js 18+
   - Added framework: Express.js, PostgreSQL, Vercel
   - Added database context: taken table with herhaling fields
   - Agent context file updated successfully

**Design Decisions**:
- **Fix Approach**: Dead code removal (simplest solution)
- **Testing Strategy**: Playwright browser automation + manual testing
- **No API Changes**: Frontend-only state management fix
- **No Data Model Changes**: Runtime state only, no persistence

**Output**: All Phase 1 artifacts created and documented

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from research.md findings (dead code removal approach)
- No contract tests needed (pure frontend fix, no API changes)
- No model creation needed (no data model changes)
- Browser automation tests from quickstart.md scenarios (7 test scenarios)

**Task Categories**:
1. **Code Analysis**: Verify dead code identification (regel 10762-10763)
2. **Implementation**: Remove dead code from completePlanningTask()
3. **Version Bump**: Update package.json version
4. **Changelog**: Add fix entry to changelog.html
5. **Playwright Tests**: Automate 7 test scenarios from quickstart.md
6. **Manual Testing**: Execute quickstart.md scenarios on dev.tickedify.com
7. **Deployment**: Merge to staging, verify deployment
8. **Validation**: User acceptance testing

**Ordering Strategy**:
- Sequential (not parallel) due to single file modification (app.js)
- Order: Analysis → Implementation → Tests → Deployment → Validation
- Testing tasks can be parallel (manual + Playwright simultaneously)

**Estimated Output**: 8-10 numbered, sequential tasks in tasks.md

**Special Considerations**:
- Very small fix (2 lines dead code removal)
- Focus on thorough testing over complex implementation
- Playwright automation recommended for regression prevention
- Constitution compliance: staging-first, version bump, changelog

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/README.md, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - approach described below)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 10 numbered tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - geen deviations)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
