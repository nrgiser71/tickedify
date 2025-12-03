# Implementation Plan: Backup Strategie

**Branch**: `071-de-backup-strategie` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/071-de-backup-strategie/spec.md`

## Summary

Implementeer een volledig eigen backup systeem naar Backblaze B2 met:
- 6 automatische backups per dag (elke 4 uur via Vercel Cron)
- Transaction logging voor alle database mutaties
- Admin interface voor backup management en restore
- 24 uur retentie met automatische cleanup

Technische aanpak: Hergebruik bestaande B2 integratie (storage-manager.js), JSON-based database export met gzip compressie, nieuwe tabellen voor metadata en logging.

## Technical Context

**Language/Version**: Node.js 18+, JavaScript ES2022
**Primary Dependencies**: Express.js 4.18, backblaze-b2 1.7, pg 8.11
**Storage**: PostgreSQL (Neon) + Backblaze B2 voor backup files
**Testing**: API-based testing via curl (conform constitution)
**Target Platform**: Vercel serverless (30s timeout)
**Project Type**: Web application (monolith - server.js + admin2.html)
**Performance Goals**: Backup < 30 seconds, logging < 10ms overhead
**Constraints**: Vercel 4.5MB payload limit, 60s max execution
**Scale/Scope**: 5-1000 users, ~1GB max database size

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Beta Freeze | ✅ PASS | Deploy to staging only, no main branch changes |
| II. Staging-First | ✅ PASS | All testing on dev.tickedify.com |
| III. Sub-Agents | ✅ PASS | Using tickedify-feature-builder for implementation |
| IV. Versioning | ✅ PASS | Will bump version + update changelog |
| V. Deployment Verification | ✅ PASS | Will verify via /api/version endpoint |
| VI. Test-First via API | ✅ PASS | All testing via API endpoints, not UI automation |

**Initial Check**: PASS - No violations

## Project Structure

### Documentation (this feature)
```
specs/071-de-backup-strategie/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/           # Phase 1 output ✅
│   └── backup-api.yaml  # OpenAPI spec
└── tasks.md             # Phase 2 output (via /tasks command)
```

### Source Code (to modify)
```
/
├── server.js            # Add backup endpoints + transaction logging
├── database.js          # Add new tables schema
├── backup-manager.js    # NEW - Backup orchestration module
├── transaction-logger.js # NEW - Transaction logging module
├── vercel.json          # Add cron configuration
└── public/
    └── admin2.html      # Add backup management UI
```

**Structure Decision**: Existing monolith structure - no architectural changes needed

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

Research findings documented in [research.md](./research.md):

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Storage provider | Backblaze B2 | Existing integration, cost-effective |
| Backup format | Compressed JSON | Vercel limits, easy restore |
| Scheduling | Vercel Cron | Native support, no dependencies |
| Transaction logging | Custom middleware | Minimal code changes |
| Restore approach | Transactional + maintenance mode | Data integrity |

**Output**: research.md ✅

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

### Data Model
Documented in [data-model.md](./data-model.md):
- `backup_metadata` table - Backup registry
- `transaction_log` table - Audit trail
- Indexes for efficient queries
- Retention policies

### API Contracts
Documented in [contracts/backup-api.yaml](./contracts/backup-api.yaml):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/backups` | GET | List backups |
| `/api/admin/backups/create` | POST | Manual backup |
| `/api/admin/backups/:id` | GET | Download backup |
| `/api/admin/backups/:id/restore` | POST | Restore from backup |
| `/api/admin/transaction-log` | GET | Query audit log |
| `/api/admin/transaction-log/:id/undo` | POST | Undo operation |
| `/api/cron/backup` | GET | Scheduled backup |

### Quickstart
Validation steps documented in [quickstart.md](./quickstart.md):
- 10 test scenarios covering all requirements
- Success criteria mapped to functional requirements
- Troubleshooting guide

**Output**: data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs
- TDD order: Schema first, then modules, then endpoints, then UI
- Mark [P] for parallel execution where safe

**Estimated Task Groups**:
1. Database schema (2 tasks) - transaction_log, backup_metadata tables
2. backup-manager.js module (5 tasks) - create, list, download, restore, cleanup
3. transaction-logger.js module (4 tasks) - log, query, undo, cleanup
4. Server endpoints (7 tasks) - all API routes
5. Vercel cron (2 tasks) - config + endpoint
6. Transaction logging integration (5 tasks) - hook into existing endpoints
7. Admin UI (4 tasks) - backup section in admin2.html
8. Testing (3 tasks) - API tests, integration tests

**Estimated Output**: ~32 ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Complexity Tracking

*No violations requiring justification*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking

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
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
