# Quickstart: Testing Week Display Bugfix

## Prerequisites

- Tickedify app deployed to staging (dev.tickedify.com) or production (tickedify.com)
- Browser with developer tools (Chrome/Safari/Firefox/Edge)
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9

## Quick Validation (2 minutes)

### Step 1: Set System Date to Sunday

**macOS**:
```bash
sudo date 102000002025  # October 20, 00:00, 2025 (Sunday)
```

**Windows**:
```
Control Panel → Date and Time → Change date and time → Set to Sunday
```

**Linux**:
```bash
sudo timedatectl set-time "2025-10-20 00:00:00"
```

### Step 2: Access Application

1. Open browser: https://tickedify.com/app
2. Login with test credentials
3. Navigate to "Acties" screen

### Step 3: Trigger Popup

1. Click and hold any task in the "Acties" list
2. Start dragging the task
3. Observe the floating planning popup appears

### Step 4: Verify Fix

**Expected Result** ✅:
- **Huidige week** shows: ma 13, di 14, wo 15, do 16, vr 17, za 18, **zo 19**
- **Volgende week** shows: ma 20, di 21, wo 22, do 23, vr 24, za 25, zo 26
- Today (zo 19) should have "current-day" highlighting

**Bug Symptom** ❌ (if fix not applied):
- **Huidige week** shows: ma 20, di 21, wo 22, do 23, vr 24, za 25, zo 26 (WRONG)
- **Volgende week** shows: ma 27, di 28, wo 29, do 30, vr 31, za 1, zo 2 (WRONG)

### Step 5: Reset System Date

```bash
# macOS/Linux - sync with network time
sudo sntp -sS time.apple.com

# Or manually set to current date
sudo date [MMDDhhmmYYYY]
```

## Comprehensive Testing (15 minutes)

### Test Suite: All Days of Week

#### Test 1: Sunday (Primary Bug Case)
```
Date: Sunday October 19, 2025
Expected Week 1: Oct 13-19 (Monday to Sunday)
Expected Week 2: Oct 20-26
Verification: Sunday Oct 19 visible in Week 1
```

#### Test 2: Monday (Week Start)
```
Date: Monday October 20, 2025
Expected Week 1: Oct 20-26 (Monday to Sunday)
Expected Week 2: Oct 27-Nov 2
Verification: Monday Oct 20 is first day of Week 1
```

#### Test 3: Wednesday (Mid-Week)
```
Date: Wednesday October 22, 2025
Expected Week 1: Oct 20-26
Expected Week 2: Oct 27-Nov 2
Verification: Wednesday Oct 22 highlighted in Week 1
```

#### Test 4: Saturday (Week End)
```
Date: Saturday October 25, 2025
Expected Week 1: Oct 20-26
Expected Week 2: Oct 27-Nov 2
Verification: Saturday Oct 25 highlighted in Week 1
```

#### Test 5: Month Boundary
```
Date: Sunday November 2, 2025
Expected Week 1: Oct 27 - Nov 2 (crosses October/November)
Expected Week 2: Nov 3-9
Verification: Week 1 shows "27, 28, 29, 30, 31, 1, 2"
```

#### Test 6: Year Boundary
```
Date: Sunday January 4, 2026
Expected Week 1: Dec 29, 2025 - Jan 4, 2026 (crosses year)
Expected Week 2: Jan 5-11, 2026
Verification: Week 1 shows "29, 30, 31, 1, 2, 3, 4"
```

## Automated Testing (Playwright)

### Setup
```bash
cd /Users/janbuskens/Library/CloudStorage/Dropbox/To\ Backup/Baas\ Over\ Je\ Tijd/Software/Tickedify
npm install
```

