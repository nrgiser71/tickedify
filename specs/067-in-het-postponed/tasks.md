# Tasks: Clickable Tasks in Postponed Screen

**Input**: Design documents from `/specs/067-in-het-postponed/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: JavaScript ES6+ (Vanilla JS), no frameworks
   → File modification: /public/app.js (renderUitgesteldSectieRows function)
2. Load optional design documents ✅
   → data-model.md: No database changes needed
   → contracts/: UI interaction contract (no API changes)
   → research.md: Use onclick pattern from other lists
3. Generate tasks by category ✅
   → Setup: Version bump (constitutional requirement)
   → Implementation: Single function modification in app.js
   → Testing: Playwright E2E + manual quickstart tests
   → Deployment: Staging branch, verification
4. Apply task rules ✅
   → Single file modification = sequential execution (no parallel)
   → Version bump BEFORE code changes (constitutional requirement)
5. Number tasks sequentially (T001-T010) ✅
6. Validate task completeness ✅
   → All UI interactions tested via quickstart scenarios
   → No contracts need API tests (pure frontend feature)
   → No entities need models (existing data only)
7. Return: SUCCESS (tasks ready for execution) ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Setup & Preparation

### T001: Version Bump ✅ COMPLETED
**File**: `/package.json`
**Action**: Increment version number (patch level)
**Current version check**: Read package.json and increment patch number (e.g., 1.0.101 → 1.0.102)
**Why first**: Constitutional requirement - version bump must be in same commit as code change

**Steps**:
1. Read current version from package.json
2. Parse version number (format: MAJOR.MINOR.PATCH)
3. Increment PATCH number by 1
4. Update package.json with new version
5. Verify JSON is still valid after edit

**Success criteria**: package.json has incremented version number

---

## Phase 3.2: Core Implementation

### T002: Add Click Handlers to Postponed Tasks ✅ COMPLETED
**File**: `/public/app.js`
**Function**: `renderUitgesteldSectieRows(categoryKey, taken)` (approximately line 13369)
**Action**: Add onclick handler and cursor style to `.taak-content` div

**Current code pattern** (from research.md):
```javascript
li.innerHTML = `
    <div class="taak-content">
        <span class="taak-tekst" title="${tooltipContent}">${taak.tekst}${recurringIndicator}</span>
    </div>
    <div class="taak-acties">
        <button class="delete-btn-small" onclick="app.verwijderTaak('${taak.id}', '${categoryKey}')" title="Taak verwijderen">×</button>
    </div>
`;
```

**Target code pattern** (matching other lists like Actions):
```javascript
li.innerHTML = `
    <div class="taak-content"
         onclick="app.bewerkActieWrapper('${taak.id}')"
         style="cursor: pointer;"
         title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Click to edit'}">
        <span class="taak-tekst">${taak.tekst}${recurringIndicator}</span>
    </div>
    <div class="taak-acties">
        <button class="delete-btn-small" onclick="app.verwijderTaak('${taak.id}', '${categoryKey}')" title="Taak verwijderen">×</button>
    </div>
`;
```

**Changes to make**:
1. Add `onclick="app.bewerkActieWrapper('${taak.id}')"` attribute to `.taak-content` div
2. Add `style="cursor: pointer;"` to indicate clickability
3. Update `title` attribute to include "Click to edit" hint
4. Remove tooltip content from inner span, move to outer div

**Important constraints**:
- Do NOT modify delete button onclick handler
- Do NOT modify drag & drop event listeners (they remain on the `<li>` element)
- Maintain exact HTML structure (div nesting must stay the same)
- Use single quotes for onclick attribute value to avoid escaping issues

**Success criteria**:
- Code compiles without errors
- Visual inspection shows onclick and style attributes added
- No drag & drop code modified
- Delete button still has its onclick handler

---

### T003: Update Changelog ✅ COMPLETED
**File**: `/public/changelog.html`
**Action**: Add new version entry with feature description

**Format** (from CLAUDE.md):
```html
<div class="changelog-entry">
    <div class="version-header">
        <span class="version badge-latest">v1.0.102</span>
        <span class="date">2025-01-18</span>
    </div>
    <div class="changes">
        <div class="change-category">✨ Features</div>
        <ul>
            <li>Made tasks in postponed screen clickable to open task details for editing</li>
        </ul>
    </div>
