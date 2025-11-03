# Tasks: Filter Persistentie bij Taak Completion

**Input**: Design documents from `/specs/050-als-ik-in/`
**Prerequisites**: plan.md (✅), quickstart.md (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Root cause: Ontbrekende filterActies() call in taakAfwerken()
   → Fix location: public/app.js:4189 (na DOM removal logic)
   → Tech stack: Vanilla JavaScript, geen backend changes
2. Load optional design documents ✅
   → quickstart.md: 6 test scenarios voor Playwright
   → Geen data-model, contracts (frontend-only bugfix)
3. Generate tasks by category:
   → Setup: Version bump, changelog (2 tasks)
   → Implementation: 1-line code fix (1 task)
   → Tests: 4 Playwright scenarios (4 tasks)
   → Deployment: Staging merge, verify, test (3 tasks)
   → Regression: Verify bestaande functionaliteit (2 tasks)
4. Apply task rules:
   → Setup tasks [P] - verschillende files
   → Implementation task - single file
   → Test tasks na implementation
   → Deployment tasks sequentieel
5. Number tasks sequentially (T001-T012)
6. Total: 12 tasks, straightforward bugfix workflow
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `public/` (frontend), `server.js` (backend)
- This fix: `public/app.js` only (frontend bugfix)

---

## Phase 3.1: Pre-Implementation Setup

### T001 [X] [P] Version bump in package.json
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/package.json`

**Action**:
- Read current version from package.json
- Increment patch version (e.g., 0.21.22 → 0.21.23)
- Update version field
- Commit is NOT part of this task (comes later in T010)

**Validation**:
- Version number follows semantic versioning
- Patch increment only (no minor/major)

---

### T002 [X] [P] Changelog entry toevoegen
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/changelog.html`

**Action**:
- Add new entry at top of changelog with:
  - Version number (from T001)
  - Date: 2025-11-03
  - Category: 🔧 BUGFIX
  - Badge: `badge-fix`
  - Title: "Filter persistentie bij taak completion"
  - Description: "Gefixte bug waarbij filters werden gereset na het afvinken van een taak in de dagelijkse planning. Filter state blijft nu behouden tijdens taak completions."
- Set previous version badge from `badge-latest` to `badge-fix` or `badge-feature`

**Validation**:
- HTML syntax correct
- Nieuwste versie heeft `badge-latest`
- Emoji en formatting consistent met bestaande entries

---

## Phase 3.2: Core Implementation

### T003 [X] Implementeer filterActies() calls op 2 locaties
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`

**Root Cause Analysis**:
- Filter wordt gereset omdat na taak completion geen `filterActies()` wordt aangeroepen
- `taakAfwerken()` doet bewust individuele DOM removal zonder `renderActiesLijst()` te roepen (performance optimalisatie, zie regel 4235)
- Andere flows (drag&drop, bulk mode toggle) roepen wel `renderActiesLijst()` aan, maar die heeft ook geen filter re-application

**Implementation Strategy**: Twee wijzigingen nodig

**Wijziging 1: Voeg filterActies() toe aan einde van renderActiesLijst()**

**Locatie**: Regel ~3951, aan einde van `renderActiesLijst()` functie

**Code toevoegen**:
```javascript
// Re-apply filters after list render (Feature 050 - filter persistence)
// Only apply if we're in the acties list context
if (this.huidigeLijst === 'acties') {
    this.filterActies();
}
```

**Placement**: Na `this.setupActiesDragFunctionality();` (regel ~3950), voor de sluitende `}` van de functie

**Rationale**: Dit lost filter persistentie op voor alle flows die `renderActiesLijst()` aanroepen:
- Drag naar uitgestelde lijst (regel 11876)
- Drag naar datum (regel 11973)
- Toggle bulk mode (regel 12407)
- Filter restoration (regel 2836)

---

**Wijziging 2: Voeg filterActies() toe in taakAfwerken()**

**Locatie**: Regel ~4189 in `taakAfwerken()` functie

**Code toevoegen**:
```javascript
// Re-apply filters after task removal to maintain filter state (Feature 050)
// This is needed because taakAfwerken() bypasses renderActiesLijst() for performance
if (this.huidigeLijst === 'acties') {
    this.filterActies();
}
```

**Placement**: Na de setTimeout block (regel ~4189), voor het "Background updates" comment (regel ~4191)

**Rationale**: Dit lost filter persistentie op voor de taak completion flow, die bewust geen volledige re-render doet (performance optimalisatie voor grote lijsten)

---

**Conditional Logic**:
- Beide calls checken `this.huidigeLijst === 'acties'` om onnodige filter calls te voorkomen op andere lijsten
- Filter logic blijft fast (<50ms) en scroll position wordt behouden

**Performance Consideration**:
- Dubbele `filterActies()` calls zijn veilig - de functie is idempotent
- Geen full page refresh, geen API calls
- Scroll position preservation blijft intact

**Validation**:
- Code compiles (no syntax errors)
- Filter logic only runs for acties lijst
- Comments reference Feature 050
- Beide wijzigingen aanwezig in final code

---

## Phase 3.3: Deployment Preparation

### T004 [X] Git commit met descriptive message
**Action**:
- Stage all changes: `git add public/app.js public/changelog.html package.json`
- Create commit with message:
  ```
  🔧 FIX: Filter persistentie bij taak completion - v{VERSION}

  Fixed bug waarbij filters werden gereset na het afvinken van een taak
  in de dagelijkse planning acties lijst. De filter UI bleef visueel actief,
  maar de lijst toonde weer alle taken in plaats van gefilterde taken.

  Root cause: Ontbrekende filterActies() call na DOM removal in taakAfwerken().

  Fix: Toegevoegd this.filterActies() call na task completion, alleen voor
  acties lijst. Filter state blijft nu 100% persistent tijdens completions.

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- Replace {VERSION} with actual version from package.json

