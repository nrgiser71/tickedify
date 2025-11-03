# Research: Context Management Titel Bug Fix

**Date**: 2025-11-03
**Feature**: 051-als-ik-in

## Problem Analysis

### Current Behavior
Wanneer gebruiker navigeert van "Context Management" naar een ander menu item (bijv. Dagelijkse Planning, Inbox, Acties), blijft de titel "Contexten Beheer" persistent staan in de `<h1 id="page-title">` element.

### Root Cause Investigation

#### Code Structure Discovery
1. **Two Navigation Systems**:
   - Regular lists: `data-lijst="inbox"` → roept `navigeerNaarLijst(lijst)` aan (regel 1527-1533)
   - Tool items: `data-tool="contextenbeheer"` → roept `openTool(tool)` aan (regel 1541-1548)

2. **Context Management Setup** (`showContextenBeheer()` - regel 7121-7153):
   ```javascript
   showContextenBeheer() {
       // Remove actief from all lijst items
       document.querySelectorAll('.lijst-item').forEach(item => {
           item.classList.remove('actief');
       });

       // Set contextenbeheer as actief
       const contextenbeheerItem = document.querySelector('[data-tool="contextenbeheer"]');
       if (contextenbeheerItem) {
           contextenbeheerItem.classList.add('actief');
       }

       // Update page title
       const pageTitle = document.getElementById('page-title');
       if (pageTitle) {
           pageTitle.textContent = 'Contexten Beheer';  // <-- SETS TITLE
       }

       // Set huidige lijst
       this.huidigeLijst = 'contextenbeheer';
       this.saveCurrentList();

       this.renderContextenBeheer();
   }
   ```

3. **Navigation from Context Management** (`navigeerNaarLijst()` - regel 2097-2144):
   ```javascript
   async navigeerNaarLijst(lijst) {
       // Check if coming from special sections
       let titleAlreadySet = false;
       if ((this.huidigeLijst === 'contextenbeheer' ||
            this.huidigeLijst === 'dagelijkse-planning' ||
            this.huidigeLijst === 'uitgesteld') &&
           lijst !== 'contextenbeheer' &&
           lijst !== 'dagelijkse-planning' &&
           lijst !== 'uitgesteld') {
           this.restoreNormalContainer(lijst);
           titleAlreadySet = true;  // <-- BLOCKS TITLE UPDATE BELOW
       }

       // Remove actief classes
       document.querySelectorAll('.lijst-item').forEach(item => {
           item.classList.remove('actief');
       });
       document.querySelectorAll('[data-tool]').forEach(item => {
           item.classList.remove('actief');
       });

       // Set new lijst as actief
       const listItem = document.querySelector(`[data-lijst="${lijst}"]`);
       if (listItem) {
           listItem.classList.add('actief');
       }

       // Define titles
       const titles = {
           'inbox': 'Inbox',
           'acties': 'Actions',
           'projecten': 'Projects',
           'opvolgen': 'Follow-up',
           'afgewerkte-taken': 'Completed',
           'dagelijkse-planning': 'Daily Planning',
           // ... more titles
       };

       // Only update title if NOT already set
       if (!titleAlreadySet) {  // <-- THIS IS THE PROBLEM
           const pageTitle = document.getElementById('page-title');
           if (pageTitle) {
               pageTitle.textContent = titles[lijst] || lijst;
           }
       }

       // ... rest of function
   }
   ```

4. **The RestoreNormalContainer Function** (regel 7155-7263):
   - This function DOES update the title (regel 7200-7202)
   - BUT: It only does this when cleaning up from `uitgesteld` accordion view
   - When coming from `contextenbeheer`, there's no accordion to clean up
   - So the title update in `restoreNormalContainer()` might not always execute

### Bug Mechanism
**Flow when navigating from Context Management → Inbox:**
1. User clicks on "Inbox" in sidebar
2. Event listener detects `data-lijst="inbox"` (regel 1527)
3. Calls `navigeerNaarLijst('inbox')` (regel 1531)
4. Check detects `this.huidigeLijst === 'contextenbeheer'` (regel 2100)
5. Calls `restoreNormalContainer('inbox')` (regel 2106)
6. Sets `titleAlreadySet = true` (regel 2107)
7. Title update code is SKIPPED (regel 2139-2143) because `titleAlreadySet === true`
8. **Result**: Title blijft "Contexten Beheer"

