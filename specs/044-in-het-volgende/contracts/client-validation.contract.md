# Contract: Client-Side Task ID Validation

**Feature**: 044-in-het-volgende
**Type**: Client-side validation logic
**Date**: 2025-10-30

---

## Contract: validateTaskId()

**Purpose**: Validate task ID before allowing it to enter bulk selection state.

**Signature**:
```javascript
validateTaskId(taskId: string): boolean
```

**Pre-conditions**:
- `taskId` is a non-empty string
- `this.taken` array is loaded (may be empty array, but must be defined)

**Post-conditions**:
- Returns `true` if task ID is valid for selection
- Returns `false` if task ID should be rejected
- Logs warning to console for rejected IDs with reason

**Validation Rules**:

1. **Test Pattern Rejection**
   ```javascript
   if (/^test-/.test(taskId)) {
       console.warn('[VALIDATION] Test task ID rejected:', taskId);
       return false;
   }
   ```
   - **Rejects**: Any ID starting with "test-"
   - **Examples**: `test-1752000171959-gjj7u1rf0`, `test-abc-123`
   - **Rationale**: Test/placeholder IDs never exist in database

2. **Existence Verification**
   ```javascript
   const taskExists = this.taken.find(t => t.id === taskId);
   if (!taskExists) {
       console.warn('[VALIDATION] Task not in loaded data:', taskId);
       return false;
   }
   ```
   - **Rejects**: IDs not present in `this.taken` array
   - **Examples**: Deleted tasks, stale IDs from previous list load
   - **Rationale**: Only tasks in current loaded state can be bulk edited

3. **Success Case**
   ```javascript
   return true; // Task ID is valid
   ```

**Error Handling**:
- Invalid `taskId` (null, undefined) → return `false` (defensive)
- `this.taken` not loaded → return `false` (defensive)
- Validation failure → log warning, return `false`

**Performance**:
- O(n) complexity where n = this.taken.length (linear search)
- Typical case: n ≈ 200 tasks → <1ms per validation
- Called once per selection click → negligible overhead

---

## Contract: Enhanced toggleTaakSelectie()

**Purpose**: Toggle task selection state with validation.

**Signature**:
```javascript
toggleTaakSelectie(taakId: string): void
```

**Pre-conditions**:
- `taakId` corresponds to a DOM element with `data-id="${taakId}"`
- Bulk mode is active (`this.bulkModus === true`)

**Post-conditions**:
- If validation fails → no state change, function returns early
- If task hidden → no state change, function returns early
- If valid → `taakId` toggled in `geselecteerdeTaken` Set
- Visual selection state updated in DOM
- Bulk toolbar count updated

**Validation Flow**:
```javascript
async toggleTaakSelectie(taakId) {
    // [NEW] Step 1: Validate task ID
    if (!this.validateTaskId(taakId)) {
        return; // Rejected - no state change
    }

    // [EXISTING] Step 2: Check if task is visible
    const taakElement = document.querySelector(`[data-id="${taakId}"]`);
    if (!taakElement || taakElement.style.display === 'none') {
        console.log('[BULK SELECT] Ignoring click on hidden task:', taakId);
        return;
    }

    // [EXISTING] Step 3: Toggle selection
    if (this.geselecteerdeTaken.has(taakId)) {
        this.geselecteerdeTaken.delete(taakId);
    } else {
        this.geselecteerdeTaken.add(taakId);
    }

    // [EXISTING] Step 4: Update UI
    const selectieCircle = taakElement.querySelector('.selectie-circle');
    if (selectieCircle) {
        selectieCircle.classList.toggle('geselecteerd', this.geselecteerdeTaken.has(taakId));
    }

    // [EXISTING] Step 5: Update toolbar
    this.updateBulkToolbar();
}
```

**Behavioral Changes**:
- **Before**: Test IDs could enter `geselecteerdeTaken` Set
- **After**: Test IDs rejected with console warning

**Backwards Compatibility**:
- ✅ Existing valid IDs work identically
- ✅ UI behavior unchanged for valid tasks
- ✅ No breaking changes to API

---

## Contract: Enhanced selecteerAlleTaken()

**Purpose**: Select all visible tasks with validation.

**Signature**:
```javascript
selecteerAlleTaken(): void
```

**Pre-conditions**:
- Bulk mode is active
- DOM contains `.actie-item[data-id]` elements

**Post-conditions**:
- All visible AND valid tasks added to `geselecteerdeTaken`
- Invalid/test IDs silently skipped (with console warning)
- Visual selection state updated for all selected tasks
- Bulk toolbar count reflects valid selections only