</div>
```

**Steps**:
1. Read changelog.html
2. Find the most recent version entry
3. Change its badge from "badge-latest" to "badge-feature"
4. Insert new entry at the top with:
   - Version number from T001 (package.json version)
   - Current date (2025-01-18)
   - "badge-latest" badge
   - "✨ Features" category
   - Feature description in English (per CLAUDE.md UI language policy)

**Success criteria**:
- New version entry appears at top of changelog
- Previous "badge-latest" changed to "badge-feature"
- Entry follows existing HTML structure

---

## Phase 3.3: Testing

### T004: Create Playwright E2E Test ✅ COMPLETED
**File**: `/tests/postponed-click.spec.js` (new file)
**Action**: Create automated test for click interaction

**Test scenarios** (from ui-interaction-contract.md):
1. Click task opens modal
2. Modal is populated with task data
3. Edit task and save
4. Task remains in postponed list after save
5. Drag & drop still works (no conflict with click)

**Test code structure**:
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Postponed Tasks Clickability', () => {
    test.beforeEach(async ({ page }) => {
        // Login to dev.tickedify.com
        await page.goto('https://dev.tickedify.com/app');
        await page.fill('#email', 'jan@buskens.be');
        await page.fill('#password', 'qyqhut-muDvop-fadki9');
        await page.click('#loginBtn');

        // Navigate to postponed screen
        await page.click('a[href="#uitgesteld"]');
        await page.waitForSelector('.uitgesteld-accordion');
    });

    test('T004.1: Click postponed task opens modal', async ({ page }) => {
        // Expand weekly section
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');

        // Wait for tasks to load
        await page.waitForSelector('#lijst-uitgesteld-wekelijks li');

        // Click first task
        await page.click('#lijst-uitgesteld-wekelijks li:first-child .taak-content');

        // Verify modal opens
        const modal = page.locator('#planningPopup');
        await expect(modal).toBeVisible();

        // Verify form fields are populated
        const taskName = await page.locator('#taakNaamInput').inputValue();
        expect(taskName).not.toBe('');
    });

    test('T004.2: Edit task and save keeps it in postponed list', async ({ page }) => {
        // Setup: Click task to open modal
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');
        await page.waitForSelector('#lijst-uitgesteld-wekelijks li');
        await page.click('#lijst-uitgesteld-wekelijks li:first-child .taak-content');

        // Edit task name
        await page.fill('#taakNaamInput', 'Updated Task Name via Test');

        // Save
        await page.click('#maakActieBtn');

        // Wait for modal to close
        await expect(page.locator('#planningPopup')).not.toBeVisible();

        // Verify task still in weekly postponed list
        const updatedTask = page.locator('#lijst-uitgesteld-wekelijks li:first-child .taak-tekst');
        await expect(updatedTask).toContainText('Updated Task Name via Test');
    });

    test('T004.3: Change due date does not auto-move task', async ({ page }) => {
        // Setup: Click task
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');
        await page.waitForSelector('#lijst-uitgesteld-wekelijks li');
        const taskCountBefore = await page.locator('#lijst-uitgesteld-wekelijks li').count();
        await page.click('#lijst-uitgesteld-wekelijks li:first-child .taak-content');

        // Change due date to today
        const today = new Date().toISOString().split('T')[0];
        await page.fill('#verschijndatum', today);

        // Save
        await page.click('#maakActieBtn');
        await expect(page.locator('#planningPopup')).not.toBeVisible();

        // Verify task count unchanged in weekly list
        const taskCountAfter = await page.locator('#lijst-uitgesteld-wekelijks li').count();
        expect(taskCountAfter).toBe(taskCountBefore);
    });

    test('T004.4: Drag and drop still works', async ({ page }) => {
        // This test verifies click doesn't break drag & drop
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');
        await page.click('[data-category="uitgesteld-maandelijks"] .sectie-header');

        await page.waitForSelector('#lijst-uitgesteld-wekelijks li');

        // Get task element
        const task = page.locator('#lijst-uitgesteld-wekelijks li:first-child');
        const taskText = await task.locator('.taak-tekst').textContent();

        // Drag to monthly section
        await task.dragTo(page.locator('[data-category="uitgesteld-maandelijks"] .sectie-header'));

        // Verify task moved to monthly
        await page.waitForSelector('#lijst-uitgesteld-maandelijks li');
        const monthlyTask = page.locator('#lijst-uitgesteld-maandelijks .taak-tekst').first();
        await expect(monthlyTask).toContainText(taskText);

        // Verify no modal opened during drag
        await expect(page.locator('#planningPopup')).not.toBeVisible();
    });
});
```

**Success criteria**: All 4 test scenarios pass on staging environment

---

### T005: Manual Testing via Quickstart
**File**: `/specs/067-in-het-postponed/quickstart.md` (reference)
**Action**: Execute all quickstart test scenarios manually on staging

