
# Implementation Plan: Fix Bulk Edit Prioriteit 404 Errors

**Branch**: `045-afgelopen-nacht-hebben` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/045-afgelopen-nacht-hebben/spec.md`

## Execution Flow (/plan command scope)
```
✅ 1. Load feature spec from Input path
✅ 2. Fill Technical Context (scan for NEEDS CLARIFICATION)
✅ 3. Fill the Constitution Check section
✅ 4. Evaluate Constitution Check section
✅ 5. Execute Phase 0 → research.md
⏳ 6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   7. Re-evaluate Constitution Check section
   8. Plan Phase 2 → Describe task generation approach
   9. STOP - Ready for /tasks command
```

## Summary

**Bug Fix**: Bulk edit prioriteit faalt met 404 errors door mismatch tussen frontend waarde `'normaal'` en database constraint die `'gemiddeld'` verwacht.

**Root Cause**: HTML dropdown in `public/index.html` voor bulk edit modal gebruikt `<option value="normaal">` terwijl database schema CHECK constraint vereist `prioriteit IN ('laag', 'gemiddeld', 'hoog')`. Dit veroorzaakt SQL UPDATE met 0 rows affected → `db.updateTask()` returns false → server stuurt 404.

**Solution**: Eén karakter wijziging: `normaal` → `gemiddeld` in bulk edit dropdown (line ~1156 in index.html).

## Technical Context
**Language/Version**: JavaScript (ES6+), Node.js 18+, PostgreSQL 14+
**Primary Dependencies**: Express.js (backend), Vanilla JavaScript (frontend), pg (PostgreSQL driver)
**Storage**: PostgreSQL (Neon cloud database) - taken table met prioriteit VARCHAR(10) CHECK constraint
**Testing**: Direct API testing via curl, browser manual testing op dev.tickedify.com
**Target Platform**: Web application - Vercel deployment
**Project Type**: web (frontend: public/*.html,js, backend: server.js, database: database.js)
**Performance Goals**: <200ms API response time, instant UI feedback
**Constraints**: Bèta freeze active - alleen staging deployment toegestaan
**Scale/Scope**: Single HTML file change, zero database migration required

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Beta Freeze - Production Stability (NON-NEGOTIABLE)
- **Status**: COMPLIANT
- Feature branch `045-afgelopen-nacht-hebben` actief
- Staging-only deployment naar dev.tickedify.com
- Geen productie deployment tot freeze lift
- Bug fix heeft GEEN productie impact (alleen staging testing)

### ✅ II. Staging-First Deployment
- **Status**: COMPLIANT
- Workflow: feature branch → staging merge → dev.tickedify.com deployment
- Testing op dev.tickedify.com met jan@buskens.be credentials
- Vercel automatische deployment binnen 30-60 seconden

### ✅ III. Gespecialiseerde Sub-Agents
- **Status**: COMPLIANT
- Dit is eenvoudige bug fix, geen sub-agent nodig
- Complexiteit: 1 HTML file, 1 option value wijziging
- Testing kan via tickedify-testing agent indien nodig

### ✅ IV. Versioning & Changelog Discipline
- **Status**: COMPLIANT
- Version bump: 0.20.40 → 0.20.41 (patch)
- Changelog entry: 🔧 FIX: Bulk edit prioriteit waarde 'normaal' → 'gemiddeld' fix
- Update public/changelog.html met fix details

### ✅ V. Deployment Verification Workflow
- **Status**: COMPLIANT
- Check /api/version endpoint na 15 seconden
- Herhaal elke 15 seconden tot 2 minuten timeout
- Gebruik `curl -s -L -k` voor API verificatie

### ✅ VI. Test-First via API (NON-NEGOTIABLE)
- **Status**: COMPLIANT
- Test plan: Direct API testing met PUT /api/taak/:id
- Payload: `{prioriteit: 'gemiddeld'}` (na fix)
- Verify via GET /api/lijst/acties dat prioriteit correct is opgeslagen
- Manual browser test voor UI consistency

**Constitution Compliance**: ✅ ALL CHECKS PASSED

## Project Structure

### Documentation (this feature)
```
specs/045-afgelopen-nacht-hebben/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (completed)
├── data-model.md        # N/A (no data model changes)
├── quickstart.md        # Phase 1 output (test procedure)
└── contracts/           # N/A (no API contract changes)
```

### Source Code (repository root)
```
public/
├── index.html           # CHANGED: Bulk edit modal dropdown fix
├── app.js               # UNCHANGED: collectBulkEditUpdates already correct
└── changelog.html       # CHANGED: Version 0.20.41 entry

