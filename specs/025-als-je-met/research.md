# Research: Duplicate Submit Prevention voor Shift+F12 Quick Add

**Feature**: 025-als-je-met
**Date**: 2025-10-23
**Status**: Complete

## Executive Summary

Deze feature vereist minimaal onderzoek omdat de oplossing al volledig geïmplementeerd is in de codebase (Feature 023). De research bevestigt dat we simpelweg de bestaande LoadingManager pattern kunnen kopiëren naar de QuickAddModal class.

## Research Questions & Findings

### 1. Hoe werkt de huidige duplicate prevention in het Inbox scherm?

**Decision**: Gebruik LoadingManager.withLoading() wrapper met operation tracking

**Rationale**:
- De Inbox scherm implementatie (app.js:3291-3353) wrapt de async operatie in `loading.withLoading()`
- Dit systeem gebruikt een `Set` van actieve operaties om duplicates te blokkeren
- De operationId 'add-task' wordt geregistreerd tijdens de operatie
- Bij nieuwe submissions wordt via `loading.isOperationActive('add-task')` gecheckt
- Pattern is proven en werkt stabiel sinds Feature 023

**Code Locatie**:
```javascript
// app.js:3311-3351 - Inbox implementation
await loading.withLoading(async () => {
    // ... API call logic ...
}, {
    operationId: 'add-task',
    showGlobal: true,
    message: 'Taak toevoegen...'
});

// app.js:1286-1300 - Prevention check before calling
if (!loading.isOperationActive('add-task')) {
    this.voegTaakToe();
}
```

**Alternatives Considered**:
1. **Debouncing**: Zou werken maar is inconsistent met bestaande pattern
2. **Disabled button state**: Niet toepasbaar voor keyboard events
3. **Request cancellation**: Over-engineered voor dit probleem
4. **Flag in QuickAddModal**: Dupliceert functionaliteit van LoadingManager

### 2. Moet de Quick Add modal dezelfde operationId gebruiken?

**Decision**: Hergebruik 'add-task' operationId voor beide implementaties

**Rationale**:
- Beide modals voegen taken toe aan dezelfde inbox
- Gebruiken dezelfde backend endpoint: `/api/taak/add-to-inbox`
- Delen van operationId voorkomt ook cross-modal duplicates (onwaarschijnlijk maar mogelijk)
- LoadingManager is globaal en kan meerdere concurrent operations tracken
- Consistent gedrag: als gebruiker snel Shift+F12 + Enter doet terwijl Inbox submit actief is, wordt het ook geblokkeerd

**Alternatives Considered**:
1. **Aparte operationId 'quick-add-task'**: Zou cross-modal duplicates toestaan (ongewenst edge case)
2. **Modal-specifieke tracking**: Dupliceert LoadingManager functionaliteit

### 3. Welke visuele feedback moet de gebruiker zien?

**Decision**: Gebruik bestaande global loading overlay met "Taak toevoegen..." message

**Rationale**:
- LoadingManager.withLoading() met `showGlobal: true` toont automatisch overlay
- Consistent met Inbox scherm gedrag
- Gebruikers kennen deze feedback al
- Geen extra UI development nodig
- Loading overlay blokkeert ook UI interactie tijdens API call

**Implementation Detail**:
```javascript
loading.withLoading(async () => { ... }, {
    operationId: 'add-task',
    showGlobal: true,  // Shows loading overlay
    message: 'Taak toevoegen...'  // Displayed message
});
```

**Alternatives Considered**:
1. **Button disabled state**: Kan niet, modal heeft geen submit button (Enter key only)
2. **Input field disabled**: Verwarrend voor gebruiker
3. **Spinner in modal**: Extra development, inconsistent met rest van app

### 4. Hoe behandelen we edge cases?

**Finding**: LoadingManager handelt alle edge cases automatisch af

**Edge Cases Covered**:
1. **Multiple Enter presses**: `activeOperations.has(operationId)` check blokkeert duplicates
2. **Modal close during submission**: LoadingManager.endOperation() in finally block cleanup
3. **API failures**: withLoading() roept endOperation() aan in finally, retry wordt mogelijk
4. **Slow network**: Loading overlay blijft zichtbaar, user kan niet spammen
5. **Success flow**: Modal.hide() na success, operation wordt beëindigd, volgende submission mogelijk

