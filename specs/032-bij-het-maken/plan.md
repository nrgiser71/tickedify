# Implementation Plan: "Volgende Keer" Bericht Trigger Optie

**Branch**: `032-bij-het-maken` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-bij-het-maken/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ Existing messaging system analyzed
   ✓ Project Type: web (frontend + backend)
   ✓ Structure Decision: Tickedify custom structure
3. Fill the Constitution Check section
   ✓ No constitution defined - using general best practices
4. Evaluate Constitution Check section
   ✓ No violations - simple extension of existing system
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   ✓ Complete - research.md generated
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   ✓ Complete - All artifacts generated
7. Re-evaluate Constitution Check section
   ✓ Complete - No new violations
8. Plan Phase 2 → Describe task generation approach
   ✓ Complete - Strategy documented in plan.md
9. STOP - Ready for /tasks command
   ✓ READY - All planning complete
```

## Summary
Deze feature voegt een nieuwe trigger optie "Volgende keer" toe aan het bestaande messaging system. De trigger zorgt ervoor dat een bericht verschijnt bij het eerstvolgende pagina bezoek van een gebruiker NA het aanmaken van het bericht. De implementatie hergebruikt bestaande infrastructuur (admin_messages tabel, message_interactions voor dismiss tracking) en vereist alleen:
1. Een nieuwe trigger_type waarde in de database
2. Aangepaste trigger logica in de backend API
3. Een extra radio button optie in de admin interface

## Technical Context
**Language/Version**: Node.js (Express.js backend) + Vanilla JavaScript (frontend)
**Primary Dependencies**:
- Backend: Express.js, PostgreSQL (via Neon), pg pool
- Frontend: Vanilla JS, geen frameworks
**Storage**: PostgreSQL (Neon hosted) - bestaande tables: admin_messages, message_interactions, user_page_visits
**Testing**: Manual testing via Vercel deployment (tickedify.com), geen geautomatiseerde tests
**Target Platform**: Web application (Vercel hosting)
**Project Type**: web (frontend + backend in monorepo)
**Performance Goals**: < 200ms API response tijd, 5-minuut polling interval voor nieuwe berichten
**Constraints**:
- Moet bestaande message system niet breken
- Backwards compatible met bestaande trigger types
- Geen breaking changes aan database schema
**Scale/Scope**: Bèta gebruikers (klein aantal), bestaand messaging systeem met ~500 LOC

**Bestaande Implementatie Details**:
- Database: admin_messages tabel met trigger_type VARCHAR(50) en trigger_value TEXT kolommen
- Backend: Server.js (~13,000 regels) met messaging endpoints vanaf regel 13220
- Frontend: message-modal.js met polling en display logica
- API Endpoints:
  - POST /api/admin/messages - Create message (regel 13230)
  - GET /api/messages/unread - Fetch unread messages voor gebruiker
  - POST /api/messages/:id/dismiss - Dismiss bericht
- Bestaande trigger types: 'immediate', 'page_visit_count' (eerste keer, 5e keer, etc.)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Project heeft geen constitution.md gedefinieerd. Gebruiken algemene best practices:

✅ **Simplicity**: Feature is een eenvoudige uitbreiding van bestaand systeem
✅ **Backwards Compatibility**: Geen breaking changes, bestaande triggers blijven werken
✅ **Reuse**: Hergebruikt bestaande admin_messages en message_interactions tabellen
✅ **Minimal Changes**: Alleen nieuwe trigger_type waarde + logica aanpassing
✅ **No Dependencies**: Geen nieuwe external dependencies nodig

**Initial Constitution Check**: PASS - Feature is eenvoudig en volgt bestaande patterns

## Project Structure

### Documentation (this feature)
```
specs/032-bij-het-maken/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (Tickedify structure)
```
Tickedify/
├── server.js                    # Backend API (~13,000 lines)
│   └── /api/admin/messages      # Messaging endpoints (regel 13220+)
│   └── /api/messages/unread     # User-facing message fetch
├── database.js                  # PostgreSQL connection pool
├── public/
│   ├── admin2.html             # Admin interface voor berichten
│   ├── app.js                  # Main frontend app
│   └── js/
│       └── message-modal.js    # Message display logic
└── specs/
    └── 026-lees-messaging-system/  # Original messaging system spec
        └── SETUP_DATABASE.sql      # Database schema
```

