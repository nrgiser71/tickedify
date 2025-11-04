
# Implementation Plan: Soft Delete voor Taken

**Branch**: `055-soft-delete-implementatie` | **Date**: 2025-11-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/055-soft-delete-implementatie/spec.md`

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

**Primair Requirement**: Implementeer soft delete systeem voor taken waarbij verwijderde taken 30 dagen bewaard blijven in een prullenbak scherm met restore mogelijkheid, gevolgd door automatische permanente verwijdering per gebruiker.

**Technische Aanpak**:
- Twee nieuwe kolommen toevoegen aan `taken` tabel: `verwijderd_op` en `definitief_verwijderen_op`
- Eén nieuwe kolom aan `users` tabel: `laatste_cleanup_op`
- Alle bestaande `DELETE` operaties omzetten naar `UPDATE` met soft delete flags
- Alle taken queries filteren op `verwijderd_op IS NULL`
- Nieuw prullenbak scherm met restore functionaliteit
- Dagelijkse per-gebruiker cleanup trigger bij eerste actie
- CASCADE constraints aanpassen voor soft delete compatibiliteit

## Technical Context
**Language/Version**: Node.js (backend), Vanilla JavaScript (frontend)
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Vercel hosting
**Storage**: PostgreSQL database via Neon, Backblaze B2 voor bijlagen
**Testing**: Manual testing op dev.tickedify.com (staging), Playwright voor browser automation
**Target Platform**: Web applicatie (responsive design: desktop, tablet, mobile)
**Project Type**: Web (backend + frontend in single repo, no separate projects)
**Performance Goals**: <500ms response tijd voor queries, max 2s voor batch updates
**Constraints**:
  - Geen cron jobs toegestaan (per-gebruiker lazy evaluation)
  - Backwards compatible met bestaand archief systeem
  - Geen impact op bestaande cascade behavior voor live taken
  - Query filtering moet zero-impact hebben op performance
**Scale/Scope**:
  - Bèta: ~10-20 gebruikers, ~500-2000 taken per gebruiker
  - Database: 3 kolommen toevoegen (2x taken, 1x users)
  - Frontend: 1 nieuw scherm + menu item
  - Backend: 6-8 endpoints (soft delete, restore, prullenbak queries, cleanup trigger)
  - Impact: ~20 bestaande query locaties moeten gefilterd worden

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Beta Freeze - Production Stability
- **Status**: PASS
- **Verificatie**: Alle development op feature branch `055-soft-delete-implementatie`
- **Deployment**: ALLEEN naar staging branch → dev.tickedify.com
- **Main branch**: NIET geraakt tot "BÈTA FREEZE IS OPGEHEVEN"

### ✅ Staging-First Deployment
- **Status**: PASS
- **Workflow**: Feature branch → staging → testing op dev.tickedify.com
- **Verificatie**: Volledige testing cycle op staging environment

### ✅ Gespecialiseerde Sub-Agents
- **Status**: PASS
- **Testing**: tickedify-testing agent voor browser automation en feature testing
- **Bug Fixes**: tickedify-bug-hunter agent indien issues gevonden tijdens testing
- **Implementation**: Feature implementatie kan direct of via tickedify-feature-builder

### ✅ Versioning & Changelog Discipline
- **Status**: PASS
- **Version Bump**: Package.json version increment bij elke commit
- **Changelog**: Update public/changelog.html met soft delete feature entry
- **Format**: Emoji categorieën (⚡ nieuwe feature, 🔧 fixes indien nodig)

### ✅ Deployment Verification Workflow
- **Status**: PASS
- **Verificatie**: Check /api/version endpoint na deployment
- **Timing**: 15s intervals, max 2 minuten timeout
- **Curl Flags**: `-s -L -k` voor alle API testing

### ✅ Test-First via API
- **Status**: PASS
- **Aanpak**: Direct API testing voor soft delete, restore, cleanup operaties
- **Quickstart**: API-based test scenarios voor alle functionaliteit
- **UI Testing**: Alleen voor prullenbak scherm UI specifics

### Initial Constitution Check: PASS ✅
Alle constituional requirements worden nageleefd door deze implementatie.

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

**Structure Decision**: Tickedify gebruikt een hybride single-project structuur:
- **Root**: server.js (backend), database.js (schema), package.json
- **public/**: Frontend code (app.js, style.css, index.html)
- **specs/**: Feature specifications en design documents
- Geen aparte backend/frontend folders - alles in één repo met duidelijke file separation

## Phase 0: Outline & Research ✅

**Output**: `research.md` - 10 research topics gedocumenteerd

**Key Research Decisions**:
1. **Database Schema**: Kolom-based soft delete (verwijderd_op, definitief_verwijderen_op)
2. **CASCADE Behandeling**: Behoud constraints, conditional logic voor soft vs hard delete
3. **Query Filtering**: WHERE filter in alle queries + index op verwijderd_op
4. **Prullenbak UI**: Dedicated scherm na "Afgewerkte Taken" menu
5. **Cleanup Scheduling**: Lazy evaluation in auth middleware (geen cron job)
6. **Restore**: Simple UPDATE, reset naar NULL
7. **Herhalende Taken**: Stop herhaling bij delete, manual restart na restore
8. **B2 Bijlagen**: Behoud bij soft delete, cleanup bij permanent delete
9. **Archive Compatibility**: Separate workflows, geen overlap
10. **UI Iconography**: 🗑️ trash icon, universele herkenning

**Alle NEEDS CLARIFICATION resolved** ✅

## Phase 1: Design & Contracts ✅

**Output Files**:
- ✅ `data-model.md` - Database schema changes, entity relationships, state transitions
- ✅ `contracts/api-contracts.yml` - OpenAPI 3.0 spec voor 6 endpoints
- ✅ `quickstart.md` - 10 test scenarios met curl commands
- ✅ `CLAUDE.md` - Updated met soft delete context

**Data Model Summary**:
- **Taken tabel**: +2 kolommen (verwijderd_op, definitief_verwijderen_op)
- **Users tabel**: +1 kolom (laatste_cleanup_op)
- **Indexes**: 2 nieuwe indexes voor performance
- **State Transitions**: Actief → Soft Deleted → Hard Deleted (of Restore → Actief)
- **Validation Rules**: Documented voor soft delete, restore, cleanup

**API Contracts**:
1. `PUT /taak/:id/soft-delete` - Soft delete operatie
2. `POST /taak/:id/restore` - Restore operatie
3. `GET /prullenbak` - Haal verwijderde taken op
4. `POST /bulk/soft-delete` - Bulk soft delete
5. `POST /bulk/restore` - Bulk restore
6. `GET /admin/cleanup-stats` - Admin statistieken

**Test Scenarios** (quickstart.md):
- 10 volledige scenarios met API calls
- Edge cases coverage
- Performance benchmarks
- UI testing via Playwright (scenario 9)

**Post-Design Constitution Check**: PASS ✅
- Geen nieuwe constitutional violations
- Design volgt alle established patterns

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Database Migration Tasks** (van data-model.md):
   - Task: Add verwijderd_op, definitief_verwijderen_op kolommen aan taken
   - Task: Add laatste_cleanup_op kolom aan users
   - Task: Create indexes voor performance

2. **Backend API Tasks** (van api-contracts.yml):
   - Task: Implement PUT /taak/:id/soft-delete endpoint
   - Task: Implement POST /taak/:id/restore endpoint
   - Task: Implement GET /prullenbak endpoint
   - Task: Implement bulk soft delete/restore endpoints
   - Task: Implement cleanup trigger in auth middleware

3. **Query Filtering Tasks**:
   - Task: Audit alle taken queries in server.js (~20 locaties)
   - Task: Add WHERE verwijderd_op IS NULL filters

4. **Frontend Tasks**:
   - Task: Add prullenbak menu item na "Afgewerkte Taken"
   - Task: Create prullenbak scherm HTML/CSS
   - Task: Implement prullenbak rendering functie
   - Task: Add restore button handlers
   - Task: Update delete button naar trash icon

5. **Testing Tasks** (van quickstart.md):
   - Task: Test scenario 1-10 (elk 1 task)

**Ordering Strategy**:
1. Database migrations eerst (foundation)
2. Backend endpoints (parallel waar mogelijk)
3. Query filtering audit (kritiek voor correctheid)
4. Frontend UI (depends on backend)
5. Testing scenarios (validatie)

**Estimated Output**: 30-35 numbered, ordered tasks

**Dependencies**:
- Database tasks block alle backend tasks
- Backend soft delete blocks frontend delete updates
- Prullenbak endpoint blocks prullenbak UI
- Query filtering kan parallel met API development

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

**No Constitution Violations** ✅

Alle design decisions volgen de Tickedify constitution:
- Staging-first workflow
- Geen cron jobs (lazy evaluation instead)
- Test-first via API
- Sub-agent usage voor testing/implementation
- Backwards compatible met bestaande systemen


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning approach described (/plan command) ✅
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] No complexity deviations ✅

**Artifacts Generated**:
- [x] research.md (10 research topics)
- [x] data-model.md (schema changes, state transitions)
- [x] contracts/api-contracts.yml (6 endpoints OpenAPI spec)
- [x] quickstart.md (10 test scenarios)
- [x] CLAUDE.md updated

**Ready for /tasks Command** ✅

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
