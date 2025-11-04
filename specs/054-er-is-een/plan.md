
# Implementation Plan: Email Import Help - English Translation & Visual Styling

**Branch**: `054-er-is-een` | **Date**: 2025-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/054-er-is-een/spec.md`

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
Translate the existing Dutch email import help documentation (`public/email-import-help.md`) to English and enhance its visual presentation with styled markdown rendering. The current help file is comprehensive but rendered as plain text, making it difficult to scan and locate information. The solution will completely replace the Dutch version with an English translation while adding CSS-styled markdown rendering with syntax highlighting for code blocks and styled tables. This improves user experience without requiring any database changes or new API endpoints - only content translation and frontend presentation enhancement.

## Technical Context
**Language/Version**: Node.js (backend), Vanilla JavaScript (frontend), HTML/CSS
**Primary Dependencies**: Express.js (backend), Markdown renderer library (e.g., marked.js or markdown-it), CSS for styling
**Storage**: N/A (content-only change, markdown file in `public/` directory)
**Testing**: Manual testing on dev.tickedify.com/email-import-help, browser compatibility testing
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), responsive design for mobile and desktop
**Project Type**: Web (frontend content + backend route)
**Performance Goals**: Page load under 2 seconds, markdown parsing < 100ms
**Constraints**: Must follow Tickedify design system (colors, fonts, spacing), backwards compatible with existing `/email-import-help` route
**Scale/Scope**: Single help page (~450 lines of markdown), no database changes, no new API endpoints

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅ PASS
- ✅ No production deployment required - staging-first workflow
- ✅ Changes will be tested on dev.tickedify.com before any consideration
- ✅ No database modifications - content and presentation only
- ✅ No live data changes - help documentation is static content

### Staging-First Deployment ✅ PASS
- ✅ All changes will be merged to `staging` branch first
- ✅ Testing on dev.tickedify.com staging environment
- ✅ No direct main branch modifications
- ✅ Vercel automated deployment to staging

### Specialized Sub-Agents ✅ PASS
- ✅ Feature implementation can use tickedify-feature-builder if needed
- ✅ Testing can use tickedify-testing agent for browser compatibility
- ✅ No complex debugging anticipated (content translation + CSS)
- Note: This is primarily a content/styling change, sub-agent usage optional

### Versioning & Changelog Discipline ✅ PASS
- ✅ Version bump required in package.json (patch level)
- ✅ Changelog update with feature description
- ✅ Both included in same commit as implementation
- ✅ User-facing change documented for transparency

### Deployment Verification Workflow ✅ PASS
- ✅ Will use `/api/version` endpoint for deployment verification
- ✅ 15-second interval checks (not long sleeps)
- ✅ `curl -s -L -k` flags for all API testing
- ✅ Standard deployment verification protocol

### Test-First via API ⚠️ PARTIAL
- ⚠️ No API changes required - this is frontend/content only
- ✅ Testing will be primarily visual/browser-based
- ✅ Verify markdown rendering, CSS styling, responsive design
- Note: API-first testing not applicable for presentation layer changes

### Summary
**Overall Status**: ✅ PASS with notes
- No constitutional violations detected
- Appropriate for content/presentation enhancement
- Follows staging-first workflow and versioning discipline
- Test approach adapted for frontend-focused changes (visual verification vs API testing)

### Post-Phase 1 Re-evaluation ✅ PASS
After completing Phase 1 design (data-model.md, contracts, quickstart.md):
- ✅ No new constitutional violations introduced
- ✅ Design confirms no database changes (content-only)
- ✅ API contracts show simple static file serving (low complexity)
- ✅ Quickstart scenarios align with staging-first testing workflow
- ✅ No new dependencies beyond CDN-hosted libraries (marked.js, Prism.js)
- ✅ Performance goals achievable (<2s load time validated in design)
- ✅ Backwards compatibility maintained (redirect route)

**Final Assessment**: Design fully compliant with constitution. Ready for task generation.

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

**Structure Decision**: Option 2 (Web application) - Tickedify has backend/ and public/ directories for Express.js backend and frontend assets

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
- Focus on content creation, frontend rendering, and styling (no backend logic changes)
- Group tasks by artifact type: Content → HTML/CSS → Route updates → Testing

**Task Categories**:

1. **Content Translation** (T001-T003):
   - T001: Translate Dutch markdown to English (all sections)
   - T002: Verify code examples unchanged (syntax validation)
   - T003: Verify tables preserved (priority/defer codes)

2. **HTML Page Creation** (T004-T006):
   - T004: Create `email-import-help.html` with semantic structure
   - T005: Integrate marked.js via CDN
   - T006: Integrate Prism.js via CDN for syntax highlighting

3. **CSS Styling** (T007-T012):
   - T007: Create `email-import-help.css` base structure
   - T008: Style headings with Tickedify colors
   - T009: Style code blocks (background, border, syntax highlighting)
   - T010: Style tables (borders, alternating rows)
   - T011: Implement responsive breakpoints (mobile/tablet/desktop)
   - T012: Add accessibility features (focus indicators, contrast)

4. **Backend Route Updates** (T013-T015):
   - T013: Update server.js - Add `/email-import-help` HTML route
   - T014: Add `/api/email-import-help/content` markdown API route
   - T015: Add redirect from old `/api/email-import-help` route (backwards compat)

5. **Testing & Validation** (T016-T020):
   - T016: Manual test on dev.tickedify.com - HTML page loads
   - T017: Visual test - English translation complete
   - T018: Visual test - Syntax highlighting works
   - T019: Visual test - Responsive design (mobile/tablet/desktop)
   - T020: Performance test - Page load <2 seconds

6. **Documentation & Deployment** (T021-T023):
   - T021: Update package.json version (patch bump)
   - T022: Update changelog with feature description
   - T023: Deploy to staging and verify via `/api/version`

**Ordering Strategy**:
- **Sequential**: Content → HTML → CSS → Routes → Testing → Deployment
- **No parallel tasks**: Each phase depends on previous (content needed for HTML, HTML needed for CSS test, etc.)
- **No TDD approach**: This is content/styling work, not logic/API development
- **Manual testing**: Visual verification primary validation method

**Dependencies**:
- T001-T003 must complete before T004 (need English content for HTML)
- T004-T006 must complete before T007-T012 (need HTML structure for CSS)
- T007-T012 must complete before T013-T015 (need styling before route serving)
- T013-T015 must complete before T016-T020 (need routes for testing)
- T016-T020 must complete before T021-T023 (verify before version bump)

**Estimated Output**: 23 numbered, sequential tasks in tasks.md

**Special Considerations**:
- No database migrations (content-only feature)
- No API contract tests (static file serving)
- No unit tests (no business logic)
- Manual testing primary validation (visual/responsive design)
- CDN dependencies (marked.js, Prism.js) - no npm install

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
  - ✅ research.md created with 7 research areas
  - ✅ All technical decisions documented (marked.js, Prism.js, design system)
  - ✅ No NEEDS CLARIFICATION remaining
- [x] Phase 1: Design complete (/plan command)
  - ✅ data-model.md created (static content entity documented)
  - ✅ contracts/email-import-help-api.yml created (4 endpoints)
  - ✅ quickstart.md created (8 test scenarios)
  - ✅ CLAUDE.md updated with new tech stack
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
  - ✅ 6 task categories defined (23 tasks estimated)
  - ✅ Sequential ordering strategy documented
  - ✅ Dependencies mapped (Content → HTML → CSS → Routes → Testing → Deploy)
- [ ] Phase 3: Tasks generated (/tasks command) - **NEXT STEP**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
  - ✅ Beta freeze respected (staging-first)
  - ✅ No database changes (content-only)
  - ✅ Versioning discipline planned
- [x] Post-Design Constitution Check: PASS
  - ✅ No new violations introduced
  - ✅ Design confirms low complexity (static files)
  - ✅ Performance goals achievable (<2s load time)
- [x] All NEEDS CLARIFICATION resolved
  - ✅ Markdown renderer: marked.js
  - ✅ Syntax highlighting: Prism.js
  - ✅ Design system: Tickedify colors
  - ✅ Responsive: Mobile-first breakpoints
- [x] Complexity deviations documented
  - ✅ No deviations - simple content/styling feature

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
