
# Implementation Plan: Admin Message Display Debug & Validatie Verbetering

**Branch**: `031-ik-heb-in` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-ik-heb-in/spec.md`

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
Deze feature verbetert de admin messaging interface om te voorkomen dat berichten foutief worden aangemaakt zonder correcte gebruiker selectie. Het huidige probleem ontstond doordat een admin zocht op `info@baasoverjetijd.be` terwijl de bèta gebruiker `jan@buskens.be` als email heeft, waardoor het bericht met lege target_users werd opgeslagen en niet verscheen.

De oplossing omvat:
- Backend validatie om berichten zonder gebruiker selectie te blokkeren
- UX verbeteringen om geselecteerde gebruikers duidelijk te tonen (met emails)
- Preview functionaliteit om te verifiëren welke gebruikers een bericht ontvangen
- Waarschuwingen voor inactive berichten of toekomstige publish dates
- Verbeterde zoekfunctionaliteit voor gebruikers

## Technical Context
**Language/Version**: Node.js >=16.0.0, Vanilla JavaScript (ES6+)
**Primary Dependencies**: Express.js 4.18, PostgreSQL via pg 8.11, bcryptjs, express-session
**Storage**: PostgreSQL (Neon hosted) - tables: admin_messages, users, message_interactions
**Testing**: Manual testing op staging (dev.tickedify.com) en production (tickedify.com)
**Target Platform**: Web application - Vercel deployment, browser-based frontend
**Project Type**: Web (monolith: backend server.js + frontend public/*.html + public/js/*.js)
**Performance Goals**: <500ms API response time, realtime message polling elke 5 minuten
**Constraints**: Beta freeze actief - alleen staging deployment, geen production changes
**Scale/Scope**: ~10-20 bèta users, single admin interface (admin2.html), 15 functional requirements

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: No formal constitution file found (template only). Applying Tickedify-specific principles from CLAUDE.md:

### Tickedify Development Principles
- ✅ **Beta Freeze Compliance**: Feature ontwikkeling op develop branch, staging deployment only - COMPLIANT
- ✅ **Version Tracking**: Elke change vereist version bump in package.json - PLANNED
- ✅ **Changelog Maintenance**: Update changelog.html bij elke feature - PLANNED
- ✅ **Monolith Architecture**: Wijzigingen blijven binnen bestaande server.js + admin2.html structuur - COMPLIANT
- ✅ **No Breaking Changes**: Backwards compatible - alleen toevoegen van validatie en UX improvements - COMPLIANT
- ✅ **Manual Testing**: Staging testing door gebruiker na deployment - PLANNED

### Architecture Compliance
- ✅ Uses existing PostgreSQL tables (admin_messages, users, message_interactions)
- ✅ Extends existing API endpoints (POST /api/admin/messages validation)
- ✅ Enhances existing admin2.html interface (no new pages)
- ✅ Follows established patterns (Express middleware, vanilla JS frontend)

**GATE STATUS**: ✅ PASS - No constitutional violations, aligns with Tickedify development workflow

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

**Structure Decision**: [DEFAULT to Option 1 unless Technical Context indicates web/mobile app]

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

Deze feature heeft een pragmatische implementatie aanpak aangezien:
1. Database schema geen wijzigingen vereist (bestaande tables)
2. Bestaande API endpoints worden enhanced (niet nieuw)
3. Frontend wijzigingen zijn beperkt tot admin2.html (single file)
4. Geen automated tests (manual staging testing workflow)

**Taak Categorieën**:

1. **Backend Validation** (1 task):
   - Enhance POST /api/admin/messages met validation logic
   - Add 400 error responses met Nederlandse messages
   - Location: server.js:13243-13248

2. **Frontend UX Improvements** (3-4 tasks):
   - Display email addresses in user search results
   - Display email addresses in selected users list
   - Add warning badges voor inactive/future-publish
   - Update form submit button state based on validation

3. **Preview Functionality** (2 tasks, optional):
   - Client-side preview van selected users count
   - Display targeted users met emails voor verification

4. **Testing & Verification** (2 tasks):
   - Version bump en changelog update
   - Manual staging tests volgens quickstart.md scenarios

**Ordering Strategy**:
1. Backend validation (blocks invalid data) - FIRST, highest priority
2. Frontend email display (prevents user error) - SECOND
3. Warning badges (UX polish) - THIRD
4. Preview functionality (nice-to-have) - OPTIONAL
5. Testing & deployment - LAST

**Dependencies**:
- Backend validation is independent, can be done first
- Frontend tasks hebben geen dependencies op elkaar (parallel mogelijk)
- Testing vereist dat alle features zijn geïmplementeerd

**Estimated Output**: 7-9 focused implementation tasks in tasks.md

**Note**: Geen contract tests of TDD approach vanwege:
- Manual testing workflow (user tests op staging)
- No test framework setup in Tickedify
- Focus op rapid iteration met user feedback

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
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md generated
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (compliant met Tickedify workflow)
- [x] Post-Design Constitution Check: PASS (no schema changes, backwards compatible)
- [x] All NEEDS CLARIFICATION resolved (all technical context filled)
- [x] Complexity deviations documented (none - straightforward enhancement)

**Generated Artifacts**:
- ✅ `/specs/031-ik-heb-in/plan.md` (this file)
- ✅ `/specs/031-ik-heb-in/research.md` (root cause analysis + decisions)
- ✅ `/specs/031-ik-heb-in/data-model.md` (existing schema + validation rules)
- ✅ `/specs/031-ik-heb-in/contracts/api-validation.md` (enhanced API contract)
- ✅ `/specs/031-ik-heb-in/quickstart.md` (manual test scenarios)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
