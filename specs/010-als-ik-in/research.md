# Research: Ctrl-toets uitbreiding voor extra week in drag popup

**Feature**: 010-als-ik-in
**Date**: 2025-10-10
**Status**: Complete ✅

## Research Questions & Findings

### 1. Bestaande Drag & Drop Implementatie

**Question**: Hoe werkt de huidige drag popup in het acties scherm?

**Findings**:
- **Location**: `public/app.js` regel 11033-11104
- **Function**: `generateActiesWeekDays()`
- **Mechanism**:
  - Genereert twee week containers: `#actiesHuidigeWeek` en `#actiesVolgendeWeek`
  - Elke week heeft 7 dag zones met `data-target` (ISO datum) en `data-type="planning"`
  - Gebruikt Nederlandse weekdag afkortingen: `['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']`
  - Berekent maandag van huidige week als start, volgende week = +7 dagen
  - Markeert vandaag met `current-day` CSS klasse
- **Parent Element**: `#actiesFloatingPanel` (floating panel die verschijnt bij drag start)
- **Show/Hide Logic**: Panel heeft `active` CSS klasse voor visibility + fade-in/out animatie

**Decision**: Extend `generateActiesWeekDays()` met optionele derde week parameter. Voeg nieuwe container `#actiesDerdeWeek` toe parallel aan bestaande week containers.

**Rationale**: Minimale code wijzigingen door bestaande pattern te hergebruiken. Geen refactoring nodig van drag/drop event handlers.

---

### 2. Keyboard Event Handling tijdens Drag Operaties

**Question**: Hoe detecteren we Ctrl-toets status tijdens een actieve drag operatie?

**Findings**:
- **Browser Event Support**: `keydown` en `keyup` events werken tijdens drag operaties
- **Event Property**: `event.ctrlKey` boolean property beschikbaar in alle moderne browsers
- **Cross-browser**: Werkt identiek op Windows (Ctrl) en Mac (Ctrl toets, niet Cmd)
- **Event Binding**: Bind tijdens `dragstart` event, unbind tijdens `dragend` event
- **Performance**: Event listeners zijn lightweight, geen performance impact bij real-time toggling

**Existing Pattern in Codebase**:
```javascript
// app.js regel 8504-8548: dragstart handler voorbeeld
item.addEventListener('dragstart', (e) => {
    // Set drag data
    this.currentDragData = dragData;
    // Start dynamic drag tracking
    this.startDynamicDragTracking();
});

item.addEventListener('dragend', (e) => {
    // Clear global drag data
    this.currentDragData = null;
    // Stop dynamic drag tracking
    this.stopDynamicDragTracking();
});
```

**Decision**:
1. Implementeer global keyboard event listeners op `document` level
2. Track Ctrl-toets status in instance variable: `this.ctrlKeyPressed = false`
3. Alleen actief tijdens drag operatie (gecontroleerd via `this.currentDragData !== null`)
4. Call `toggleDerdeWeek()` functie bij status wijziging

**Rationale**: Global keyboard listeners zijn de standaard aanpak. Instance variable voorkomt race conditions tussen keydown/keyup events.

**Alternatives Considered**:
- ❌ Polling `event.ctrlKey` tijdens dragover: Te traag, gemiste events
- ❌ Ctrl + Click pattern: User story specificeert Ctrl tijdens drag, niet voor start

---

### 3. DOM Manipulatie voor Dynamische Week Container

**Question**: Hoe tonen/verbergen we de derde week zonder layout glitches?

**Findings**:
- **Current Layout**: Floating panel gebruikt CSS Grid/Flexbox voor week containers
- **CSS Approach Options**:
  1. `display: none` → `display: block` (instant toggle, mogelijk layout shift)
  2. `opacity: 0` + `height: 0` → `opacity: 1` + `height: auto` (smooth, maar height auto animatie problematisch)
  3. `max-height: 0` → `max-height: [calculated]` (smooth transition, geen auto height issue)
  4. CSS class toggle met transition (cleanest, meest maintainable)

**Decision**: Gebruik CSS klasse toggle pattern:
```css
#actiesDerdeWeek {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.2s ease-out, opacity 0.2s ease-out;
}

#actiesDerdeWeek.visible {
    max-height: 100px; /* Calculated based on day-zone height */
    opacity: 1;
}
```

