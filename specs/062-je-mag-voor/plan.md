
# Implementation Plan: Page Help Icons with Admin-Configurable Content

**Branch**: `062-je-mag-voor` | **Date**: 2025-11-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/062-je-mag-voor/spec.md`

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
Add help icons next to page titles (excluding CSV Import and Settings) that display markdown-formatted help content when clicked. Content is admin-configurable via new admin2.html section with default English content provided during implementation. Uses existing information message styling with scrollable popups.

## Technical Context
**Language/Version**: JavaScript (ES6+), Node.js (Express backend), HTML5/CSS3
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Marked.js (markdown rendering), existing admin2.html framework
**Storage**: PostgreSQL database table for page help content (page_id, content, modified_at, modified_by)
**Testing**: Playwright for browser testing, curl for API testing, manual admin interface testing
**Target Platform**: Web application (SPA), Vercel deployment, responsive design
**Project Type**: Web (frontend + backend)
**Performance Goals**: <100ms response time for help content retrieval, instant popup display
**Constraints**: Reuse existing information message UI patterns, maintain SPA architecture (no page reloads), English-only UI text
**Scale/Scope**: ~10-12 pages eligible for help icons, admin interface for 1 admin user, production users viewing help content

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅
- Development on feature branch `062-je-mag-voor`
- Will merge to `staging` branch for dev.tickedify.com testing
- NO merge to main until explicit "BÈTA FREEZE IS OPGEHEVEN" instruction
- All testing via staging environment

### Staging-First Deployment ✅
- Feature branch → staging merge workflow
- Testing on dev.tickedify.com before any production consideration
- Vercel auto-deployment on staging push

### Versioning & Changelog ✅
- Package.json version bump required with implementation
- Changelog entry in English (UI language policy)
- Emoji categories for feature type

### Testing Strategy ✅
- API testing via curl for backend endpoints
- Playwright for UI-specific help icon interaction
- Manual testing of admin interface
- Reuse existing information message patterns (no new complexity)

### Complexity Justification ✅
- Reuses existing information message UI (no new components)
- Single new database table (minimal schema change)
- Extends existing admin2.html patterns (no new admin framework)
- No new dependencies beyond markdown rendering library

**Initial Check**: ✅ PASS - No constitution violations

---

### Post-Design Constitution Check (After Phase 1)

**Architecture Review**:
- ✅ Single new database table (minimal schema impact)
- ✅ Three RESTful API endpoints (standard Express patterns)
- ✅ Reuses existing Marked.js library (no new dependencies)
- ✅ Admin2 follows existing sidebar menu pattern
- ✅ Main app reuses existing popup/modal patterns
- ✅ localStorage caching follows existing patterns

**Complexity Assessment**:
- ✅ No new frameworks or libraries (except Marked.js already in use)
- ✅ No architectural changes to existing codebase
- ✅ Extends existing patterns (admin2 screens, information messages)
- ✅ Simple data model (one table, no complex relationships)
- ✅ No breaking changes to existing features

**Performance Impact**:
- ✅ Minimal database load (11 fixed pages, infrequent writes)
- ✅ Client-side caching reduces API calls
- ✅ No impact on existing page load times
- ✅ Help icons don't block page rendering

**Security Review**:
- ✅ Admin-only write operations (existing auth middleware)
- ✅ Public read operations (help content is educational)
- ✅ No user-generated content (admin-only)
- ✅ SQL injection prevented via parameterized queries
- ✅ XSS risk minimal (markdown from trusted admin source)

**Final Check**: ✅ PASS - Design maintains simplicity, no violations

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

1. **Database Tasks**:
   - Create `page_help` table migration
   - Add database indexes

2. **Backend Tasks**:
   - Implement GET `/api/page-help/:pageId` endpoint with fallback logic
   - Implement PUT `/api/page-help/:pageId` endpoint (admin only)
   - Implement DELETE `/api/page-help/:pageId` endpoint (admin only)
   - Implement GET `/api/page-help` endpoint (list all, admin only)
   - Create default help content object with English text for 11 pages

3. **Frontend Tasks** (Main App):
   - Add help icon to page title template (reusable component)
   - Implement help popup modal with markdown rendering
   - Integrate Marked.js library (if not already available)
   - Add localStorage caching logic (24-hour TTL)
   - Add cache invalidation on content update
   - Connect help icons to all 11 eligible pages

4. **Frontend Tasks** (Admin2):
   - Add "Page Help" menu item to sidebar
   - Create page help admin screen (page selector + content editor)
   - Implement content editor with markdown preview
   - Add save/revert/delete functionality
   - Show custom vs. default content indicators

5. **Testing Tasks**:
   - API contract tests (GET/PUT/DELETE endpoints)
   - Integration tests (main app help icon interaction)
   - Admin interface tests (manual or Playwright)
   - Test all 10 quickstart scenarios

6. **Documentation Tasks**:
   - Write default English help content for all 11 pages
   - Update ARCHITECTURE.md with feature locations
   - Update changelog

**Ordering Strategy**:
- Database first (prerequisite for backend)
- Backend endpoints before frontend integration
- Main app UI before admin UI (end-user facing priority)
- Testing after implementation
- Documentation concurrent with implementation

**Task Dependencies**:
- Backend depends on database
- Frontend (main app) depends on backend API
- Frontend (admin) depends on backend API
- Testing depends on all implementation

**Parallel Execution Opportunities** [P]:
- Default content writing [P] (independent from code)
- Frontend main app + admin UI [P] (after backend complete)
- Different API endpoints [P] (independent implementations)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No complexity violations detected.**

This feature maintains simplicity by:
- Reusing existing patterns (admin2 screens, information messages, popup modals)
- Minimal database schema (single table, no complex relationships)
- Standard RESTful API design
- No new frameworks or architectural changes
- Client-side caching follows existing localStorage patterns

All design decisions align with constitution principles of simplicity and YAGNI.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 24 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
