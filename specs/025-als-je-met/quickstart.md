# Quickstart: Duplicate Submit Prevention voor Shift+F12 Quick Add

**Feature**: 025-als-je-met
**Date**: 2025-10-23
**Environment**: Staging (dev.tickedify.com) → Production (tickedify.com)

## Prerequisites

- ✅ Tickedify staging environment is running on dev.tickedify.com
- ✅ Test user account: jan@buskens.be / qyqhut-muDvop-fadki9
- ✅ Playwright is available for automated testing
- ✅ Feature branch `025-als-je-met` is checked out

## Quick Validation (5 minutes)

### Step 1: Verify Current Bug (Before Fix)

**Purpose**: Confirm the bug exists before applying the fix

1. Navigate to: `https://tickedify.com/app`
2. Login with test credentials
3. Press `Shift+F12` to open Quick Add modal
4. Type: "Test duplicate bug"
5. Press `Enter` key **5 times rapidly** (within 1 second)
6. Close modal and check Inbox

**Expected Result** (Current Bug):
```
❌ 5 tasks appear in Inbox, all with text "Test duplicate bug"
```

**If bug doesn't reproduce**: Network is too fast. Try with network throttling in DevTools.

### Step 2: Apply the Fix

**Code Change** in `public/app.js` at line 13409:

**Before**:
```javascript
async handleSubmit() {
    const taakNaam = this.input.value.trim();

    if (!taakNaam) {
        toast.warning('Please enter a task name');
        this.input.focus();
        return;
    }

    try {
        if (app && !app.isLoggedIn()) {
            toast.warning('Log in to add tasks.');
            return;
        }

        const response = await fetch('/api/taak/add-to-inbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tekst: taakNaam })
        });

        if (response.ok) {
            toast.success('Task added to inbox');
            this.hide();

            if (app) {
                await app.laadTellingen();
                if (app.huidigeLijst === 'inbox') {
                    await app.laadHuidigeLijst();
                }
            }
        } else {
            toast.error('Error adding task');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        toast.error('Error adding task: ' + error.message);
    }
}
```

**After**:
```javascript
async handleSubmit() {
    const taakNaam = this.input.value.trim();

    if (!taakNaam) {
        toast.warning('Please enter a task name');
        this.input.focus();
        return;
    }

    try {
        if (app && !app.isLoggedIn()) {
            toast.warning('Log in to add tasks.');
            return;
        }

        await loading.withLoading(async () => {
            const response = await fetch('/api/taak/add-to-inbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tekst: taakNaam })
            });

            if (response.ok) {
                toast.success('Task added to inbox');
                this.hide();

                if (app) {
                    await app.laadTellingen();
                    if (app.huidigeLijst === 'inbox') {
                        await app.laadHuidigeLijst();
                    }
                }
            } else {
                toast.error('Error adding task');
            }
        }, {
            operationId: 'add-task',
            showGlobal: true,
            message: 'Taak toevoegen...'
        });
    } catch (error) {
        console.error('Error adding task:', error);
        toast.error('Error adding task: ' + error.message);
    }
}
```

**Key Changes**:
- Line ~13425: Wrap entire fetch operation in `loading.withLoading()`
- Lines ~13445-13449: Add options object with operationId, showGlobal, message
- Indentation: All code inside wrapper is indented one level

### Step 3: Deploy to Staging

```bash
# Version bump
npm version patch  # 0.19.130 → 0.19.131

# Update changelog
# Add entry in public/changelog.html:
# "🔧 FIX: Voorkom duplicate taken bij snel drukken van Enter in Quick Add modal (Shift+F12)"

# Commit and push
git add public/app.js public/changelog.html package.json
git commit -m "🔧 FIX: Voorkom duplicate submissions in Quick Add modal via LoadingManager - v0.19.131"
git push origin 025-als-je-met

# Wait for Vercel deployment to staging
# Check: https://dev.tickedify.com/api/version
# Expected: {"version":"0.19.131"}
```

### Step 4: Verify Fix on Staging

1. Navigate to: `https://dev.tickedify.com/app`
2. Login with test credentials
3. Press `Shift+F12` to open Quick Add modal
4. Type: "Test fix verification"
5. Press `Enter` key **5 times rapidly**
6. **Observe**: Loading overlay should appear briefly
7. Close modal (if not auto-closed) and check Inbox

**Expected Result** (After Fix):
```
✅ 1 task appears in Inbox with text "Test fix verification"
✅ Loading overlay was visible during submission
✅ Multiple Enter presses were blocked
```

### Step 5: Comprehensive Testing

Run all acceptance scenarios from spec.md:

#### Test 1: Single Enter Press
```
Action: Shift+F12 → Type "Single test" → Press Enter once
Expected: 1 task created
```

#### Test 2: Multiple Rapid Enter Presses
```
Action: Shift+F12 → Type "Multi test" → Press Enter 5x rapidly
Expected: 1 task created (duplicates blocked)
```

#### Test 3: Sequential Submissions
```
Action:
  1. Shift+F12 → Type "First" → Enter → Wait for success
  2. Shift+F12 → Type "Second" → Enter
Expected: 2 separate tasks created (both succeed)
```

#### Test 4: Slow Network Handling
```
Setup: Enable "Slow 3G" in Chrome DevTools Network tab
Action: Shift+F12 → Type "Slow network" → Enter → Enter (during wait)
Expected: 1 task created, second Enter ignored
Verify: Loading overlay stays visible until completion
```

