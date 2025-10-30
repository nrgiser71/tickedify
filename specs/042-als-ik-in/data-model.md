# Data Model: Keyboard Shortcuts Focus Fix

**Feature**: Keyboard Shortcuts Blijven Werken Na Focus Wijziging
**Date**: 2025-10-30

## Overview

Dit is een UI bugfix zonder data model wijzigingen. Er worden geen nieuwe entities geïntroduceerd en er zijn geen database schema aanpassingen nodig.

## Existing Entities (No Changes)

### Task Entity (taken table)
**Status**: Ongewijzigd - geen impact van keyboard shortcut fix

Bestaande velden relevant voor popup functionaliteit:
- `id` - Task identifier
- `naam` - Task naam (input in popup)
- `prioriteit` - Prioriteit (gewijzigd via Shift+F9)
- `project_id` - Project (gewijzigd via F2-F6 shortcuts)
- `context_id` - Context (gewijzigd via F7-F9 shortcuts)
- `datum` - Geplande datum

**Geen wijzigingen nodig**: Keyboard shortcuts wijzigen alleen UI interactie, niet data structuur

### UI State (Client-side only)

**Popup State** (JavaScript variabelen in app.js):
```javascript
// Bestaande state - geen wijzigingen
{
    huidigeTaakId: null | number,        // Currently editing task
    huidigeLijst: 'inbox' | 'acties',    // Current list context
    popupVisible: boolean                // Popup display state
}
```

**Event Listener State** (Browser DOM):
```javascript
// VOOR: Normal bubbling phase
popup.addEventListener('keydown', handler);

// NA: Capture phase
popup.addEventListener('keydown', handler, { capture: true });
```

**Geen nieuwe state**: Event listener configuration wijziging alleen

## Event Flow (Modified)

### Before Fix
```
User presses key
    ↓
Browser generates keydown event
    ↓
Event bubbles from target element → parent elements
    ↓
If button/dropdown has focus → might stopPropagation()
    ↓
Event might not reach popup-level handler
    ↓
❌ Shortcut not triggered
```

### After Fix
```
User presses key
    ↓
Browser generates keydown event
    ↓
CAPTURE PHASE: Event flows from window → document → popup
    ↓
Popup handler executes BEFORE child elements
    ↓
✅ Shortcut triggered regardless of focus
    ↓
Event continues to target (if not prevented)
```

## No Database Impact

**Tables affected**: None
**Migrations needed**: None
**API changes**: None
**Data persistence**: None

Dit is puur een client-side UI fix zonder impact op data laag.

## Testing Considerations

**State to test**:
- Popup visibility state (display: flex/none)
- Focus state van verschillende elementen
- Event propagation behavior

**No data validation needed**: Geen nieuwe data inputs of outputs

---
**Data Model Status**: N/A voor deze bugfix
**Next Phase**: Contract definitions (quickstart test scenarios)
