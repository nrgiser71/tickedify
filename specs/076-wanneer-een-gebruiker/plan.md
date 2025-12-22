# Implementation Plan: Admin Email Notification for Trial Starts

**Branch**: `076-wanneer-een-gebruiker` | **Date**: 2025-12-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/076-wanneer-een-gebruiker/spec.md`

## Summary

Add admin email notification when a new user starts a free trial, similar to existing subscription purchase notifications. The implementation will follow the existing `sendNewCustomerNotification()` pattern at `server.js:495-595` and integrate into the `/api/subscription/select` endpoint at line 5345.

## Technical Context
**Language/Version**: Node.js 18+ / JavaScript ES2022
**Primary Dependencies**: Express.js, mailgun.js, form-data
**Storage**: PostgreSQL (Neon) - No schema changes needed
**Testing**: Manual API testing, Playwright for E2E (optional)
**Target Platform**: Vercel serverless deployment
**Project Type**: web (existing monolith with frontend + backend)
**Performance Goals**: N/A - background notification
**Constraints**: Non-blocking notification (must not fail trial activation)
**Scale/Scope**: ~10 trial starts/week

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Beta Freeze - Production Stability | ✅ PASS | Feature will be deployed to staging branch only |
| II. Staging-First Deployment | ✅ PASS | Test on dev.tickedify.com before any production |
| III. Gespecialiseerde Sub-Agents | ✅ PASS | Will use tickedify-feature-builder for implementation |
| IV. Versioning & Changelog Discipline | ✅ PASS | Will include version bump and changelog |
| V. Deployment Verification Workflow | ✅ PASS | Will verify via /api/version endpoint |
| VI. Test-First via API | ✅ PASS | Can test via /api/subscription/select endpoint |

**Constitution Check Result**: PASS - No violations

## Project Structure

### Documentation (this feature)
```
specs/076-wanneer-een-gebruiker/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output - COMPLETE
├── data-model.md        # Phase 1 output - COMPLETE
├── quickstart.md        # Phase 1 output - COMPLETE
├── contracts/           # Phase 1 output - COMPLETE
│   └── trial-notification-contract.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (changes to existing files)
```
server.js
├── ~line 495-595: Add sendNewTrialNotification() function after sendNewCustomerNotification()
├── ~line 5318: Modify query to include 'naam' field
└── ~line 5345: Add notification call after trial activation
```

**Structure Decision**: Existing monolith structure - single server.js file

## Phase 0: Research - COMPLETE

See [research.md](./research.md) for detailed findings.

**Key Decisions:**
1. Use existing Mailgun infrastructure (already configured and working)
2. Create new `sendNewTrialNotification()` function (similar to existing customer notification)
3. Non-blocking error handling (trial must succeed even if email fails)
4. Integrate at `/api/subscription/select` endpoint after trial activation

## Phase 1: Design & Contracts - COMPLETE

**Artifacts created:**
- [data-model.md](./data-model.md) - No database changes needed, uses existing user fields
- [contracts/trial-notification-contract.md](./contracts/trial-notification-contract.md) - Function signature and email template
- [quickstart.md](./quickstart.md) - Test scenarios and verification steps
- CLAUDE.md updated via update-agent-context.sh script

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy:**
1. Create `sendNewTrialNotification()` function based on existing pattern
2. Modify SELECT query to include user name
3. Add notification call at trial activation point
4. Update version and changelog
5. Deploy to staging and verify

**Ordering Strategy:**
- Function creation first (no dependencies)
- Query modification second (simple change)
- Integration third (depends on function existing)
- Testing and deployment last

**Estimated Output**: 5-7 numbered tasks (simple feature)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation using tickedify-feature-builder agent
**Phase 5**: Validation on staging (dev.tickedify.com)

## Complexity Tracking
*No complexity violations - simple feature following existing patterns*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

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
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
