# Implementation Plan: Session Expiration Handling

**Branch**: `072-ik-heb-een` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/072-ik-heb-een/spec.md`

## Summary

Implement proactive session expiration detection that automatically redirects users to the login page when their session expires, eliminating generic error messages. Uses existing `/api/auth/me` endpoint with 60-second interval checks and browser visibility API for immediate detection on tab focus.

## Technical Context

**Language/Version**: JavaScript ES6+ (Vanilla JS frontend, Node.js 18+ backend)
**Primary Dependencies**: express-session, connect-pg-simple (existing)
**Storage**: PostgreSQL via Neon (existing `user_sessions` table)
**Testing**: Playwright for E2E, curl for API testing
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: web (frontend in public/, backend in server.js)
**Performance Goals**: Session check < 100ms, redirect within 1 second of detection
**Constraints**: Max 1 request/minute per user, no visible UI during checks
**Scale/Scope**: ~100 active users, single file changes (public/app.js)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Beta Freeze | ✅ PASS | Feature branch only, merge to staging not main |
| II. Staging-First | ✅ PASS | Deploy to dev.tickedify.com for testing |
| III. Sub-Agents | ✅ PASS | Use tickedify-testing for Playwright tests |
| IV. Versioning | ✅ PASS | Will increment version in same commit |
| V. Deployment Verification | ✅ PASS | 15-sec interval checks planned |
| VI. Test-First API | ✅ PASS | API testing via curl before UI testing |

**Result**: All constitutional principles satisfied. No violations.

## Project Structure

### Documentation (this feature)
```
specs/072-ik-heb-een/
├── plan.md              # This file
├── research.md          # ✅ Complete
├── data-model.md        # ✅ Complete
├── quickstart.md        # ✅ Complete
├── contracts/           # ✅ Complete
│   ├── session-check.contract.md
│   └── fetch-wrapper.contract.md
└── tasks.md             # Pending (/tasks command)
```

### Source Code Changes
```
public/
└── app.js               # AuthManager class modifications
    ├── setupSessionMonitor()        # New: Start 60-sec interval
    ├── checkSessionValidity()       # New: Call /api/auth/me
    ├── handleSessionExpired()       # New: Redirect to login
    ├── setupGlobalFetchInterceptor() # New: 401 detection
    └── setupVisibilityListener()    # New: Tab focus check

# No server changes required - existing infrastructure sufficient
```

**Structure Decision**: Web application (existing structure maintained)

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

Research findings documented in [research.md](./research.md):
- Existing `checkAuthStatus()` can be reused
- Current interval is 60 minutes (too long), changing to 60 seconds
- Server returns 401 for expired sessions
- Visibility API provides immediate tab-focus detection
- Global fetch interceptor provides fallback 401 detection

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

Deliverables:
- [data-model.md](./data-model.md) - No database changes, client-side state only
- [contracts/session-check.contract.md](./contracts/session-check.contract.md) - /api/auth/me responses
- [contracts/fetch-wrapper.contract.md](./contracts/fetch-wrapper.contract.md) - Global interceptor
- [quickstart.md](./quickstart.md) - Test scenarios and validation steps

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do*

**Task Generation Strategy**:
- Frontend-only implementation (no backend tasks)
- Modify existing AuthManager class in public/app.js
- Add new methods for session monitoring
- Minimal code changes following simplicity principle

**Estimated Tasks** (~8-10 tasks):
1. Add `isRedirecting` flag to AuthManager
2. Add `setupSessionMonitor()` method with 60-sec interval
3. Modify existing `startBetaCheckInterval()` to use new interval
4. Add `handleSessionExpired()` method for redirect logic
5. Add `setupVisibilityListener()` for tab focus detection
6. Add `setupGlobalFetchInterceptor()` for 401 detection
7. Remove generic error toasts for 401 responses
8. Test: Proactive session check scenario
9. Test: Tab visibility scenario
10. Test: API fallback scenario

**Ordering Strategy**:
- Core methods first (setup, handle)
- Integration second (interceptor, visibility)
- Testing last (after implementation)
- Mark [P] for parallel tasks where applicable

## Phase 3+: Future Implementation

*Beyond /plan scope*

**Phase 3**: /tasks command generates tasks.md
**Phase 4**: Implementation following tasks.md
**Phase 5**: Validation via quickstart.md scenarios

## Complexity Tracking

*No violations - no complexity justification needed*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Progress Tracking

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
- [x] Complexity deviations documented (none needed)

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