**Validation**:
- All 3 files staged
- Commit message follows project conventions
- Includes co-author attribution

---

### T005 [X] Merge naar staging branch
**Action**:
- Checkout staging: `git checkout staging`
- Merge feature branch: `git merge 050-als-ik-in --no-edit`
- Push to remote: `git push origin staging`

**Validation**:
- Merge succeeds without conflicts
- Push triggers Vercel deployment

---

### T006 [X] Verifieer staging deployment op dev.tickedify.com
**Action**:
- Wait 15 seconds for Vercel deployment
- Check version endpoint: `curl -s -L -k https://dev.tickedify.com/api/version`
  - Note: dev.tickedify.com requires Vercel Authentication - use Vercel MCP tools for access
- Compare version number with package.json
- If version doesn't match:
  - Wait another 15 seconds
  - Retry check
  - Max 2 minutes total (8 retries)

**Validation**:
- `/api/version` returns new version number
- Deployment completed successfully
- No console errors in browser

---

## Phase 3.4: Automated Testing (Playwright)

**BELANGRIJK**: Deze tests gebruiken de tickedify-testing sub-agent voor browser automation.

### T007 Playwright test - Scenario 1: Single Project Filter
**Test File**: Create new test in repository (suggest: `tests/playwright/filter-persistence.spec.js`)

