# Research: Uitbreiding Planning Uren 05:00-22:00

**Feature**: 041-in-de-dagelijkse
**Date**: 2025-10-30
**Status**: Complete

## Research Vragen

### 1. Zijn er NEEDS CLARIFICATION items in de Technical Context?

**Antwoord**: Nee, alle technische details zijn bekend via codebase exploratie.

### 2. Wat is de huidige implementatie van uren configuratie?

**Bevindingen**:
- **LocalStorage keys**:
  - `dagplanning-start-uur` - default waarde: `'8'` (string)
  - `dagplanning-eind-uur` - default waarde: `'18'` (string)
- **Locatie**: `public/app.js:8277-8278`
- **Conversie**: `parseInt()` gebruikt om string naar number te converteren
- **UI Controls**: `app.js:8296-8298`
  - Start uur: `<input type="number" min="0" max="23">`
  - Eind uur: `<input type="number" min="1" max="24">`

**Code Fragment**:
```javascript
const startUur = parseInt(localStorage.getItem('dagplanning-start-uur') || '8');
const eindUur = parseInt(localStorage.getItem('dagplanning-eind-uur') || '18');
```

### 3. Waar worden de uren gebruikt in de rendering?

**Bevindingen**:
- **Hoofd render functie**: `renderKalenderGrid(startUur, eindUur, planning)` (app.js:8451-8475)
- **Loop algoritme**: `for (let uur = startUur; uur < eindUur; uur++)`
- **Gebruik**: Creëert `.kalender-uur` divs voor elk uur tussen start en eind

**Implicatie**: Door alleen de default waarden te wijzigen (8→5, 18→22), wordt automatisch het hele tijdvenster uitgebreid zonder verdere code wijzigingen.

### 4. Zijn er database constraints op uur waarden?

**Bevindingen**:
- **Database schema**: `dagelijkse_planning.uur INTEGER NOT NULL CHECK (uur >= 0 AND uur <= 23)`
- **Locatie**: `database.js:195`
- **Constraint**: Uren moeten tussen 0-23 zijn (24-uurs formaat)

**Implicatie**:
- ✅ 05:00 is geldig (uur = 5)
- ✅ 22:00 is geldig (uur = 22)
- ✅ Geen database schema wijzigingen nodig

### 5. Impact op bestaande geplande items?

**Bevindingen**:
- **Query**: `getDagelijksePlanning()` gebruikt `ORDER BY dp.uur ASC, dp.positie ASC`
- **Filter**: Alleen actieve items (niet afgewerkte taken)
- **User isolatie**: `WHERE dp.user_id = $2`

**Implicatie**:
- Bestaande items met uur = 8-17 blijven gewoon zichtbaar
- Items met uur = 5-7 of 18-22 (als die er zijn) worden nu ook getoond
- Geen data migratie nodig

### 6. UI/UX overwegingen voor langer tijdvenster?

**Bevindingen**:
- **Huidige venster**: 10 uur (08:00-18:00)
- **Nieuw venster**: 17 uur (05:00-22:00)
- **Scroll gedrag**: `.dag-kalender` heeft `overflow-y: auto` (style.css)
- **Responsive**: Bestaande responsive breakpoints blijven geldig

**Overwegingen**:
- ✅ Scroll container handelt langere lijst automatisch
- ⚠️ Mogelijk meer scroll nodig op mobiel
- ✅ Visuele indicator voor "huidige uur" blijft werken (bestaande functionaliteit)

### 7. Performance impact van meer uren?

**Bevindingen**:
- **Render methode**: DOM updates via template literals en innerHTML
- **Drag & drop**: Throttled op 50ms (app.js:8951)
- **Huidige items**: Typisch 5-15 planning items per dag
- **Nieuw scenario**: Max 34 lege uur divs (5-22 = 17 uren vs 10 uren nu)

**Impact Analyse**:
- ✅ 70% meer lege divs (10→17 uur) = verwaarloosbaar performance impact
- ✅ Drag & drop is al geoptimaliseerd met throttling
- ✅ Geen extra API calls - zelfde data queries
- **Conclusie**: Geen performance zorgen

### 8. Browser compatibility voor uitgebreide uren?

**Bevindingen**:
- **Technologieën**: LocalStorage, parseInt(), template literals, drag & drop API
- **Huidige support**: Alle moderne browsers (Chrome, Firefox, Safari, Edge)
- **Geen nieuwe APIs**: Alleen default waarden wijzigen

**Conclusie**: Geen compatibility risico's

### 9. Testing aanpak voor deze wijziging?

**Best Practices voor Configuration Changes**:
1. **Manual Testing**:
   - Verifieer lege kalender toont 05:00-22:00
   - Test drag & drop naar vroege uren (05:00-07:00)
   - Test drag & drop naar late uren (18:00-21:00)
   - Verifieer bestaande items (08:00-17:00) blijven werken

