# Quickstart Test: Remove Feedback & Support Block from Sidebar

**Feature**: 061-verwijder-in-de
**Test Environment**: dev.tickedify.com (staging)
**Login**: jan@buskens.be / qyqhut-muDvop-fadki9

## Test Objective

Verify that the Feedback & Support block is removed from the sidebar while the instructional video link remains accessible.

## Prerequisites

1. Feature deployed to staging environment (dev.tickedify.com)
2. Browser with developer tools available
3. Access to staging environment via Vercel Authentication or MCP tools

## Test Scenarios

### Scenario 1: Feedback Block Removed
**Given**: User navigates to dev.tickedify.com/app  
**When**: User views the sidebar  
**Then**: 
- ✅ Feedback & Support block is NOT visible
- ✅ No "Feedback" heading or text present
- ✅ No support-related links in sidebar

**Test Steps**:
1. Navigate to https://dev.tickedify.com/app
2. Login with test credentials
3. Inspect sidebar (left side of screen)
4. Verify absence of "Feedback" or "Support" text

**Expected Result**: Feedback & Support block completely removed

---

### Scenario 2: Instructional Video Link Preserved
**Given**: User navigates to dev.tickedify.com/app  
**When**: User views the sidebar  
**Then**: 
- ✅ Instructional video link IS visible
- ✅ Link text and icon are intact
- ✅ Link is clickable and functional

**Test Steps**:
1. Navigate to https://dev.tickedify.com/app
2. Login with test credentials
3. Locate instructional video link in sidebar
4. Verify link presence and visibility
5. Click link to verify functionality (optional)

**Expected Result**: Video link remains fully functional

---

### Scenario 3: Sidebar Layout Integrity
**Given**: User navigates to dev.tickedify.com/app  
**When**: User views the sidebar  
**Then**: 
- ✅ Sidebar displays correctly without visual gaps
- ✅ All other sidebar elements remain in proper position
- ✅ No broken styling or layout issues

**Test Steps**:
1. Navigate to https://dev.tickedify.com/app
2. Login with test credentials
3. Inspect entire sidebar visually
4. Verify no empty spaces where block was removed
5. Verify all other elements properly aligned

**Expected Result**: Clean, gap-free sidebar layout

---

### Scenario 4: Responsive Design (Mobile)
**Given**: User accesses dev.tickedify.com/app on mobile viewport  
**When**: User views the sidebar  
**Then**: 
- ✅ Feedback block NOT visible on mobile
- ✅ Video link visible and accessible on mobile
- ✅ Sidebar responsive behavior unchanged

**Test Steps**:
1. Open browser developer tools
2. Set viewport to mobile size (e.g., 375x667 iPhone)
3. Navigate to https://dev.tickedify.com/app
4. Login with test credentials
5. Open sidebar (if collapsed)
6. Verify removal and preservation same as desktop

**Expected Result**: Consistent behavior across viewport sizes

---

### Scenario 5: Page Refresh Persistence
**Given**: User has loaded dev.tickedify.com/app  
**When**: User refreshes the page  
**Then**: 
- ✅ Feedback block remains hidden after refresh
- ✅ Video link remains visible after refresh
- ✅ No cache-related display issues

**Test Steps**:
1. Navigate to https://dev.tickedify.com/app
2. Login with test credentials
3. Verify block removed and link present
4. Refresh page (Ctrl+R / Cmd+R)
5. Verify same state after refresh

**Expected Result**: Changes persist across page reloads

---

## Automated Test (Playwright)

```javascript
// Test: Sidebar Feedback block removal
test('Feedback & Support block removed, video link preserved', async ({ page }) => {
  // Navigate and login
  await page.goto('https://dev.tickedify.com/app');
  await page.fill('[name="email"]', 'jan@buskens.be');
  await page.fill('[name="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('[type="submit"]');
  
  // Wait for sidebar to load
  await page.waitForSelector('.sidebar'); // Adjust selector as needed
  
  // Verify Feedback block is removed
  const feedbackBlock = page.locator('text=/Feedback|Support/i');
  await expect(feedbackBlock).toHaveCount(0);
  
  // Verify instructional video link is present
  const videoLink = page.locator('text=/instructievideo|video|tutorial/i');
  await expect(videoLink).toBeVisible();
  
  // Verify sidebar layout integrity (no empty gaps)
  const sidebar = page.locator('.sidebar');
  await expect(sidebar).toBeVisible();
});
```

## Success Criteria

✅ **All 5 scenarios pass**  
✅ **No visual regressions**  
✅ **Sidebar functionality unchanged**  
✅ **Responsive design intact**  

## Rollback Plan

If issues found:
1. Revert commit on staging branch
2. Re-deploy previous version
3. Investigate HTML structure differences
4. Re-test before re-deployment

---

**Test Duration**: ~5 minutes (manual)  
**Automation Duration**: ~30 seconds (Playwright)
