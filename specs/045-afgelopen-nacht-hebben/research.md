# Research: Bulk Edit Prioriteit 404 Bug

**Feature**: 045-afgelopen-nacht-hebben
**Date**: 2025-10-31
**Status**: ✅ Completed

## Problem Statement

Bulk edit van prioriteit veld faalt met 404 "Taak niet gevonden" errors voor ALLE geselecteerde taken, terwijl:
- Task IDs zijn correct (verified in snapshot logging)
- Tasks bestaan in database (36 taken in data source)
- Bulk edit popup UI werkt correct
- Snapshot creatie succesvol (3 taken geïdentificeerd)

## Root Cause Analysis

### Investigation Path

1. **User Hint**: "Afgelopen nacht hebben we een probleem opgelost op het acties scherm, waar er een probleem was als we een bulk edit deden van de context. Er was een probleem dat je een onbestaand veld wou updaten."

2. **Git History Search**: Found commit 48975cb (v0.20.39) from last night:
   ```
   🎯 FIX: Property name typo in collectBulkEditUpdates - contextId & projectId fix
   - Fixed updates.context → updates.contextId (line 413)
   - Fixed updates.project_id → updates.projectId (line 401)
   - Root cause: database.updateTask() expects camelCase property names
   ```

3. **Initial Hypothesis**: Prioriteit heeft hetzelfde field name mapping probleem
   - **REJECTED**: `collectBulkEditUpdates()` gebruikt al correcte 'prioriteit' naam (line 419)
   - Context fix was over field NAME, dit probleem is anders

4. **Database Schema Check**:
   ```sql
   prioriteit VARCHAR(10) DEFAULT 'gemiddeld'
   CHECK (prioriteit IN ('laag', 'gemiddeld', 'hoog'))
   ```
   - Database heeft CHECK constraint voor geldige waarden
   - Alleen 'laag', 'gemiddeld', 'hoog' toegestaan

5. **Frontend Dropdown Check**:
   ```html
   <select id="bulkEditPriority">
       <option value="">-- Geen wijziging --</option>
       <option value="laag">Laag</option>
       <option value="normaal">Normaal</option>    <!-- ❌ BUG! -->
       <option value="hoog">Hoog</option>
   </select>
   ```
   - **ROOT CAUSE FOUND**: Dropdown stuurt `'normaal'` maar database verwacht `'gemiddeld'`

6. **API Flow Verification**:
   ```
   Frontend → collectBulkEditUpdates() → {prioriteit: 'normaal'}
   ↓
   Server → PUT /api/taak/:id → db.updateTask(id, {prioriteit: 'normaal'}, userId)
   ↓
   Database → UPDATE taken SET prioriteit = 'normaal' WHERE id = ... AND user_id = ...
   ↓
   PostgreSQL CHECK CONSTRAINT FAILS → 0 rows affected
   ↓
   db.updateTask() returns false (line 816: return result.rowCount > 0)
   ↓
   Server → res.status(404).json({ error: 'Taak niet gevonden' }) (line 5333)
   ```

### Why 404 Instead of 400/500?

**Design Pattern**: `db.updateTask()` returns boolean `success`
- `true` = rows updated → 200 OK
- `false` = no rows updated → 404 "Taak niet gevonden"

**Rationale**: False return kan betekenen:
1. Task ID bestaat niet
2. userId matcht niet (security check)
3. UPDATE failed om andere reden (zoals constraint violation)

All cases worden behandeld als "task not accessible" → 404 is semantic correct voor API consumer.

### Consistency Check

**Other dropdowns in applicatie**:
1. Filter bar (app.js line 3797): `value="gemiddeld"` ✅ CORRECT
2. Task create/edit prioriteitSelect: `'gemiddeld'` ✅ CORRECT
3. prioriteitConfig mapping (app.js line 6222): `'gemiddeld'` ✅ CORRECT

**Conclusion**: Bulk edit modal is ENIGE plaats met inconsistente 'normaal' waarde.

## Solution Decision

### Option 1: Fix HTML Dropdown (CHOSEN)
**Change**: `<option value="normaal">` → `<option value="gemiddeld">`

**Pros**:
- ✅ Single file, single line change
- ✅ Consistent met rest van applicatie
- ✅ Zero database migration
- ✅ Zero JavaScript wijzigingen
- ✅ Zero API changes
- ✅ Follows established convention

**Cons**:
- None (this is the correct fix)

