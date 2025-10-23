# Implementation Plan: Real-time Bericht Notificatie bij Navigatie

**Branch**: `028-wanneer-ik-in` | **Date**: 2025-10-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-wanneer-ik-in/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✅ All context filled - no NEEDS CLARIFICATION
3. Fill the Constitution Check section
   ✅ Constitution template noted (needs user-specific principles)
4. Evaluate Constitution Check section
   → No violations - this is a frontend enhancement to existing system
5. Execute Phase 0 → research.md
   → Research existing navigation hooks and message check patterns
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → No new contracts (uses existing /api/messages/unread)
   → Data model unchanged (no database changes)
   → Quickstart for navigation testing
7. Re-evaluate Constitution Check
   → No new violations
8. Plan Phase 2 → Task generation approach described
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at Phase 2 planning. Phases 2-4 executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

---

## Summary

**Primary Requirement**: Geprogrammeerde berichten moeten automatisch verschijnen wanneer gebruikers tussen pagina's navigeren, zonder dat een volledige page refresh nodig is.

**Technical Approach**:
- Hook into bestaande SPA navigation events
- Call bestaande `/api/messages/unread` endpoint bij elke navigatie
- Reuse bestaande `showMessage()` logica uit `message-modal.js`
- No database changes, no new API endpoints
- Pure frontend enhancement

---

## Technical Context

**Language/Version**: JavaScript ES6+, Node.js 16+
**Primary Dependencies**:
- Express.js 4.18 (backend)
- PostgreSQL (via pg 8.11)
- Vanilla JavaScript (frontend, no framework)
- Font Awesome icons
**Storage**: PostgreSQL (Neon) - existing `admin_messages` and `message_interactions` tables
**Testing**: Manual testing via Playwright (existing tickedify-testing agent)
**Target Platform**: Web browser (Chrome, Safari, Firefox) + Express.js server
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <50ms navigation hook, <200ms API response for message check
**Constraints**:
- Must not impact navigation speed
- Must work with existing SPA navigation pattern
- Must prevent duplicate message displays
**Scale/Scope**:
- Single-user beta phase (jan@buskens.be)
- Extends existing 026-lees-messaging-system
- No schema changes required

---

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is template-only. Assuming standard web development principles:

✅ **No violations identified**:
- Uses existing API endpoints (no new contracts needed)
- Pure frontend enhancement (no architectural changes)
- Extends existing message-modal.js functionality
- No new dependencies required
- No database schema changes
- No performance impact (async check on navigation)

---

## Project Structure

### Documentation (this feature)
```
specs/028-wanneer-ik-in/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0: Navigation patterns research
├── data-model.md        # Phase 1: No changes (documents existing)
├── quickstart.md        # Phase 1: Navigation testing scenario
├── contracts/           # Phase 1: No new contracts (uses existing)
└── tasks.md             # Phase 2: /tasks command output
```

### Source Code (repository root)
```
# Tickedify Web Application Structure
public/
├── js/
│   ├── message-modal.js      # EXTEND: Add navigation check
│   ├── app.js                # EXTEND: Hook navigation events
│   ├── lijst-acties.js       # Hook: loadLijstActies()
│   ├── dagelijkse-planning.js # Hook: loadDagelijkse Planning()
│   └── [other page modules]  # Hook: Each page load function
├── index.html                # ADD: Script include
├── lijst-acties.html         # ADD: Script include
├── dagelijkse-planning.html  # ADD: Script include
└── [other pages]             # ADD: Script include

server.js                     # NO CHANGES (uses existing /api/messages/unread)

Database: NO CHANGES
- admin_messages table (existing)
- message_interactions table (existing)
```

**Structure Decision**: Web application (Option 2) - frontend JavaScript enhancement with no backend changes.

---

## Phase 0: Outline & Research

**No NEEDS CLARIFICATION in Technical Context** - all info available from existing codebase.

### Research Tasks:

1. **Navigation Pattern Analysis**
   - Onderzoek: Hoe werkt de huidige SPA navigatie in Tickedify?
   - Vind: loadPage(), loadLijstActies(), loadDagelijkse Planning() functions
   - Conclusie: Navigation hook points identified

2. **Message Check Implementation Pattern**
   - Onderzoek: Hoe werkt `checkForMessages()` in message-modal.js?
   - Vind: DOMContentLoaded trigger, async fetch, showMessage() call
   - Conclusie: Reuse existing pattern, add navigation trigger

3. **Duplicate Prevention Strategy**
   - Onderzoek: Hoe voorkomt message-modal.js dubbele berichten?
   - Vind: `dismissed` tracking in message_interactions table
   - Conclusie: Existing backend logic prevents duplicates

**Output**: research.md

---

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model (data-model.md)

**No database changes required**. Document existing entities:
- `admin_messages` table (existing from 026-lees-messaging-system)
- `message_interactions` table (existing from 026-lees-messaging-system)
- Message lifecycle already handles `display_at` timing

### 2. API Contracts (contracts/)

**No new contracts required**. Document existing endpoint usage:
- `GET /api/messages/unread` (existing from 026-lees-messaging-system)
  - Returns: `{ messages: [...] }` with messages WHERE display_at <= NOW
  - Filters: Already dismissed, snoozed, targeted, scheduled
  - No changes needed

### 3. Quickstart (quickstart.md)

**Test Scenario**: Navigation-triggered message display
```
1. Admin: Create scheduled message (display_at = +2 minutes)
2. User: Login to tickedify.com/app
3. User: Stay on current page
4. Wait: 2 minutes pass
5. User: Navigate from Lijst Acties → Dagelijkse Planning
6. Assert: Message appears automatically
7. User: Dismiss message
8. User: Navigate to another page
9. Assert: Message does NOT appear again
```

### 4. Agent File Update

Execute: `.specify/scripts/bash/update-agent-context.sh claude`
- Add: Navigation hook pattern
- Add: Message check on navigation feature
- Keep: Existing message system context (already present)

**Output**: data-model.md (existing system), quickstart.md, agent update

---

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Analyse bestaande `message-modal.js` structuur
2. Identificeer alle navigatie functies in app.js en page modules
3. Creëer taken voor navigation hooks
4. Creëer taken voor duplicate prevention validation
5. Creëer taken voor testing met Playwright

**Ordering Strategy**:
- Research eerst: Analyseer navigatie patterns
- Core implementation: Update message-modal.js met navigation check
- Integration: Hook into elk page load event
- Testing: Playwright scenario voor acceptance criteria
- Validation: Manual test op production environment

**Estimated Task Breakdown**:
1. Analyseer huidige navigatie flow (lijst-acties.js, dagelijkse-planning.js, etc.)
2. Extend message-modal.js met `checkForMessagesOnNavigation()` functie
3. Hook into loadLijstActies() function
4. Hook into loadDagelijkse Planning() function
5. Hook into overige page load functions
6. Add localStorage tracking voor last checked message ID
7. Test: Scheduled message verschijnt bij navigatie
8. Test: Message verschijnt NIET opnieuw na dismiss
9. Test: Multiple messages handlen correct
10. Test: No message bij geen scheduled content
11. Deploy naar staging (dev.tickedify.com)
12. Playwright automated test scenario
13. Deploy naar production (tickedify.com)
14. Update changelog met versie bump

**Estimated Output**: ~14 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation via tickedify-feature-builder agent
**Phase 5**: Validation via tickedify-testing agent (Playwright)

---

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - This is a straightforward frontend enhancement extending existing functionality.

---

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations)
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none needed)

---

**Ready for /tasks command** ✅

---
*Based on Constitution template - See `.specify/memory/constitution.md`*
