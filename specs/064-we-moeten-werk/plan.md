# Implementation Plan: Separate Test Environment with Database Isolation

**Branch**: `064-we-moeten-werk` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/064-we-moeten-werk/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → SUCCESS: Spec loaded with 42 functional requirements
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type: Web application (Node.js/Express backend + Vanilla JS frontend)
   → Structure Decision: Option 1 (single monolith structure)
   → All technical context clear - no NEEDS CLARIFICATION
3. Fill the Constitution Check section
   → SUCCESS: Constitution loaded and checked
4. Evaluate Constitution Check section
   → Beta Freeze: COMPLIANT (staging-only deployment)
   → Staging-First: COMPLIANT (dev.tickedify.com target)
   → Sub-Agents: COMPLIANT (tickedify-feature-builder for implementation)
   → Progress Tracking: Initial Constitution Check PASSED
5. Execute Phase 0 → research.md
   → Database platform: Neon PostgreSQL
   → Schema copying approach: pg_dump + restoration
   → Environment configuration: Vercel environment variables
   → User data dependencies identified: 8 tables to copy
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
   → Data model: No new tables (infrastructure only)
   → API contracts: 7 new admin endpoints
   → Quickstart: Manual setup guide + API testing scenarios
7. Re-evaluate Constitution Check section
   → No new violations introduced
   → Progress Tracking: Post-Design Constitution Check PASSED
8. Plan Phase 2 → Task generation approach described
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Create completely isolated test environment with separate database for dev.tickedify.com, enabling safe testing of new features without any risk to production data or live users.

**Technical Approach** (from Phase 0 research):
1. **Infrastructure**: Create new empty PostgreSQL database on Neon, configure Vercel environment variables for dev.tickedify.com to use test database credentials
2. **Database Operations**: Implement pg_dump schema-only export from production, restore to test database, selective user data copy with relationship preservation
3. **Admin UI**: Extend admin2.html with test environment management section, confirmation dialogs for all destructive operations
4. **Connection Management**: Dual database connection pool in server.js, environment-based routing (VERCEL_ENV detection)

## Technical Context

**Language/Version**: Node.js 18+ (current production version), Vanilla JavaScript ES6+
**Primary Dependencies**:
  - Backend: Express.js 4.x, pg (PostgreSQL client), dotenv (environment configuration)
  - Frontend: Vanilla JavaScript, existing admin2.html components
  - Database: PostgreSQL 14+ (Neon hosted)

**Storage**:
  - Production Database: Neon PostgreSQL (tickedify.com)
  - Test Database: Neon PostgreSQL (dev.tickedify.com) - NEW
  - No file system dependencies for this feature

**Testing**:
  - Manual API testing via curl with -s -L -k flags
  - Quickstart validation scenarios
  - Constitution-compliant staging-first deployment

**Target Platform**: Vercel serverless functions (Node.js runtime)

**Project Type**: Web application (single monolith - server.js backend + public/ frontend)

**Performance Goals**:
  - Schema copy: <30 seconds for full structure
  - User data copy: <10 seconds for single user with 1000 tasks
  - Database connections: <500ms latency per query

**Constraints**:
  - Zero production database modifications (read-only for copy operations)
  - Environment-based connection routing (no code changes for production)
  - Vercel serverless timeout: 10 seconds per request (use async for long operations)
  - Beta freeze: NO main branch deployments (staging only)

**Scale/Scope**:
  - ~15 production users currently
  - ~50,000 total tasks in production database
  - 12 database tables to manage
  - Expected test database: 1-3 users at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅ COMPLIANT
- **No main branch operations**: This feature targets staging branch only
- **No production deployments**: All testing via dev.tickedify.com
- **No live database changes**: Test database is separate infrastructure
- **Rationale**: Fully compliant - creates safer testing environment for future features

### Staging-First Deployment ✅ COMPLIANT
- **Feature branches merge to staging**: Plan includes staging-first workflow
- **dev.tickedify.com testing**: Test database will be used by dev.tickedify.com
- **Vercel automation**: Push to staging triggers automatic deployment
- **Rationale**: This feature enhances staging environment capabilities

### Gespecialiseerde Sub-Agents ✅ COMPLIANT
- **Implementation agent**: tickedify-feature-builder for database infrastructure + admin UI
- **Testing agent**: tickedify-testing for API endpoint validation
- **Bug hunting**: tickedify-bug-hunter if issues arise during implementation
- **Rationale**: Clear agent boundaries for this infrastructure feature

### Versioning & Changelog Discipline ✅ COMPLIANT
- **Version bump**: Each commit includes package.json increment
- **Changelog**: Feature will be documented in English per new guidelines
- **Communication**: Admin-facing feature will be announced to user
- **Rationale**: Standard versioning workflow applies

### Deployment Verification Workflow ✅ COMPLIANT
- **15-second iterations**: Implementation will use standard verification loop
- **curl -s -L -k flags**: All API testing follows security prompt prevention
- **Version endpoint**: /api/version check for deployment confirmation
- **Rationale**: Standard deployment workflow applies