### Option 2: Change Database Constraint (REJECTED)
**Change**: `CHECK (prioriteit IN ('laag', 'gemiddeld', 'hoog', 'normaal'))`

**Pros**:
- HTML dropdown hoeft niet aangepast

**Cons**:
- ❌ Breekt consistency met rest van applicatie
- ❌ Vereist database migratie (ALTER TABLE)
- ❌ Introduceert twee synoniemen voor zelfde concept
- ❌ Alle andere code gebruikt 'gemiddeld' - inconsistentie blijft
- ❌ 'gemiddeld' is established convention sinds app begin

### Option 3: Map in collectBulkEditUpdates() (REJECTED)
**Change**: Add mapping `if (priority === 'normaal') priority = 'gemiddeld';`

**Pros**:
- HTML dropdown hoeft niet aangepast

**Cons**:
- ❌ Adds unnecessary complexity
- ❌ Band-aid over root cause
- ❌ Doesn't fix inconsistency
- ❌ Future maintenance confusion

## Implementation Details

### File Changes Required
1. **public/index.html** (line ~1156):
   ```diff
   - <option value="normaal">Normaal</option>
   + <option value="gemiddeld">Normaal</option>
   ```

2. **package.json**:
   ```diff
   - "version": "0.20.40",
   + "version": "0.20.41",
   ```

3. **public/changelog.html**:
   Add v0.20.41 entry with 🔧 FIX category

### Testing Strategy
1. **API Direct Test**: `curl` met `{prioriteit: 'gemiddeld'}` → expect 200 OK
2. **Browser Manual Test**: Select "Normaal" in bulk edit → verify update succeeds
3. **Regression Test**: Verify 'laag' en 'hoog' still work correctly
4. **UI Consistency Test**: Verify prioriteit indicator shows correct color/icon

### Deployment Plan
1. Feature branch `045-afgelopen-nacht-hebben` (already created)
2. Implement fix on feature branch
3. Merge to `staging` branch
4. Vercel auto-deploys to dev.tickedify.com
5. Test on staging environment
6. Wait for bèta freeze lift before production deployment

## Related Issues & Prevention

### Why Did This Bug Exist?
Possible reasons:
1. Original developer used 'normaal' as more intuitive Dutch word
2. Database constraint was added later with 'gemiddeld' standard
3. Bulk edit modal was created separately from main task form
4. No consistency check across dropdown options

### Prevention Measures
1. **Code Review**: Check dropdown values match database constraints
2. **Integration Tests**: Test bulk edit with all prioriteit waarden
3. **Database Constraint Documentation**: Document valid values in schema comments
4. **Shared Constants**: Consider extracting prioriteit values to shared constant

### Similar Bugs to Watch For
- Other bulk edit fields might have similar value mismatches
- Check `bulkEditTime` (estimated_time_minutes) - format consistent?
- Check other modals/forms for dropdown value consistency

## Technical Decisions Log

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Fix HTML dropdown | Simplest, most consistent solution | Database constraint change, JavaScript mapping |
| Keep 'gemiddeld' | Established convention in 99% of codebase | Switching all to 'normaal' |
| Minimal change approach | YAGNI principle, no over-engineering | Refactoring to shared constants (overkill for bug fix) |
| Staging deployment only | Bèta freeze active, respect constitution | Direct production fix (violates principle I) |

## Research Artifacts

### Console Logs Analysis
From user-provided error logs:
```
🟡 [BULK EDIT EXECUTE] Updates payload: {prioriteit: 'normaal'}
PUT https://dev.tickedify.com/api/taak/task_1759150017759_q16qw458u 404 (Not Found)
🟡 [BULK EDIT EXECUTE] ❌ FAILED for task task_1759150017759_q16qw458u: {"error":"Taak niet gevonden"}
```

**Key Insight**: Payload shows `{prioriteit: 'normaal'}` being sent. This confirmed the value mismatch hypothesis.

### Database Schema Source
**File**: `database.js` - line ~180-210
**Key Finding**: CHECK constraint explicitly limits values

### Git Blame Analysis
**File**: `public/index.html` - bulkEditPriority section
**Finding**: 'normaal' was in original bulk edit modal implementation
**Lesson**: Original implementation didn't verify against database constraints

## Conclusion

**Root Cause**: Frontend-database value mismatch
**Fix**: Single line HTML change
**Impact**: Zero risk, high benefit
**Complexity**: Minimal (1 file, 1 word change)
**Testing**: Straightforward API + browser testing

✅ Research complete. Ready for implementation.