### Run Test
```javascript
// Save as: tests/week-display-sunday-bug.spec.js
const { test, expect } = require('@playwright/test');

test('Sunday drag popup shows current week', async ({ page, context }) => {
  // Mock system date to Sunday October 19, 2025
  await context.addInitScript(() => {
    const fakeDate = new Date('2025-10-19T12:00:00Z');
    Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          super(fakeDate);
        } else {
          super(...args);
        }
      }
    };
  });

  // Login
  await page.goto('https://tickedify.com/app');
  await page.fill('input[type="email"]', 'jan@buskens.be');
  await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');

  // Navigate to Acties
  await page.click('text=Acties');

  // Drag a task
  const task = page.locator('.task-item').first();
  await task.dragTo(page.locator('.drop-zone-item').first());

  // Verify current week contains Sunday Oct 19
  const huidigeWeek = page.locator('#actiesHuidigeWeek');
  const days = await huidigeWeek.locator('.week-day-zone').all();

  expect(days).toHaveLength(7);

  // First day should be Monday Oct 13
  expect(await days[0].locator('.day-name').textContent()).toBe('ma');
  expect(await days[0].locator('.day-date').textContent()).toBe('13');

  // Last day should be Sunday Oct 19 (current day)
  expect(await days[6].locator('.day-name').textContent()).toBe('zo');
  expect(await days[6].locator('.day-date').textContent()).toBe('19');
  expect(await days[6].getAttribute('class')).toContain('current-day');
});
```

## Manual Regression Test Checklist

After deploying fix, verify these scenarios still work:

- [ ] Drag task on Monday - popup appears correctly
- [ ] Drag task on Tuesday-Saturday - weeks display correctly
- [ ] Drag task on Sunday - **BUG FIX VERIFICATION** - current week visible
- [ ] Drop task on any day - task gets planned correctly
- [ ] Current day highlighting works on all days
- [ ] Month boundaries display correctly (dates wrap properly)
- [ ] Ctrl+drag shows third week correctly
- [ ] Popup closes on Escape key
- [ ] Popup closes when dropping outside
- [ ] Multiple drag operations work consecutively

## Rollback Procedure

If issues are discovered after deployment:

1. **Immediate Rollback**:
   ```bash
   git revert <commit-hash>
   git push origin develop
   ```

2. **Verify Rollback**:
   - Check version endpoint: `curl -s -L -k https://dev.tickedify.com/api/version`
   - Confirm previous version deployed

3. **Document Issue**:
   - Add issue to GitHub/project tracker
   - Include reproduction steps
   - Note affected scenarios

## Success Criteria

Fix is successful when:

- ✅ Sunday drag popup shows correct current week (Oct 13-19, not Oct 20-26)
- ✅ All other days (Mon-Sat) continue to work correctly
- ✅ No console errors during drag operations
- ✅ Month/year boundaries handled correctly
- ✅ Performance unchanged (< 1ms calculation time)
- ✅ No regression in other drag & drop features

## Performance Validation

```javascript
// Browser console performance test
const iterations = 1000;
console.time('weekCalculation');
for (let i = 0; i < iterations; i++) {
  const vandaag = new Date();
  const dagVanWeek = vandaag.getDay();
  const dagenNaarMaandag = dagVanWeek === 0 ? -6 : -(dagVanWeek - 1);
  const weekStart = new Date(vandaag);
  weekStart.setDate(vandaag.getDate() + dagenNaarMaandag);
}
console.timeEnd('weekCalculation');
// Expected: < 10ms for 1000 iterations (< 0.01ms per calculation)
```

## Troubleshooting

### Issue: Weeks still show incorrectly on Sunday

**Check**:
1. Verify code change deployed (check version number)
2. Clear browser cache (Cmd+Shift+R / Ctrl+F5)
3. Check browser console for JavaScript errors
4. Verify system date is actually Sunday (not mocked incorrectly)

### Issue: Current day highlighting missing

**Check**:
1. Verify `vandaagISO` calculation correct
2. Check CSS class `current-day` applied
3. Inspect element styling in DevTools

### Issue: Popup doesn't appear

**Not related to this fix** - separate issue:
1. Check drag event handlers registered
2. Verify popup DOM element exists
3. Check z-index and display styles
