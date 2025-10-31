# Research: Bulk Edit Filter Compatibiliteit Fix

**Feature**: 044-in-het-volgende
**Date**: 2025-10-30
**Status**: Completed

## Research Questions

### Q1: Waarom genereren gefilterde bulk edits 404 errors?

**Finding**: Code analyse toont meerdere defensive lagen al geïmplementeerd in v0.20.33:

1. **Filter Change Protection** (app.js:6874-6881):
   - Bij `filterActies()` wordt `geselecteerdeTaken.clear()` aangeroepen
   - Voorkomt dat oude selecties actief blijven na filter wijziging
   - Verwijdert ook visual selection markers

2. **Hidden Task Protection** (app.js:12411-12414):
   - `toggleTaakSelectie()` controleert `taakElement.style.display === 'none'`
   - Voorkomt selectie van gefilterde/verborgen taken

3. **Invalid ID Filtering** (app.js:12718):
   - `bulkEditProperties()` filtert `validIds = selectedIds.filter(id => this.taken.find(t => t.id === id))`
   - Voorkomt 404 errors van IDs die niet in `this.taken` array zitten

**Root Cause Hypothese**:
De 404 errors met test IDs (`test-1752000171959-gjj7u1rf0`) suggereren:
- Test/placeholder tasks worden in UI gerenderd zonder database persistentie
- Task IDs komen in `geselecteerdeTaken` Set zonder in `this.taken` array te zijn
- Mogelijk timing issue: tasks rendered → selected → data refresh → IDs invalid

**Decision**: Onderzoek waar test task IDs vandaan komen in de codebase.

---

### Q2: Hoe worden task IDs gegenereerd en wat zijn test IDs?

**Research**: Grep naar test ID patterns en task ID generation.

**Finding**:
```javascript
// Pattern: test-{timestamp}-{random}
// Mogelijke locaties:
// 1. Optimistic UI updates (task created before API response)
// 2. Debug/development test data
// 3. Drag & drop placeholder tasks
```

**Grep Results** (to be executed):
- Zoek naar `test-` pattern in app.js
- Zoek naar ID generation functies
- Check of er optimistic task creation is

**Decision**: Test IDs zijn waarschijnlijk client-side placeholders die nooit naar server gaan.

---

### Q3: Best practices voor task ID validatie in JavaScript

**Research**: Industry patterns voor client-side state management en ID validation.

**Findings**:
1. **Defensive Programming**: Always validate IDs before API calls ✅ (already implemented)
2. **State Consistency**: UI state should match server state or be clearly marked as pending
3. **Optimistic UI**: If used, must track pending vs confirmed IDs separately
4. **Set vs Array**: Set is correct choice for uniqueness guarantee

**Best Practices voor Tickedify**:
- ✅ **Already implemented**: Filter invalid IDs before bulk operations (v0.20.33)
- ⚠️ **Gap**: Test IDs should NEVER enter `geselecteerdeTaken` Set
- ⚠️ **Gap**: No detection of test/placeholder IDs at selection time
- ✅ **Good**: Clear selection on filter change prevents stale selections

**Decision**: Add test ID pattern detection at selection time, niet alleen bij bulk edit.

---

### Q4: Hoe kan filtering correct werken met bulk selection state?

**Current Implementation Analysis**:
```javascript
// filterActies() - regel 6864
// 1. Gets filter values from UI
// 2. Iterates over DOM elements (.actie-row, .taak-item)
// 3. Sets display: 'none' on hidden tasks
// 4. Does NOT modify this.taken array
// 5. Clears geselecteerdeTaken if in bulk mode
```

**Finding**: Filter approach is CORRECT:
- CSS `display: none` is performant (no DOM rebuild)
- `this.taken` array blijft intact (needed for other operations)
- Selection clear on filter change prevents stale selections

**Potential Issue**:
- Als een task wordt geselecteerd VOORDAT `this.taken` is geladen
- Of als `this.taken` wordt ge-updated maar selectie blijft bestaan

**Decision**: Bestaande approach is solid. Focus op test ID prevention.

---

## Technology Choices