server.js                # UNCHANGED: PUT /api/taak/:id endpoint correct
database.js              # UNCHANGED: updateTask() logic correct
package.json             # CHANGED: Version 0.20.40 → 0.20.41
```

**Structure Decision**: Web application (Option 2) - frontend/backend separation

## Phase 0: Outline & Research

**Research Status**: ✅ COMPLETED

### Research Findings

#### 1. Historical Context - Previous Bug Fix (v0.20.39)
**Git commit 48975cb** (2025-10-31 01:53:58):
```
🎯 FIX: Property name typo in collectBulkEditUpdates - contextId & projectId fix
- Fixed updates.context → updates.contextId (line 413)
- Fixed updates.project_id → updates.projectId (line 401)
- Root cause: database.updateTask() expects camelCase property names
```

**Key insight**: Context fix was about camelCase field name mapping in `collectBulkEditUpdates()`. Current prioriteit bug is DIFFERENT - it's about WAARDE mismatch, niet veldnaam.

#### 2. Database Schema Analysis
**File**: `database.js` - taken table schema (line ~180):
```sql
prioriteit VARCHAR(10) DEFAULT 'gemiddeld'
CHECK (prioriteit IN ('laag', 'gemiddeld', 'hoog'))
```

**Constraint**: Alleen 'laag', 'gemiddeld', 'hoog' toegestaan. Elke andere waarde → CHECK constraint violation → 0 rows affected.

#### 3. Frontend Code Analysis
**File**: `public/app.js` - collectBulkEditUpdates() (line 417-420):
```javascript
const priority = document.getElementById('bulkEditPriority').value;
if (priority) {
    updates.prioriteit = priority;  // ✅ CORRECT: uses 'prioriteit' not 'priority'
}
```

**Finding**: Frontend JavaScript is CORRECT - gebruikt 'prioriteit' (camelCase match voor database).

#### 4. HTML Dropdown Analysis
**File**: `public/index.html` - bulkEditPriority dropdown (line ~1156):
```html
<select id="bulkEditPriority">
    <option value="">-- Geen wijziging --</option>
    <option value="laag">Laag</option>
    <option value="normaal">Normaal</option>    <!-- ❌ BUG: moet 'gemiddeld' zijn -->
    <option value="hoog">Hoog</option>
</select>
```

**ROOT CAUSE FOUND**: Dropdown stuurt `'normaal'` maar database verwacht `'gemiddeld'`.

#### 5. Backend API Flow Analysis
**File**: `server.js` - PUT /api/taak/:id endpoint (line 5159-5334):
```javascript
// Line 5326: Normal task update
const success = await db.updateTask(id, req.body, userId);

if (success) {
    res.json({ success: true });  // 200 OK
} else {
    res.status(404).json({ error: 'Taak niet gevonden' });  // ❌ 404 ERROR
}
```

**File**: `database.js` - updateTask() method (line 743-884):
```javascript
// Line 780: Falls through to direct column assignment
else {
    fields.push(`${key} = $${paramIndex}`);  // prioriteit → prioriteit (no mapping)
}

// Line 796: Execute query
const result = await pool.query(query, values);

// Line 816: Return based on rows affected
return result.rowCount > 0;  // Returns false if constraint violation → 0 rows
```

**Finding**:
1. Frontend stuurt: `{prioriteit: 'normaal'}`
2. Database UPDATE query: `UPDATE taken SET prioriteit = 'normaal' WHERE id = ...`
3. PostgreSQL CHECK constraint FAILS: 'normaal' not in ('laag', 'gemiddeld', 'hoog')
4. Result: 0 rows updated
5. db.updateTask() returns `false`
6. Server responds: 404 "Taak niet gevonden"

#### 6. Consistency Check - Other Dropdowns
**File**: `public/app.js` - Filter bar (line 3795-3799):
```html
<option value="hoog">🔴 Hoog</option>
<option value="gemiddeld">🟠 Gemiddeld</option>  <!-- ✅ CORRECT -->
<option value="laag">⚪ Laag</option>
```

**File**: `public/app.js` - prioriteitSelect for task create/edit (line 6222-6224):
```javascript
const prioriteitConfig = {
    'hoog': { label: 'Hoog', color: '#FF4444', icon: 'fas fa-circle' },
    'gemiddeld': { label: 'Gemiddeld', color: '#FF9500', icon: 'fas fa-circle' },  // ✅ CORRECT
    'laag': { label: 'Laag', color: '#8E8E93', icon: 'fas fa-circle' }
};
```

**Finding**: ALLE andere delen van applicatie gebruiken correct `'gemiddeld'`. Alleen bulk edit modal heeft inconsistente `'normaal'` waarde.

### Decision: Minimal Fix Approach

**Rationale**:
- Alleen HTML dropdown fix vereist
- Geen JavaScript wijzigingen nodig
- Geen database migratie nodig
- Geen API endpoint wijzigingen nodig
- Consistent met rest van applicatie

**Alternative Considered**: Database constraint wijzigen om 'normaal' toe te staan
**Rejected Because**:
- Breekt consistency met rest van applicatie
- Vereist database migratie
- Voegt onnodige complexity toe
- 'gemiddeld' is al de established convention

**Output**: research.md (see separate file)

## Phase 1: Design & Contracts

### Data Model
**Status**: N/A - Geen data model wijzigingen
**Rationale**: Bug fix in frontend dropdown, database schema blijft ongewijzigd

### API Contracts
**Status**: N/A - Geen API contract wijzigingen
**Rationale**:
- PUT /api/taak/:id endpoint blijft identiek
- Request body schema ongewijzigd: `{prioriteit: string}`
- Response schema ongewijzigd: `{success: boolean}` of `{error: string}`
- Alleen WAARDE van prioriteit wijzigt ('normaal' → 'gemiddeld')

### Quickstart / Test Procedure
**File**: `quickstart.md` - Manual testing procedure voor deze bug fix

**Test Scenario 1: Bulk Edit Prioriteit Update**
```
GIVEN: 3 taken geselecteerd op acties scherm
WHEN: Bulk edit popup geopend
  AND: Prioriteit dropdown gewijzigd naar "Normaal"
  AND: Opslaan geklikt
