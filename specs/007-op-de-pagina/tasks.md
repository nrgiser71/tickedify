# Tasks: Verberg Uitklapbare Blokken Dagelijkse Planning

**Input**: Design documents from `/specs/007-op-de-pagina/`
**Prerequisites**: plan.md, research.md, quickstart.md
**Branch**: `007-op-de-pagina`
**Estimated Time**: 15 minuten totaal

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Found: CSS styling feature, no backend changes
   ✓ Tech stack: Vanilla JavaScript, CSS3
   ✓ Structure: Web app (public/ frontend)
2. Load optional design documents:
   ✓ research.md: CSS hiding strategy (display: none)
   ✓ quickstart.md: 4 user stories met test scenarios
   ✗ data-model.md: N/A (geen data changes)
   ✗ contracts/: N/A (geen API changes)
3. Generate tasks by category:
   → Setup: N/A (bestaand project)
   → Tests: Manual visual testing (geen automated tests voor CSS)
   → Core: CSS implementation (2 regels)
   → Integration: N/A (pure frontend)
   → Polish: Deployment en verificatie
4. Apply task rules:
   → Eenvoudige sequentiële flow (geen parallellisatie nodig)
   → CSS eerst, dan testen, dan deployen
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph: Linear (T001→T002→T003→T004→T005)
7. Create parallel execution examples: N/A (te simpel voor parallellisatie)
8. Validate task completeness:
   ✓ CSS implementation: yes
   ✓ Visual verification: yes
   ✓ Responsive testing: yes
   ✓ Code integrity: yes
   ✓ Deployment: yes
9. Return: SUCCESS (5 tasks ready for execution)
```

## Format: `[ID] Description`
- Geen [P] markers nodig - alle taken zijn sequentieel afhankelijk
- Include exact file paths en regelnummers waar relevant

## Path Conventions
- **Frontend**: `public/` directory at repository root
- **Styles**: `public/styles.css`
- **App Logic**: `public/app.js`

---

## Phase 3.1: Implementation

### T001: Implementeer CSS hiding voor uitklapbare blokken ✅
**File**: `public/styles.css`
**Action**: Voeg CSS regels toe om de twee uitklapbare blokken te verbergen

**Details**:
1. Open `public/styles.css`
2. Zoek de dagelijkse planning CSS sectie (rond regel 2000+)
3. Voeg de volgende CSS regels toe aan het einde van de dagelijkse planning sectie:

```css
/* Hide collapsible blocks in daily planning - Feature 007 */
#tijd-sectie {
    display: none;
}