### Test-First via API ✅ COMPLIANT
- **Direct API testing**: All test environment operations via REST endpoints
- **Database state validation**: Query both databases to confirm isolation
- **UI testing minimal**: Only for confirmation dialogs and admin2.html UI
- **Rationale**: Infrastructure feature is API-driven, perfect for direct testing

## Project Structure

### Documentation (this feature)
```
specs/064-we-moeten-werk/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (created below)
├── data-model.md        # Phase 1 output (created below)
├── quickstart.md        # Phase 1 output (created below)
├── contracts/           # Phase 1 output (created below)
│   ├── admin-test-db.yml    # OpenAPI spec for test DB operations
│   └── README.md            # Contract documentation
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Tickedify uses Option 1: Single project structure
server.js                      # Backend - add dual DB connection logic
public/
├── admin2.html                # Admin UI - add test environment section
├── admin2.js                  # Admin JS - add test DB management functions
└── admin2.css                 # Admin CSS - styling for test section

.env                           # Environment variables (NOT committed)
.env.example                   # Template for environment setup
```

**Structure Decision**: Option 1 (Single project) - Tickedify is monolithic Express.js app with public/ frontend

## Phase 0: Outline & Research

**Objective**: Resolve all technical unknowns about database infrastructure setup and data copying strategies.

### Research Tasks Completed

1. **Database Platform Research**
   - **Decision**: Use Neon PostgreSQL (current production platform)
   - **Rationale**:
     - Neon supports multiple databases in same project
     - Connection string based isolation (different DATABASE_URL per environment)
     - No migration needed from current stack
     - Familiar pg client usage in Node.js
   - **Alternatives considered**:
     - Separate Neon project: More overhead, unnecessary isolation
     - Local PostgreSQL: Not viable for Vercel deployments

2. **Schema Copy Strategy**
   - **Decision**: Use pg_dump with --schema-only flag via Node.js child_process
   - **Rationale**:
     - Native PostgreSQL tool, reliable and standard
     - Schema-only flag excludes data perfectly
     - Can be automated via Node.js exec commands
     - Preserves all constraints, indexes, sequences, triggers
   - **Alternatives considered**:
     - Manual SQL parsing: Too fragile, would miss indexes/triggers
     - ORM migrations: Doesn't exist in Tickedify, would add complexity
     - Query information_schema: Complex and incomplete for all DB objects

3. **User Data Copy Strategy**
   - **Decision**: Sequential SQL INSERT via pg client with foreign key preservation
   - **Rationale**:
     - Tables identified: users, taken, projecten, contexten, subtaken, bijlagen, feedback, page_help (user-specific portions)
     - Copy order matters: users → projecten/contexten → taken → subtaken/bijlagen
     - Preserve IDs to maintain relationships
     - Transaction per user for atomicity
   - **Alternatives considered**:
     - pg_dump selective: No built-in way to filter by user_id across tables
     - COPY command: Requires superuser privileges not available on Neon

4. **Environment Configuration Strategy**
   - **Decision**: Vercel environment variables per deployment
   - **Rationale**:
     - VERCEL_ENV automatic variable ('production' | 'preview' | 'development')
     - Configure DATABASE_URL_TEST for dev.tickedify.com (staging branch)
     - Keep DATABASE_URL for production (main branch)
     - Server.js detects environment and selects connection
   - **Alternatives considered**:
     - Separate server.js: Code duplication, harder to maintain
     - Runtime .env files: Not available in Vercel serverless

5. **Connection Management Strategy**
   - **Decision**: Dual connection pool initialization in server.js
   - **Rationale**:
     - Production pool: Always available
     - Test pool: Only initialized if DATABASE_URL_TEST exists
     - Admin endpoints check environment before using test pool
     - Zero impact on production code paths
   - **Alternatives considered**:
     - Single pool with connection switching: Too error-prone
     - Separate Express instances: Overcomplicated for this use case

6. **Admin UI Integration Strategy**
   - **Decision**: New section in existing admin2.html
   - **Rationale**:
     - Admin2.html already has authentication and admin-only access
     - Consistent UI patterns with existing admin features
     - Reuse existing modal confirmation pattern
     - Add "Test Environment" tab to existing navigation
   - **Alternatives considered**:
     - Separate admin page: Unnecessary fragmentation
     - CLI tools: Less accessible for non-technical admin

7. **Duplicate Prevention Strategy**
   - **Decision**: Check test database for user.email before copy
   - **Rationale**:
     - Email is unique identifier across both databases
     - Simple SELECT query before INSERT
     - Return 409 Conflict error if exists
     - Admin can delete via UI, then retry copy
   - **Alternatives considered**:
     - Overwrite existing: Requested against by user
     - Composite keys: Email is sufficient unique constraint

### Technical Unknowns Resolved

