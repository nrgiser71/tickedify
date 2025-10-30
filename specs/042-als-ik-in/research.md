# Research: Keyboard Shortcuts Focus Issue

**Feature**: Keyboard Shortcuts Blijven Werken Na Focus Wijziging in Taak Popup
**Date**: 2025-10-30

## Problem Analysis

### Current Implementation (app.js:2856-3075, app.js:13633-13700)

**Huidige setup**:
1. **`initPlanningKeyboardShortcuts()`** (app.js:2856): Event listener op `#planningPopup` element voor F-key shortcuts (F2-F9, Shift+F9)
2. **Global shortcuts** (app.js:13633): `document` event listener voor shortcuts zoals F10, F12
3. **Popup level shortcuts** (app.js:1447): Direct op `#planningPopup` voor Enter en Escape

**Probleem geïdentificeerd**:
- Wanneer gebruiker klikt op "Project toevoegen" of "Context toevoegen" knoppen, krijgen deze knoppen/dropdowns focus
- Event listeners zijn wel op popup-niveau (`popup.addEventListener`), maar checken `popup.style.display`
- Het probleem is NIET de event listener locatie, maar mogelijk:
  - Event propagation wordt gestopt door child elements
  - Focus shift triggert andere handlers die events consumeren
  - Dropdowns of buttons hebben eigen keydown handlers die e.stopPropagation() aanroepen

### Code Locaties

**Relevante functies**:
- `initPlanningKeyboardShortcuts()` - app.js:2856-3075
  - Handlers voor F2-F9 (contexten selecteren)
  - Handler voor Shift+F9 (prioriteit wijzigen via modal)
  - Check: `if (popup.style.display === 'none') return;`

- Global shortcuts setup - app.js:13633-13700
  - F10 voor herhaling popup
  - F12 voor quick add
  - Check voor input/textarea focus (laat F2-F9 door naar planning popup)

**Popup element**:
- ID: `planningPopup` (index.html)
- Event listeners: keydown op popup level EN globaal document level

## Root Cause Analysis

### Hypotheses

**Hypothesis 1: Event Propagation Blocked**
- Child elements (buttons, dropdowns) kunnen `event.stopPropagation()` aanroepen
- Dit voorkomt dat event naar popup-level handler komt
- **Likelihood**: Hoog - dit is meest waarschijnlijke oorzaak

**Hypothesis 2: Focus Management**
- Wanneer button/dropdown focus krijgt, gaat focus weg van elementen die keyboard events ontvangen
- Maar event listeners zijn al op popup niveau, dus dit zou niet moeten uitmaken
- **Likelihood**: Laag

**Hypothesis 3: Modal/Dropdown Interference**
- Project/Context dropdowns creëren mogelijk overlay elements die events intercepten
- Of ze attachen eigen keydown handlers die events consumeren
- **Likelihood**: Medium

## Solution Approaches Evaluated

### Approach 1: Event Capture Phase ✅ RECOMMENDED

**Decision**: Gebruik `addEventListener` met `capture: true` option

**Implementation**:
```javascript
popup.addEventListener('keydown', handler, { capture: true });
```

**Rationale**:
- Capture phase vindt plaats VOOR bubbling phase
- Events worden opgevangen voordat child elements ze kunnen stoppen
- Minst invasief - geen wijzigingen aan child elements nodig
- Consistent met bestaande popup-level pattern

**Alternatives considered**:
- ❌ Event listeners op `document` niveau: Zou werken maar minder specifiek, zou kunnen conflicteren met andere globale shortcuts
- ❌ `event.stopImmediatePropagation()`: Te agressief, zou andere legitieme handlers kunnen blokkeren
- ❌ Remove handlers van child elements: Te veel wijzigingen, risico op breaking changes

### Approach 2: Prevent Child Event Propagation

**Decision**: NIET gekozen als primaire aanpak

**Would require**:
- Identificeren van alle child elements die `stopPropagation` aanroepen
- Verwijderen van deze calls of conditioneel maken
- Meer invasief en risico op side effects

**Why rejected**: Approach 1 (capture phase) is eleganter en minder risicovol

### Approach 3: Focus Trap Pattern

**Decision**: NIET nodig voor deze fix

**Would involve**:
- Focus management binnen popup
- Keyboard navigation tussen elementen
- Meer complexiteit dan nodig voor dit specifieke probleem

**Why rejected**: Overkill voor het probleem; capture phase lost het op

## Implementation Strategy

### Phase 1: Update Event Listeners to Capture Phase

**Files to modify**:
- `public/app.js` - `initPlanningKeyboardShortcuts()` functie (regel 2856)

**Changes**:
1. Wijzig alle `popup.addEventListener('keydown', ...)` calls
2. Voeg `{ capture: true }` option toe
3. Zorgt dat shortcuts worden opgevangen in capture phase

**Code pattern**:
```javascript
// VOOR:
popup.addEventListener('keydown', (e) => { ... });

// NA:
popup.addEventListener('keydown', (e) => { ... }, { capture: true });
```

### Phase 2: Testing Strategy

**Test scenarios** (alle met focus op verschillende elementen):
1. Focus op "Project toevoegen" button → Test alle shortcuts (F2-F9, Shift+F9, Enter, Escape)
2. Focus op "Context toevoegen" button → Test alle shortcuts
3. Focus op project dropdown (open) → Test alle shortcuts
4. Focus op context dropdown (open) → Test alle shortcuts
5. Focus op input veld → Test alle shortcuts (Enter/Escape moeten werken, F-keys ook)
6. Snel schakelen tussen elementen → Test shortcuts blijven werken

**Success criteria**:
- Alle shortcuts blijven werken ongeacht welk element focus heeft
- Geen breaking changes aan bestaand gedrag
- Performance blijft < 50ms response tijd

## Technical Decisions Summary

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Capture phase event listeners | Intercepteert events vóór child elements | Document level (te globaal), Remove child handlers (te invasief) |
| Minimale code wijzigingen | Alleen event listener options aanpassen | Volledige refactor van keyboard handling (overkill) |
| Test via Playwright | Automated testing van keyboard interactions | Manual testing alleen (niet reproduceerbaar) |
| Scope: planning popup alleen | Zoals gespecificeerd in requirements | Apply to all popups (out of scope) |

## Dependencies & Constraints

**Dependencies**: Geen externe dependencies nodig
**Browser compatibility**: `capture` option supported in alle moderne browsers (IE11+)
**Breaking changes**: Geen - alleen internal implementation wijziging
**Performance impact**: Negligible - event capture is native browser functionality

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Capture phase breekt bestaand gedrag | High | Low | Thorough testing van alle shortcuts |
| Events worden te vroeg opgevangen | Medium | Low | Conditionele checks behouden (display check) |
| Browser compatibility issues | Medium | Very Low | Capture supported since IE11 |

## Next Steps (Phase 1)

1. ✅ Research complete
2. → Generate implementation plan in tasks.md
3. → Implement capture phase for all planning popup shortcuts
4. → Test all keyboard shortcuts with different focus states
5. → Deploy to staging (dev.tickedify.com) en verify

---
**Research complete**: 2025-10-30
**Ready for Phase 1**: Design & Implementation Planning