**JavaScript Implementation**:
```javascript
toggleDerdeWeek(show) {
    const derdeWeek = document.getElementById('actiesDerdeWeek');
    if (show) {
        derdeWeek.classList.add('visible');
    } else {
        derdeWeek.classList.remove('visible');
    }
}
```

**Rationale**: CSS transitions zorgen voor smooth UX. Class toggle is eenvoudig te debuggen en te maintainen.

---

### 4. Datum Berekening voor Derde Week

**Question**: Hoe berekenen we correct de datums voor week 3?

**Findings**:
- **Current Logic**: Huidige week start = maandag van deze week, volgende week = +7 dagen
- **Week 3 Calculation**: `derdeWeekStart = volgendeWeekStart + 7 dagen`
- **Edge Cases**:
  - Maand overgangen: JavaScript Date object handelt automatisch (geen speciale logica nodig)
  - Jaar overgangen: JavaScript Date object handelt automatisch
  - Zomertijd/wintertijd: ISO string conversie is timezone-agnostic

**Existing Code Pattern** (app.js regel 11046-11053):
```javascript
const huidigeWeekStart = new Date(vandaag);
huidigeWeekStart.setDate(vandaag.getDate() - vandaag.getDay() + 1); // Maandag
const volgendeWeekStart = new Date(huidigeWeekStart);
volgendeWeekStart.setDate(huidigeWeekStart.getDate() + 7);
```

**Decision**: Extend bestaande pattern:
```javascript
const derdeWeekStart = new Date(volgendeWeekStart);
derdeWeekStart.setDate(volgendeWeekStart.getDate() + 7);
```

**Rationale**: Hergebruikt bewezen logica, consistent met bestaande week berekeningen.

---

### 5. CSS Layout Strategie voor 2-Week vs 3-Week View

**Question**: Hoe passen we de floating panel layout aan zonder visuele glitches?

**Findings**:
- **Current Panel Structure** (inspectie van index.html + style.css):
  - Floating panel heeft vaste breedte container
  - Week containers zijn horizontal flex/grid layouts
  - Dag zones hebben vaste width/height (responsive)

**Layout Constraints**:
- Panel moet niet groeien in breedte (desktop screen real estate)
- Derde week moet onder week 2 verschijnen (vertical stack)
- Smooth transition tussen 2-week en 3-week view
- Mobile responsive niet vereist (desktop-only feature per spec)

**Decision**: Vertical stack layout met flexbox column:
```css
.weeks-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.week-row {
    display: flex;
    gap: 4px;
}
```

**Rationale**: Flexbox column is meest flexibel voor dynamische content. Gap zorgt voor consistente spacing.

---

## Technical Decisions Summary

| Aspect | Decision | Confidence |
|--------|----------|-----------|
| DOM Structure | Nieuwe `#actiesDerdeWeek` container parallel aan bestaande | 🟢 High |
| Keyboard Detection | Global keydown/keyup listeners + instance variable tracking | 🟢 High |
| Show/Hide Mechanism | CSS class toggle met max-height + opacity transition | 🟢 High |
| Datum Berekening | Extend bestaande Date arithmetic pattern (+7 dagen) | 🟢 High |
| CSS Layout | Flexbox column voor weeks container | 🟢 High |
| Event Lifecycle | Bind keyboard tijdens dragstart, unbind tijdens dragend | 🟢 High |

## Implementation Risks & Mitigations

### Risk 1: Keyboard events conflicten met bestaande shortcuts
**Mitigation**: Alleen Ctrl detectie tijdens actieve drag (check `this.currentDragData !== null`)

### Risk 2: Layout shift bij eerste toggle
**Mitigation**: CSS transitions + max-height met calculated value (geen `auto`)

### Risk 3: Performance bij rapid Ctrl toggling
**Mitigation**: Debounce niet nodig - CSS transitions zijn GPU-accelerated, DOM updates zijn O(1)

## Open Questions

**None** - Alle technical aspects zijn onderzocht en gedocumenteerd.

---

**Research Complete** ✅ - Ready for Phase 1 (Design & Contracts)
