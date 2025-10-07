# Quickstart: Verberg Uitklapbare Blokken Dagelijkse Planning

**Feature**: 007-op-de-pagina
**Estimated Time**: 2 minuten
**Prerequisites**: Toegang tot tickedify.com/app met inloggegevens

## User Story Validation

### Story 1: Blokken zijn verborgen bij laden
**Als gebruiker** wil ik dat de dagelijkse planning pagina zonder de uitklapbare blokken laadt
**Zodat** ik direct bij de relevante planning functionaliteit kom

**Test Steps**:
1. Navigeer naar https://tickedify.com/app
2. Login met jan@buskens.be / qyqhut-muDvop-fadki9
3. Klik op "Dagelijkse Planning" in de sidebar (onder Tools)
4. **Expected**: Pagina laadt zonder "⏰ Tijd" en "🔒 Geblokkeerd & Pauzes" blokken zichtbaar
5. **Expected**: Alleen "📋 Acties" sectie is zichtbaar in de linker sidebar
6. **Expected**: Rechter kalender kolom is normaal zichtbaar

### Story 2: Andere functionaliteit blijft werken
**Als gebruiker** wil ik dat alle andere planning functionaliteit blijft werken
**Zodat** ik mijn planning workflow kan voortzetten

**Test Steps**:
1. Vervolg op vorige test (dagelijkse planning pagina open)
2. Test filters in "Acties" sectie:
   - Zoek op taaknaam
   - Filter op project
   - Filter op context
   - Filter op prioriteit
   - Filter op max duur
   - Toggle "Toon toekomstige taken"
3. **Expected**: Alle filters werken normaal
4. Test drag & drop:
   - Sleep een taak van "Acties" naar de kalender
   - Verplaats een taak binnen de kalender
   - Verwijder een taak uit de kalender
5. **Expected**: Drag & drop functionaliteit werkt normaal
6. Test kalender functionaliteit:
   - Klik op "🗑️ Leegmaken" button
   - Bekijk totaal geplande tijd indicator
   - Test "📺 Focus" button
7. **Expected**: Alle kalender functies werken normaal

### Story 3: Responsive design blijft intact
**Als gebruiker** wil ik dat de pagina responsive blijft op verschillende schermformaten
**Zodat** ik op elk apparaat kan werken

**Test Steps**:
1. Test desktop view (> 1024px)
   - **Expected**: Sidebar en kalender naast elkaar
   - **Expected**: Geen zichtbare uitklapbare blokken
2. Test tablet view (768px - 1024px)
   - Open browser developer tools
   - Resize naar 800px breedte
   - **Expected**: Layout blijft bruikbaar
   - **Expected**: Geen zichtbare uitklapbare blokken
3. Test mobile view (< 768px)
   - Resize naar 375px breedte (iPhone SE)
   - **Expected**: Hamburger menu verschijnt
   - **Expected**: Sidebar en kalender gestapeld
   - **Expected**: Geen zichtbare uitklapbare blokken

### Story 4: Code blijft intact voor toekomstige activering
**Als developer** wil ik dat de HTML/JS code voor de blokken blijft bestaan
**Zodat** ik ze in de toekomst makkelijk kan heractiveren

**Test Steps**:
1. Open browser developer tools (F12)
2. Open Elements/Inspector tab
3. Zoek naar element met id="tijd-sectie"
4. **Expected**: Element bestaat in DOM
5. **Expected**: Element heeft `display: none` CSS property
6. Zoek naar element met id="templates-sectie"
7. **Expected**: Element bestaat in DOM
8. **Expected**: Element heeft `display: none` CSS property
9. View page source of inspect `public/app.js`
10. **Expected**: Regel 8004-8015 (tijd sectie code) blijft intact
11. **Expected**: Regel 8018-8039 (templates sectie code) blijft intact

## Manual Testing Checklist

### Visual Verification
- [ ] "⏰ Tijd" block is niet zichtbaar op dagelijkse planning pagina
- [ ] "🔒 Geblokkeerd & Pauzes" block is niet zichtbaar op dagelijkse planning pagina
- [ ] "📋 Acties" sectie is wel zichtbaar en functioneel
- [ ] Dag kalender (rechts) is zichtbaar en functioneel
- [ ] Layout ziet er clean uit zonder lege ruimtes waar blokken waren
- [ ] Geen console errors in browser developer tools

### Functional Verification
- [ ] Filters in acties sectie werken allemaal
- [ ] Drag & drop van taken naar kalender werkt
- [ ] Kalender functies (leegmaken, focus mode) werken
- [ ] Taken kunnen worden bewerkt/verwijderd
- [ ] Totaal geplande tijd wordt correct berekend

### Responsive Verification
- [ ] Desktop view (1920x1080): Layout correct, blokken verborgen
- [ ] Tablet view (768x1024): Layout correct, blokken verborgen
- [ ] Mobile view (375x667): Layout correct, blokken verborgen
- [ ] Hamburger menu werkt op mobile

### Code Integrity Verification
- [ ] Elementen bestaan in DOM maar zijn hidden
- [ ] `app.js` code voor tijd sectie (regel 8004-8015) intact
- [ ] `app.js` code voor templates sectie (regel 8018-8039) intact
- [ ] CSS rule `#tijd-sectie { display: none; }` bestaat in styles.css
- [ ] CSS rule `#templates-sectie { display: none; }` bestaat in styles.css

## Success Criteria
✅ Beide blokken zijn niet zichtbaar voor gebruiker
✅ Alle andere dagelijkse planning functionaliteit werkt normaal
✅ Responsive design blijft intact op alle formaten
✅ Geen console errors of warnings
✅ Code blijft intact in app.js (alleen CSS wijziging)

## Rollback Procedure
Als er problemen zijn:
1. Open `public/styles.css`
2. Zoek de twee CSS regels voor `#tijd-sectie` en `#templates-sectie`
3. Comment out of verwijder deze regels
4. Deploy naar productie
5. Blokken zijn weer zichtbaar

## Notes
- Deze feature heeft geen backend impact
- Geen database wijzigingen
- Deployment is instant (CSS wordt gecached maar force refresh werkt)
- Extremely low risk wijziging
