
# Implementation Plan: Volledig Abonnement-Betalingsproces

**Branch**: `011-in-de-app` | **Date**: 2025-10-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-in-de-app/spec.md`

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
Implementeren van het complete abonnement-betalingsproces voor Tickedify via Plug&Pay payment provider. Gebruikers die hun bèta periode of trial periode hebben afgelopen, kunnen een abonnement selecteren (trial 14 dagen, maandelijks €7, jaarlijks €70), worden doorgestuurd naar Plug&Pay checkout, en na succesvolle betaling automatisch teruggekeerd naar de app met actieve subscription status. Admin kan checkout URLs per abonnement configureren via admin dashboard. Webhook integration met Plug&Pay voor automatische payment confirmation en auto-login token systeem voor naadloze gebruiker return flow.

## Technical Context
**Language/Version**: Node.js (backend Express.js), Vanilla JavaScript (frontend)
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Plug&Pay API, GoHighLevel CRM API
**Storage**: PostgreSQL - users table extensions + new payment_configurations table + payment_webhook_logs table
**Testing**: Manual testing via Playwright MCP, API endpoint testing
**Target Platform**: Vercel deployment (web application)
**Project Type**: Web (frontend + backend in single repository)
**Performance Goals**: Webhook processing <500ms, Payment redirect <200ms
**Constraints**: Idempotent webhook processing, secure API key validation, auto-login token 10-minute expiry
**Scale/Scope**: Bèta users transitioning to paid (initially ~10-50 users), scalable to 10k+ users

**Plug&Pay Integration Details** (from MindDumper analysis):
- Webhook format: `application/x-www-form-urlencoded` (NOT JSON)
- Event type: `order_payment_completed` or `status === 'paid'`
- API key validation: Via form data parameter `api_key` (NOT headers)
- Email field: `email` (with fallback to `customer_email`)
- Idempotency: Via `order_id` field tracking
- Auto-login tokens: 10-minute validity, single-use, for seamless return flow
- Return URLs: Configured per plan in admin, include login token parameter

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Template constitution (not yet project-specific)

**Assumed Best Practices** (pending constitutional requirements):
- ✅ Separation of concerns: Frontend subscription.js, backend webhook endpoint, database layer
- ✅ Security first: API key validation, idempotency checks, auto-login token expiry
- ✅ Error handling: Comprehensive logging, user-friendly error messages
- ✅ Testing: Manual testing via Playwright, API endpoint validation
- ✅ Observability: Webhook logging table for audit trail, console logging for debugging
- ✅ Simplicity: Leverage existing patterns from MindDumper, avoid over-engineering

**No violations detected** - proceeding with standard best practices for payment integration

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

**Structure Decision**: Tickedify uses a web application structure with:
- Backend: server.js (Express) with API endpoints
- Frontend: public/ directory with HTML/CSS/JS files
- Database: database.js connection + migrations
- No separate frontend/backend directories (single monolithic structure)

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
   - Task: Create migration 011-001 (extend users table)
   - Task: Create migration 011-002 (payment_configurations table)
   - Task: Create migration 011-003 (payment_webhook_logs table)
   - Task: Run migrations on development database
   - Task: Verify database schema with SQL queries

2. **API Endpoint Tasks** (from contracts/api-contracts.md):
   - Task: Implement POST /api/subscription/select endpoint [P]
   - Task: Implement POST /api/webhooks/plugandpay endpoint [P]
   - Task: Implement GET /api/payment/success endpoint [P]
   - Task: Implement GET /api/payment/cancelled endpoint [P]
   - Task: Implement GET /api/admin/payment-configurations endpoint [P]
   - Task: Implement PUT /api/admin/payment-configurations/:plan_id endpoint [P]
   - Task: Implement GET /api/subscription/status endpoint [P]

3. **Frontend Tasks**:
   - Task: Update subscription.js for paid plan redirect logic
   - Task: Add admin-subscription-config.html page
   - Task: Add admin-subscription-config.js for URL management
   - Task: Update subscription.html with error message handling
   - Task: Add payment success/cancel pages

4. **Business Logic Tasks**:
   - Task: Implement subscription state machine helper
   - Task: Implement auto-login token generation and validation
   - Task: Implement webhook idempotency check
   - Task: Implement GoHighLevel sync for paid customers
   - Task: Implement trial expiry detection (login check)

5. **Integration Testing Tasks** (from quickstart.md):
   - Task: Test Scenario 1 (Beta → Trial)
   - Task: Test Scenario 2 (Beta → Paid Plan)
   - Task: Test Scenario 3 (Trial Expiry → Upgrade)
   - Task: Test Scenario 4 (Payment Cancelled)
   - Task: Test Scenario 5 (Webhook Idempotency)
   - Task: Test Scenario 6 (Token Expiry)
   - Task: Test Scenario 7 (Admin Configuration)
   - Task: Test Scenario 8 (Missing URL Error)

6. **Deployment Tasks**:
   - Task: Configure PLUGANDPAY_API_KEY environment variable
   - Task: Update ARCHITECTURE.md with new endpoints and tables
   - Task: Update CHANGELOG.md with feature description
   - Task: Deploy to staging (dev.tickedify.com)
   - Task: Deploy to production (tickedify.com) after approval

**Ordering Strategy**:

**Phase 1: Database Setup** (Sequential)
1. Migration 011-001
2. Migration 011-002
3. Migration 011-003
4. Run migrations
5. Verify schema

**Phase 2: Backend Implementation** (Parallel where possible)
6. [P] Subscription state machine helper
7. [P] Auto-login token helper
8. [P] Idempotency check helper
9. POST /api/subscription/select (depends on 6)
10. POST /api/webhooks/plugandpay (depends on 7, 8)
11. [P] GET /api/payment/success (depends on 7)
12. [P] GET /api/payment/cancelled
13. [P] GET /api/subscription/status (depends on 6)
14. [P] GET /api/admin/payment-configurations
15. [P] PUT /api/admin/payment-configurations/:plan_id

**Phase 3: Frontend Implementation** (Parallel where possible)
16. [P] Update subscription.js (redirect logic)
17. [P] Admin config HTML page
18. [P] Admin config JS logic
19. [P] Payment success/cancel pages
20. Update subscription.html (error handling)

**Phase 4: Integration & Testing** (Sequential for validation)
21. GoHighLevel sync integration
22. Trial expiry detection
23. Test Scenario 1 (Beta → Trial)
24. Test Scenario 2 (Beta → Paid)
25. Test Scenario 3 (Trial Expiry)
26. Test Scenario 4 (Cancelled)
27. Test Scenario 5 (Idempotency)
28. Test Scenario 6 (Token Expiry)
29. Test Scenario 7 (Admin Config)
30. Test Scenario 8 (Missing URL)

**Phase 5: Documentation & Deployment** (Sequential)
31. Update ARCHITECTURE.md
32. Update CHANGELOG.md
33. Version bump (package.json)
34. Deploy to staging
35. Staging validation
36. Deploy to production (after approval)

**Estimated Output**: 36 numbered, ordered tasks in tasks.md

**Dependencies**:
- Database tasks must complete before API implementation
- Backend helpers before endpoints that use them
- Backend before frontend (API contracts define integration)
- Implementation before integration testing
- All tests pass before deployment

**Parallel Execution Opportunities**:
- All 7 API endpoints can be implemented in parallel (marked [P])
- Frontend pages can be built in parallel
- Test scenarios can run in parallel (but after implementation)

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


## Post-Design Constitution Check

**Re-evaluation after Phase 1 design artifacts:**

✅ **Separation of Concerns**: Design maintains clear separation:
- Database layer (data-model.md, migrations)
- API layer (contracts/api-contracts.md, 7 endpoints)
- Business logic (webhook processing, state machine)
- Admin layer (configuration UI, separate from user flow)

✅ **Security Best Practices**:
- API key validation on webhooks (prevents unauthorized access)
- Idempotency via unique order_id (prevents duplicate processing)
- Auto-login tokens with 10-minute expiry and single-use (secure return flow)
- HTTPS-only URLs (enforced in admin validation)
- Comprehensive webhook logging (audit trail for compliance)

✅ **Error Handling**:
- All API contracts define error responses
- User-friendly error messages (Dutch language)
- Fallback behaviors for edge cases (expired tokens → login screen)
- Admin notifications for configuration issues

✅ **Testability**:
- Complete quickstart.md with 8 test scenarios
- Contract tests defined for all endpoints
- Performance benchmarks specified (<500ms webhook, <200ms redirect)
- Regression testing checklist included

✅ **Observability**:
- payment_webhook_logs table for all webhook events
- Console logging for debugging
- Database indexes for query performance
- Admin dashboard for configuration review

✅ **Simplicity**:
- Leverage existing users table (extend vs new table)
- Proven patterns from MindDumper (no re-invention)
- Minimal new tables (only 2: configs + logs)
- Clear state machine (6 states, documented transitions)

**No new violations detected** - design adheres to best practices

**Changes from Initial Check**: None - design maintained security and simplicity principles

---

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
- [x] Complexity deviations documented (N/A - no deviations)

**Artifacts Generated**:
- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/api-contracts.md (Phase 1)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (agent context)
- [x] tasks.md (Phase 3) - 36 implementation tasks

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