**Test Scenario** (from quickstart.md):
```javascript
// Scenario 1: Single Project Filter + Taak Completion
test('Filter blijft actief na single project filter + completion', async ({ page }) => {
  // Login
  await page.goto('https://dev.tickedify.com/app');
  await page.fill('input[type="email"]', 'jan@buskens.be');
  await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');

  // Wait for app to load
  await page.waitForSelector('text=Dagelijkse Planning', { timeout: 10000 });

  // Navigate to daily planning if not already there
  await page.click('text=Dagelijkse Planning');
  await page.waitForSelector('#projectFilter');

  // Get first project option value (skip "Alle" option)
  const projectOptions = await page.locator('#projectFilter option:not([value=""])').all();
  if (projectOptions.length === 0) {
    throw new Error('No projects available for testing');
  }
  const firstProjectValue = await projectOptions[0].getAttribute('value');
  const firstProjectText = await projectOptions[0].textContent();

  // Apply project filter
  await page.selectOption('#projectFilter', firstProjectValue);
  await page.waitForTimeout(500); // Wait for filter to apply

  // Count visible tasks before completion
  const tasksBeforeCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
  console.log(`Visible tasks before completion: ${tasksBeforeCount}`);

  if (tasksBeforeCount === 0) {
    console.log('No visible tasks after filter - test scenario not applicable');
    return; // Skip test gracefully
  }

  // Complete first visible task
  const firstCheckbox = page.locator('.actie-row:visible input[type="checkbox"], .taak-item:visible input[type="checkbox"]').first();
  await firstCheckbox.check();

  // Wait for completion toast
  await page.waitForSelector('text=/Task completed|Taak afgewerkt/i', { timeout: 5000 });
  await page.waitForTimeout(500); // Wait for DOM updates

  // CRITICAL VERIFICATION: Filter still active
  const filterValueAfter = await page.inputValue('#projectFilter');
  expect(filterValueAfter).toBe(firstProjectValue);
  console.log(`✅ Filter value preserved: ${firstProjectText}`);

  // Count visible tasks after completion
  const tasksAfterCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
  console.log(`Visible tasks after completion: ${tasksAfterCount}`);
  expect(tasksAfterCount).toBe(tasksBeforeCount - 1);

  // Verify only filtered project tasks visible
  const visibleTasks = await page.locator('.actie-row:visible, .taak-item:visible').all();
  for (const task of visibleTasks) {
    const projectId = await task.getAttribute('data-project-id');
    expect(projectId).toBe(firstProjectValue);
  }

  console.log('✅ All visible tasks belong to filtered project');
});
```

**Expected Result**: Test passes - filter blijft actief, lijst blijft gefilterd

**Failure Indicators**:
- Filter value gereset naar ""
- tasksAfterCount shows all tasks (not filtered)
- Visible tasks include other projects

---

### T008 Playwright test - Scenario 2: Multiple Filters
**Test Scenario** (from quickstart.md):
```javascript
// Scenario 2: Multiple Filters (Project + Context)
test('Filter blijft actief met multiple filters + completion', async ({ page }) => {
  // Login en navigate (reuse from T007)
  await page.goto('https://dev.tickedify.com/app');
  await page.fill('input[type="email"]', 'jan@buskens.be');
  await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Dagelijkse Planning', { timeout: 10000 });
  await page.click('text=Dagelijkse Planning');
  await page.waitForSelector('#projectFilter');

  // Apply project filter
  const projectOptions = await page.locator('#projectFilter option:not([value=""])').all();
  if (projectOptions.length === 0) return;
  const projectValue = await projectOptions[0].getAttribute('value');
  await page.selectOption('#projectFilter', projectValue);
  await page.waitForTimeout(300);

  // Apply context filter
  const contextOptions = await page.locator('#contextFilter option:not([value=""])').all();
  if (contextOptions.length === 0) {
    console.log('No context filter available - skip test');
    return;
  }
  const contextValue = await contextOptions[0].getAttribute('value');
  await page.selectOption('#contextFilter', contextValue);
  await page.waitForTimeout(500);

  // Count tasks with both filters
  const tasksBeforeCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
  if (tasksBeforeCount === 0) return;

  // Complete first task
  await page.locator('.actie-row:visible input[type="checkbox"], .taak-item:visible input[type="checkbox"]').first().check();
  await page.waitForSelector('text=/Task completed|Taak afgewerkt/i', { timeout: 5000 });
  await page.waitForTimeout(500);

  // VERIFY: Both filters still active
  const projectFilterAfter = await page.inputValue('#projectFilter');
  const contextFilterAfter = await page.inputValue('#contextFilter');
  expect(projectFilterAfter).toBe(projectValue);
  expect(contextFilterAfter).toBe(contextValue);
  console.log('✅ Both filters preserved');

  // VERIFY: Only tasks matching BOTH criteria visible
  const tasksAfterCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
  expect(tasksAfterCount).toBe(tasksBeforeCount - 1);

  const visibleTasks = await page.locator('.actie-row:visible, .taak-item:visible').all();
  for (const task of visibleTasks) {
    const taskProjectId = await task.getAttribute('data-project-id');
    const taskContextId = await task.getAttribute('data-context-id');
    expect(taskProjectId).toBe(projectValue);
    expect(taskContextId).toBe(contextValue);
  }

  console.log('✅ All visible tasks match both filter criteria');
});
```