2. **Playwright End-to-End Tests**:
   - Navigate naar dagelijkse planning
   - Verifieer kalender-uur divs: count = 17 (05-22)
   - Test drag taak naar 06:00
   - Test drag taak naar 20:00
   - Verifieer localStorage persistence

3. **Regression Testing**:
   - Bestaande drag & drop blijft werken
   - Template items (geblokkeerd/pauze) blijven werken
   - Overboekt warning (>60 min) blijft werken

### 10. Deployment strategie?

**Beslissing**:
- ✅ Deploy naar **staging branch** eerst (dev.tickedify.com)
- ✅ Manual testing op staging environment
- ✅ Playwright automated tests op staging
- ✅ Version bump in package.json (volgens CLAUDE.md workflow)
- ❌ **GEEN productie deployment** (BÈTA FREEZE actief - zie CLAUDE.md)
- ⏳ Wacht op expliciete "BÈTA FREEZE IS OPGEHEVEN" instructie

**Workflow**:
```bash
# 1. Wijziging implementeren op feature branch
git checkout 041-in-de-dagelijkse

# 2. Version bump + commit
npm version patch  # Of manual in package.json
git add .
git commit -m "⚡ FEATURE: Uitbreiding planning uren 05:00-22:00 - v0.20.19"

# 3. Merge naar staging
git checkout staging
git merge 041-in-de-dagelijkse --no-edit
git push origin staging

# 4. Vercel deploys automatisch naar dev.tickedify.com
# 5. Test op staging
# 6. STOP - wacht op BÈTA FREEZE LIFT voordat merge naar main
```

## Conclusies

### Simpliciteit van Implementatie
Dit is een **zeer eenvoudige wijziging**:
- **2 regels code**: Wijzig default waarden van '8' naar '5' en '18' naar '22'
- **0 database wijzigingen**: Bestaande schema ondersteunt uren 0-23
- **0 API wijzigingen**: Endpoints werken al met elk uur
- **0 nieuwe functies**: Alleen configuratie aanpassing

### Risico Analyse
- **Risico niveau**: Zeer laag
- **Backwards compatibility**: 100% - bestaande items blijven werken
- **Performance**: Geen zorgen (70% meer divs is verwaarloosbaar)
- **User impact**: Positief - meer flexibiliteit, geen breaking changes

### Implementatie Approach
**Recommended**: Direct wijziging zonder data model of contracts:
1. Update default waarden in app.js:8277-8278
2. Test op staging environment
3. Deploy naar staging, wait for BÈTA FREEZE lift voor productie

**Rationale**:
- Geen nieuwe entiteiten of relationships
- Geen API contract wijzigingen
- Pure configuratie aanpassing
- Bestaande tests blijven geldig

### Alternatives Considered

**Alternative 1**: User-configureerbare uren via settings
- **Pro**: Meer flexibiliteit per gebruiker
- **Con**: Complexiteit, UI voor settings, database opslag
- **Rejected**: YAGNI - start met goede defaults, voeg configuratie toe als gebruikers erom vragen

**Alternative 2**: Automatische uren op basis van gebruiker gedrag
- **Pro**: Intelligente aanpassing aan gebruiker workflow
- **Con**: Machine learning complexity, data verzameling, privacy
- **Rejected**: Veel te complex voor huidige need

**Alternative 3**: 24-uurs planning (00:00-24:00)
- **Pro**: Maximale flexibiliteit
- **Con**: Te lange lijst, overwhelming UI, niet praktisch (wie plant om 03:00?)
- **Rejected**: 05:00-22:00 is praktische balans tussen flexibiliteit en usability

## Aanbevelingen

### Immediate Implementation
1. ✅ Wijzig default waarden naar 5 en 22
2. ✅ Deploy naar staging en test
3. ✅ Playwright tests toevoegen voor nieuwe uren
4. ⏳ Wacht op BÈTA FREEZE LIFT voor productie

### Future Enhancements (Optional)
- [ ] User settings voor persoonlijke uren voorkeur (als gevraagd)
- [ ] Analytics: welke uren worden meest gebruikt?
- [ ] Smart defaults op basis van historisch gebruiker gedrag (ver in toekomst)

### Documentation Updates
- [x] ARCHITECTURE.md updaten met nieuwe default waarden
- [x] CHANGELOG.md entry toevoegen
- [x] Deze research.md als referentie

---

**Status**: Research complete - alle vragen beantwoord, geen NEEDS CLARIFICATION items.
**Next Phase**: Phase 1 - Design & Contracts (optioneel - kan direct naar implementatie)
