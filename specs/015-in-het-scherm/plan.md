# Implementation Plan: MIT Maximum Telling Bug Fix

**Branch**: `015-in-het-scherm` | **Date**: 2025-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-in-het-scherm/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
   → Spec loaded successfully - Bug fix voor MIT maximum limiet
2. Fill Technical Context ✓
   → Project Type: Web application (frontend + backend)
   → Structure Decision: Existing Tickedify architecture (public/ + server.js)
3. Fill the Constitution Check section ✓
   → Tickedify heeft geen formele constitution - gebruik best practices
4. Evaluate Constitution Check section ✓
   → No violations - simple bug fix following existing patterns
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md ✓
   → Bug is duidelijk - geen extra research nodig
6. Execute Phase 1 → No new contracts needed (bug fix) ✓
7. Re-evaluate Constitution Check section ✓
   → No new violations - simple logic fix
   → Update Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Task generation approach defined ✓
9. STOP - Ready for /tasks command ✓
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 will be executed by /tasks command.

## Summary

**Bug**: MIT (Most Important Task) maximum limiet controleert alleen MIT's die vandaag aangemaakt zijn, niet MIT's van vorige dagen die nog steeds in de dagelijkse planning staan.

**Root Cause**: De `/api/prioriteiten/:datum` endpoint filtert alleen op `prioriteit_datum = vandaag`, waardoor MIT's van gisteren die nog in de planning staan niet meegeteld worden.

**Solution**: Bij het controleren van de maximum limiet moeten ALLE MIT's in de dagelijkse planning view geteld worden, ongeacht hun originele `prioriteit_datum`.

## Technical Context
**Language/Version**: JavaScript (Vanilla), Node.js 18+
**Primary Dependencies**: Express.js 4.x, PostgreSQL (via pg), Vercel deployment
**Storage**: PostgreSQL (Neon) - taken tabel met top_prioriteit & prioriteit_datum kolommen
**Testing**: Manual testing op tickedify.com/app (staging: dev.tickedify.com)
**Target Platform**: Web browser (Chrome/Safari/Firefox), Node.js server
**Project Type**: Web (existing) - public/app.js (frontend) + server.js (backend)
**Performance Goals**: <200ms API response, instant UI feedback
**Constraints**: Maximum 3 MITs per dagelijkse planning view
**Scale/Scope**: Single user tijdens development (Jan), voorbereid voor multi-user

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Tickedify Best Practices:**
- ✅ **Backwards Compatibility**: Bug fix mag geen breaking changes introduceren
- ✅ **Data Integrity**: MIT telling moet correct zijn in alle edge cases
- ✅ **User Experience**: Duidelijke foutmeldingen bij overschrijding limiet
- ✅ **Testing**: Handmatige testing op staging voor deployment naar productie
- ✅ **Version Tracking**: Version bump + changelog update verplicht

**Constitution Compliance:**
- ✅ No new architecture patterns needed - gebruik bestaande MIT systeem
- ✅ Geen nieuwe database wijzigingen - gebruik bestaande kolommen
- ✅ Geen nieuwe API endpoints - fix bestaande query logica
- ✅ Volg existing code style en naming conventions

**Complexity Justification**: Geen - dit is een eenvoudige bug fix zonder nieuwe complexiteit.

## Project Structure

### Documentation (this feature)
```
specs/015-in-het-scherm/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (bug analysis)
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)
```
public/
├── app.js               # Frontend - toggleTopPriority() functie (regel ~5900)
└── style.css            # No changes needed

server.js                # Backend - /api/prioriteiten/:datum endpoint (regel ~5857)