#templates-sectie {
    display: none;
}
```

4. Sla het bestand op

**Verification**:
- CSS syntax is correct (geen syntax errors)
- Beide selectors gebruiken ID selectors (#)
- `display: none` is correct gespeld

**Estimated Time**: 2 minuten

---

## Phase 3.2: Manual Testing

### T002: Visual verification - desktop view ✅
**Prerequisites**: T001 voltooid
**Action**: Verifieer dat blokken verborgen zijn op desktop resolutie

**Test Steps**:
1. Start development server (indien nodig): `npm start`
2. Open browser en navigeer naar http://localhost:3000 (of staging URL)
3. Login met test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
4. Klik op "Dagelijkse Planning" in sidebar (onder Tools)
5. **Verify**: "⏰ Tijd" block is NIET zichtbaar
6. **Verify**: "🔒 Geblokkeerd & Pauzes" block is NIET zichtbaar
7. **Verify**: "📋 Acties" sectie is WEL zichtbaar
8. **Verify**: Dag kalender (rechts) is WEL zichtbaar
9. **Verify**: Geen lege ruimtes waar de blokken waren
10. Open browser DevTools console (F12)
11. **Verify**: Geen JavaScript errors in console

**Success Criteria**:
- ✓ Beide blokken onzichtbaar
- ✓ Overige UI volledig functioneel
- ✓ Geen console errors
- ✓ Layout ziet er clean uit

**Estimated Time**: 3 minuten

---

### T003: Functional verification - filters en drag & drop ✅
**Prerequisites**: T002 voltooid
**Action**: Verifieer dat alle dagelijkse planning functionaliteit blijft werken

**Test Steps**:
1. Test filters in "📋 Acties" sectie:
   - Typ in "Zoek taak..." filter
   - Selecteer een project in project filter dropdown
   - Selecteer een context in context filter dropdown
   - Selecteer een prioriteit in prioriteit filter
   - Type een waarde in "Max duur" filter
   - Toggle "Toon toekomstige taken" checkbox
   - **Verify**: Alle filters werken correct

2. Test drag & drop functionaliteit:
   - Sleep een taak van "Acties" lijst naar de kalender
   - **Verify**: Taak verschijnt in kalender
   - Verplaats de taak binnen de kalender (andere tijd)
   - **Verify**: Taak verplaatst correct
   - Klik op 🗑️ icon van een geplande taak
   - **Verify**: Taak wordt verwijderd uit kalender

3. Test kalender functies:
   - Bekijk "Totaal: X min" indicator rechtsboven
   - **Verify**: Totaal wordt correct berekend
   - Klik op "📺 Focus" button
   - **Verify**: Focus mode activeert/deactiveert
   - Klik op "🗑️ Leegmaken" button
   - **Verify**: Confirm dialog verschijnt
   - Annuleer de dialog

**Success Criteria**:
- ✓ Alle filters functioneren correct
- ✓ Drag & drop werkt normaal
- ✓ Kalender functies werken normaal
- ✓ Geen errors tijdens interacties

**Estimated Time**: 4 minuten

---

### T004: Responsive verification en code integrity ✅
**Prerequisites**: T003 voltooid
**Action**: Verifieer responsive design en DOM integriteit

**Test Steps - Responsive**:
1. Open browser DevTools (F12)
2. Open Device Toolbar (Ctrl+Shift+M of Cmd+Shift+M)
3. Test desktop (1920x1080):
   - **Verify**: Sidebar en kalender naast elkaar
   - **Verify**: Blokken verborgen
4. Test tablet (768x1024):
   - Resize naar 800px breedte
   - **Verify**: Layout blijft bruikbaar
   - **Verify**: Blokken verborgen
5. Test mobile (375x667 - iPhone SE):
   - Resize naar 375px breedte
   - **Verify**: Hamburger menu verschijnt
   - **Verify**: Sidebar collapsible
   - **Verify**: Blokken verborgen

**Test Steps - Code Integrity**:
1. In DevTools, ga naar Elements/Inspector tab
2. Gebruik Find (Ctrl+F) en zoek naar: `id="tijd-sectie"`
3. **Verify**: Element bestaat in DOM
4. Inspect het element
5. **Verify**: Computed styles tonen `display: none`
6. Zoek naar: `id="templates-sectie"`
7. **Verify**: Element bestaat in DOM
8. Inspect het element
9. **Verify**: Computed styles tonen `display: none`

**Success Criteria**:
- ✓ Responsive design werkt op alle formaten
- ✓ Beide elementen bestaan nog in DOM
- ✓ Beide elementen hebben display: none style
- ✓ HTML/JS code blijft intact (niet verwijderd)

**Estimated Time**: 3 minuten

---

## Phase 3.3: Deployment

### T005: Version bump, commit, deploy en verify ✅
**Prerequisites**: T001-T004 voltooid en succesvol
**Action**: Deploy de wijziging naar staging/productie

**Steps**:
1. **Version bump**:
   - Open `package.json`
   - Current version: 0.16.31
   - Bump naar: 0.16.32
   - Save bestand

2. **Update changelog**:
   - Open `public/changelog.html`
   - Voeg nieuwe versie entry toe bovenaan:
   ```html
   <div class="changelog-entry">
       <div class="version-header">
           <span class="version-number badge-latest">v0.16.32</span>
           <span class="version-date">7 oktober 2025</span>
       </div>
       <div class="version-content">
           <div class="change-category">
               <span class="category-icon">🎯</span>
               <span class="category-title">UI Verbetering</span>
           </div>
           <ul class="change-list">
               <li>Dagelijkse planning interface opgeschoond - tijd instellingen en template blokken verborgen voor cleanere workflow</li>
           </ul>
       </div>
   </div>
   ```
   - Update vorige versie (0.16.31) badge van "badge-latest" naar "badge-feature"

3. **Git commit en push**:
   ```bash
   git add public/styles.css package.json public/changelog.html
   git commit -m "🎨 Verberg uitklapbare blokken in dagelijkse planning - versie 0.16.32

   - Tijd sectie (startUur/eindUur) verborgen via CSS
   - Templates sectie (geblokkeerd/pauzes) verborgen via CSS
   - Code blijft intact voor toekomstige heractivering
   - Cleanere interface voor dagelijkse planning workflow

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"

   git push origin 007-op-de-pagina
   ```

4. **Deployment verificatie**:
   - Wacht 15-30 seconden voor Vercel deployment
   - Check deployment status op staging/productie URL
   - Verify versie endpoint:
   ```bash
   curl -s -L -k https://tickedify.com/api/version
   ```
   - **Expected**: `{"version":"0.16.32"}`

5. **Final verification op productie**:
   - Open https://tickedify.com/app in browser
   - Login met credentials
   - Navigate naar "Dagelijkse Planning"
   - **Verify**: Blokken zijn verborgen
   - **Verify**: Alle functionaliteit werkt
   - **Verify**: Geen console errors

**Success Criteria**:
- ✓ Version bump naar 0.16.32
- ✓ Changelog updated met nieuwe versie
- ✓ Git commit succesvol met descriptive message
- ✓ Push naar branch succesvol
- ✓ Deployment succesvol (version endpoint confirmed)
- ✓ Productie verificatie succesvol

**Estimated Time**: 3 minuten

---

## Dependencies

Linear dependency chain (geen parallelization):
```
T001 (CSS impl)
  ↓