**Validation Flow**:
```javascript
selecteerAlleTaken() {
    const alleTaken = document.querySelectorAll('.actie-item[data-id]');

    alleTaken.forEach(item => {
        // [EXISTING] Skip hidden/filtered tasks
        if (item.style.display === 'none') return;

        const taakId = item.dataset.id;

        // [NEW] Skip invalid task IDs
        if (!this.validateTaskId(taakId)) return;

        // [EXISTING] Add to selection
        this.geselecteerdeTaken.add(taakId);

        const selectieCircle = item.querySelector('.selectie-circle');
        if (selectieCircle) {
            selectieCircle.classList.add('geselecteerd');
        }
    });

    this.updateBulkToolbar();
}
```

**Edge Cases**:
- DOM has 10 tasks, 3 are test IDs → 7 tasks selected
- All tasks are test IDs → 0 tasks selected, "Select All" has no effect
- Mix of hidden + test IDs → only visible AND valid tasks selected

---

## Integration Contract: bulkEditProperties()

**Purpose**: Bulk update tasks with defense-in-depth validation.

**Existing Validation** (v0.20.33 - KEEP):
```javascript
// Line 12718 - Filter valid IDs from selection
const validIds = selectedIds.filter(id => this.taken.find(t => t.id === id));
const invalidCount = selectedIds.length - validIds.length;

if (invalidCount > 0) {
    console.warn(`[BULK EDIT] Filtered out ${invalidCount} invalid task IDs:`,
        selectedIds.filter(id => !this.taken.find(t => t.id === id)));
}
```

**Defense Layers**:
1. **Layer 1 (NEW)**: `validateTaskId()` prevents invalid IDs entering Set
2. **Layer 2 (EXISTING)**: `bulkEditProperties()` filters invalid IDs before API calls
3. **Layer 3 (EXISTING)**: Server returns 404 for non-existent task IDs

**Expected Outcome After Fix**:
- Layer 1 prevents test IDs → `invalidCount` should be 0 in normal usage
- Layer 2 remains as safety net for edge cases
- Layer 3 (server 404) should never be reached for test IDs

---

## Testing Contract

**Unit Test**: validateTaskId()

```javascript
describe('validateTaskId', () => {
    it('rejects test IDs', () => {
        expect(app.validateTaskId('test-123-abc')).toBe(false);
        expect(app.validateTaskId('test-1752000171959-gjj7u1rf0')).toBe(false);
    });

    it('rejects IDs not in this.taken', () => {
        app.taken = [{ id: 'valid-123' }];
        expect(app.validateTaskId('non-existent')).toBe(false);
    });

    it('accepts valid IDs in this.taken', () => {
        app.taken = [{ id: 'xachag1c7mekd5yyn' }];
        expect(app.validateTaskId('xachag1c7mekd5yyn')).toBe(true);
    });
});
```

**Integration Test**: Bulk Edit Flow

```javascript
describe('Bulk Edit with Filters', () => {
    it('prevents selection of test IDs', async () => {
        // Setup: Mix of valid and test tasks
        app.taken = [
            { id: 'valid-1', tekst: 'Real task' },
            { id: 'valid-2', tekst: 'Real task' }
        ];

        // Attempt to select test ID (should be rejected)
        app.toggleTaakSelectie('test-123-abc');
        expect(app.geselecteerdeTaken.has('test-123-abc')).toBe(false);

        // Valid ID should work
        app.toggleTaakSelectie('valid-1');
        expect(app.geselecteerdeTaken.has('valid-1')).toBe(true);
    });
});
```

**Browser Test**: Reproduction Scenario

```
1. Navigate to tickedify.com/app
2. Login with test credentials
3. Go to Actions scherm
4. Enable bulk edit mode
5. Apply filter: 'dagelijks'
6. Select 5 filtered tasks
7. Click 'Edit Properties'
8. Change context to 'JB Thuis'
9. Confirm bulk edit
10. VERIFY: No 404 errors in console
11. VERIFY: All selected tasks updated successfully
```

---

## Success Criteria

**Functional**:
- ✅ No 404 errors when bulk editing filtered tasks
- ✅ Test IDs cannot enter `geselecteerdeTaken` Set
- ✅ Console warnings logged for rejected IDs (debugging aid)
- ✅ Bulk edit only affects valid, visible, selected tasks

**Non-Functional**:
- ✅ No performance degradation (validation is O(n), n ≈ 200)
- ✅ Backwards compatible (valid tasks behave identically)
- ✅ Defensive programming (multiple validation layers)

**User Experience**:
- ✅ Silent failure for invalid IDs (no user-facing errors)
- ✅ Bulk edit workflow unchanged for valid tasks
- ✅ Clear console logging for developers debugging issues