**Test categories** (from quickstart.md):
1. ✅ Quick Test (5 min) - Steps 1-4
2. ✅ Click opens modal for all 5 categories
3. ✅ Edit all field types
4. ✅ Critical constraint: No auto-move on date change
5. ✅ Explicit list movement via defer buttons
6. ✅ Delete task (from modal and from item)
7. ✅ Drag & drop compatibility
8. ✅ Visual feedback (hover, cursor)
9. ✅ Keyboard navigation (Tab, Enter, Escape)
10. ✅ Mobile responsive
11. ✅ Edge cases (empty fields, long names, special chars, rapid clicking)
12. ✅ Regression tests (other lists still work)
13. ✅ Performance verification (<50ms modal open)
14. ✅ Browser compatibility (Chrome, Firefox, Safari)
15. ✅ Console error check (no errors)

**Execution**:
1. Deploy to staging (see T007)
2. Login to dev.tickedify.com with test credentials
3. Follow each test scenario in quickstart.md
4. Document any issues found
5. Verify all success criteria met

**Success criteria**: All 15 test categories pass without errors

---

## Phase 3.4: Deployment

### T006: Git Commit ✅ COMPLETED
**Action**: Commit all changes with descriptive message

**Files to commit**:
- package.json (version bump)
- public/app.js (onclick handlers added)
- public/changelog.html (new entry)
- tests/postponed-click.spec.js (new test file)

**Commit message format** (per CLAUDE.md):
```
✨ FEATURE: Made postponed tasks clickable for editing - v1.0.102

Added onclick handlers to postponed task items in renderUitgesteldSectieRows()
to open task details modal (planningPopup). Tasks can now be clicked to view
and edit all properties, matching behavior of other task lists.

Critical constraint: Tasks remain in postponed list when due date is changed,
never auto-moved to other lists (only via explicit defer buttons).

Files modified:
- public/app.js: Added onclick="app.bewerkActieWrapper(id)" to .taak-content
- public/changelog.html: Version 1.0.102 entry
- package.json: Version bump to 1.0.102
- tests/postponed-click.spec.js: Playwright E2E tests

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Git commands**:
```bash
git add package.json public/app.js public/changelog.html tests/postponed-click.spec.js
git commit -m "$(cat <<'EOF'
✨ FEATURE: Made postponed tasks clickable for editing - v1.0.102

Added onclick handlers to postponed task items in renderUitgesteldSectieRows()
to open task details modal (planningPopup). Tasks can now be clicked to view
and edit all properties, matching behavior of other task lists.

Critical constraint: Tasks remain in postponed list when due date is changed,
never auto-moved to other lists (only via explicit defer buttons).

Files modified:
- public/app.js: Added onclick="app.bewerkActieWrapper(id)" to .taak-content
- public/changelog.html: Version 1.0.102 entry
- package.json: Version bump to 1.0.102
- tests/postponed-click.spec.js: Playwright E2E tests

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Success criteria**:
- Git commit succeeds
- Commit message follows project style
- All 4 files included in commit

---

### T007: Deploy to Staging ✅ COMPLETED
**Action**: Merge feature branch to staging and push to trigger Vercel deployment

**Git commands**:
```bash
# Switch to staging branch
git checkout staging

# Merge feature branch
git merge 067-in-het-postponed --no-edit

# Push to trigger Vercel deployment
git push origin staging
```

**Success criteria**:
- Merge succeeds without conflicts
- Push to staging triggers Vercel deployment
- dev.tickedify.com updates within 60 seconds

---

### T008: Verify Deployment ✅ COMPLETED
**Action**: Confirm new version deployed on dev.tickedify.com
**Verified**: Version 1.0.102 is live on dev.tickedify.com (commit 555a2cc)

**Verification steps**:
1. Wait 15 seconds after push
2. Check version endpoint: `curl -s -L -k https://dev.tickedify.com/api/version`
3. Verify version matches package.json (e.g., "1.0.102")
4. If version doesn't match, wait another 15 seconds and check again
5. Repeat checks every 15 seconds for max 2 minutes
6. If after 2 minutes version still doesn't match, report deployment timeout