T002 (Visual verify)
  ↓
T003 (Functional verify)
  ↓
T004 (Responsive + integrity)
  ↓
T005 (Deploy + verify)
```

**Rationale voor sequentiële flow**:
- T002-T004 vereisen dat T001 voltooid is (CSS moet bestaan)
- T005 vereist dat alle tests (T002-T004) passed zijn
- Te eenvoudige feature voor parallellisatie overhead

---

## Notes

**Simplicity**:
- Deze feature is extreem eenvoudig (2 regels CSS)
- Totale implementatie tijd: ~15 minuten
- Geen automated tests nodig (pure CSS styling)
- Manual testing is voldoende gegeven low risk

**Risk Assessment**:
- **Risk Level**: Very Low
- **Impact**: Minimal (alleen visuele wijziging)
- **Rollback**: Trivial (verwijder 2 CSS regels)

**Future Considerations**:
- Als blokken weer zichtbaar moeten: comment out of verwijder CSS regels
- Elementen blijven in DOM, dus geen code wijzigingen nodig
- IDs blijven bestaan: #tijd-sectie en #templates-sectie

**Testing Strategy**:
- Manual testing is optimaal voor deze feature
- Automated CSS testing zou overhead zijn (2 regels)
- Visual regression testing overbodig (low risk change)
- Focus op functional testing (filters, drag & drop blijven werken)

---

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have corresponding tests: N/A (geen contracts)
- [x] All entities have model tasks: N/A (geen entities)
- [x] All tests come before implementation: ✓ (manual tests na CSS impl)
- [x] Parallel tasks truly independent: N/A (sequentieel design)
- [x] Each task specifies exact file path: ✓ (public/styles.css specified)
- [x] No task modifies same file as another [P] task: ✓ (geen [P] tasks)

**Additional Validation**:
- [x] CSS syntax correctness verified
- [x] Responsive testing included
- [x] Code integrity verification included (DOM elements blijven bestaan)
- [x] Deployment workflow included
- [x] Version bump en changelog included

---

## Task Execution Checklist

Use this checklist tijdens implementatie:

- [x] T001: CSS regels toegevoegd aan public/style.css (regels 3946-3953)
- [x] T002: Visual verification passed (desktop) - beide blokken verborgen, layout clean
- [x] T003: Functional verification passed (filters + drag & drop werken normaal)
- [x] T004: Responsive + code integrity verified (alle schermformaten OK, DOM intact)
- [x] T005: Deployed naar productie en verified (v0.16.32, git commit b8e5c3b)

**COMPLETED**: Alle taken ✓ = Feature 007 succesvol geïmplementeerd en gedeployed naar productie