**Structure Decision**: Tickedify custom structure (web app monorepo, geen strikte src/ indeling)

## Phase 0: Outline & Research

**Knowns** (geen research nodig):
- ✅ Database schema bestaat (admin_messages.trigger_type accommodeert nieuwe waarde)
- ✅ Message_interactions tabel heeft dismiss tracking (herbruikbaar)
- ✅ Backend API patterns bekend (bestaande endpoints als template)
- ✅ Frontend display logic bestaat (message-modal.js polling systeem)
- ✅ Admin interface patterns bekend (admin2.html formulier)

**Research Tasks**:
1. **Trigger Logic Design**: Hoe bepalen of gebruiker bericht moet zien?
   - Decision: Vergelijk message created_at met user's laatste dismiss/view timestamp
   - Rationale: Message moet verschijnen als created_at > last interaction voor die user

2. **"Next Time" Definition**: Wat is "volgende bezoek"?
   - Decision: Eerste pagina load NA message created_at waar user nog geen interaction heeft
   - Rationale: Simpel te implementeren met bestaande message_interactions tabel

3. **Multiple Messages Handling**: Backend of frontend filtering?
   - Decision: Backend filtert in /api/messages/unread endpoint
   - Rationale: Consistent met bestaande immediate/page_visit_count triggers

4. **Backwards Compatibility**: Impact op bestaande triggers?
   - Decision: Nieuwe trigger_type waarde, bestaande logica blijft intact
   - Rationale: Switch/case pattern in backend, geen wijziging aan bestaande cases

**Output**: research.md wordt nu gegenereerd...

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

**Entities** (voor data-model.md):
- admin_messages: Geen schema wijziging nodig (trigger_type VARCHAR(50) accommodeert 'next_time')
- message_interactions: Bestaande tabel perfect voor dismiss tracking

**API Contracts** (voor contracts/):
- Bestaande endpoints blijven ongewijzigd
- Interne logica in GET /api/messages/unread wordt uitgebreid

**Frontend Changes**:
- Admin2.html: Nieuwe radio button voor "Volgende keer" trigger
- message-modal.js: Geen wijziging (backend doet filtering)

**Test Scenarios**:
- Scenario 1: Message met "next_time" trigger toont bij eerstvolgende bezoek
- Scenario 2: Message toont niet meer na dismiss
- Scenario 3: Multiple "next_time" messages tonen allemaal
- Scenario 4: Message edit toont niet opnieuw aan users die al dismissed hebben

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Database/Backend tasks:
   - Document nieuwe trigger_type waarde
   - Implementeer "next_time" trigger logica in /api/messages/unread
   - Update message creation endpoint validatie (optioneel)

2. Frontend tasks:
   - Add "Volgende keer" radio button in admin2.html
   - Update admin form submission logic
   - Test message display flow

3. Testing tasks:
   - Manual test: Create "next_time" message
   - Verify: Message shows on next page visit
   - Verify: Message doesn't show after dismiss
   - Verify: Multiple messages show correctly

**Ordering Strategy**:
- Backend eerst (trigger logic foundation)
- Frontend daarna (admin interface)
- Testing laatst (end-to-end verification)

**Estimated Output**: 8-10 geordende tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md, deploy to staging, test)
**Phase 5**: Validation (regression testing, bèta freeze compliance check)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - Feature is straightforward extension of existing system.

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
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none exist)

**Artifacts Generated**:
- ✅ research.md - Design decisions documented
- ✅ data-model.md - No schema changes required
- ✅ contracts/api-contract.md - API extensions documented
- ✅ quickstart.md - Testing procedures complete
- ✅ CLAUDE.md - Agent context updated
- ✅ tasks.md - 10 implementation tasks generated

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