**Why restoreNormalContainer doesn't fix it:**
- `restoreNormalContainer()` alleen update title bij cleanup van `uitgesteld` accordion (regel 7168-7203)
- Voor `contextenbeheer` heeft het geen speciale cleanup logica voor titel
- De titel update in `restoreNormalContainer()` wordt ALLEEN uitgevoerd als er een `uitgesteld-accordion` container is (regel 7169)

## Solution Options

### Option A: Fix restoreNormalContainer Title Logic ⭐ RECOMMENDED
**Approach**: Zorg dat `restoreNormalContainer()` ALTIJD de titel update, ongeacht van welke sectie je komt.

**Implementation**:
```javascript
restoreNormalContainer(targetLijst = null) {
    // ... existing cleanup code ...

    // ALWAYS update title when restoring, not just for uitgesteld cleanup
    const titles = {
        'inbox': 'Inbox',
        'acties': 'Actions',
        'projecten': 'Projects',
        'opvolgen': 'Follow-up',
        'afgewerkte-taken': 'Completed',
        'dagelijkse-planning': 'Daily Planning',
        // ... more titles
    };

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = titles[targetLijst || this.huidigeLijst] || 'Inbox';
    }

    // ... rest of function ...
}
```

**Pros**:
- Minimal code change
- Fixes root cause: titel wordt altijd geset bij restore
- Consistent met bestaande pattern
- No risk of breaking other flows

**Cons**:
- None identified

### Option B: Remove titleAlreadySet Flag
**Approach**: Verwijder de `titleAlreadySet` logica en laat `navigeerNaarLijst()` ALTIJD de titel updaten.

**Pros**:
- Simplest fix
- Most explicit

**Cons**:
- Dupliceert titel update (beide in `restoreNormalContainer` én in `navigeerNaarLijst`)
- Potential for future bugs if beide updates conflicteren

### Option C: Conditional titleAlreadySet Based on Section
**Approach**: Alleen set `titleAlreadySet = true` als `restoreNormalContainer()` echt de titel heeft geupdatet.

**Pros**:
- Most precise fix

**Cons**:
- More complex
- Requires refactoring of `restoreNormalContainer()` return value

## Decision

**Selected**: **Option A - Fix restoreNormalContainer Title Logic**

**Rationale**:
1. **Root Cause Fix**: Dit lost het onderliggende probleem op (restoreNormalContainer update titel niet consequent)
2. **Minimal Impact**: Kleinste code change met laagste risico
3. **Future-Proof**: Als er meer "special sections" komen, werkt dit pattern automatisch
4. **Consistent**: Gebruikt bestaande titles mapping die al bestaat
5. **Single Responsibility**: restoreNormalContainer is verantwoordelijk voor container restore ÉN titel reset

**Implementation Location**:
- File: `public/app.js`
- Function: `restoreNormalContainer()` (around line 7155)
- Change: Move title update logic OUTSIDE the `if (uitgesteldContainer)` block

## Edge Cases to Test

1. ✅ Context Management → Inbox
2. ✅ Context Management → Acties
3. ✅ Context Management → Dagelijkse Planning
4. ✅ Context Management → Postponed (uitgesteld)
5. ✅ Inbox → Context Management → Inbox (round-trip)
6. ✅ Dagelijkse Planning → Context Management → Dagelijkse Planning
7. ✅ Browser back button from Context Management
8. ✅ Direct URL access to different sections
9. ✅ Other tool items (zoeken) → reguliere lijsten (geen regressie)

## Performance Impact
- **Change**: Single DOM text update
- **Impact**: <1ms, negligible
- **Browser reflow**: None (text content change only)

## Backwards Compatibility
- ✅ Geen breaking changes
- ✅ Bestaande navigatie flows blijven werken
- ✅ Geen API changes
- ✅ Geen database changes

## Testing Strategy
1. **Manual Testing**: Alle 9 edge cases handmatig testen via UI
2. **Playwright Automation**: Automated test voor primaire scenario's
3. **Regression Testing**: Verificatie dat andere menu items correct blijven werken
4. **Browser Testing**: Chrome, Firefox, Safari, Edge

## Dependencies
- None - pure JavaScript DOM manipulation

## Risks
- **Low Risk**: Zeer minimale code change in geïsoleerde functie
- **Mitigation**: Staging testing op dev.tickedify.com met alle scenarios

## Timeline Estimate
- Implementation: 10 minutes
- Testing: 20 minutes
- Deployment + Verification: 15 minutes
- **Total**: ~45 minutes
