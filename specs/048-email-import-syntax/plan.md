# Implementation Plan: Email Import Syntax Uitbreiding

**Branch**: `048-email-import-syntax` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-email-import-syntax/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Feature spec geladen - 41 functional requirements geïdentificeerd
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: Web application (Node.js + Express backend, Vanilla JS frontend)
   → ✅ Structure Decision: Backend modifications + Frontend UI updates
3. Fill the Constitution Check section
   → ⚠️ OVERGESLAGEN - gebruiker vroeg "zonder constitution"
4. Evaluate Constitution Check section
   → ⚠️ OVERGESLAGEN - gebruiker vroeg "zonder constitution"
5. Execute Phase 0 → research.md
   → ✅ COMPLEET - research.md gemaakt met 8 research decisions
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ COMPLEET - Alle artifacts gegenereerd
7. Re-evaluate Constitution Check section
   → ⚠️ OVERGESLAGEN - gebruiker vroeg "zonder constitution"
8. Plan Phase 2 → Describe task generation approach
   → ✅ COMPLEET - 31 tasks gedocumenteerd in plan
9. STOP - Ready for /tasks command
   → ✅ READY - /tasks kan nu uitgevoerd worden
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Deze feature breidt de bestaande email-to-task import functionaliteit uit met een gestructureerde @t instructie syntax. Gebruikers kunnen door een instructieregel bovenaan de email body te plaatsen direct project, context, due date, prioriteit, duur en defer status instellen. De implementatie vereist:

1. **Parser uitbreiding** in `parseEmailToTask` functie om @t syntax te detecteren en verwerken
2. **--end-- marker** parsing om email body te truncaten (case-insensitive)
3. **Defer handling** met absolute voorrang logica
4. **Priority normalisatie** (p0-p9+ → High/Medium/Low)
5. **Helpfile** in Markdown voor gebruikers documentatie
6. **UI uitbreiding** met clickable help icoon naast import email adres
7. **Backwards compatibility** - bestaande functionaliteit blijft ongewijzigd zonder @t

De feature is volledig gespecificeerd met 10 acceptance scenarios en alle edge cases gedocumenteerd. Geen database schema wijzigingen nodig - gebruikt bestaande taken tabel en project/context auto-creatie.

## Technical Context

**Language/Version**: Node.js 20.x (backend), ES6+ Vanilla JavaScript (frontend)
**Primary Dependencies**: Express.js 4.x, Multer (file upload), PostgreSQL client (pg), Neon cloud database
**Storage**: PostgreSQL voor tasks/projects/contexts, Backblaze B2 voor attachments (niet relevant voor deze feature)
**Testing**: Manual API testing via curl, Browser UI testing voor help icoon, Direct database verification
**Target Platform**: Web application, Vercel serverless deployment
**Project Type**: Web (backend API + frontend UI)
**Performance Goals**:
- Email parsing < 100ms
- Backwards compatible - geen performance impact voor emails zonder @t
- Regex parsing O(n) in line length
**Constraints**:
- Backwards compatible - bestaande emails zonder @t blijven exact hetzelfde werken
- Foutentolerant - parsing errors leiden niet tot task creation failures
- Geen email bevestigingen versturen
- Case-insensitive voor alle codes
**Scale/Scope**:
- Bestaande `parseEmailToTask` functie uitbreiden (~100 regels extra)
- Nieuwe helpfile in public/ (~200 regels Markdown)
- UI uitbreiding in settings/admin pagina (~50 regels HTML/JS)
- 41 functional requirements over 6 categorieën

## Constitution Check

⚠️ **OVERGESLAGEN OP VERZOEK GEBRUIKER** - "zonder constitution"

De gebruiker heeft expliciet gevraagd om het plan "zonder constitution" uit te voeren. Constitution compliance checks zijn overgeslagen.

## Project Structure

