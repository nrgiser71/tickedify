# Data Model: Duplicate Toast Fix

**Feature**: Fix Duplicate Toast Berichten Bij Postponed Weekly Drag & Drop
**Date**: 2025-10-25

## Overview
Dit is een **frontend-only bugfix** - geen database schema wijzigingen nodig.

---

## Affected Components

### TakenBeheer Class (public/app.js)
**Type**: JavaScript Class
**Purpose**: Beheer van taken lijst en drag & drop functionaliteit

**Relevante Methods**:

#### Bestaande Methods (Te Wijzigen)
| Method | Location | Current Behavior | New Behavior |
|--------|----------|------------------|--------------|
| `setupUitgesteldDropZones()` | 10981-11001 | Voegt listeners toe zonder cleanup | Cleanup elementen voordat listeners toevoegen |
| `setupDropZone(element, category, type)` | 11003-11046 | Voegt 3 listeners toe (dragover, dragleave, drop) | Blijft hetzelfde - ontvangt pre-cleaned element |
| `handleUitgesteldDrop(...)` | 11048-11103 | Drop handler die toast triggert | Blijft hetzelfde - geen wijziging |
| `renderUitgesteldConsolidated()` | 10796-10861 | Rendert UI en roept setup aan | Blijft hetzelfde - setup is nu idempotent |

#### Nieuwe Methods (Toe Te Voegen)
| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `cleanupEventListeners(element)` | Verwijdert alle event listeners via cloning | `element: HTMLElement` | `HTMLElement` (cleaned clone) |

---

## DOM Elements State

### Drop Zone Elements
**Elements**: Headers en content containers van uitgesteld categories

**Before Fix**:
```
Element
├── Event Listeners (render 1): dragover, dragleave, drop
├── Event Listeners (render 2): dragover, dragleave, drop  ← DUPLICATE
├── Event Listeners (render 3): dragover, dragleave, drop  ← DUPLICATE
└── ... (accumulation continues)
```

**After Fix**:
```
Element (cleaned via cloning)
└── Event Listeners (current): dragover, dragleave, drop  ← SINGLE SET
```

**State Properties**:
- `data-category`: Category identifier (bijv. "uitgesteld-wekelijks")
- `id`: Element identifier (voor content containers)
- Event listeners: Cleaned to single set per render

---

## Event Flow

### Current (Buggy) Flow
```
1. User navigates → renderUitgesteldConsolidated()
2. → setupUitgesteldDropZones()
3. → setupDropZone() voor elk element
4. → addEventListener() × 3 per element
5. → OUDE listeners blijven actief ❌
6. User drags task → drop event
7. → ALLE listeners (oud + nieuw) triggeren
8. → Elk roept handleUitgesteldDrop()
9. → Elk triggert toast.success()
10. → Resultaat: N duplicate toasts
```

### Fixed Flow
```
1. User navigates → renderUitgesteldConsolidated()
2. → setupUitgesteldDropZones()
3. → cleanupEventListeners() voor elk element ⭐ NEW
4. → setupDropZone() met cleaned element
5. → addEventListener() × 3 per element
6. → OUDE listeners zijn verwijderd ✅
7. User drags task → drop event
8. → Alleen HUIDIGE listeners triggeren ✅
9. → 1× handleUitgesteldDrop()
10. → 1× toast.success()
11. → Resultaat: Exact 1 toast bericht ✅
```

---

## No Database Changes

**Database Tables**: Geen wijzigingen
**API Endpoints**: Geen wijzigingen
**Data Persistence**: Geen impact

De bugfix betreft uitsluitend frontend event handling - de taak verplaatsing zelf (via API) werkt al correct.

---

## Memory Model

### Before Fix (Memory Leak)
```
Drop Zone Element
├── Internal [[Listeners]] Array
│   ├── Listener 1 (render 1) - 144 bytes
│   ├── Listener 2 (render 1) - 144 bytes
│   ├── Listener 3 (render 1) - 144 bytes
│   ├── Listener 4 (render 2) - 144 bytes  ← Leaked
│   ├── Listener 5 (render 2) - 144 bytes  ← Leaked
│   ├── Listener 6 (render 2) - 144 bytes  ← Leaked
│   └── ... (accumulation)
└── Total: N × 144 bytes leaked per element
```

### After Fix (No Leak)
```
Drop Zone Element (cloned)
├── Internal [[Listeners]] Array
│   ├── Listener 1 (current) - 144 bytes
│   ├── Listener 2 (current) - 144 bytes
│   └── Listener 3 (current) - 144 bytes
└── Total: Fixed 432 bytes per element ✅
```

**Memory Impact**:
- Before: Growing memory usage (leak)
- After: Constant memory usage (no leak)
- Savings: Up to ~4KB per session (10 elements × 10 renders × 432 bytes)

---

## Component Dependencies

### Affected Components
```
TakenBeheer
├── setupUitgesteldDropZones() [MODIFIED]
│   ├── cleanupEventListeners() [NEW]
│   └── setupDropZone() [NO CHANGE]
│       └── handleUitgesteldDrop() [NO CHANGE]
│           └── toast.success() [NO CHANGE]
└── renderUitgesteldConsolidated() [NO CHANGE]
```

### Unaffected Components
- ToastManager (public/app.js:2-52) - Blijft hetzelfde
- API endpoints - Geen wijzigingen
- Database queries - Geen wijzigingen
- Andere drag & drop zones - Geen impact (separate implementation)

---

## Validation Rules

### Pre-Conditions
- Element moet een valid DOM element zijn
- Element moet een parent hebben (voor replaceChild)

### Post-Conditions
- Geclonede element heeft identieke attributes, classes, innerHTML
- Geclonede element heeft GEEN event listeners
- Geclonede element zit op zelfde positie in DOM tree
- Oude element is ge-garbage collected

### Invariants
- Aantal drop zones blijft constant (5 categories × 2 zones = 10)
- Event listener types blijven constant (dragover, dragleave, drop)
- DOM structure blijft ongewijzigd

---

**Data Model Complete**: Geen database wijzigingen nodig - frontend-only bugfix