- ✅ Database platform: Neon PostgreSQL (same as production)
- ✅ Schema copy method: pg_dump --schema-only via Node.js exec
- ✅ User data copy: Sequential INSERT with FK preservation
- ✅ Environment config: Vercel environment variables
- ✅ Connection routing: VERCEL_ENV detection + dual pools
- ✅ UI integration: admin2.html new section
- ✅ Duplicate handling: Email-based uniqueness check

**Output**: research.md (generated below)

## Phase 1: Design & Contracts

*Prerequisites: research.md complete ✅*

### 1. Data Model

**No new database tables required** - this is infrastructure feature only.

**Existing tables used**:
- All 12 production tables (read-only for schema copy)
- All 12 test database tables (write for copy, delete operations)

**Data model changes**: None - only connection configuration changes.

**See**: data-model.md (generated below)

### 2. API Contracts

**New Admin Endpoints** (7 total):

1. **POST /api/admin/test-db/copy-schema**
   - Request: `{ confirm: true }`
   - Response: `{ success: true, tablesCreated: 12, duration: 28000 }`
   - Action: Clear test DB, copy schema from production
   - Auth: requireAdmin middleware

2. **GET /api/admin/production-users**
   - Response: `{ users: [{ id, username, email }] }`
   - Action: List all production users
   - Auth: requireAdmin middleware

3. **POST /api/admin/test-db/copy-user**
   - Request: `{ userId: 123, confirm: true }`
   - Response: `{ success: true, userEmail: "jan@buskens.be", tasksCopied: 150 }`
   - Action: Copy user and all related data to test DB
   - Auth: requireAdmin middleware
   - Error: 409 if user already exists in test

4. **GET /api/admin/test-users**
   - Response: `{ users: [{ id, username, email }] }`
   - Action: List all test database users
   - Auth: requireAdmin middleware

5. **DELETE /api/admin/test-db/user/:userId**
   - Response: `{ success: true, deletedTasks: 150 }`
   - Action: Delete user and all related data from test DB
   - Auth: requireAdmin middleware

6. **POST /api/admin/test-db/clear**
   - Request: `{ confirm: true }`
   - Response: `{ success: true, tablesCleared: 12 }`
   - Action: DELETE all data from test DB (schema remains)
   - Auth: requireAdmin middleware

7. **GET /api/admin/test-db/verify**
   - Response: `{ production: { connected: true }, test: { connected: true } }`
   - Action: Verify both database connections
   - Auth: requireAdmin middleware

**See**: contracts/ directory (generated below)

### 3. Integration Test Scenarios

**From User Stories**:

1. **Infrastructure Setup** (Scenarios 1-3):
   - Verify test database connection
   - Verify production database still works
   - Verify environment-based routing

2. **Schema Copy** (Scenarios 4-5):
   - Copy schema to empty test DB
   - Verify all 12 tables exist in test DB
   - Verify zero data rows in test DB

3. **User Copy** (Scenarios 6-9):
   - List production users
   - Copy user with all related data
   - Verify duplicate prevention (409 error)
   - Verify relationship preservation

4. **Test DB Management** (Scenarios 10-12):
   - List test users
   - Delete individual test user
   - Clear entire test database

**See**: quickstart.md (generated below)

### 4. Agent File Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with:
- New test database infrastructure
- Dual connection pool management
- Admin test environment management endpoints

**Output**: Updated CLAUDE.md in repository root

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Infrastructure Setup Tasks** (Manual - Admin execution):
   - Create test database on Neon
   - Configure Vercel environment variables
   - Document connection credentials

2. **Backend Implementation Tasks** (Code):
   - Add test database connection pool to server.js
   - Implement environment-based connection routing
   - Implement 7 admin API endpoints
   - Add error handling and validation

3. **Frontend Implementation Tasks** (Code):
   - Add test environment section to admin2.html UI
   - Implement JavaScript functions for API calls
   - Add confirmation dialogs (reuse existing pattern)
   - Style test environment section

4. **Testing Tasks** (Validation):
   - Test schema copy operation
   - Test user copy with relationships
   - Test duplicate prevention
   - Test delete operations
   - Test database isolation

**Ordering Strategy**:
- Phase 1: Infrastructure setup (manual) - [M] marker
- Phase 2: Backend connection management before endpoints - dependency order
- Phase 3: API endpoints (can be parallel per endpoint) - [P] marker
- Phase 4: Frontend UI components (depends on API) - dependency order
- Phase 5: Integration testing (depends on implementation) - TDD validation

**Estimated Output**: ~18-22 numbered, ordered tasks in tasks.md

**Dependencies**:
- Backend connection management → API endpoints
- API endpoints → Frontend UI
- Implementation → Testing

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
| N/A | No constitution violations | All requirements align with constitutional principles |

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no deviations)

**Artifacts Generated**:
- [x] plan.md (this file)
- [x] research.md
- [x] data-model.md
- [x] contracts/ directory with OpenAPI specs
- [x] quickstart.md
- [x] CLAUDE.md updated

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
