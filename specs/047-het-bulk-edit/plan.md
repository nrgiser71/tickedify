
# Implementation Plan: Translate Bulk Edit Properties Screen to English

**Branch**: `047-het-bulk-edit` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/047-het-bulk-edit/spec.md`

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
This feature translates the bulk edit properties modal from Dutch to English. The bulk edit screen allows users to select multiple tasks and edit their properties simultaneously. All UI elements (labels, buttons, placeholders, dropdown options, success/error messages) need to be translated while maintaining consistency with the rest of the English application interface. This is a pure UI translation task with no backend or data model changes required.

## Technical Context
**Language/Version**: JavaScript ES6+ (Vanilla JavaScript, no frameworks)
**Primary Dependencies**: None (frontend-only translation task)
**Storage**: N/A (no data storage changes)
**Testing**: Manual UI testing via browser, Playwright for automated testing
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend-only for this feature)
**Performance Goals**: N/A (translation does not impact performance)
**Constraints**: Text must fit within existing UI layout, maintain visual consistency
**Scale/Scope**: ~30-50 text strings in bulk edit modal (labels, buttons, messages, placeholders)

**Additional Context from User**: (en niet /constitution) - Ensuring we follow correct workflow without constitutional changes.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Beta Freeze - Production Stability ✅ PASS
- **Status**: COMPLIANT
- **Rationale**: This is a UI translation task that will be developed on feature branch `047-het-bulk-edit`, merged to `staging` branch, and tested on dev.tickedify.com. No direct changes to `main` branch or production deployment during beta freeze. All testing will occur on staging environment first.

### II. Staging-First Deployment ✅ PASS
- **Status**: COMPLIANT
- **Rationale**: Feature will be merged to `staging` branch, automatically deployed to dev.tickedify.com via Vercel, and tested there before any production consideration. This follows the mandatory staging-first workflow.

### III. Gespecialiseerde Sub-Agents ✅ PASS
- **Status**: COMPLIANT
- **Rationale**: For implementation, will use **tickedify-feature-builder** for UI translation implementation. For testing, will use **tickedify-testing** for browser automation and visual verification. This is appropriate for a UI translation feature.

### IV. Versioning & Changelog Discipline ✅ PASS
- **Status**: COMPLIANT
- **Rationale**: Will increment package.json version (patch level) and update public/changelog.html with translation completion entry in same commit. Changelog will use appropriate emoji category (🎯 improvement for translation).

### V. Deployment Verification Workflow ✅ PASS
- **Status**: COMPLIANT
- **Rationale**: After staging deployment, will verify via `/api/version` endpoint using `curl -s -L -k` flags, checking every 15 seconds until version matches or 2-minute timeout. No long sleep commands will be used.

### VI. Test-First via API ⚠️ ADAPTED
- **Status**: COMPLIANT (Adapted for UI-only feature)
- **Rationale**: This is a pure UI translation feature with no business logic or API changes. Testing MUST be done via browser/Playwright to verify visual correctness of translated text. No API endpoints are involved in this translation task. This is an acceptable exception to the API-first testing principle per constitution: "UI testing alleen voor UI-specifieke features".

**Initial Gate Status**: ✅ ALL CHECKS PASSED - Proceeding to Phase 0

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

**Structure Decision**: Option 2 (Web application) - Tickedify has `public/` for frontend and `server.js` for backend. This is a frontend-only translation feature affecting `public/index.html` and `public/app.js`.

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
This is a pure UI translation feature with no backend changes, so task generation will follow a simplified approach:

1. **Translation Tasks** (from ui-translation.contract.md):
   - HTML translation task (index.html)
   - JavaScript translation task (app.js)

2. **Verification Tasks** (from quickstart.md):
   - Manual UI verification task
   - Playwright automated test task (optional)

3. **Deployment Tasks** (from constitution):
   - Version bump and changelog update
   - Staging deployment and verification
   - Git commit and push to staging branch

**Ordering Strategy**:
1. HTML translation (index.html) [P]
2. JavaScript translation (app.js) [P]
3. Version bump and changelog update
4. Git commit and push to staging
5. Deployment verification
6. Manual UI testing (quickstart.md)
7. Playwright automated testing (optional)

**Estimated Output**: 7 numbered, ordered tasks in tasks.md

**Key Differences from Standard Approach**:
- No data model tasks (N/A for UI translation)
- No API contract tasks (no backend changes)
- No integration tests (pure frontend)
- Simplified to translation → deploy → verify workflow

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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete (/implement command)
- [x] Phase 5: Validation passed (manual UI verification)

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no deviations)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