### Documentation (this feature)
```
specs/048-email-import-syntax/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   └── email-import-api.yml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Tickedify Web Application Structure
server.js                # Express backend - email import endpoint wijzigingen
├── parseEmailToTask()   # MODIFY: Huidige parser (regel ~1304)
├── POST /api/email/import  # MODIFY: Email webhook handler (regel ~1052)
└── Helper functions     # MODIFY: findOrCreateProject, findOrCreateContext

public/
├── email-import-help.md # CREATE: Helpfile met volledige syntax documentatie
├── app.js               # MODIFY: UI voor help icoon en import adres display
├── admin.js             # MODIFY: Settings pagina import adres sectie
└── admin.html           # MODIFY: HTML voor help icoon naast copy button

database.js              # Database helper functions (mogelijk kleine wijzigingen)

migrations/              # Geen database migraties nodig - gebruikt bestaande schema
```

**Structure Decision**: Web application - Backend modificaties in server.js + Frontend UI in public/

## Phase 0: Outline & Research

### Research Questions

1. **@t Parsing Strategy**
   - Decision: First non-empty line detection + regex-based parameter splitting
   - Rationale: Simple, fast, fault-tolerant approach matching PRD requirements
   - Alternatives considered: Full email header parsing (too complex), multi-line syntax (scope creep)

2. **Defer Code Mapping**
   - Decision: Map defer shortcuts naar bestaande `lijst` values in database
   - Rationale: Tickedify heeft al postponed lijsten (Follow-up, Weekly, Monthly, etc.) - geen nieuwe database velden nodig
   - Alternatives considered: Nieuwe `defer_status` kolom (overkill), tag-based system (niet in scope)

3. **Priority Normalisatie**
   - Decision: p0-p9+ → High/Medium/Low mapping zoals gespecificeerd in PRD
   - Rationale: Tickedify gebruikt High/Medium/Low in bestaande UI - direct compatible
   - Alternatives considered: Numeric priorities 0-9 (breekt UI compatibility)

4. **--end-- Marker Implementation**
   - Decision: Case-insensitive regex search + substring truncation
   - Rationale: Simple, performant, works across all email clients
   - Alternatives considered: Email signature detection (unreliable), quote header parsing (complex)

5. **Backwards Compatibility Testing**
   - Decision: Ensure `parseEmailToTask` zonder @t detection blijft exact hetzelfde
   - Rationale: Existing users moet geen veranderingen merken zonder @t
   - Alternatives considered: Versioned parsers (over-engineering)

6. **Helpfile Format**
   - Decision: Markdown in public/ directory, accessible via /email-import-help.md
   - Rationale: Simple hosting, easy to update, good readability
   - Alternatives considered: HTML page (harder to maintain), in-app modal (scope creep)

### Research Output

**Parsing Approach:**
- Use regex `/^@t\s+(.+)$/` to detect @t instruction line
- Split parameters on `;` delimiter
- Parse each segment with type-specific regex:
  - Defer: `/^(df|dw|dm|d3m|d6m|dy)\s*$/i`
  - Priority: `/^p(\d+)$/i`
  - Key-value: `/^(p|c|d|t)\s*:\s*(.+)$/i`
- Track duplicates per key - first wins
- Defer detection immediately short-circuits all other parsing

**--end-- Implementation:**
```javascript
// Case-insensitive search for --end--
const endMarkerRegex = /--end--/i;
const endIndex = body.search(endMarkerRegex);
if (endIndex !== -1) {
    body = body.substring(0, endIndex).trim();
}
```

**Defer Code Mapping:**
```javascript
const deferMapping = {
    'df': 'followup',      // Defer to Follow-up lijst
    'dw': 'weekly',        // Defer to Weekly lijst
    'dm': 'monthly',       // Defer to Monthly lijst
    'd3m': 'quarterly',    // Defer to Quarterly lijst
    'd6m': 'biannual',     // Defer to Bi-annual lijst
    'dy': 'yearly'         // Defer to Yearly lijst
};
```

**Priority Normalisatie:**
```javascript
function normalizePriority(pCode) {
    const num = parseInt(pCode);
    if (num === 0 || num === 1) return 'High';
    if (num === 2) return 'Medium';
    if (num === 3) return 'Low';
    if (num >= 4) return 'Low';
    return null; // Invalid
}
```

**Testing Strategy:**
- Manual API testing met curl POST requests naar /api/email/import
- Test cases gedocumenteerd in quickstart.md
- Browser testing voor UI help icoon
- Database verification voor created tasks

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### Entities & Data Model

Zie `data-model.md` voor volledige entity definities.