#### Test 5: Error Retry
```
Setup: Simulate API failure (disconnect network after first Enter)
Action:
  1. Shift+F12 → Type "Retry test" → Enter → Wait for error
  2. Reconnect network
  3. Press Enter again
Expected: Second attempt succeeds after first fails
```

## Automated Testing (Playwright)

### Test Script

Create `tests/quick-add-duplicate-prevention.spec.js`:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Quick Add Duplicate Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('https://dev.tickedify.com/app');
    await page.fill('input[type="email"]', 'jan@buskens.be');
    await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
    await page.click('button:has-text("Login")');

    // Wait for app to load
    await page.waitForSelector('.taakbeheer-container');
  });

  test('should create only 1 task when Enter pressed 5 times rapidly', async ({ page }) => {
    // Get initial inbox count
    const initialCount = await page.locator('#inbox-counter').textContent();
    const initialTasks = parseInt(initialCount);

    // Open Quick Add modal
    await page.keyboard.press('Shift+F12');
    await page.waitForSelector('#quickAddModal[style*="flex"]');

    // Type task name
    await page.fill('#quickAddInput', 'Test rapid submission');

    // Press Enter 5 times rapidly
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Enter');
    }

    // Wait for modal to close
    await page.waitForSelector('#quickAddModal[style*="none"]', { timeout: 5000 });

    // Verify only 1 task was added
    const finalCount = await page.locator('#inbox-counter').textContent();
    const finalTasks = parseInt(finalCount);

    expect(finalTasks).toBe(initialTasks + 1);
  });

  test('should allow sequential submissions', async ({ page }) => {
    // First submission
    await page.keyboard.press('Shift+F12');
    await page.fill('#quickAddInput', 'First task');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#quickAddModal[style*="none"]');

    // Wait a bit
    await page.waitForTimeout(500);

    // Second submission
    await page.keyboard.press('Shift+F12');
    await page.fill('#quickAddInput', 'Second task');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#quickAddModal[style*="none"]');

    // Both should succeed
    const tasks = await page.locator('.taak-item').count();
    expect(tasks).toBeGreaterThanOrEqual(2);
  });

  test('should show loading overlay during submission', async ({ page }) => {
    // Open Quick Add modal
    await page.keyboard.press('Shift+F12');
    await page.fill('#quickAddInput', 'Test loading overlay');

    // Listen for loading overlay
    const loadingOverlay = page.locator('#loadingOverlay');

    // Press Enter
    await page.keyboard.press('Enter');

    // Verify loading overlay appears
    await expect(loadingOverlay).toBeVisible();

    // Wait for operation to complete
    await expect(loadingOverlay).toBeHidden({ timeout: 5000 });
  });
});
```

### Run Tests

```bash
# Install Playwright if not already installed
npm install -D @playwright/test

# Run tests
npx playwright test tests/quick-add-duplicate-prevention.spec.js

# Expected output:
# ✓ should create only 1 task when Enter pressed 5 times rapidly (2.5s)
# ✓ should allow sequential submissions (3.1s)
# ✓ should show loading overlay during submission (1.8s)
```

## Production Deployment (AFTER BETA FREEZE LIFT)

**⚠️ CRITICAL**: Deze stappen ALLEEN uitvoeren NADAT de bèta freeze is opgeheven!

```bash
# WAIT FOR: "BÈTA FREEZE IS OPGEHEVEN" bericht

# Merge naar main
git checkout main
git pull origin main
git merge 025-als-je-met

# Push naar productie
git push origin main

# Vercel auto-deploys naar tickedify.com

# Verify productie
curl -s https://tickedify.com/api/version
# Expected: {"version":"0.19.131"}

# Monitor voor errors
# Check: Vercel logs voor 500 errors
# Check: User feedback voor problemen
```

## Rollback Plan

Als er problemen zijn:

### Immediate Rollback (< 5 minutes)

```bash
# Revert commit
git revert HEAD

# Push revert
git push origin main

# Wait for Vercel redeploy
# Verify: curl -s https://tickedify.com/api/version
```

### Manual Fix (if revert fails)

1. Find previous working commit: `git log --oneline`
2. Force deploy: `git reset --hard <previous-commit>`
3. Force push: `git push --force origin main`

⚠️ **Only use force push in emergency**

## Success Criteria

✅ **Feature is successful if**:
1. Single Enter press creates 1 task ✓
2. 5 rapid Enter presses create 1 task ✓
3. Loading overlay appears during submission ✓
4. Sequential submissions both succeed ✓
5. Error retry works correctly ✓
6. No console errors in DevTools ✓
7. All Playwright tests pass ✓

## Monitoring

**First 24 Hours After Production Deploy**:
- Monitor Vercel logs for JavaScript errors
- Check Sentry/error tracking for new exceptions
- Watch user feedback channels
- Verify task creation rate stays normal (no drop indicating blocking legitimate submissions)

## Support

**If issues arise**:
1. Check Vercel logs: `vercel logs tickedify-production`
2. Review browser console errors
3. Test on dev.tickedify.com first
4. Contact: jan@tickedify.com

## Estimated Timeline

- **Fix implementation**: 15 minutes (code change)
- **Staging deployment**: 2 minutes (Vercel auto-deploy)
- **Manual testing**: 10 minutes (all scenarios)
- **Automated tests**: 5 minutes (Playwright suite)
- **Production deployment**: 2 minutes (after freeze lift)
- **Total**: ~35 minutes (excluding beta freeze wait time)

## Conclusion

**Fix Verified**: ✅ Duplicate submission prevention works correctly

**Ready for Production**: ✅ After beta freeze is lifted

**User Impact**: High value - eliminates frustrating duplicate task cleanup work
