
# Implementation Plan: Email Import Attachment Syntax Flexibility

**Branch**: `059-bij-het-importeren` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/059-bij-het-importeren/spec.md`

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
Make the `a:` attachment syntax in email-to-task import more flexible by allowing `a;` (without filename) when there is only one attachment. This enhancement improves user experience by removing the need to specify filenames for single-attachment emails while maintaining full backwards compatibility with the existing `a: filename;` syntax.

## Technical Context
**Language/Version**: Node.js (Express.js backend), Vanilla JavaScript (frontend)
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Mailgun (email receiving), Backblaze B2 (attachment storage)
**Storage**: PostgreSQL for task metadata, Backblaze B2 for email attachments
**Testing**: Direct API testing via curl, Vercel MCP tools for staging access
**Target Platform**: Vercel (serverless Node.js), dev.tickedify.com (staging), tickedify.com (production - frozen)
**Project Type**: Web (backend API + vanilla JS frontend)
**Performance Goals**: Email processing <5s, attachment parsing compatible with existing @t syntax performance
**Constraints**: MUST maintain 100% backwards compatibility with existing `a: filename;` syntax, staging-first deployment (bèta freeze active)
**Scale/Scope**: Single-user bèta testing, existing email import infrastructure (Feature 048), modify parseEmailToTask() function only

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze Compliance
- ✅ **PASS**: Feature targets `staging` branch only (dev.tickedify.com)
- ✅ **PASS**: No production deployment planned (bèta freeze respected)
- ✅ **PASS**: Main branch remains untouched

### Staging-First Deployment
- ✅ **PASS**: Feature branch merges to `staging` only
- ✅ **PASS**: Testing on dev.tickedify.com via Vercel
- ✅ **PASS**: No main branch interaction

### Versioning & Changelog
- ✅ **PASS**: Will increment package.json version (patch level)
- ✅ **PASS**: Will update public/changelog.html with 🎯 improvement category
- ✅ **PASS**: Single commit with version + changelog + feature code

### Test-First via API
- ✅ **PASS**: Email endpoint testing via Mailgun webhook simulation
- ✅ **PASS**: Direct API calls to `/api/email-webhook` for validation
- ✅ **PASS**: No UI changes required (backend-only feature)

### Complexity Justification
- ✅ **PASS**: No new complexity introduced
- ✅ **PASS**: Modifies existing parseEmailToTask() function only
- ✅ **PASS**: Follows established @t syntax patterns from Feature 048

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

**Structure Decision**: Option 2 (Web application) - Tickedify has separate backend (server.js) and frontend (public/*.html, public/*.js) structure. This feature modifies backend only (server.js parseEmailToTask function).

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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- This is a backend-only feature (no UI changes)
- Focus on function modifications in server.js

**Specific Tasks to Generate**:

1. **Function Modification Tasks**:
   - Task 1: Modify `parseAttachmentCode()` regex pattern to make filename optional
   - Task 2: Update `parseAttachmentCode()` return logic to handle null targetFilename
   - Task 3: Modify `findMatchingAttachment()` to return first file when searchTerm is null

2. **Testing Tasks** (based on quickstart.md scenarios):
   - Task 4: Test Scenario 1 - Single attachment with `a;`
   - Task 5: Test Scenario 2 - Multiple attachments with `a;`
   - Task 6: Test Scenario 3 - No attachments with `a;`
   - Task 7: Test Scenario 4 - Colon without filename
   - Task 8: Test Scenario 5 - Backwards compatibility verification
   - Task 9: Test Scenario 6 - Case insensitivity
   - Task 10: Test Scenario 7 - Combined with other @t codes

3. **Regression Testing Tasks**:
   - Task 11: Regression test existing `a: filename` syntax
   - Task 12: Regression test other @t codes unaffected

4. **Deployment Tasks**:
   - Task 13: Version bump in package.json
   - Task 14: Update public/changelog.html
   - Task 15: Commit changes to feature branch
   - Task 16: Merge to staging branch
   - Task 17: Verify staging deployment (dev.tickedify.com)
   - Task 18: Run all quickstart tests on staging

**Ordering Strategy**:
- Implementation first (Tasks 1-3) - sequential, modify same functions
- Testing second (Tasks 4-12) - can run in parallel after implementation
- Deployment last (Tasks 13-18) - sequential, deployment workflow

**Estimated Output**: ~18 numbered tasks in tasks.md

**Dependencies**:
- Tasks 1-3 must complete before testing tasks
- Tasks 4-12 require staging deployment
- Tasks 13-18 are sequential deployment steps

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected** - This feature introduces no new complexity:
- Modifies 2 existing functions only (~15 lines total)
- No new dependencies
- No database schema changes
- No new API endpoints
- Follows established @t syntax patterns from Feature 048

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 18 tasks created
- [x] Phase 4: Implementation complete (/implement command) - 8 core tasks completed
- [ ] Phase 5: Validation passed (manual user testing required)

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
