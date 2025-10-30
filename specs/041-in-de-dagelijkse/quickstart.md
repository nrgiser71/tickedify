# Quickstart: Uitbreiding Planning Uren 05:00-22:00

**Feature**: 041-in-de-dagelijkse
**Date**: 2025-10-30
**Status**: Ready for Implementation

## Overzicht

Simpele configuratie wijziging om dagelijkse planning uren uit te breiden van 08:00-18:00 naar 05:00-22:00.

## Implementatie Checklist

### Pre-Implementation
- [x] Feature specificatie compleet (spec.md)
- [x] Research uitgevoerd (research.md)
- [x] Data model geanalyseerd (data-model.md)
- [x] API contracts geverifieerd (contracts/NO_CHANGES.md)
- [x] Geen database wijzigingen nodig
- [x] Geen backend wijzigingen nodig

### Implementation Steps

#### 1. Code Wijziging (1 minuut)
- [ ] Open `public/app.js`
- [ ] Ga naar regels 8277-8278
- [ ] Wijzig default waarden:
  ```javascript
  // OUD:
  const startUur = parseInt(localStorage.getItem('dagplanning-start-uur') || '8');
  const eindUur = parseInt(localStorage.getItem('dagplanning-eind-uur') || '18');

  // NIEUW:
  const startUur = parseInt(localStorage.getItem('dagplanning-start-uur') || '5');
  const eindUur = parseInt(localStorage.getItem('dagplanning-eind-uur') || '22');
  ```

#### 2. Version Bump (1 minuut)
- [ ] Open `package.json`
- [ ] Increment versie: `0.20.18` → `0.20.19` (patch level)
- [ ] Sla op

#### 3. Changelog Update (2 minuten)
- [ ] Open `public/changelog.html`
- [ ] Voeg nieuwste versie toe:
  ```html
  <div class="version-entry">
      <div class="version-header">
          <span class="badge badge-latest">v0.20.19</span>
          <span class="version-date">30 oktober 2025</span>
      </div>
      <div class="version-content">
          <div class="change-category">
              <span class="category-icon">⚡</span>
              <span class="category-name">Features</span>
          </div>
          <ul class="change-list">
              <li>Uitbreiding dagelijkse planning uren van 08:00-18:00 naar 05:00-22:00 voor meer flexibiliteit</li>
          </ul>
      </div>
  </div>
  ```
- [ ] Verander vorige versie badge van `badge-latest` naar `badge-feature`

#### 4. Git Commit (2 minuten)
- [ ] Stage wijzigingen:
  ```bash
  git add public/app.js package.json public/changelog.html
  ```
