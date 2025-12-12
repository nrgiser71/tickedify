
# Implementation Plan: User Task Activity Chart

**Branch**: `073-in-admin2-html` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/073-in-admin2-html/spec.md`

## Summary
Add a bar chart to the user details panel in admin2.html showing the number of tasks created per day by a user. The chart includes a period selector (This Week, This Month, This Quarter, This Year, Custom) and displays extended statistics (total, average, peak day, trend).

**Technical Approach**:
- New API endpoint `/api/admin2/users/:id/task-activity` with date range parameters
- Chart.js bar chart rendered in existing user details panel
- Client-side period calculations, server-side data aggregation
- Consistent with existing admin2 patterns and styling

## Technical Context
**Language/Version**: JavaScript ES6+ (frontend), Node.js v18+ (backend)
**Primary Dependencies**: Chart.js (chart rendering), Express.js (API)
**Storage**: PostgreSQL (Neon) - existing `taken` table with `created_at` column
**Testing**: API testing via curl, manual browser testing
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: web (frontend + backend)
**Performance Goals**: Chart loads within 500ms for up to 365 days of data
**Constraints**: No new dependencies except Chart.js CDN, < 200ms API response
**Scale/Scope**: Support date ranges up to 1 year, handle 0-10,000+ tasks per user

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Beta Freeze - Production Stability ✅
- Feature will be deployed to staging (dev.tickedify.com) only
- No push to main branch planned
- Compliant with beta freeze policy

### II. Staging-First Deployment ✅
- All development on feature branch `073-in-admin2-html`
- Merge to staging for testing on dev.tickedify.com
- Main branch remains untouched

### III. Gespecialiseerde Sub-Agents ✅
- tickedify-feature-builder will be used for implementation
- tickedify-testing will be used for validation

### IV. Versioning & Changelog Discipline ✅
- Version bump required before commit
- Changelog update with feature description

### V. Deployment Verification Workflow ✅
- Use `/api/version` endpoint to verify deployment
- Check every 15 seconds, max 2 minutes timeout
- Use `curl -s -L -k` flags

### VI. Test-First via API ✅
- API endpoint testable via curl commands (see quickstart.md)
- UI testing only for chart rendering and interactions

## Project Structure

### Documentation (this feature)
```
specs/073-in-admin2-html/
├── plan.md              # This file (/plan command output) ✅
├── research.md          # Phase 0 output (/plan command) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output (/plan command) ✅
│   └── api-contracts.md
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
# Existing Tickedify structure (web application)
server.js                # Backend - add new API endpoint here
public/
├── admin2.html          # Frontend - add chart HTML here
└── admin2.js            # Frontend - add chart logic here
```

**Structure Decision**: Use existing Tickedify structure (no new folders needed)

## Phase 0: Outline & Research ✅ COMPLETE
See [research.md](./research.md) for full details.

**Key Decisions**:
- Chart.js for rendering (may already be in project)
- PostgreSQL aggregation query on existing `taken.created_at` column
- Client-side period calculation, server-side data aggregation
- Statistics: total, average, peak day, trend (up/down/stable)

## Phase 1: Design & Contracts ✅ COMPLETE
See [data-model.md](./data-model.md) and [contracts/api-contracts.md](./contracts/api-contracts.md)

**Artifacts Generated**:
1. **data-model.md** - No new tables needed, uses existing `taken` table
2. **contracts/api-contracts.md** - API contract for `GET /api/admin2/users/:id/task-activity`
3. **quickstart.md** - Validation steps and curl test commands

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Backend Tasks** (sequential):
   - Add API endpoint to server.js
   - Implement date validation
   - Implement aggregation query
   - Implement statistics calculation
   - Add API method to admin2.js

2. **Frontend Tasks** (after backend):
   - Add Chart.js CDN to admin2.html (if not present)
   - Add HTML structure for chart section
   - Add period selector dropdown
   - Add custom date picker UI
   - Implement chart rendering function
   - Add statistics display
   - Wire up event handlers

3. **Integration Tasks**:
   - Connect UI to API
   - Handle loading states
   - Handle error states
   - Handle empty data state

4. **Testing Tasks**:
   - API endpoint testing (curl)
   - UI functionality testing (Playwright)

**Ordering Strategy**:
- Backend first (API must exist before frontend can use it)
- HTML structure → Chart logic → Event handlers
- Testing after implementation

**Estimated Output**: ~15 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run quickstart.md tests, performance validation)

## Complexity Tracking
*No violations - feature is straightforward*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | - | - |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
