# Tasks: Translate Bulk Edit Properties Screen to English

**Input**: Design documents from `/specs/047-het-bulk-edit/`
**Prerequisites**: plan.md, research.md, contracts/ui-translation.contract.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Vanilla JavaScript, HTML5
   → Structure: Web app (frontend only)
   → Files: public/index.html, public/app.js
2. Load design documents:
   → research.md: 12 HTML elements, 4 JS strings identified
   → contracts/ui-translation.contract.md: Translation mappings defined
   → quickstart.md: 15-step manual verification guide
   → data-model.md: N/A (no data changes)
3. Generate tasks by category:
   → Translation: HTML + JavaScript string replacements
   → Versioning: package.json bump + changelog
   → Deployment: Git commit, staging push, verification
   → Testing: Manual + automated verification
4. Apply task rules:
   → HTML and JS can be parallel [P] (different files)
   → Version bump sequential (depends on translations)
   → Testing sequential (depends on deployment)
5. Number tasks sequentially (T001-T007)
6. Validate completeness:
   → All 12 HTML elements covered?
   → All 4 JS strings covered?
   → Deployment workflow complete?
   → Testing scenarios defined?
7. Return: SUCCESS (7 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths and line numbers from research.md

## Path Conventions
- **Frontend**: `public/` directory at repository root
- **Config**: Root-level `package.json`, `public/changelog.html`
- **Tests**: Playwright tests (optional) in `tests/` directory

---

## Phase 3.1: Translation Tasks
**CRITICAL**: These tasks translate user-facing text only. DO NOT modify value attributes (laag/gemiddeld/hoog must remain unchanged for backend compatibility).

### ✅ T001 [P] Translate bulk edit modal HTML elements [COMPLETED]
**File**: `/public/index.html` (lines 1183-1230)

**Task Description**:
Translate all Dutch text elements in the bulk edit modal (#bulkEditModal) to English following the ui-translation.contract.md mappings.

**Required Changes**:
1. Modal header (line 1185):
   - Change: `"Eigenschappen bewerken voor X taken"` → `"Edit properties for X tasks"`
   - Note: JavaScript already handles this dynamically, but update HTML default

2. Form labels:
   - Line 1197: `"Datum:"` → `"Date:"`
   - Line 1211: `"Prioriteit:"` → `"Priority:"`
   - Line 1221: `"Geschatte tijd (minuten):"` → `"Estimated time (minutes):"`

3. Project dropdown (lines 1190-1191):
   - `"-- Geen wijziging --"` → `"-- No change --"`
   - `"Geen project"` → `"No project"`

4. Context dropdown (lines 1204-1205):
   - `"-- Geen wijziging --"` → `"-- No change --"`
   - `"Geen context"` → `"No context"`

5. Priority dropdown (lines 1213-1216):
   - `"-- Geen wijziging --"` → `"-- No change --"`
   - `"Laag"` → `"Low"` (keep value="laag")
   - `"Normaal"` → `"Normal"` (keep value="gemiddeld")
   - `"Hoog"` → `"High"` (keep value="hoog")

6. Placeholder (line 1222):
   - `placeholder="Optioneel"` → `placeholder="Optional"`

7. Buttons (lines 1226-1227):
   - `"Annuleren"` → `"Cancel"`
   - `"Opslaan"` → `"Save"`

**Validation**:
- All 12 text elements translated
- No value attributes changed (backend contract preserved)
- HTML syntax valid (no unclosed tags)
- Layout unchanged (no CSS modifications)

**Completion Criteria**: ✅ All Dutch text in modal HTML replaced with English equivalents

---

### ✅ T002 [P] Translate bulk edit JavaScript strings [COMPLETED]
**File**: `/public/app.js` (lines 357-393)

**Task Description**:
Translate Dutch string constants in the `populateBulkEditDropdowns()` function to English.

**Required Changes**:
1. Line 362-363 (Project dropdown):
```javascript
// Current:
projectSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                          '<option value="null">Geen project</option>';

// Change to:
projectSelect.innerHTML = '<option value="">-- No change --</option>' +
                          '<option value="null">No project</option>';
```

2. Line 379-380 (Context dropdown):
```javascript
// Current:
contextSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                          '<option value="null">Geen context</option>';

// Change to:
contextSelect.innerHTML = '<option value="">-- No change --</option>' +
                          '<option value="null">No context</option>';
```

**Validation**:
- All 4 string constants translated
- No syntax errors (quotes balanced, semicolons present)
- No changes to DOM IDs or value attributes
- Function logic unchanged

**Completion Criteria**: ✅ JavaScript strings in populateBulkEditDropdowns() translated to English

---

## Phase 3.2: Versioning & Deployment

### ✅ T003 Update version and changelog [COMPLETED]
**Files**:
- `/package.json` (version field)
- `/public/changelog.html` (new entry)

**Task Description**:
Increment version number and document translation completion in changelog.

**Required Changes**:
1. **package.json**:
   - Read current version from package.json
   - Increment patch version (e.g., 0.20.42 → 0.20.43)
   - Update version field

2. **changelog.html**:
   - Add new entry at top of changelog list
   - Use emoji: 🎯 (IMPROVEMENT category)
   - Title: "Translate bulk edit properties to English - v0.20.43"
   - Description: "All bulk edit modal elements (labels, dropdowns, buttons, placeholders) now display in English for consistent application language."
   - Badge: "badge-latest"
   - Update previous "badge-latest" to "badge-improvement"

**Example Changelog Entry**:
```html
<div class="changelog-item">
    <div class="changelog-header">
        <span class="badge badge-latest">Nieuwste</span>
        <span class="version">v0.20.43</span>
        <span class="date">31 oktober 2025</span>
    </div>
    <h3>🎯 Translate bulk edit properties to English</h3>
    <p>All bulk edit modal elements (labels, dropdowns, buttons, placeholders) now display in English for consistent application language.</p>
</div>
```

**Validation**:
- Version number incremented correctly
- Changelog entry follows existing format
- No duplicate version numbers
- Date is current (2025-10-31)

**Completion Criteria**: ✅ Version bumped and changelog updated

---

### ✅ T004 Git commit and push to staging branch [COMPLETED]
**Git Operations**:
- Commit changes to feature branch
- Merge to staging branch
- Push to origin/staging

**Task Description**:
Commit translation changes following Tickedify git conventions and push to staging for deployment.

**Required Steps**:
1. Verify working branch is `047-het-bulk-edit`
2. Stage changes:
   ```bash
   git add public/index.html public/app.js package.json public/changelog.html
   ```

3. Create commit with standardized message:
   ```bash
   git commit -m "$(cat <<'EOF'
   🎯 IMPROVEMENT: Translate bulk edit properties to English - v0.20.43

   All bulk edit modal UI elements now display in English:
   - Form labels: Date, Priority, Estimated time
   - Dropdown options: No change, No project, No context
   - Priority values: Low, Normal, High
   - Buttons: Cancel, Save
   - Placeholder: Optional

   Backend value attributes (laag/gemiddeld/hoog) preserved for data compatibility.

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

4. Switch to staging branch:
   ```bash
   git checkout staging
   ```

5. Merge feature branch (no-edit to avoid prompt):
   ```bash
   git merge 047-het-bulk-edit --no-edit
   ```

6. Push to staging (triggers Vercel deployment):
   ```bash
   git push origin staging
   ```

**Validation**:
- Commit message follows convention (emoji, description, co-authored)
- All 4 files included in commit
- Merge to staging successful (no conflicts)
- Push successful (no errors)

**Completion Criteria**: ✅ Changes committed and pushed to staging branch

---

## Phase 3.3: Deployment Verification

### ✅ T005 Verify staging deployment and version [COMPLETED]
**Deployment**: dev.tickedify.com via Vercel

**Task Description**:
Wait for Vercel deployment to complete and verify version number matches expected version on staging environment.

**Required Steps**:
1. Wait 15 seconds after push (initial Vercel processing)

2. Check version endpoint iteratively:
   ```bash
   curl -s -L -k https://dev.tickedify.com/api/version
   ```

3. Parse response and compare to expected version (0.20.43)

4. If version doesn't match:
   - Wait 15 seconds
   - Check again
   - Repeat up to 8 times (2 minutes total)

5. If still not matching after 2 minutes:
   - Report deployment timeout
   - Check Vercel dashboard for errors

**Expected Response**:
```json
{"version":"0.20.43"}
```

**Validation**:
- Version endpoint returns 200 OK
- Version matches package.json (0.20.43)
- No 404 or 500 errors
- Response time < 1 second

**Completion Criteria**: ✅ Staging deployment confirmed with correct version

---

## Phase 3.4: Manual Testing

### ✅ T006 Execute manual UI verification (quickstart.md) [COMPLETED]
**File**: `/specs/047-het-bulk-edit/quickstart.md`
**Environment**: https://dev.tickedify.com/app

**Task Description**:
Follow the 15-step quickstart guide to manually verify all translated UI elements display correctly.

**Required Steps** (from quickstart.md):
1. Login to dev.tickedify.com/app (jan@buskens.be / qyqhut-muDvop-fadki9)
2. Navigate to Actions list
3. Enable bulk mode and select 2+ tasks
4. Click "Edit Properties" button
5. Verify modal header: "Edit properties for X tasks"
6. Verify form labels in English (Date, Priority, Estimated time)
7. Verify Project dropdown options ("-- No change --", "No project")
8. Verify Context dropdown options ("-- No change --", "No context")
9. Verify Priority dropdown options ("-- No change --", "Low", "Normal", "High")
10. Verify time placeholder: "Optional"
11. Verify buttons: "Cancel", "Save"
12. Test form submission (select project, set priority, click Save)
13. Test cancel functionality (click Cancel)
14. Test ESC key (press Escape to close)
15. Visual regression check (no layout breaks, text fits properly)

**Validation Checklist**:
- [ ] All 15 quickstart steps passed
- [ ] No Dutch text visible in modal
- [ ] All dropdowns populate correctly
- [ ] Form submission works (tasks updated)
- [ ] Cancel and ESC key work
- [ ] No layout breaks or text overflow
- [ ] No JavaScript console errors

**Completion Criteria**: ✅ All 15 manual test steps passed successfully

---

## Phase 3.5: Automated Testing (Optional)

### T007 [Optional] Create Playwright automated test
**File**: `/tests/bulk-edit-translation.spec.js` (new file)

**Task Description**:
Create automated Playwright test to verify bulk edit modal translation. This is optional but recommended for regression testing.

**Test Implementation**:
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Bulk Edit Modal Translation', () => {
  test.beforeEach(async ({ page }) => {
    // Login to staging environment
    await page.goto('https://dev.tickedify.com/app');
    await page.fill('input[name="email"]', 'jan@buskens.be');
    await page.fill('input[name="password"]', 'qyqhut-muDvop-fadki9');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Navigate to Actions list
    await page.click('a:has-text("Actions")');

    // Enable bulk mode
    await page.click('button:has-text("Bulk Mode")');

    // Select 2 tasks
    const checkboxes = await page.locator('[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Open bulk edit modal
    await page.click('button:has-text("Edit Properties")');
    await page.waitForSelector('#bulkEditModal', { state: 'visible' });
  });

  test('Modal header displays in English', async ({ page }) => {
    const header = await page.textContent('#bulkEditHeader');
    expect(header).toMatch(/Edit properties for \d+ tasks/);
  });

  test('Form labels are in English', async ({ page }) => {
    await expect(page.locator('label[for="bulkEditDatum"]')).toHaveText('Date:');
    await expect(page.locator('label[for="bulkEditPriority"]')).toHaveText('Priority:');
    await expect(page.locator('label[for="bulkEditTime"]')).toHaveText('Estimated time (minutes):');
  });

  test('Project dropdown options are in English', async ({ page }) => {
    const options = await page.locator('#bulkEditProject option').allTextContents();
    expect(options[0]).toBe('-- No change --');
    expect(options[1]).toBe('No project');
  });

  test('Context dropdown options are in English', async ({ page }) => {
    const options = await page.locator('#bulkEditContext option').allTextContents();
    expect(options[0]).toBe('-- No change --');
    expect(options[1]).toBe('No context');
  });

  test('Priority dropdown options are in English', async ({ page }) => {
    const options = await page.locator('#bulkEditPriority option').allTextContents();
    expect(options[0]).toBe('-- No change --');
    expect(options[1]).toBe('Low');
    expect(options[2]).toBe('Normal');
    expect(options[3]).toBe('High');
  });

  test('Time placeholder is in English', async ({ page }) => {
    await expect(page.locator('#bulkEditTime')).toHaveAttribute('placeholder', 'Optional');
  });

  test('Buttons are in English', async ({ page }) => {
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
  });

  test('Form submission works correctly', async ({ page }) => {
    // Select a priority
    await page.selectOption('#bulkEditPriority', 'hoog');

    // Click Save
    await page.click('button:has-text("Save")');

    // Verify modal closed
    await expect(page.locator('#bulkEditModal')).not.toBeVisible();

    // Verify success toast (assuming toast implementation)
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

**Validation**:
- All 8 test cases implemented
- Tests run successfully on dev.tickedify.com
- No test failures
- Coverage includes all translated elements

**Completion Criteria**: ✅ Playwright tests created and passing (optional)

---

## Dependencies

### Sequential Dependencies
```
T001, T002 → T003 → T004 → T005 → T006 → T007
(Translation) (Version) (Git) (Deploy) (Test) (Automated)
```

### Parallel Opportunities
- **T001 & T002 [P]**: Different files (index.html vs app.js) - can run in parallel
- **T007 [Optional]**: Can be done independently after T006

### Critical Path
```
T001/T002 [P] → T003 → T004 → T005 → T006
```

**Estimated Total Time**: 30-45 minutes
- Translation: 10 min (parallel)
- Versioning: 5 min
- Git operations: 5 min
- Deployment wait: 2-5 min
- Manual testing: 10-15 min
- Automated testing: 15 min (optional)

---

## Parallel Execution Example

### Launch T001 & T002 in Parallel
```javascript
// In a single Claude Code response, use multiple Task tool calls:

Task(subagent_type: "tickedify-feature-builder",
     description: "Translate HTML modal",
     prompt: "Translate all Dutch text elements in /public/index.html bulk edit modal (lines 1183-1230) to English following ui-translation.contract.md. Change 12 elements: modal header, labels, dropdown options, placeholder, buttons. DO NOT modify value attributes.")

Task(subagent_type: "tickedify-feature-builder",
     description: "Translate JS strings",
     prompt: "Translate Dutch string constants in /public/app.js populateBulkEditDropdowns() function (lines 357-393) to English. Change 4 strings: '-- Geen wijziging --' and 'Geen project/context' in both dropdowns.")
```

---

## Constitutional Compliance Checklist

### Beta Freeze Compliance ✅
- [ ] NO changes to main branch (only staging)
- [ ] NO production deployment (only dev.tickedify.com)
- [ ] Feature branch → staging workflow followed

### Staging-First Deployment ✅
- [ ] T004 pushes to staging branch (not main)
- [ ] T005 verifies on dev.tickedify.com (not tickedify.com)
- [ ] Manual testing on staging environment

### Versioning Discipline ✅
- [ ] T003 increments package.json version
- [ ] T003 updates changelog.html
- [ ] Version bump in same commit as feature

### Deployment Verification ✅
- [ ] T005 uses curl -s -L -k flags
- [ ] 15-second intervals (not long sleep)
- [ ] 2-minute timeout with error reporting

### Sub-Agent Usage ✅
- [ ] tickedify-feature-builder for T001, T002 implementation
- [ ] tickedify-testing for T007 Playwright test creation

### Test-First Adapted ✅
- [ ] UI-only feature exemption (no API tests)
- [ ] Manual browser testing (T006 quickstart)
- [ ] Playwright automated testing (T007 optional)

---

## Validation Checklist
*GATE: All must pass before marking tasks complete*

### Translation Completeness
- [ ] All 12 HTML elements translated (T001)
- [ ] All 4 JavaScript strings translated (T002)
- [ ] No Dutch text remains in modal
- [ ] Backend value attributes preserved

### Deployment Workflow
- [ ] Version incremented (T003)
- [ ] Changelog updated (T003)
- [ ] Committed to feature branch (T004)
- [ ] Merged to staging (T004)
- [ ] Pushed successfully (T004)
- [ ] Deployment verified (T005)

### Testing Coverage
- [ ] All 15 quickstart steps passed (T006)
- [ ] No layout breaks or regressions
- [ ] Form functionality intact
- [ ] Playwright tests passing (T007 optional)

### File Integrity
- [ ] index.html syntax valid
- [ ] app.js syntax valid (no JS errors)
- [ ] package.json format correct
- [ ] changelog.html format correct

---

## Notes

### Critical Warnings
⚠️ **DO NOT modify value attributes**: Priority dropdown values (laag/gemiddeld/hoog) must remain unchanged. Backend expects these Dutch values. Only translate display text.

⚠️ **Staging only**: During beta freeze, NEVER push to main branch or deploy to production (tickedify.com).

⚠️ **Vercel Authentication**: dev.tickedify.com requires authentication. Use Vercel MCP tools or browser with valid session.

### Success Indicators
✅ All translated text displays in English
✅ Modal layout unchanged (no wrapping or overflow)
✅ Form submission works correctly
✅ No JavaScript console errors
✅ Staging deployment successful

### Failure Recovery
If deployment fails:
1. Check Vercel dashboard for build errors
2. Verify git push was successful
3. Check branch is correct (staging, not main)
4. Verify syntax in modified files

If tests fail:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check version endpoint matches
4. Review browser console for errors

---

**Tasks Generated**: 7 tasks (6 required, 1 optional)
**Parallel Opportunities**: 2 tasks (T001, T002)
**Estimated Time**: 30-45 minutes
**Branch**: 047-het-bulk-edit
**Target Environment**: dev.tickedify.com (staging)

✅ **READY FOR EXECUTION** - All tasks are specific, actionable, and immediately executable.
