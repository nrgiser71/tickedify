# Quickstart Testing Guide: Hide Settings & Tutorial Elements

**Feature**: Temporarily hide Settings menu item, instruction video link, and auto-play tutorial video
**Branch**: `063-temporarely-hide-the`
**Testing Environment**: dev.tickedify.com (staging)

## Prerequisites

1. Changes deployed to staging branch
2. Vercel deployment complete on dev.tickedify.com
3. Browser with developer tools (Chrome/Firefox/Safari)

## Test Scenario 1: Settings Menu Item Hidden

**Objective**: Verify Settings menu item is not visible in navigation

### Steps:
1. Navigate to `https://dev.tickedify.com/app`
2. Log in with test credentials:
   - Email: `jan@buskens.be`
   - Password: `qyqhut-muDvop-fadki9`
3. Look at left sidebar navigation menu
4. Scroll through entire menu list

### Expected Results:
- ✅ Settings menu item is NOT visible
- ✅ No gear icon (⚙️) in navigation
- ✅ No broken layout or spacing issues
- ✅ Other menu items display correctly

### Verification:
```javascript
// Open browser console and verify:
document.getElementById('settings-link')  // Should return null or element has display:none
```

---

## Test Scenario 2: Instruction Video Link Hidden

**Objective**: Verify instruction video link is not visible in navigation

### Steps:
1. While logged in to dev.tickedify.com/app
2. Look at left sidebar navigation menu
3. Search for video icon (🎥) or "Instruction Video" text

### Expected Results:
- ✅ Instruction video link is NOT visible
- ✅ No video icon in navigation
- ✅ No broken layout or spacing issues

### Verification:
```javascript
// Open browser console and verify:
document.getElementById('openOnboardingVideoLink')  // Should return null or element has display:none
```

---

## Test Scenario 3: Auto-Play Video Disabled (First Login)

**Objective**: Verify tutorial video does NOT auto-play on first app startup

### Steps:
1. **Create a new test user** OR **clear onboarding status**:
   - Option A: Use admin interface to create new user
   - Option B: Use API to reset onboarding status for existing test user
2. Log in with fresh user credentials
3. Observe application load behavior

### Expected Results:
- ✅ App loads normally
- ✅ NO video popup appears automatically
- ✅ No "Welcome to Tickedify" modal
- ✅ User goes directly to main app interface

### Verification:
```javascript
// Open browser console and verify:
document.getElementById('onboardingVideoPopup').style.display  // Should be 'none'
```

---

## Test Scenario 4: Code Preservation Check

**Objective**: Verify all code remains in place for future restoration

### Steps:
1. Open `/public/index.html` in code editor
2. Search for "Feature 063" (case-sensitive)
3. Verify comment markers are clear and consistent

### Expected Results:
- ✅ Settings menu HTML wrapped in clear comment markers
- ✅ Instruction video HTML wrapped in clear comment markers
- ✅ Onboarding video popup HTML wrapped in clear comment markers
- ✅ Comment markers include "TEMPORARILY HIDDEN - Feature 063"
- ✅ Comment markers include "END TEMPORARILY HIDDEN - Feature 063"
- ✅ Original code intact within comments

**Example Expected Format**:
```html
<!-- TEMPORARILY HIDDEN - Feature 063 - Restore by uncommenting
<div class="lijst-item nav-section-gap" data-tool="settings" id="settings-link">
    <div class="lijst-icon"><i class="fas fa-cog"></i></div>
    <span class="lijst-naam">Settings</span>
</div>
END TEMPORARILY HIDDEN - Feature 063 -->
```

### Verification in JavaScript:
1. Open `/public/app.js` in code editor
2. Search for "Feature 063"
3. Find auto-play logic block (should be around line 1159-1172)
4. Verify it's wrapped in clear comment block

**Example Expected Format**:
```javascript
// TEMPORARILY DISABLED - Feature 063 - Restore by uncommenting
/*
// Feature 014: Check if user needs to see onboarding video (first login)
try {
    const response = await fetch('/api/user/onboarding-status');
    if (response.ok) {
        const { seen } = await response.json();
        if (!seen) {
            await this.onboardingVideo.showVideo();
        }
    }
} catch (error) {
    console.error('Fout bij controleren onboarding status:', error);
}
*/
// END TEMPORARILY DISABLED - Feature 063
```

---

## Test Scenario 5: Restoration Dry-Run

**Objective**: Verify code can be easily restored without errors

### Steps:
1. Create a separate test branch from feature branch:
   ```bash
   git checkout -b test-restoration-063
   ```
2. Uncomment all hidden code blocks:
   - Search for "TEMPORARILY HIDDEN - Feature 063" in index.html
   - Remove opening and closing comment markers
   - Search for "TEMPORARILY DISABLED - Feature 063" in app.js
   - Remove opening `/*` and closing `*/` markers
3. Save files
4. Deploy test branch to staging OR test locally
5. Verify all 3 elements reappear correctly
6. Delete test branch (do NOT merge):
   ```bash
   git checkout 063-temporarely-hide-the
   git branch -D test-restoration-063
   ```

### Expected Results:
- ✅ Settings menu item visible after uncommenting
- ✅ Instruction video link visible after uncommenting
- ✅ Auto-play video triggers after uncommenting (test with new user)
- ✅ No JavaScript errors in console
- ✅ No broken functionality
- ✅ All elements function exactly as before Feature 063

---

## Regression Testing

**Objective**: Ensure hiding these elements doesn't break other functionality

### Critical Workflows to Test:
1. ✅ Navigate between different list views (Inbox, Acties, Opvolgen, etc.)
2. ✅ Create new task in Inbox
3. ✅ Edit existing task
4. ✅ Move task to different list (drag & drop or context menu)
5. ✅ Daily planning drag & drop from Acties to calendar
6. ✅ Help icon functionality (other pages should show help modals)
7. ✅ Project filter in Acties
8. ✅ Context filter in Acties
9. ✅ Task completion (checkbox)
10. ✅ Task deletion (move to Prullenbak)

### Expected Results:
- All core functionality works normally
- No JavaScript console errors
- No visual layout breaks
- No performance degradation
- Navigation menu spacing looks natural (no gaps where elements removed)

---

## Success Criteria

All test scenarios MUST pass before considering this feature complete:

- [ ] Test Scenario 1: Settings menu item hidden ✅
- [ ] Test Scenario 2: Instruction video link hidden ✅
- [ ] Test Scenario 3: Auto-play video disabled ✅
- [ ] Test Scenario 4: Code preservation verified ✅
- [ ] Test Scenario 5: Restoration dry-run successful ✅
- [ ] Regression testing passed (10/10 workflows) ✅

---

## Rollback Procedure

If issues are found during testing:

1. **Immediate**: Revert staging branch to previous commit
   ```bash
   git checkout staging
   git reset --hard HEAD~1
   git push -f origin staging
   ```
2. **Analysis**: Investigate failure in test scenario
3. **Fix**: Apply corrections to feature branch
4. **Re-test**: Run full quickstart guide again
5. **Deploy**: Only after all tests pass

---

## Notes

- Use browser DevTools Console for verification commands
- Test in multiple browsers if possible (Chrome, Firefox, Safari)
- Check both desktop and mobile responsive views
- Document any unexpected behavior in GitHub issues
- Keep test credentials secure (dev.tickedify.com only)

---

**Last Updated**: 2025-06-19
**Feature**: 063-temporarely-hide-the
**Estimated Testing Time**: 15-20 minutes for full quickstart