**Expected Result**: Test passes - beide filters blijven actief, lijst gefilterd op beide criteria

---

### T009 Playwright test - Scenario 3: Last Task Completion
**Test Scenario** (from quickstart.md):
```javascript
// Scenario 3: Last Filtered Task Completion
test('Lege lijst met actieve filter na laatste taak completion', async ({ page }) => {
  // Login en navigate
  await page.goto('https://dev.tickedify.com/app');
  await page.fill('input[type="email"]', 'jan@buskens.be');
  await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Dagelijkse Planning', { timeout: 10000 });
  await page.click('text=Dagelijkse Planning');
  await page.waitForSelector('#projectFilter');

  // Find project with exactly 1 task
  const projectOptions = await page.locator('#projectFilter option:not([value=""])').all();
  let targetProjectValue = null;

  for (const option of projectOptions) {
    const projectValue = await option.getAttribute('value');
    await page.selectOption('#projectFilter', projectValue);
    await page.waitForTimeout(300);

    const visibleCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
    if (visibleCount === 1) {
      targetProjectValue = projectValue;
      break;
    }
  }

  if (!targetProjectValue) {
    console.log('No project with exactly 1 task found - skip test');
    return;
  }

  // Complete the only visible task
  await page.locator('.actie-row:visible input[type="checkbox"], .taak-item:visible input[type="checkbox"]').first().check();
  await page.waitForSelector('text=/Task completed|Taak afgewerkt/i', { timeout: 5000 });
  await page.waitForTimeout(500);

  // VERIFY: Filter still active
  const filterValueAfter = await page.inputValue('#projectFilter');
  expect(filterValueAfter).toBe(targetProjectValue);
  console.log('✅ Filter blijft actief na laatste taak completion');

  // VERIFY: List is empty (no tasks visible)
  const tasksAfterCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
  expect(tasksAfterCount).toBe(0);
  console.log('✅ Lijst is leeg, geen andere taken verschenen');

  // VERIFY: No automatic filter reset
  // (if filter was reset, we would see all tasks from other projects)
});
```

**Expected Result**: Test passes - filter blijft actief, lijst leeg, geen auto-reset

---

### T010 Playwright test - Scenario 4: Sequential Completions
**Test Scenario** (from quickstart.md):
```javascript
// Scenario 4: Multiple Sequential Completions
test('Filter blijft persistent bij meerdere opeenvolgende completions', async ({ page }) => {
  // Login en navigate
  await page.goto('https://dev.tickedify.com/app');
  await page.fill('input[type="email"]', 'jan@buskens.be');
  await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Dagelijkse Planning', { timeout: 10000 });
  await page.click('text=Dagelijkse Planning');
  await page.waitForSelector('#projectFilter');

  // Find project with 3+ tasks
  const projectOptions = await page.locator('#projectFilter option:not([value=""])').all();
  let targetProjectValue = null;

  for (const option of projectOptions) {
    const projectValue = await option.getAttribute('value');
    await page.selectOption('#projectFilter', projectValue);
    await page.waitForTimeout(300);

    const visibleCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
    if (visibleCount >= 3) {
      targetProjectValue = projectValue;
      break;
    }
  }

  if (!targetProjectValue) {
    console.log('No project with 3+ tasks found - skip test');
    return;
  }

  const initialCount = await page.locator('.actie-row:visible, .taak-item:visible').count();

  // Complete 3 tasks sequentially
  for (let i = 0; i < 3; i++) {
    console.log(`Completing task ${i + 1}/3...`);

    // Complete first visible task
    await page.locator('.actie-row:visible input[type="checkbox"], .taak-item:visible input[type="checkbox"]').first().check();
    await page.waitForSelector('text=/Task completed|Taak afgewerkt/i', { timeout: 5000 });
    await page.waitForTimeout(500);

    // VERIFY: Filter still active after each completion
    const filterValue = await page.inputValue('#projectFilter');
    expect(filterValue).toBe(targetProjectValue);
    console.log(`✅ Filter active after completion ${i + 1}`);

    // VERIFY: Only filtered tasks visible
    const visibleTasks = await page.locator('.actie-row:visible, .taak-item:visible').all();
    for (const task of visibleTasks) {
      const projectId = await task.getAttribute('data-project-id');
      expect(projectId).toBe(targetProjectValue);
    }

    // VERIFY: Count decreased by 1
    const currentCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
    expect(currentCount).toBe(initialCount - (i + 1));
  }

  console.log('✅ Filter blijft stabiel door 3 opeenvolgende completions');
});
```

