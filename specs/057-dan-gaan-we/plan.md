
# Implementation Plan: Subscription Management in Settings

**Branch**: `057-dan-gaan-we` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/057-dan-gaan-we/spec.md`

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
Add subscription management block to Settings screen that displays user's current subscription plan (with price and billing cycle), renewal date, and provides controls to upgrade, downgrade, or cancel subscriptions. Integrates with Plug&Pay API for all subscription operations. Supports trial users (2-week free period), active subscriptions, canceled subscriptions (with reactivation), and implements asymmetric upgrade (immediate with proration) vs downgrade (at next renewal) billing logic.

## Technical Context
**Language/Version**: Node.js 16+ (backend), Vanilla JavaScript ES6+ (frontend)
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Plug&Pay API SDK (NEEDS CLARIFICATION - check if SDK exists or use REST API)
**Storage**: PostgreSQL for subscription metadata, Plug&Pay as source of truth for subscription state
**Testing**: API endpoint testing via curl, Playwright for UI flows
**Target Platform**: Web application (desktop/tablet/mobile browsers), Vercel serverless functions
**Project Type**: web (frontend + backend in same repo, monolith architecture)
**Performance Goals**: <500ms API response time, real-time subscription state sync via webhooks
**Constraints**: Must work with Plug&Pay webhook validation, must handle idempotency for plan changes, must prevent concurrent subscription modifications
**Scale/Scope**: Beta phase with small user base, anticipate 100-500 active subscriptions initially

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Beta Freeze - Production Stability ✅ PASS
- **Compliance**: This feature will be developed on branch `057-dan-gaan-we` and deployed to staging only
- **No violations**: No main branch modifications, no production deployments during beta freeze
- **Workflow**: Feature branch → staging → testing on dev.tickedify.com

### II. Staging-First Deployment ✅ PASS
- **Compliance**: All testing will occur on dev.tickedify.com after staging deployment
- **Workflow**: Feature branch → merge to staging → auto-deploy to dev.tickedify.com → API testing + Playwright UI testing

### III. Gespecialiseerde Sub-Agents ✅ PLANNED
- **Agent Selection**: Will use `tickedify-feature-builder` for implementation (new feature with database + API + UI)
- **Rationale**: Subscription management is a new feature requiring database schema, API endpoints, frontend UI, and Plug&Pay integration - perfect match for feature-builder agent

### IV. Versioning & Changelog Discipline ✅ PLANNED
- **Compliance**: Version bump from current 0.21.82 → 0.21.83 (patch increment)
- **Changelog**: Will add entry with ⚡ feature emoji for subscription management block
- **Timing**: Version bump and changelog update in same commit as feature completion

### V. Deployment Verification Workflow ✅ PLANNED
- **Compliance**: Use `curl -s -L -k https://dev.tickedify.com/api/version` for deployment verification
- **Timing**: Check after 15 seconds, repeat every 15 seconds until match or 2-minute timeout
- **No violations**: No long sleep commands, proper curl flags

### VI. Test-First via API ✅ PLANNED
- **Primary Testing**: Direct API endpoint testing for subscription operations
  - `GET /api/subscription` - fetch current subscription
  - `POST /api/subscription/upgrade` - upgrade plan
  - `POST /api/subscription/downgrade` - schedule downgrade
  - `POST /api/subscription/cancel` - cancel subscription
  - `POST /api/subscription/reactivate` - reactivate canceled subscription
- **Secondary Testing**: Playwright only for Settings UI display and modal interactions
- **Rationale**: Business logic (billing, plan changes) tested via API; UI tested for display/UX only

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

**Structure Decision**: Tickedify uses a monolith web architecture (NOT the template options above):
```
/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/
├── server.js                    # Backend API (Express.js, ~15,000 lines)
├── public/
│   ├── app.js                   # Frontend application logic (~8,000 lines)
│   ├── style.css                # Styles (~1,800 lines)
│   ├── index.html               # Main app shell
│   └── changelog.html           # User-facing changelog
├── migrations/                  # Database migration scripts
├── specs/057-dan-gaan-we/      # This feature's documentation
└── package.json                 # Dependencies & version
```

**Rationale**: Existing monolith architecture with frontend and backend in same repository. No separate directories for src/tests - all code in root-level files.

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
1. **Database Tasks** (from data-model.md):
   - Create migration file for users table extensions
   - Create subscription_plans table + seed data
   - Create webhook_events table
   - Create subscription_change_requests table
   - Execute migration on staging database [P]

2. **Backend API Tasks** (from subscription-api.yml contract):
   - Implement GET /api/subscription endpoint
   - Implement GET /api/subscription/plans endpoint
   - Implement POST /api/subscription/checkout endpoint
   - Implement POST /api/subscription/upgrade endpoint [P]
   - Implement POST /api/subscription/downgrade endpoint [P]
   - Implement POST /api/subscription/cancel endpoint [P]
   - Implement POST /api/subscription/reactivate endpoint [P]
   - Implement POST /api/webhooks/plugpay endpoint
   - Add Plug&Pay API helper functions
   - Add webhook signature validation logic

3. **Frontend UI Tasks** (from spec.md):
   - Update Settings screen to show subscription block
   - Implement trial status display component
   - Implement active subscription display component
   - Implement canceled subscription display component
   - Implement plan comparison modal (upgrade/downgrade)
   - Implement upgrade confirmation dialog
   - Implement downgrade confirmation dialog
   - Implement cancel confirmation dialog
   - Add CSS styling matching Tickedify design system

4. **Testing Tasks** (from quickstart.md):
   - API test: View trial user subscription
   - API test: Fetch available plans
   - API test: Create checkout session
   - API test: Upgrade plan (immediate)
   - API test: Downgrade plan (scheduled)
   - API test: Cancel subscription
   - API test: Reactivate subscription
   - API test: Webhook idempotency
   - API test: Invalid plan upgrade (error handling)
   - API test: Webhook signature validation
   - UI test: Plan comparison modal (Playwright)
   - UI test: Trial expiry handling

5. **Deployment Tasks**:
   - Version bump to 0.21.83
   - Update changelog with subscription management feature
   - Commit and push to staging branch
   - Verify deployment on dev.tickedify.com
   - Execute migration on staging database

**Ordering Strategy**:
- Phase 1: Database migration (blocking for all other tasks)
- Phase 2: Backend API implementation (parallel where possible)
- Phase 3: Frontend UI (depends on API endpoints)
- Phase 4: Testing (depends on implementation)
- Phase 5: Deployment

**Estimated Output**: ~35-40 numbered, ordered tasks in tasks.md

**Parallel Execution Opportunities**:
- Backend API endpoints (upgrade/downgrade/cancel/reactivate) can be built in parallel
- Frontend UI components can be built in parallel after API is ready
- API tests can run in parallel after implementation

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
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

**Artifacts Generated**:
- [x] research.md - Technical decisions and Plug&Pay integration approach
- [x] data-model.md - Database schema with 4 tables (users extensions + 3 new tables)
- [x] contracts/subscription-api.yml - OpenAPI 3.0 contract with 7 endpoints + webhook
- [x] quickstart.md - 12 test scenarios covering full subscription lifecycle
- [x] CLAUDE.md updated - New tech context added
- [x] tasks.md - 60 numbered tasks with dependencies and parallel execution guidance

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