ARCHITECTURE.md          # Update na implementatie
public/changelog.html    # Version bump + bug fix entry
package.json             # Version bump
```

**Structure Decision**: Existing web application structure - geen wijzigingen nodig.

## Phase 0: Outline & Research

### Bug Analysis (research.md)

**Problem Diagnosis:**

1. **Current Implementation** (app.js:5900-5915):
   ```javascript
   const response = await fetch(`/api/prioriteiten/${today}`);
   const currentPriorities = response.ok ? await response.json() : [];

   if (currentPriorities.length >= 3) {
       // Block new MIT
   }
   ```

2. **Current API** (server.js:5857-5877):
   ```sql
   SELECT * FROM taken
   WHERE prioriteit_datum = $1 AND user_id = $2 AND top_prioriteit IS NOT NULL
   ORDER BY top_prioriteit
   ```
   - Filtert alleen op `prioriteit_datum = vandaag`
   - MIT's van gisteren hebben `prioriteit_datum = gisteren`
   - Deze MIT's worden NIET meegeteld

3. **User Scenario Bug**:
   - Gisteren: 2 MIT's aangemaakt (prioriteit_datum = 2025-10-14)
   - Deze MIT's niet afgewerkt → staan vandaag nog in planning
   - Vandaag: Gebruiker kan 3 NIEUWE MIT's aanmaken (prioriteit_datum = 2025-10-15)
   - Totaal in planning: 5 MIT's (2 oude + 3 nieuwe) ❌

4. **Why It Works After Login**:
   - Bij page refresh wordt `this.topPrioriteiten` array opnieuw geladen
   - Deze array bevat ALLE MIT's die in de UI zichtbaar zijn
   - Frontend validatie werkt correct met deze data
   - Maar API query filtert nog steeds op datum → inconsistentie

**Root Cause Identified:**
De API endpoint moet NIET filteren op datum wanneer gebruikt voor maximum limiet controle. Het moet ALLE MIT's in de dagelijkse planning view tellen.

**Solution Approach:**
Twee mogelijke oplossingen:

**Option A: Client-side counting** (RECOMMENDED)
- Gebruik `this.topPrioriteiten` array die al geladen is in `toonDagelijksePlanning()`
- Count MIT's lokaal zonder extra API call
- Sneller + consistent met UI state
- Geen backend wijziging nodig

**Option B: Server-side query wijziging**
- Maak nieuwe endpoint `/api/prioriteiten/dagelijkse-planning/:datum`
- Query: Join met dagelijkse_planning tabel om alle MIT's te vinden
- Complexer maar server-authoritative

**Decision: Option A** - Client-side counting
- **Rationale**: Data is al beschikbaar in `this.topPrioriteiten`
- **Advantage**: Geen extra API call, instant validation
- **Risk**: Client state kan out-of-sync zijn (mitigeerd door reload na wijzigingen)

**Output**: research.md created with bug analysis and solution decision.

## Phase 1: Design & Contracts

### Data Model (data-model.md)

**No changes needed** - Bug fix gebruikt bestaande data structures:

**Existing Entity: Taak (MIT)**
- `top_prioriteit`: INTEGER (1-3) - MIT positie
- `prioriteit_datum`: VARCHAR(10) YYYY-MM-DD - Datum waarop MIT gemarkeerd werd
- `lijst`: VARCHAR(50) - Huidige lijst locatie
- `status`: VARCHAR(20) - actief/afgewerkt/uitgesteld

**Existing Frontend State:**
- `this.topPrioriteiten`: Array van taken met MIT status
- `this.planningActies`: Alle acties beschikbaar voor planning
- Geladen in `toonDagelijksePlanning()` (app.js:8114-8120)

### API Contracts

**No new endpoints needed** - Bug fix wijzigt alleen frontend logica.

**Existing Endpoint (unchanged):**
```
GET /api/prioriteiten/:datum
Response: Array<{id, naam, top_prioriteit, prioriteit_datum, ...}>
```

**This endpoint blijft werken voor:**
- Laden van MIT's bij page load
- Tonen van sterretjes in UI
- Maar NIET meer gebruiken voor maximum limiet controle

### Implementation Changes

**File 1: public/app.js**

**Function**: `toggleTopPriority()` (regel ~5900)

**Change**:
```javascript
// VOOR (regel 5906-5915):
const response = await fetch(`/api/prioriteiten/${today}`);
const currentPriorities = response.ok ? await response.json() : [];