**Bash script**:
```bash
EXPECTED_VERSION="1.0.102"  # Read from package.json
MAX_ATTEMPTS=8  # 8 attempts × 15 seconds = 2 minutes
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "Checking version (attempt $ATTEMPT/$MAX_ATTEMPTS)..."

    CURRENT_VERSION=$(curl -s -L -k https://dev.tickedify.com/api/version | jq -r '.version')

    if [ "$CURRENT_VERSION" = "$EXPECTED_VERSION" ]; then
        echo "✅ Deployment verified! Version $CURRENT_VERSION is live on staging."
        exit 0
    fi

    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "Version is $CURRENT_VERSION, expected $EXPECTED_VERSION. Waiting 15 seconds..."
        sleep 15
    fi
done

echo "❌ Deployment timeout after 2 minutes. Version still shows $CURRENT_VERSION instead of $EXPECTED_VERSION."
exit 1
```

**Success criteria**:
- Version endpoint returns expected version within 2 minutes
- No deployment errors in Vercel dashboard

---

## Phase 3.5: Validation

### T009: Run Playwright Tests on Staging
**Action**: Execute automated E2E tests against dev.tickedify.com

**Commands**:
```bash
# Run Playwright tests
npx playwright test tests/postponed-click.spec.js --project=chromium

# Generate test report
npx playwright show-report
```

**Expected results**:
- ✅ T004.1: Click postponed task opens modal
- ✅ T004.2: Edit task and save keeps it in postponed list
- ✅ T004.3: Change due date does not auto-move task
- ✅ T004.4: Drag and drop still works

**Success criteria**: All 4 tests pass without failures

---

### T010: Final Regression Check
**Action**: Verify no regressions in other parts of the app

**Regression test areas**:
1. **Other task lists still clickable**:
   - Click task in Inbox → modal opens ✅
   - Click task in Actions → modal opens ✅
   - Click task in Follow-up → modal opens ✅
   - Click task in Daily Planning → modal opens ✅

2. **Delete buttons still work**:
   - Delete postponed task via (×) button → task deleted ✅
   - Delete inbox task → task deleted ✅

3. **Drag & drop elsewhere**:
   - Drag task from Actions to Daily Planning → works ✅
   - Drag task within Daily Planning calendar → works ✅

4. **Console errors**:
   - Open browser DevTools → Console tab
   - Perform all above actions
   - Verify NO errors or warnings ✅

**Manual check on dev.tickedify.com**:
```
1. Login to dev.tickedify.com/app
2. Test each regression scenario
3. Document any failures
4. If all pass, feature is ready for user acceptance
```

**Success criteria**:
- All regression tests pass
- No console errors
- No unexpected behavior in other features

---

## Dependencies

### Sequential Execution (No Parallelization)
All tasks modify or depend on the same file (app.js) or must execute in order:

```
T001 (version bump)
  → BLOCKS → T002 (code changes must include version in same commit)
  → BLOCKS → T003 (changelog needs version from T001)
  → BLOCKS → T004 (test needs code from T002)
  → BLOCKS → T005 (manual test needs code from T002)
  → BLOCKS → T006 (commit needs all changes from T001-T003)
  → BLOCKS → T007 (deploy needs commit from T006)
  → BLOCKS → T008 (verify needs deployment from T007)
  → BLOCKS → T009 (Playwright tests need staging deployment from T008)
  → BLOCKS → T010 (regression check is final validation)
```

**No parallel execution possible** - single file modification with constitutional commit requirements.

---

## Validation Checklist
*GATE: Checked before marking tasks complete*

- [x] All UI interactions tested via quickstart scenarios ✅
- [x] No contracts need API tests (pure frontend feature) ✅
- [x] No entities need models (existing data only) ✅
- [x] Tests come before deployment (T004, T005 before T007) ✅
- [x] Each task specifies exact file path ✅
- [x] No parallel tasks (all sequential due to same file) ✅
- [x] Version bump first (constitutional requirement) ✅

---

## Notes

### Constitutional Compliance
✅ **Beta Freeze**: All work on feature branch, staging deployment only
✅ **Versioning**: T001 version bump before code changes
✅ **Changelog**: T003 adds feature entry
✅ **Staging-First**: T007 deploys to staging, not main
✅ **Deployment Verification**: T008 confirms via version endpoint
✅ **Testing**: T004 (Playwright) + T005 (manual) comprehensive coverage

### Simplicity
This is an extremely simple feature:
- 1 function modification
- ~5 lines of code added
- 0 database changes
- 0 API changes
- 0 new dependencies

Total estimated implementation time: **30-45 minutes**

### Risk Mitigation
- **Drag & drop conflict**: Research confirmed browser distinguishes click from drag
- **List auto-move bug**: Backend already preserves list assignment (verified in research)
- **Performance**: Onclick handler is instant, no performance impact
- **Browser compatibility**: Pattern already works across all browsers in other lists

---

**Tasks Ready for Execution**: ✅ Proceed with T001