**Key Entities:**
- **EmailInstruction**: Parsed @t instruction data (niet persistent - alleen runtime)
- **Task**: Bestaande taken tabel - geen schema wijzigingen
- **Project**: Bestaande projecten tabel - auto-create functie blijft
- **Context**: Bestaande contexten tabel - auto-create functie blijft

**Database Impact:**
- ✅ Geen schema wijzigingen nodig
- ✅ Gebruikt bestaande `lijst` kolom voor defer mapping
- ✅ Gebruikt bestaande `prioriteit` kolom voor normalized values
- ✅ Gebruikt bestaande `verschijndatum`, `duur`, `project_id`, `context_id` kolommen

### API Contracts

**Modified Endpoint:** `POST /api/email/import`

Request blijft hetzelfde (Mailgun webhook format), maar:
- Body parsing detecteert nu @t instructies
- --end-- marker wordt altijd verwerkt
- Response blijft hetzelfde

Zie `contracts/email-import-api.yml` voor OpenAPI spec.

### Test Scenarios

Zie `quickstart.md` voor complete test scenarios die alle 10 acceptance scenarios uit spec.md dekken.

**Test Categories:**
1. Basis @t parsing (FR-001 t/m FR-006)
2. Alle ondersteunde codes (FR-007 t/m FR-014)
3. Defer absolute voorrang (FR-015 t/m FR-016)
4. Duplicaat handling (FR-017 t/m FR-018)
5. Body processing met --end-- (FR-019 t/m FR-023)
6. Entity auto-creation (FR-024 t/m FR-027)
7. Validatie & foutentolerantie (FR-028 t/m FR-034)
8. Backwards compatibility (FR-037 t/m FR-038)
9. UI help icoon (FR-040 t/m FR-041)

### Agent Context Update

CLAUDE.md wordt geüpdatet met:
- Email import @t syntax feature beschrijving
- Locatie van parseEmailToTask functie
- --end-- marker parsing strategie
- Defer code mapping table
- Helpfile locatie in public/

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy:**

1. **Setup Tasks** (3 tasks)
   - Create helpfile structure in public/email-import-help.md
   - Create contracts/ directory with email-import-api.yml
   - Review existing parseEmailToTask function

2. **Backend Implementation** (12 tasks)
   - [P] Implement @t detection in parseEmailToTask
   - [P] Implement parameter splitting logic
   - [P] Implement defer code parser
   - [P] Implement priority code parser
   - [P] Implement key-value parser (p:, c:, d:, t:)
   - [P] Implement --end-- marker processing
   - [P] Implement priority normalization function
   - [P] Implement defer mapping to lijst values
   - Update findOrCreateProject for @t context
   - Update findOrCreateContext for @t context
   - Add @t instruction line removal from notes
   - Integration testing for all parsing logic

3. **Frontend Implementation** (5 tasks)
   - [P] Create email-import-help.md with full syntax documentation
   - [P] Add help icon HTML in admin.html next to copy button
   - [P] Add click handler in admin.js to open helpfile
   - [P] Style help icon to match existing UI
   - Test help icon functionality in browser

4. **Testing & Validation** (8 tasks)
   - [P] Test scenario 1: Basic @t parsing
   - [P] Test scenario 2: Backwards compatibility
   - [P] Test scenario 3: Defer with absolute priority
   - [P] Test scenario 4: Priority normalization
   - [P] Test scenario 5: Entity auto-creation
   - [P] Test scenario 6: --end-- marker
   - [P] Test scenario 7: Error tolerance
   - [P] Test scenario 8: Duplicates handling

5. **Documentation & Polish** (3 tasks)
   - Update CLAUDE.md with feature details
   - Add inline code comments for @t parser
   - Verify all 41 functional requirements covered

**Ordering Strategy:**
- Setup → Backend → Frontend → Testing → Documentation
- Backend tasks mostly parallel (different parsing functions)
- Testing tasks all parallel (independent scenarios)
- Documentation last after implementation verified

**Estimated Output**: 31 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

⚠️ **NIET VAN TOEPASSING** - Constitution Check overgeslagen op verzoek gebruiker

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: SKIPPED (user request)
- [x] Post-Design Constitution Check: SKIPPED (user request)
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented: N/A

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