if (currentPriorities.length >= 3) {
    checkbox.checked = false;
    toast.error('Maximum 3 top prioriteiten...');
    return;
}

// NA:
// Count MIT's from already loaded topPrioriteiten array
// This includes MIT's from previous days still in planning
const currentMITCount = (this.topPrioriteiten || []).filter(t =>
    t.top_prioriteit !== null &&
    t.top_prioriteit !== undefined
).length;

if (currentMITCount >= 3) {
    checkbox.checked = false;
    toast.error('Maximum 3 Most Important Tasks bereikt');
    return;
}
```

**Rationale**:
- `this.topPrioriteiten` array is al geladen in `toonDagelijksePlanning()`
- Bevat ALLE MIT's die visueel in de planning staan
- Geen extra API call nodig
- Consistent met wat gebruiker ziet in UI

**Edge Case Handling**:
- `this.topPrioriteiten` kan undefined zijn → gebruik `|| []` fallback
- Filter alleen taken waar `top_prioriteit` niet null/undefined is
- Afgewerkte taken worden al uit array verwijderd door bestaande logica

### Agent Context Update

Run update script voor CLAUDE.md:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Output**: No files to create - simple logic change in existing function.

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks for bug fix implementation:
   - Code wijziging in app.js toggleTopPriority()
   - Manual testing scenario's (5 acceptance criteria)
   - Version bump + changelog update
   - Deployment naar staging
   - Production deployment approval

**Ordering Strategy**:
- Sequential: Code → Test → Deploy → Verify
- Manual testing required (geen automated tests voor dit UI gedrag)
- Staging verification vóór productie deployment

**Estimated Output**: 8-10 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Implementation & Validation

**Phase 3**: Task execution (/tasks command created tasks.md) ✅
**Phase 4**: Implementation (v0.19.2 → v0.19.3 correcte fix) ✅
**Phase 5**: Validation (productie test succesvol, v0.19.4) ✅

### Validation Results (v0.19.4)

**Test Environment**: tickedify.com/app (productie)
**Test Account**: jan@buskens.be
**Test Date**: 15 oktober 2025

**Test Scenario 1: Limiet overschreden (4 MIT's aanwezig)**
- Situatie: 4 MIT's in planning (1 nieuwe + 3 oude van 6 oktober)
- Actie: Poging tot 5e MIT toevoegen
- Resultaat: ✅ GEBLOKKEERD met melding "Maximum 3 Most Important Tasks bereikt"

**Test Scenario 2: Exacte limiet (3 MIT's aanwezig)**
- Situatie: 3 MIT's in planning na uitvinken van 1 MIT
- Actie: Poging tot 4e MIT toevoegen
- Resultaat: ✅ GEBLOKKEERD met melding "Maximum 3 Most Important Tasks bereikt"

**Acceptance Criteria Validatie**:
- ✅ AC-1: MIT's van vorige dagen worden meegeteld
- ✅ AC-2: Maximum limiet voorkomt > 3 MIT's
- ✅ AC-3: Duidelijke foutmelding bij overschrijding
- ✅ AC-4: Consistentie na uitlog/inlog (data uit `planningActies`)

**Implementation Journey**:
- v0.19.2: Eerste poging (gefaald) - gebruikte `this.topPrioriteiten` (datum-gefilterd)
- v0.19.3: Correcte fix - gebruikt `this.planningActies` (alle acties)
- v0.19.4: Productie test & documentatie

## Complexity Tracking
*No violations - this section is empty*

This is a straightforward bug fix following existing Tickedify patterns. No architectural deviations or complexity justifications needed.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created
- [x] Phase 4: Implementation complete - v0.19.3 deployed (correcte fix)
- [x] Phase 5: Validation passed - Productie test succesvol (v0.19.4)

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations)
- [x] Post-Design Constitution Check: PASS (simple bug fix)
- [x] All NEEDS CLARIFICATION resolved (bug is well-defined)
- [x] Complexity deviations documented (none - simple fix)

---
*Based on Tickedify Best Practices - See `CLAUDE.md` and `ARCHITECTURE.md`*