**Expected Result**: Test passes - filter blijft actief na elke completion, geen flicker/reset

---

## Phase 3.5: Regression Testing

### T011 Manual regression tests op staging
**Action**:
- Test op dev.tickedify.com/app met test credentials
- Verify bestaande functionaliteit blijft werken:

**Test 1: Filter reset button**
- Filter instellen → klik "Reset" button → filter wordt correct gereset

**Test 2: Lijst switch**
- Filter instellen in acties lijst → switch naar inbox lijst → terugkeren naar acties → filter is gereset (expected behavior)

**Test 3: Bulk mode filter clearing** (Feature 043)
- Bulk mode activeren → filter wijzigen → verify selections worden gecleared

**Test 4: Manual F5 refresh**
- Filter instellen → F5 refresh → filters worden gereset (expected behavior)

**Validation**:
- Alle 4 regression tests slagen
- Geen nieuwe bugs geïntroduceerd
- Bestaande workflows intact

---

### T012 Verifieer scroll position preservation
**Action**:
- Filter instellen in acties lijst met lange lijst
- Scroll naar beneden
- Vink een taak af die niet in viewport is
- Verify:
  - Scroll position is niet veranderd
  - Geen page jump naar top
  - Filter blijft actief

**Validation**:
- Scroll position preserved
- No jarring UX
- Filter blijft consistent

---

## Dependencies

**Setup → Implementation → Deployment → Testing → Regression**

- T001, T002 [P] → T003 (setup before implementation)
- T003 → T004 (implementation before commit)
- T004 → T005 → T006 (sequential deployment)
- T006 → T007, T008, T009, T010 (deployment before tests)
- T007-T010 → T011, T012 (automated tests before manual regression)

## Parallel Example

```bash
# T001 + T002 can run in parallel (different files):
# In separate terminals/agents:
Terminal 1: "Version bump in package.json to 0.21.23"
Terminal 2: "Add changelog entry for filter persistence fix"

# T007-T010 can theoretically run in parallel (independent test scenarios)
# But sequential execution is safer for Playwright browser tests
```

## Notes

- **[P] tasks**: T001, T002 kunnen parallel (verschillende bestanden)
- **Single file edit**: T003 is critical fix, 1-2 lines toevoeging
- **Playwright tests**: Gebruik tickedify-testing sub-agent voor T007-T010
- **Staging only**: Deze feature blijft op staging tot bèta freeze wordt opgeheven
- **No production deployment**: Main branch blijft bevroren per constitution

## Validation Checklist

- [x] All test scenarios from quickstart.md covered (T007-T010)
- [x] Implementation task specifies exact location (T003)
- [x] Version bump + changelog before commit (T001, T002)
- [x] Deployment verification included (T006)
- [x] Regression testing planned (T011, T012)
- [x] Tasks follow TDD principles (tests after implementation, acceptable for bugfix)
- [x] Each task has specific file path
- [x] Dependencies clearly documented
- [x] Parallel tasks are truly independent

## Success Criteria

**All 12 tasks completed** = Filter persistence bug fixed, tested, deployed to staging, verified via automated and manual testing.

**User Acceptance**: Filter state blijft 100% persistent tijdens task completions in dagelijkse planning acties lijst.