THEN: Alle 3 taken succesvol geüpdatet met prioriteit='gemiddeld'
  AND: Geen 404 errors in console
  AND: Taken tonen correcte prioriteit indicator in UI
```

**Test Scenario 2: API Direct Testing**
```bash
# Test via curl (staging environment)
TASK_ID="task_1759150017759_q16qw458u"  # Use actual task ID from dev.tickedify.com
TOKEN="<session-token>"  # Get from browser DevTools

curl -s -L -k -X PUT \
  "https://dev.tickedify.com/api/taak/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=${TOKEN}" \
  -d '{"prioriteit": "gemiddeld"}'

# Expected: {"success": true}
# Before fix would return: {"error": "Taak niet gevonden"}
```

**Test Scenario 3: Regression Check**
```
Verify andere prioriteit waarden werken:
- "laag" → SUCCESS
- "gemiddeld" → SUCCESS
- "hoog" → SUCCESS
- "" (empty/geen wijziging) → SUCCESS (geen update)
```

### Agent File Update
**Status**: N/A - Minimal bug fix, geen agent context update nodig
**Rationale**:
- Constitution principe III: Sub-agents voor complexe taken
- Deze fix: 1 HTML option value wijziging
- Te simpel voor agent context tracking
- Geen nieuwe technologie of patterns

**Output**: quickstart.md created

## Phase 1 Status
- [x] research.md completed (Phase 0)
- [x] quickstart.md created
- [x] data-model.md: N/A (no changes)
- [x] contracts/: N/A (no changes)
- [x] Agent file: N/A (not needed)

**Gate Check**: ✅ READY FOR PHASE 2 PLANNING

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. HTML file modification task (single file change)
2. Version bump task (package.json)
3. Changelog update task (public/changelog.html)
4. Deployment task (staging merge + push)
5. Verification task (API testing + browser testing)

**Ordering Strategy**:
1. Fix HTML dropdown (blocking voor alle andere tasks)
2. Update version + changelog (parallel na fix)
3. Commit + push naar staging
4. Deployment verification (wacht op Vercel deployment)
5. Functional testing (manual browser test + API test)

**Estimated Output**: 5-7 straightforward tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks following TDD principles where applicable)
**Phase 5**: Validation (quickstart.md test procedure + API verification)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: N/A - No constitution violations

All constitution principles complied with:
- ✅ Beta freeze respected (staging only)
- ✅ Staging-first deployment workflow
- ✅ No sub-agent needed (simple fix)
- ✅ Version + changelog discipline
- ✅ Deployment verification protocol
- ✅ Test-first via API approach

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
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (prioriteit waarden: laag/gemiddeld/hoog)
- [x] Complexity deviations: NONE (no violations)

**Research Decisions**:
- [x] Root cause identified: HTML dropdown waarde mismatch
- [x] Fix approach decided: Change 'normaal' → 'gemiddeld' in index.html
- [x] Alternatives evaluated: Database constraint wijziging rejected
- [x] Test strategy defined: API + manual browser testing

---
*Implementation plan complete. Ready for /tasks command to generate execution tasks.*

*Based on Tickedify Constitution v1.0.0 - See `.specify/memory/constitution.md`*