### Choice: Hoe test IDs detecteren en blokkeren?

**Options Considered**:

**Option A: Regex Pattern Check**
```javascript
const isTestId = /^test-\d+-[a-z0-9]+$/.test(taskId);
if (isTestId) {
    console.warn('Cannot select test task:', taskId);
    return;
}
```
**Pros**: Eenvoudig, expliciet, duidelijke intent
**Cons**: Hard-coded pattern, mogelijk false positives

**Option B: Database Lookup Validation**
```javascript
const taskExists = this.taken.find(t => t.id === taskId);
if (!taskExists) {
    console.warn('Task not found in loaded data:', taskId);
    return;
}
```
**Pros**: Catches ALL invalid IDs (not just test patterns)
**Cons**: Requires `this.taken` to be loaded and current

**Option C: Combined Approach**
```javascript
// 1. Check test pattern (fast fail)
if (/^test-/.test(taskId)) return;
// 2. Verify in loaded data (safety net)
if (!this.taken.find(t => t.id === taskId)) return;
```
**Pros**: Best of both, defense in depth
**Cons**: Slightly more code

**Decision**: **Option C (Combined)** - Defense in depth aligns met bestaande v0.20.33 pattern.

---

### Choice: Waar validatie toevoegen?

**Options**:

**Option A: Alleen in toggleTaakSelectie()** (app.js:12410)
- Pro: Centraal punt voor alle selecties
- Con: Mist bulk "select all" scenarios

**Option B: In toggleTaakSelectie() + selecteerAlleTaken()** (app.js:12433)
- Pro: Covers beide selection paths
- Con: Code duplication

**Option C: Utility functie validateTaskId()**
```javascript
validateTaskId(taskId) {
    if (/^test-/.test(taskId)) {
        console.warn('[VALIDATION] Test task ID rejected:', taskId);
        return false;
    }
    if (!this.taken.find(t => t.id === taskId)) {
        console.warn('[VALIDATION] Task not in loaded data:', taskId);
        return false;
    }
    return true;
}
```
- Pro: DRY, reusable, consistent logging
- Con: Extra function call overhead (negligible)

**Decision**: **Option C (Utility)** - Volgt bestaande Tickedify pattern van utility functies.

---

## Alternatives Considered

### Alternative 1: Wijzig filterActies() om this.taken te filteren
**Rejected Because**:
- Breaking change - andere delen van code verwachten volledige `this.taken` array
- Performance overhead - moet array rebuilden bij elke filter change
- Complexity - zou state sync issues introduceren
- Current CSS approach is idiomatic en performant

### Alternative 2: Server-side validation toevoegen
**Rejected Because**:
- 404 errors zijn al correcte server response (task bestaat niet)
- Client-side fix is voldoende - voorkomt onnodige API calls
- Server heeft al correcte validatie (retourneert 404)

### Alternative 3: Disable bulk edit bij active filters
**Rejected Because**:
- Breekt primaire use case: bulk edit van gefilterde subset
- User story vereist juist dit scenario (FR-001)
- Filter + bulk edit is valide workflow die moet blijven werken

---

## Implementation Recommendations

1. **Add Task ID Validation Utility** (5 min)
   - Create `validateTaskId(taskId)` method
   - Check test pattern + existence in `this.taken`
   - Consistent debug logging

2. **Use Validation in Selection Functions** (10 min)
   - `toggleTaakSelectie()`: Validate before adding to Set
   - `selecteerAlleTaken()`: Skip invalid IDs
   - Maintain existing hidden check (display: none)

3. **Enhanced Debug Logging** (5 min)
   - Log invalid ID rejections with reason
   - Log `geselecteerdeTaken` size before/after bulk operations
   - Help diagnose if issue recurs

4. **Testing Approach**:
   - Reproductie scenario exact zoals user beschrijft
   - Check browser console voor validation warnings
   - Verify geen 404 errors meer optreden
   - Test edge cases: rapid filter changes, select all, partial selections

---

## Open Questions
None - All research questions resolved.

---

## Next Phase
**Phase 1**: Design artifacts (data-model.md, contracts/, quickstart.md)
