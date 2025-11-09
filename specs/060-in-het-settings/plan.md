
# Implementation Plan: Password Reset Screen

**Branch**: `060-in-het-settings` | **Date**: 2025-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/060-in-het-settings/spec.md`

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
Create a dedicated password reset page at `/reset-password?token={token}` that allows users to set a new password after clicking the reset link in their email. The page must validate password strength (min 8 chars, uppercase, digit, special char), handle various token states (valid, expired, used, invalid), and provide clear user feedback throughout the process. Backend API endpoint already exists; this feature implements the missing frontend page.

## Technical Context
**Language/Version**: Node.js 18+ (backend), Vanilla JavaScript ES6+ (frontend), HTML5, CSS3
**Primary Dependencies**: Express.js (backend), bcrypt (password hashing), existing validatePasswordStrength() function
**Storage**: PostgreSQL (Neon) - uses existing password_reset_tokens table
**Testing**: Manual testing on dev.tickedify.com via Playwright browser automation
**Target Platform**: Web browsers (Chrome, Firefox, Safari) - responsive design
**Project Type**: Web application (frontend page + existing backend API)
**Performance Goals**: <2s page load, instant client-side validation feedback
**Constraints**: Token URL parameter required, 24h token expiry, single-use tokens, password validation must match registration flow
**Scale/Scope**: Single standalone HTML page, reuses existing API endpoint POST /api/account/password-reset/confirm

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze Compliance
- ✅ **PASS**: Development on feature branch `060-in-het-settings`
- ✅ **PASS**: Deployment target is staging (dev.tickedify.com) only
- ✅ **PASS**: No main branch modifications planned
- ✅ **PASS**: No production deployments (tickedify.com remains untouched)

### Staging-First Workflow
- ✅ **PASS**: Feature branch will merge to staging for testing
- ✅ **PASS**: Testing planned on dev.tickedify.com
- ✅ **PASS**: Vercel Authentication access via MCP tools available
- ✅ **PASS**: Main branch untouched during bèta freeze

### Specialized Sub-Agents
- ✅ **PASS**: tickedify-testing agent planned for browser automation testing
- ✅ **PASS**: Feature implementation follows standard workflow (no specialized build agent needed for simple HTML page)
- ℹ️ **NOTE**: Bug fixes during implementation will use tickedify-bug-hunter if needed

### Versioning & Changelog
- ✅ **PASS**: Version bump in package.json required before commit
- ✅ **PASS**: Changelog update required with feature description
- ✅ **PASS**: Format: ✨ Features category, English language, user-facing description

### Test-First via API
- ✅ **PASS**: Existing API endpoint POST /api/account/password-reset/confirm will be tested directly
- ✅ **PASS**: UI testing only for password reset page-specific functionality
- ✅ **PASS**: Token validation tested via API calls
- ✅ **PASS**: Password strength validation tested client-side and verified server-side

### Technical Stack Constraints
- ✅ **PASS**: Vanilla JavaScript (no frameworks)
- ✅ **PASS**: Express.js backend (existing)
- ✅ **PASS**: PostgreSQL via Neon (existing password_reset_tokens table)
- ✅ **PASS**: Responsive design principles applied

**Initial Constitution Check: PASS** ✅

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

**Structure Decision**: Web application - Tickedify uses custom structure:
- Backend: server.js (monolithic Express.js app)
- Frontend: public/ directory with HTML/CSS/JS files
- This feature adds: public/reset-password.html (standalone page)

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

**Output**: data-model.md, /contracts/*, quickstart.md, CLAUDE.md updated

**Status**: ✅ Completed
- ✅ data-model.md created (client-side state management)
- ✅ contracts/reset-password-api.yml created (OpenAPI spec)
- ✅ quickstart.md created (14 test scenarios)
- ✅ CLAUDE.md updated with feature context
- ℹ️ No failing tests created (API endpoint already exists and tested)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
The /tasks command will generate tasks based on the following approach:

1. **HTML Page Creation** (Foundation)
   - Create public/reset-password.html with semantic structure
   - Include meta tags, viewport, title
   - Basic HTML form structure (2 password inputs, submit button)

2. **CSS Styling** (Visual Design)
   - Create embedded or linked CSS matching Tickedify design
   - Responsive layout (mobile-first approach)
   - Form styling (inputs, buttons, error states, success states)
   - Loading states and animations
   - Password visibility toggle button styling

3. **JavaScript Client-Side Logic** (Core Functionality)
   - URL parameter extraction (token from query string)
   - Client-side password validation (4 rules + match check)
   - Real-time validation feedback (blur/input events)
   - Form submission handler (prevent default, async/await)
   - API integration (POST /api/account/password-reset/confirm)
   - Error handling (network, server errors, validation errors)
   - Success state management (lock form, show success message)
   - Password visibility toggle functionality

4. **Server-Side Integration** (Backend Routing)
   - Add Express.js route to serve reset-password.html
   - Ensure /reset-password route exists (GET endpoint)
   - Verify existing API endpoint /api/account/password-reset/confirm works

5. **Testing Tasks** (Quality Assurance)
   - Manual testing on dev.tickedify.com (all 14 quickstart scenarios)
   - Playwright automation for happy path
   - Playwright automation for error cases
   - Mobile responsive testing
   - Keyboard navigation testing
   - Browser compatibility testing (Chrome, Firefox, Safari)

6. **Documentation & Deployment**
   - Version bump in package.json
   - Changelog update (English, ✨ Features category)
   - Git commit with feature description
   - Push to staging branch
   - Deployment verification on dev.tickedify.com
   - Post-deployment regression testing

**Ordering Strategy**:
1. **Foundation First**: HTML structure → CSS styling → JavaScript logic
2. **TDD Approach**: Where applicable, write validation logic before full implementation
3. **Integration Last**: Server routing → Testing → Documentation
4. **Sequential Dependencies**: HTML must exist before CSS can style it, JS requires HTML structure
5. **[P] Parallel Markers**: CSS and initial JS validation logic can be developed in parallel after HTML structure exists

**Estimated Task Breakdown**:
- HTML/CSS Tasks: 3-4 tasks
- JavaScript Logic: 6-8 tasks (validation, API, state management, toggles)
- Server Integration: 1-2 tasks
- Testing: 4-5 tasks (manual scenarios, Playwright automation, responsive)
- Deployment: 3-4 tasks (version, changelog, commit, verify)
- **Total**: ~20-25 numbered tasks

**Key Milestones**:
1. **Milestone 1**: Static page renders correctly
2. **Milestone 2**: Client-side validation works
3. **Milestone 3**: API integration successful
4. **Milestone 4**: All test scenarios pass
5. **Milestone 5**: Deployed to staging

**Risk Mitigation**:
- **Risk**: Password validation regex mismatch with server
  **Mitigation**: Test validation against existing validatePasswordStrength() function early

- **Risk**: Token format validation inconsistency
  **Mitigation**: Use exact regex from API contract: `/^[a-f0-9]{64}$/i`

- **Risk**: Responsive design breaks on mobile
  **Mitigation**: Test on mobile viewport throughout development (not just at end)

- **Risk**: CLAUDE.md context update incomplete
  **Mitigation**: Already completed in Phase 1 via update-agent-context.sh script

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

**Status**: ✅ Task generation approach planned and documented

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
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none - straightforward frontend page)

**Post-Design Constitution Re-evaluation**:
After completing Phase 1 design, re-checking all constitutional requirements:

### Beta Freeze Compliance
- ✅ **PASS**: Design confirms feature branch implementation only
- ✅ **PASS**: No database migrations required (uses existing tables)
- ✅ **PASS**: No backend code changes (uses existing API)
- ✅ **PASS**: Deployment remains staging-only during freeze

### Staging-First Workflow
- ✅ **PASS**: All 14 test scenarios target dev.tickedify.com
- ✅ **PASS**: Quickstart.md explicitly documents staging testing
- ✅ **PASS**: No production references in design docs

### Specialized Sub-Agents
- ✅ **PASS**: Quickstart.md includes Playwright automation section
- ✅ **PASS**: Design supports tickedify-testing agent usage

### Versioning & Changelog
- ✅ **PASS**: Design complete, implementation will require version bump
- ✅ **PASS**: Changelog entry planned: "✨ Password reset screen"

### Test-First via API
- ✅ **PASS**: Design emphasizes API endpoint testing (POST /api/account/password-reset/confirm)
- ✅ **PASS**: UI testing limited to page-specific functionality
- ✅ **PASS**: Contract tests defined in contracts/reset-password-api.yml

### Technical Stack Constraints
- ✅ **PASS**: Design confirms Vanilla JavaScript (no frameworks)
- ✅ **PASS**: Responsive design principles in data-model.md
- ✅ **PASS**: Reuses existing backend infrastructure

**Post-Design Constitution Check: PASS** ✅

No design changes required - all constitutional principles satisfied.

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
