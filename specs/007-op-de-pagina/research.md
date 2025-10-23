# Research: Verberg Uitklapbare Blokken Dagelijkse Planning

**Feature**: 007-op-de-pagina
**Date**: 2025-10-07

## Overview
Deze feature vereist minimale research aangezien het een eenvoudige CSS styling wijziging betreft voor bestaande UI elementen.

## Technical Decisions

### Decision 1: CSS Hiding Methode
**Decision**: Gebruik `display: none` voor beide blokken

**Rationale**:
- Simpelste methode om elementen te verbergen
- Verwijdert elementen volledig uit document flow (geen ruimte ingenomen)
- Geen JavaScript nodig
- Makkelijk te reverten door CSS regel te verwijderen/commentariëren
- Betere performance dan `visibility: hidden` (geen layout berekening)

**Alternatives Considered**:
- `visibility: hidden` - Houdt ruimte in layout, niet gewenst
- `opacity: 0` - Elementen blijven interacteerbaar, niet gewenst
- HTML verwijderen - Tegen requirements (code moet blijven bestaan)
- JavaScript hiding - Onnodige complexiteit voor pure UI hiding

### Decision 2: CSS Locatie
**Decision**: Voeg regels toe aan `public/styles.css` in dagelijkse planning sectie

**Rationale**:
- Tickedify gebruikt één centraal styles.css bestand
- Dagelijkse planning heeft bestaande CSS sectie (~regel 2000+)
- Consistent met bestaande architectuur
- Makkelijk te vinden en te onderhouden

**Alternatives Considered**:
- Inline styles in app.js - Minder maintainable
- Nieuwe CSS file - Onnodige overhead voor 2 regels
- Style tag in HTML - Tickedify gebruikt externe stylesheet

### Decision 3: CSS Selectors
**Decision**: Gebruik ID selectors `#tijd-sectie` en `#templates-sectie`

**Rationale**:
- Elementen hebben al unieke IDs (regel 8004 en 8018 in app.js)
- ID selectors hebben hoogste specificiteit (geen conflicts)
- Meest performante selector type
- Eenvoudigste syntax

**Alternatives Considered**:
- Class selectors - Elementen hebben al IDs, minder specifiek
- Attribute selectors - Onnodige complexiteit
- JavaScript based hiding - Tegen requirement (code moet blijven)

## Element Identification

### Tijd Sectie
**Location**: `public/app.js` regel 8004-8015
**ID**: `tijd-sectie`
**Content**:
- Section header "⏰ Tijd"
- Input fields voor startUur en eindUur
- Collapsible functionaliteit via `toggleSection('tijd')`

### Templates Sectie
**Location**: `public/app.js` regel 8018-8039
**ID**: `templates-sectie`
**Content**:
- Section header "🔒 Geblokkeerd & Pauzes"
- Template items voor geblokkeerd (30/60/90/120 min)
- Template items voor pauzes (5/10/15 min)
- Collapsible functionaliteit via `toggleSection('templates')`

## Implementation Path

### Files to Modify
1. **public/styles.css** - Add 2 CSS rules

### Expected Changes
```css
/* Hide time settings in daily planning */
#tijd-sectie {
    display: none;
}

/* Hide templates section in daily planning */
#templates-sectie {
    display: none;
}
```

## Testing Approach
1. Navigate to tickedify.com/app
2. Login with jan@buskens.be credentials
3. Open "Dagelijkse Planning" page
4. Verify beide blokken zijn niet zichtbaar
5. Verify overige functionaliteit (acties, kalender, filters) werkt normaal
6. Test responsive design (mobile/tablet/desktop)
7. Verify geen console errors

## Risks & Mitigations

### Risk 1: CSS Specificity Conflicts
**Likelihood**: Low
**Impact**: Low
**Mitigation**: ID selectors hebben hoogste specificiteit, conflicts onwaarschijnlijk

### Risk 2: Future Code Dependencies
**Likelihood**: Low
**Impact**: Low
**Mitigation**: Elementen blijven in DOM, alleen niet zichtbaar

### Risk 3: Responsive Layout Issues
**Likelihood**: Very Low
**Impact**: Low
**Mitigation**: `display: none` heeft geen layout impact

## Dependencies
Geen - Pure CSS wijziging, geen externe libraries of APIs

## Performance Impact
**Positive** - Minder DOM elementen gerenderd = betere paint performance

## Security Considerations
Geen - CSS styling heeft geen security implicaties

## Accessibility Considerations
✅ **Improved** - Minder visuele clutter = betere focus voor gebruikers
⚠️ **Note**: Elementen blijven in DOM maar zijn hidden voor screen readers (aria-hidden implicitly true via display:none)

## Rollback Plan
Remove of comment out de 2 CSS regels in styles.css - instant rollback mogelijk

## Conclusion
✅ All technical decisions made
✅ No NEEDS CLARIFICATION markers remaining
✅ Simple, low-risk implementation
✅ Ready for Phase 1 (Design & Contracts)
