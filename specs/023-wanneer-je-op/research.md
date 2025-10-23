# Research: Duplicate Submit Prevention

**Date**: 2025-10-22
**Feature**: 023-wanneer-je-op
**Context**: Prevent duplicate task submissions when users rapidly press Enter or click the "Toevoegen" button

## Research Questions

### Q1: Should we add `isOperationActive(operationId)` to LoadingManager or create separate guard?

**Decision**: Add to LoadingManager

**Rationale**:
- LoadingManager already tracks `activeOperations` Set (app.js:500)
- `withLoading()` already uses `startOperation()` and `endOperation()` methods (app.js:718, 734)
- Adding `isOperationActive()` is a natural extension of existing functionality
- Keeps operation tracking centralized in one place
- No new state management needed

**Implementation**:
```javascript
// Add to LoadingManager class (after line 744)
isOperationActive(operationId) {
    return this.activeOperations.has(operationId);
}
```

**Alternatives Considered**:
- ❌ Separate `isSubmitting` flag in Taakbeheer class: Would duplicate state management
- ❌ Guard variable in `voegTaakToe()`: Wouldn't protect against event handler spam before function starts

### Q2: Should guard check happen in event handlers or at start of `voegTaakToe()`?

**Decision**: Event handlers (bindInboxEvents)

**Rationale**:
- Prevents function call overhead when operation is already active
- Blocks submission attempt at the earliest possible point
- Event handlers already wrap the function call: `this.voegTaakToe()`
- Pattern: `if (!loading.isOperationActive('add-task')) { this.voegTaakToe(); }`
- Consistent with early-return pattern used elsewhere in codebase

**Current Implementation** (app.js:1287-1290):
```javascript
taakInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && this.huidigeLijst === 'inbox') {
        this.voegTaakToe();  // ← Guard check goes here
    }
});
```

**Updated Implementation**:
```javascript
taakInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && this.huidigeLijst === 'inbox') {
        if (!loading.isOperationActive('add-task')) {
            this.voegTaakToe();
        }
    }
});
```

**Alternatives Considered**:
- ❌ Guard at start of `voegTaakToe()`: Still allows multiple function calls to queue
- ❌ Debouncing: Adds delay, doesn't prevent rapid submissions during network latency

### Q3: How to handle button disabled state with existing loading indicator?

**Decision**: Add disabled class to button, leverage existing global loading overlay

**Rationale**:
- Global loading overlay already shows via `loading.withLoading()` with `showGlobal: true` (app.js:3337)
- Button disabled state provides additional visual feedback
- Users can see button is unresponsive before overlay appears (~50ms delay typical)
- CSS class approach is non-intrusive and easily styled

**Existing Loading System** (app.js:3336-3340):
```javascript
}, {
    operationId: 'add-task',
    showGlobal: true,
    message: 'Taak toevoegen...'
});
```

**Button Disabled Implementation**:
```javascript
// In bindInboxEvents, before calling voegTaakToe()
const toevoegBtn = document.getElementById('toevoegBtn');
if (!loading.isOperationActive('add-task')) {
    toevoegBtn.classList.add('disabled');
    this.voegTaakToe().finally(() => {
        toevoegBtn.classList.remove('disabled');
    });
}
```

**CSS Addition** (styles.css):
```css
#toevoegBtn.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}
```

**Alternatives Considered**:
- ❌ HTML disabled attribute: Would prevent CSS animations, less flexible styling
- ❌ Loading spinner in button: Redundant with global overlay, adds complexity

## Similar Patterns in Codebase

### Pattern 1: activeCompletions Set (app.js:765)
```javascript
this.activeCompletions = new Set(); // Track active task completions to prevent race conditions
```

**Usage**: Prevents race conditions when completing recurring tasks
**Relevance**: Similar concept - use Set to track active operations
**Difference**: Our LoadingManager already has activeOperations Set

### Pattern 2: isSaving Flag (app.js:767)
```javascript
this.isSaving = false; // Prevent parallel saves
```

**Usage**: Prevents parallel saves in bulk operations
**Relevance**: Boolean flag pattern for single operation type
**Difference**: LoadingManager approach is better - supports multiple operation types via operationId

### Pattern 3: data-listener-bound Attribute (app.js:1283, 1286)
```javascript
toevoegBtn.setAttribute('data-listener-bound', 'true');
```

**Usage**: Prevents duplicate event listener binding
**Relevance**: Shows existing pattern for preventing duplicate operations
**Difference**: Our solution operates at runtime, not setup time

## Technical Decisions Summary

| Decision | Approach | Location |
|----------|----------|----------|
| Guard implementation | Add `isOperationActive()` to LoadingManager | app.js:~745 |
| Guard check location | Event handlers in `bindInboxEvents()` | app.js:1278, 1287 |
| Visual feedback | Add `.disabled` class to button | styles.css |
| Loading indicator | Use existing `loading.withLoading()` system | No change |

## Performance Considerations

**Guard Check Performance**:
- `Set.has()` operation: O(1) time complexity
- Negligible overhead: <1ms per check
- No performance impact on rapid keypress handling

**UI Responsiveness**:
- Guard check happens synchronously before async `voegTaakToe()`
- Button disabled class applies immediately (<5ms)
- Global loading overlay appears via existing system (~50ms typical)

## Edge Cases Handled

1. **Rapid Enter key autorepeat**: Guard blocks all attempts after first
2. **Multiple clicks during network lag**: Guard remains active until server responds
3. **Mixed Enter + click combinations**: Single operationId blocks both event types
4. **Error scenarios**: `withLoading()` finally block ensures guard is released
5. **User navigates away**: Guard reset when leaving inbox (new list loads)

## Dependencies

**No new dependencies required**:
- Pure JavaScript solution
- Leverages existing LoadingManager class
- No external libraries needed

## Testing Strategy

**Manual Testing** (per quickstart.md):
1. Rapid Enter presses (5x within 1 second)
2. Rapid button clicks (5x within 1 second)
3. Mixed Enter + clicks (alternating, 5x total)
4. Slow network simulation (throttle to 3G)
5. Error scenario (disconnect network, attempt submit)

**Automated Testing** (optional, via tickedify-testing agent):
- Playwright test: Simulate rapid Enter keypresses
- Playwright test: Simulate rapid button clicks
- Playwright test: Verify only one task created in database

## Implementation Complexity: LOW

**Lines of Code**: ~15-20 total
- LoadingManager method: 3 lines
- Event handler guards: 6 lines (2 handlers × 3 lines each)
- Button disabled logic: 6 lines
- CSS styling: 4 lines

**Risk Level**: Minimal
- No breaking changes to existing functionality
- Guard is fail-safe: releases automatically via finally block
- Backward compatible: no API or data structure changes

---

**Research Complete**: All technical questions resolved, ready for Phase 1 design.