**Code Analysis** (app.js:615-628):
```javascript
startOperation(operationId, message = 'Loading...') {
    this.activeOperations.add(operationId);
    // Auto-show overlay
}

endOperation(operationId) {
    this.activeOperations.delete(operationId);
    // Auto-hide overlay when no operations active
}
```

### 5. Testing strategie voor deze fix?

**Decision**: Playwright browser automation op staging environment

**Test Scenarios**:
1. Single Enter press → 1 task created ✓
2. 5x rapid Enter presses → still 1 task created ✓
3. Enter, wait for success, Enter again → 2 tasks created (second submission works) ✓
4. Enter during slow response, Enter again → 1 task created (duplicate blocked) ✓
5. API failure, retry → second attempt works after first completes ✓

**Test Location**: Staging environment dev.tickedify.com (BÈTA FREEZE active)

**Alternatives Considered**:
1. **Unit tests**: Moeilijk voor async timing en DOM interactions
2. **Manual testing only**: Niet reproduceerbaar genoeg
3. **Production testing**: Verboden tijdens BÈTA FREEZE

## Technical Dependencies Analysis

### Existing Code Dependencies
- **LoadingManager class** (app.js:495-749): Core dependency, already in codebase
- **Global loading instance** (app.js:752): Accessible from QuickAddModal
- **QuickAddModal.handleSubmit()** (app.js:13409-13497): Target function to modify

### No New Dependencies Required
- ✅ No npm packages needed
- ✅ No new backend endpoints
- ✅ No database schema changes
- ✅ No new UI components

### Compatibility Verification
- ✅ LoadingManager pattern works in all browsers (Set API is ES6, supported everywhere)
- ✅ Pattern already proven in production since Feature 023
- ✅ No breaking changes to existing functionality

## Implementation Approach

### Minimal Code Change Strategy

**Current Code** (app.js:13409-13497):
```javascript
async handleSubmit() {
    const taakNaam = this.input.value.trim();
    if (!taakNaam) { return; }

    // Direct API call without operation tracking
    const response = await fetch('/api/taak/add-to-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tekst: taakNaam })
    });

    if (response.ok) {
        // Success handling
        this.hide();
        await app.laadTellingen();
        if (app.huidigeLijst === 'inbox') {
            await app.laadHuidigeLijst();
        }
    }
}
```

**New Code Pattern** (based on app.js:3311-3351):
```javascript
async handleSubmit() {
    const taakNaam = this.input.value.trim();
    if (!taakNaam) { return; }

    // Wrap entire operation in loading.withLoading()
    await loading.withLoading(async () => {
        const response = await fetch('/api/taak/add-to-inbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tekst: taakNaam })
        });

        if (response.ok) {
            // Success handling
            this.hide();
            await app.laadTellingen();
            if (app.huidigeLijst === 'inbox') {
                await app.laadHuidigeLijst();
            }
        }
    }, {
        operationId: 'add-task',
        showGlobal: true,
        message: 'Taak toevoegen...'
    });
}
```

**Lines Changed**: ~15 (add wrapper, adjust indentation, remove old structure)

### Risk Assessment

**Low Risk Implementation**:
- ✅ Pattern already proven in production
- ✅ No changes to backend or database
- ✅ No changes to modal UI or UX flow
- ✅ Fallback: if LoadingManager fails, old behavior continues (though unprotected)
- ✅ Easy rollback: single function modification

**Testing Verification**:
- Staging deployment required before production (BÈTA FREEZE compliance)
- Playwright test suite confirms duplicate prevention
- Manual testing on dev.tickedify.com

## Conclusion

**Research Complete**: All unknowns resolved, implementation path is clear.

**Key Takeaways**:
1. Solution already exists in codebase (Feature 023)
2. Simple wrapper implementation: `loading.withLoading()`
3. Reuse 'add-task' operationId for consistency
4. No new dependencies or architecture changes needed
5. Low-risk fix with high user value (eliminates duplicate task frustration)

**Ready for Phase 1**: Design & Contracts generation (though contracts are minimal for this UI-only fix)
