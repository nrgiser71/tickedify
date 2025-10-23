# Quickstart: Verwijderen 'Geblokkeerd & Pauzes' Blok

## Feature Overview
Verwijder het uitklapbare blok "🔒 Geblokkeerd & Pauzes" uit het Dagelijkse Planning scherm om de interface op te schonen.

## Test Scenario

### Pre-Implementation Verification (Before Changes)
**Doel**: Bevestig dat het blok momenteel aanwezig is

1. Open Tickedify in browser
2. Log in met test credentials
3. Navigeer naar **Dagelijkse Planning** scherm
4. Zoek in de rechterbalk naar het blok "🔒 Geblokkeerd & Pauzes"
5. **Verwacht resultaat**: Blok is zichtbaar met:
   - Header "🔒 Geblokkeerd & Pauzes" met chevron icon
   - Sectie "🔒 Geblokkeerd" met 4 template items (30/60/90/120 min)
   - Sectie "☕ Pauzes" met 3 template items (5/10/15 min)

### Post-Implementation Verification (After Changes)
**Doel**: Bevestig dat het blok correct verwijderd is

1. Open Tickedify in browser (hard refresh: Cmd+Shift+R)
2. Log in met test credentials
3. Navigeer naar **Dagelijkse Planning** scherm
4. Scan de rechterbalk voor het "🔒 Geblokkeerd & Pauzes" blok
5. **Verwacht resultaat**:
   - ❌ Blok is NIET meer zichtbaar
   - ✅ Andere secties zijn nog wel aanwezig:
     - "⏰ Tijd" sectie (bovenaan)
     - "⭐ Top 3 Prioriteiten" sectie (onderaan)

### Regression Testing
**Doel**: Verifieer dat andere functionaliteit niet is aangetast

1. Test "⏰ Tijd" sectie:
   - Klik op header om in/uit te klappen
   - Wijzig starttijd
   - Wijzig eindtijd
   - **Verwacht**: Collapse werkt normaal, tijden zijn wijzigbaar

2. Test "⭐ Top 3 Prioriteiten" sectie:
   - Klik op header om in/uit te klappen
   - Bekijk bestaande prioriteiten
   - **Verwacht**: Collapse werkt normaal, prioriteiten tonen correct

3. Test Dagelijkse Planning drag & drop:
   - Sleep een taak uit "Acties" naar de planning kalender
   - **Verwacht**: Drag & drop werkt ongewijzigd

4. Test Planning resize:
   - Resize de planning kolom breedte
   - **Verwacht**: Resize werkt normaal

## Expected Files Modified
- `public/app.js`: Regels 8290-8312 verwijderd (HTML blok)
- `public/app.js`: Regels 12015-12048 verwijderd (debug UI slider - optioneel)
- `public/style.css`: `.templates-sectie` CSS verwijderd (indien aanwezig)

## Success Criteria
- [x] "Geblokkeerd & Pauzes" blok is NIET zichtbaar in Dagelijkse Planning
- [x] Andere collapsible secties werken normaal (Tijd, Top 3 Prioriteiten)
- [x] Planning drag & drop functionaliteit ongewijzigd
- [x] Geen console errors in browser developer tools
- [x] Layout van rechterbalk is correct (geen lege ruimtes of overlap)

## Rollback Plan
Als er problemen optreden:
1. `git checkout HEAD~1 public/app.js` - Herstel vorige versie
2. Hard refresh browser (Cmd+Shift+R)
3. Verifieer dat blok terug zichtbaar is

## Notes
- Geen database wijzigingen nodig
- Geen API endpoints betrokken
- Puur frontend UI cleanup
- Test in alle browsers (Chrome, Firefox, Safari, Edge) indien mogelijk
