# Implementation Plan: In-App Admin-to-User Messaging System

**Branch**: `026-lees-messaging-system` | **Date**: 2025-01-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-lees-messaging-system/spec.md`

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
Implementatie van een one-way admin-to-user messaging systeem voor Tickedify. Admin kan berichten sturen naar alle gebruikers of specifieke doelgroepen (subscription types, specifieke users). Berichten kunnen getriggerd worden op basis van tijd (immediate, X dagen na signup) of gebruikersgedrag (eerste/Nde page visit). Systeem ondersteunt rich content (markdown, buttons), snooze functionaliteit, message carousel en complete analytics dashboard. Implementatie in 4 phases: (1) Core foundation, (2) Targeting & Triggers, (3) Rich Content & UX, (4) Analytics & Admin UI.

## Technical Context
**Language/Version**: JavaScript (Frontend: Vanilla JS, Backend: Node.js/Express)
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Vercel deployment
**Storage**: PostgreSQL - 3 nieuwe tabellen (admin_messages, message_interactions, user_page_visits)
**Testing**: Manual testing op staging (dev.tickedify.com), production deployment workflow
**Target Platform**: Web application (desktop + mobile responsive)
**Project Type**: Web (frontend in public/, backend in server.js)
**Performance Goals**: <500ms extra page load time, <2s analytics query time
**Constraints**: BETA FREEZE actief - alleen staging deployments, geen productie pushes
**Scale/Scope**: ~245 users (current beta), messaging systeem met 48 functional requirements, 4 implementatie phases

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Template constitution in repository - geen specifieke project principes gedocumenteerd.

**Tickedify Development Principles** (uit CLAUDE.md):
- ✅ **Staging Autonomie**: Volledige autonomie op staging environment voor testing
- ✅ **Version Tracking**: Elke code wijziging vereist version bump in package.json
- ✅ **Changelog Updates**: Verplicht bij elke wijziging
- ✅ **Deployment Workflow**: Automated deployment via git push met version verification
- ✅ **BETA FREEZE**: Productie volledig bevroren - alleen staging toegestaan

**Feature-Specific Checks**:
- ✅ **Database Schema**: Geen breaking changes aan bestaande tabellen, alleen nieuwe tabellen
- ✅ **Backwards Compatibility**: Feature is volledig additive, geen impact op bestaande functionaliteit
- ✅ **Admin Authorization**: Gebruikt bestaand admin check systeem (user_id = 1 of proper role)
- ✅ **Performance**: Message check is async, tracking is non-blocking
- ✅ **Security**: Input validation, SQL injection prevention, admin-only endpoints

**PASS** - Geen constitutional violations. Feature volgt bestaande Tickedify patterns.

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

**Structure Decision**: **Option 2 - Web Application Structure**
- Backend: server.js (monolithic Express app met 6,253 regels)
- Frontend: public/ directory met app.js (10,507 regels), style.css (6,542 regels)
- Messaging feature adds:
  - Backend: Nieuwe routes in server.js voor admin/user endpoints
  - Frontend: public/js/message-modal.js (nieuwe file voor modal UI)
  - Admin: Uitbreiding van public/admin.html met message dashboard
  - Styling: Uitbreiding van public/style.css met message modal CSS

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
De messaging feature is gestructureerd in 4 implementatie phases, elk met duidelijke deliverables:

**Phase 1: Core Foundation** (Database + Basic API + Modal UI)
- Database schema creation (3 tabellen + indexes)
- Admin endpoints: POST /api/admin/messages, GET /api/admin/messages, POST /api/admin/messages/:id/toggle
- User endpoints: GET /api/messages/unread, POST /api/messages/:id/dismiss, POST /api/page-visit/:pageIdentifier
- Frontend: message-modal.js met basic modal display
- HTML: Modal structure in app.html
- CSS: Basic modal styling
- Testing: Create message, view as user, dismiss

**Phase 2: Targeting & Triggers** (Advanced Filtering + Conditional Display)
- User search API: GET /api/admin/users/search
- Target preview: GET /api/admin/messages/preview-targets
- Enhanced unread query: subscription filtering, days_after_signup trigger, page visit triggers
- Admin UI: Targeting form met subscription checkboxes, user search, target preview
- Testing: Filtered messages, page visit triggers, scheduled messages

**Phase 3: Rich Content & UX** (Message Types + Carousel + Snooze)
- Message types met icons en styling (6 types: information, educational, warning, important, feature, tip)
- Markdown link parsing in message content
- Action buttons: navigate (internal) en external (new tab)
- Snooze endpoints: POST /api/messages/:id/snooze met durations [1h, 4h, 1d]
- Message carousel: prev/next buttons, indicator "1 / 3", priority sorting
- Enhanced modal UI: type-specific styling, button rendering, snooze options
- Testing: Multiple messages, snooze timing, button actions, non-dismissible

**Phase 4: Analytics & Admin UI** (Dashboard + Stats + Management)
- Analytics endpoint: GET /api/admin/messages/:id/analytics met engagement stats
- Admin dashboard: Tabbed UI (Create + List)
- Message list table: title, type, targeting, trigger, stats, actions
- Analytics modal: Stat cards, user interaction table, percentages
- Preview functionality: reuse message modal met dummy data
- Toggle active/inactive: UI button + visual feedback
- Testing: Analytics accuracy, percentage calculations, user list

**Ordering Strategy**:
- **Sequential phases**: Elke phase bouwt voort op de vorige (geen parallellization between phases)
- **Within phase parallel**: Database + backend + frontend kunnen parallel (marked [P])
- **Testing per phase**: Elke phase eindigt met test scenarios voor validation
- **Incremental delivery**: Elke phase is zelfstandig deployable en testbaar op staging

**Task Categories per Phase**:
1. **Database tasks**: Schema creation, migrations, indexes
2. **Backend tasks**: API endpoints, query building, validation
3. **Frontend tasks**: JavaScript components, HTML templates, CSS styling
4. **Integration tasks**: Connect frontend ↔ backend, test workflows
5. **Testing tasks**: Manual test scenarios, data verification, edge cases
6. **Documentation tasks**: Changelog updates, ARCHITECTURE.md updates

**Estimated Output**: 35-40 numbered tasks in tasks.md
- Phase 1: ~10 tasks (foundation is critical, need thorough setup)
- Phase 2: ~8 tasks (targeting logic + triggers)
- Phase 3: ~10 tasks (rich content heeft veel UI components)
- Phase 4: ~10 tasks (analytics + complete admin UI)

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
  - ✅ research.md created met 9 research areas
  - ✅ Alle technical decisions gedocumenteerd
  - ✅ Geen NEEDS CLARIFICATION remaining
- [x] Phase 1: Design complete (/plan command)
  - ✅ data-model.md created met 4 entities + relationships
  - ✅ contracts/api-contracts.md created met 11 endpoints
  - ✅ quickstart.md created met Phase 1 implementation guide
  - ✅ CLAUDE.md updated met messaging context
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
  - ✅ Task generation strategy documented (4 phases, 35-40 tasks)
  - ✅ Ordering strategy specified (sequential phases, parallel within)
  - ✅ Task categories identified (6 types)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
  - ✅ Geen breaking changes aan bestaande systemen
  - ✅ Feature volgt Tickedify development principles
  - ✅ BETA FREEZE compliance (staging only)
- [x] Post-Design Constitution Check: PASS
  - ✅ Design is additive, geen architectural violations
  - ✅ Performance constraints gedocumenteerd (<500ms, <2s)
  - ✅ Security patterns consistent met bestaande Tickedify auth
- [x] All NEEDS CLARIFICATION resolved
  - ✅ Alle technische details gespecificeerd in MESSAGING_SYSTEM_SPEC.md
  - ✅ Research documenteert alle design decisions
- [x] Complexity deviations documented
  - ✅ Geen deviations - feature past binnen bestaande patterns

**Artifacts Generated**:
- ✅ specs/026-lees-messaging-system/plan.md (this file)
- ✅ specs/026-lees-messaging-system/research.md (9 research areas)
- ✅ specs/026-lees-messaging-system/data-model.md (4 entities, query patterns)
- ✅ specs/026-lees-messaging-system/contracts/api-contracts.md (11 endpoints)
- ✅ specs/026-lees-messaging-system/quickstart.md (Phase 1 implementation)
- ✅ CLAUDE.md updated (messaging system context added)

---
*Based on Tickedify Development Principles - See `/CLAUDE.md`*
*Constitution template not populated - using project-specific principles*