- [ ] Commit met beschrijvende message:
  ```bash
  git commit -m "⚡ FEATURE: Uitbreiding planning uren 05:00-22:00 - v0.20.19

  - Wijzig default dagplanning-start-uur van 8 naar 5
  - Wijzig default dagplanning-eind-uur van 18 naar 22
  - Ondersteunt vroege vogels (05:00-08:00) en avondwerkers (18:00-22:00)
  - Backwards compatible: bestaande items blijven werken
  - Geen database/API wijzigingen nodig

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

#### 5. Deploy naar Staging (5 minuten)
- [ ] Checkout staging branch:
  ```bash
  git checkout staging
  ```
- [ ] Merge feature branch:
  ```bash
  git merge 041-in-de-dagelijkse --no-edit
  ```
- [ ] Push naar staging:
  ```bash
  git push origin staging
  ```
- [ ] Wacht 15-30 seconden voor Vercel deployment

#### 6. Verify Deployment (2 minuten)
- [ ] Check versie endpoint (gebruik Vercel MCP tools):
  ```bash
  # Via Vercel MCP
  mcp__vercel__web_fetch_vercel_url("https://dev.tickedify.com/api/version")

  # Expected response
  { "version": "0.20.19" }
  ```
- [ ] Als versie niet matcht: wacht nog 15 seconden en check opnieuw

### Testing Phase

#### Manual Testing op Staging (10 minuten)
- [ ] Navigate naar https://dev.tickedify.com/app (via browser of Playwright)
- [ ] Login met jan@buskens.be / qyqhut-muDvop-fadki9
- [ ] Open Dagelijkse Planning
- [ ] Clear LocalStorage (optioneel - voor nieuwe defaults):
  ```javascript
  localStorage.removeItem('dagplanning-start-uur');
  localStorage.removeItem('dagplanning-eind-uur');
  location.reload();
  ```

**Test Scenarios**:

1. **Test: Nieuwe Defaults Laden**
   - [ ] Refresh pagina
   - [ ] Verifieer kalender toont 05:00 als eerste uur
   - [ ] Scroll naar beneden
   - [ ] Verifieer kalender toont 21:00 als laatste uur
   - [ ] Tel uur divs: moet 17 zijn (05-21 inclusief)

2. **Test: Drag Taak naar Vroege Ochtend (06:00)**
   - [ ] Ga naar Acties lijst (linker sidebar)
   - [ ] Selecteer een taak
   - [ ] Sleep taak naar 06:00 uur slot
   - [ ] Verifieer taak verschijnt in kalender op 06:00
   - [ ] Verifieer geen console errors
   - [ ] Refresh pagina → taak blijft op 06:00 (persistentie check)

3. **Test: Drag Taak naar Late Avond (20:00)**
   - [ ] Sleep een andere taak naar 20:00 slot
   - [ ] Verifieer taak verschijnt op 20:00
   - [ ] Verifieer drag ghost preview werkt
   - [ ] Verifieer dynamic spacing werkt

4. **Test: Geblokkeerd Item op Nieuw Uur**
   - [ ] Sleep een "🔒 30min" template naar 07:00
   - [ ] Verifieer geblokkeerd item verschijnt
   - [ ] Verifieer 🔒 icon en styling correct zijn

5. **Test: Pauze Item op Nieuw Uur**
   - [ ] Sleep een "☕ 15min" template naar 19:00
   - [ ] Verifieer pauze item verschijnt met ☕ icon

6. **Test: Reorder Tussen Uitgebreide Uren**
   - [ ] Sleep item van 06:00 naar 20:00
   - [ ] Verifieer item verplaatst correct
   - [ ] Sleep item van 20:00 naar 09:00 (terug naar normaal bereik)
   - [ ] Verifieer geen problemen

7. **Test: Overboekt Warning**
   - [ ] Sleep 3x 30min taken naar 05:00
   - [ ] Verifieer "overboekt" warning verschijnt (>60 min)
   - [ ] Verifieer alert icon (⚠️) zichtbaar is

8. **Test: Bestaande Items (Backwards Compat)**
   - [ ] Verifieer bestaande items tussen 08:00-17:00 blijven zichtbaar
   - [ ] Verifieer drag & drop werkt voor bestaande items
   - [ ] Verifieer expand/collapse werkt voor taak items

9. **Test: Custom Settings Persistentie**
   - [ ] Zet custom waarden:
     ```javascript
     localStorage.setItem('dagplanning-start-uur', '7');
     localStorage.setItem('dagplanning-eind-uur', '19');
     location.reload();
     ```
   - [ ] Verifieer kalender toont 07:00-18:00 (custom blijft gerespecteerd)
   - [ ] Reset naar defaults en reload

10. **Test: Mobile Responsive**
    - [ ] Resize browser naar mobile (375px width)
    - [ ] Verifieer kalender blijft scrollable
    - [ ] Verifieer drag & drop werkt op touch (simulate)
    - [ ] Verifieer alle uren zichtbaar zijn via scroll

#### Playwright Automated Testing (Optioneel - 15 minuten)

**Test Script**: `tests/dagelijkse-planning-extended-hours.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Dagelijkse Planning Uitgebreide Uren', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://dev.tickedify.com/app');
    // Login
    await page.fill('input[type="email"]', 'jan@buskens.be');
    await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Clear localStorage voor nieuwe defaults
    await page.evaluate(() => {
      localStorage.removeItem('dagplanning-start-uur');
      localStorage.removeItem('dagplanning-eind-uur');
    });

    // Navigate naar dagelijkse planning
    await page.click('text=Dagelijkse Planning');
    await page.waitForLoadState('networkidle');
  });

  test('Toont 17 uren (05:00-21:00)', async ({ page }) => {
    const uurDivs = await page.locator('.kalender-uur').count();
    expect(uurDivs).toBe(17);
  });

  test('Eerste uur is 05:00', async ({ page }) => {
    const eersteUur = await page.locator('.kalender-uur').first();
    const uurText = await eersteUur.locator('.uur-tijd').textContent();
    expect(uurText).toBe('05:00');
  });

  test('Laatste uur is 21:00', async ({ page }) => {
    const laatsteUur = await page.locator('.kalender-uur').last();
    const uurText = await laatsteUur.locator('.uur-tijd').textContent();
    expect(uurText).toBe('21:00');
  });

  test('Drag taak naar 06:00 werkt', async ({ page }) => {
    // Zoek eerste taak in acties lijst
    const taak = await page.locator('.planning-actie-item').first();
    const taakTekst = await taak.textContent();

    // Zoek 06:00 slot
    const slot06 = await page.locator('.kalender-uur[data-uur="6"] .uur-planning');

    // Drag & drop
    await taak.dragTo(slot06);

    // Wacht op API call
    await page.waitForTimeout(500);

    // Verifieer taak in 06:00 slot
    const geplandItem = await page.locator('.kalender-uur[data-uur="6"] .planning-item');
    expect(await geplandItem.count()).toBeGreaterThan(0);
  });

  test('Drag taak naar 20:00 werkt', async ({ page }) => {
    const taak = await page.locator('.planning-actie-item').first();
    const slot20 = await page.locator('.kalender-uur[data-uur="20"] .uur-planning');

    await taak.dragTo(slot20);
    await page.waitForTimeout(500);

    const geplandItem = await page.locator('.kalender-uur[data-uur="20"] .planning-item');
    expect(await geplandItem.count()).toBeGreaterThan(0);
  });

  test('Custom settings worden gerespecteerd', async ({ page }) => {
    // Zet custom waarden
    await page.evaluate(() => {
      localStorage.setItem('dagplanning-start-uur', '7');
      localStorage.setItem('dagplanning-eind-uur', '19');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const uurDivs = await page.locator('.kalender-uur').count();
    expect(uurDivs).toBe(12);  // 07:00-18:00 = 12 uren

    const eersteUur = await page.locator('.kalender-uur').first().locator('.uur-tijd').textContent();
    expect(eersteUur).toBe('07:00');
  });
});
```

**Run Tests**:
```bash
npx playwright test tests/dagelijkse-planning-extended-hours.spec.js --project=chromium
```

- [ ] Run Playwright tests
- [ ] Verifieer alle tests slagen
- [ ] Check screenshots in `test-results/` (bij failures)

#### Regression Testing (5 minuten)
- [ ] Test bestaande functionaliteit blijft werken:
  - [ ] Taak completion checkbox werkt
  - [ ] Expand/collapse details werkt
  - [ ] Delete planning item werkt
  - [ ] Subtaken tonen werkt
  - [ ] Project/context filters werken
  - [ ] Overboekt warning werkt

### Sign-Off

#### Staging Approval
- [ ] Alle manual tests geslaagd
- [ ] Playwright tests geslaagd (optioneel)
- [ ] Geen console errors
- [ ] Geen visuele glitches
- [ ] Performance acceptabel (geen lag bij drag & drop)

#### Production Deployment (GEBLOKKEERD - BÈTA FREEZE)
- [ ] ⚠️ **WACHT OP "BÈTA FREEZE IS OPGEHEVEN" BERICHT**
- [ ] Staging approval compleet
- [ ] User expliciete goedkeuring voor productie deployment
- [ ] Merge naar main branch (ALLEEN NA FREEZE LIFT):
  ```bash
  git checkout main
  git merge staging --no-edit
  git push origin main
  ```

## Rollback Plan

Als er problemen zijn op staging:

1. **Quick Rollback** (revert default waarden):
   ```javascript
   // In public/app.js:8277-8278
   const startUur = parseInt(localStorage.getItem('dagplanning-start-uur') || '8');
   const eindUur = parseInt(localStorage.getItem('dagplanning-eind-uur') || '18');
   ```

2. **Git Revert**:
   ```bash
   git checkout staging
   git revert HEAD
   git push origin staging
   ```

3. **LocalStorage Fix voor Users** (als needed):
   ```javascript
   // Users kunnen zelf terugzetten in browser console
   localStorage.setItem('dagplanning-start-uur', '8');
   localStorage.setItem('dagplanning-eind-uur', '18');
   location.reload();
   ```

## Success Criteria

- ✅ Kalender toont 17 uren (05:00-21:00)
- ✅ Drag & drop werkt naar alle nieuwe uren
- ✅ Bestaande items blijven functioneel
- ✅ Geen console errors
- ✅ Geen performance degradatie
- ✅ Backwards compatible met custom settings

## Timeline Estimate

- **Implementation**: 5 minuten (code + version + changelog)
- **Deployment**: 5 minuten (git + Vercel)
- **Testing**: 30 minuten (manual + optioneel Playwright)
- **Total**: ~40 minuten van start tot staging approval

## Support

Voor vragen of problemen tijdens implementatie:
- Check research.md voor technische details
- Check data-model.md voor database impact
- Check CLAUDE.md voor deployment workflow
- Check ARCHITECTURE.md voor codebase structuur

---

**Ready to Implement**: Alle voorbereidingen zijn compleet. Start met stap 1!
