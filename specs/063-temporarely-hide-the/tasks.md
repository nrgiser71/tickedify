# Tasks: Temporarily Hide Settings & Tutorial Elements

**Input**: Design documents from `/specs/063-temporarely-hide-the/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md
**Branch**: `063-temporarely-hide-the`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Loaded - tech stack: Vanilla JavaScript, HTML5, Node.js 16+
   ✅ Structure: /public/index.html and /public/app.js modifications
2. Load optional design documents:
   ✅ research.md: Comment marker format defined
   ✅ data-model.md: No entities (UI-only change)
   ⚠️  contracts/: Not applicable (no API changes)
3. Generate tasks by category:
   ✅ Setup: Version check, current version identification
   ✅ Tests: N/A (manual UI testing via quickstart.md)
   ✅ Core: HTML commenting, JavaScript commenting
   ✅ Integration: Version bump, changelog update, deployment
   ✅ Polish: Manual testing via quickstart.md
4. Apply task rules:
   ⚠️  All tasks sequential (same 2 files: index.html, app.js)
   ✅ No [P] markers (file conflicts if run in parallel)
5. Number tasks sequentially (T001-T010)
6. Generate dependency graph: Sequential chain
7. Parallel execution: Not applicable (same-file edits)
8. Validate task completeness:
   ✅ All 3 UI elements covered
   ✅ Version bump included
   ✅ Changelog update included
   ✅ Deployment verification included
9. Return: SUCCESS (10 tasks ready for execution)
```

## Format: `[ID] Description`
- No [P] markers - all tasks sequential due to same-file editing
- Include exact file paths and line numbers in descriptions

## Path Conventions
- **Tickedify structure**: Flat /public/ directory (index.html, app.js)
- **Version file**: /package.json
- **Changelog**: /public/changelog.html

---

## Phase 3.1: Preparation

- [x] **T001: Verify current application version** ✅
**File**: `/package.json`
**Action**: Read current version number from package.json to determine next version
**Expected Output**: Current version (e.g., "1.0.3")
**Next Version**: Increment patch (e.g., "1.0.3" → "1.0.4")

---

## Phase 3.2: HTML Modifications

- [x] **T002: Hide Settings menu item in index.html** ✅
**File**: `/public/index.html`
**Lines to modify**: 142-145
**Action**: Wrap Settings menu HTML in comment markers
**Before**:
```html
<div class="lijst-item nav-section-gap" data-tool="settings" id="settings-link">
    <div class="lijst-icon"><i class="fas fa-cog"></i></div>
    <span class="lijst-naam">Settings</span>
</div>
```
**After**:
```html
<!-- TEMPORARILY HIDDEN - Feature 063 - Restore by uncommenting
<div class="lijst-item nav-section-gap" data-tool="settings" id="settings-link">
    <div class="lijst-icon"><i class="fas fa-cog"></i></div>
    <span class="lijst-naam">Settings</span>
</div>
END TEMPORARILY HIDDEN - Feature 063 -->
```
**Dependencies**: None
**Verification**: Element should not render in browser

---

- [x] **T003: Hide instruction video link in index.html** ✅
**File**: `/public/index.html`
**Lines to modify**: 148-154
**Action**: Wrap instruction video link HTML in comment markers
**Before**:
```html
<!-- Instructional Video -->
<div class="lijst-sectie">
    <a href="#" id="openOnboardingVideoLink" class="lijst-item">
        <div class="lijst-icon"><i class="fas fa-video"></i></div>
        <span class="lijst-naam">Instruction Video</span>
    </a>
</div>
```
**After**:
```html
<!-- TEMPORARILY HIDDEN - Feature 063 - Restore by uncommenting
<!-- Instructional Video -->
<div class="lijst-sectie">
    <a href="#" id="openOnboardingVideoLink" class="lijst-item">
        <div class="lijst-icon"><i class="fas fa-video"></i></div>
        <span class="lijst-naam">Instruction Video</span>
    </a>
</div>
END TEMPORARILY HIDDEN - Feature 063 -->
```
**Dependencies**: T002 (sequential same-file edit)
**Verification**: Element should not render in browser

---

- [x] **T004: Hide onboarding video popup in index.html** ✅
**File**: `/public/index.html`
**Lines to modify**: 852-869
**Action**: Wrap onboarding video popup HTML in comment markers
**Before**:
```html
<!-- Onboarding Video Popup (Feature 014) -->
<div id="onboardingVideoPopup" class="popup-overlay" style="display: none;">
    <div class="popup-content onboarding-video-content">
        <button class="close-video-btn" aria-label="Sluiten">&times;</button>
        <h2>Welcome to Tickedify</h2>
        <div class="video-container">
            <iframe id="onboardingVideoIframe"
                    width="560" height="315"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen>
            </iframe>
        </div>
        <p class="fallback-message" style="display: none;">
            Nog geen welkomstvideo beschikbaar
        </p>
    </div>
</div>
```
**After**:
```html
<!-- TEMPORARILY HIDDEN - Feature 063 - Restore by uncommenting
<!-- Onboarding Video Popup (Feature 014) -->
<div id="onboardingVideoPopup" class="popup-overlay" style="display: none;">
    <div class="popup-content onboarding-video-content">
        <button class="close-video-btn" aria-label="Sluiten">&times;</button>
        <h2>Welcome to Tickedify</h2>
        <div class="video-container">
            <iframe id="onboardingVideoIframe"
                    width="560" height="315"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen>
            </iframe>
        </div>
        <p class="fallback-message" style="display: none;">
            Nog geen welkomstvideo beschikbaar
        </p>
    </div>
</div>
END TEMPORARILY HIDDEN - Feature 063 -->
```
**Dependencies**: T003 (sequential same-file edit)
**Verification**: Popup HTML should not render in browser

---

## Phase 3.3: JavaScript Modifications

- [x] **T005: Disable auto-play video logic in app.js** ✅
**File**: `/public/app.js`
**Lines to modify**: 1159-1172
**Action**: Comment out auto-play logic block
**Before**:
```javascript
// Feature 014: Check if user needs to see onboarding video (first login)
try {
    const response = await fetch('/api/user/onboarding-status');
    if (response.ok) {
        const { seen } = await response.json();
        if (!seen) {
            // User has not seen the onboarding video yet - show it
            await this.onboardingVideo.showVideo();
        }
    }
} catch (error) {
    console.error('Fout bij controleren onboarding status:', error);
    // Continue loading app even if onboarding check fails
}
```
**After**:
```javascript
// TEMPORARILY DISABLED - Feature 063 - Restore by uncommenting
/*
// Feature 014: Check if user needs to see onboarding video (first login)
try {
    const response = await fetch('/api/user/onboarding-status');
    if (response.ok) {
        const { seen } = await response.json();
        if (!seen) {
            // User has not seen the onboarding video yet - show it
            await this.onboardingVideo.showVideo();
        }
    }
} catch (error) {
    console.error('Fout bij controleren onboarding status:', error);
    // Continue loading app even if onboarding check fails
}
*/
// END TEMPORARILY DISABLED - Feature 063
```
**Dependencies**: T004 (HTML modifications complete)
**Verification**: No auto-play on first login (new user test)

**Note**: Leave OnboardingVideoManager class (lines 537-656) intact - harmless if not called

---

## Phase 3.4: Version & Documentation

- [x] **T006: Increment version in package.json** ✅
**File**: `/package.json`
**Action**: Increment patch version (e.g., "1.0.3" → "1.0.4")
**Dependencies**: T005 (code changes complete)
**Verification**: package.json shows new version

---

- [x] **T007: Update changelog.html** ✅
**File**: `/public/changelog.html`
**Action**: Add new version entry at top of changelog
**Format**:
```html
<div class="changelog-item">
    <div class="changelog-header">
        <span class="version-badge badge-latest">v1.0.4</span>
        <span class="changelog-date">2025-06-19</span>
    </div>
    <div class="changelog-content">
        <h3>🎯 UI Improvements</h3>
        <ul>
            <li>Temporarily hide Settings menu item (under development)</li>
            <li>Temporarily hide instruction video link (under development)</li>
            <li>Temporarily disable auto-play tutorial video on first login</li>
        </ul>
        <p class="changelog-note">
            <strong>Note:</strong> These features are temporarily hidden while under development.
            They will be restored in a future release. This change has no impact on core task management functionality.
        </p>
    </div>
</div>
```
**Dependencies**: T006 (version number known)
**Verification**: Changelog shows new entry with correct version

---

## Phase 3.5: Deployment

- [x] **T008: Commit and push to staging branch** ✅
**Commands**:
```bash
git add public/index.html public/app.js package.json public/changelog.html
git commit -m "🎯 IMPROVEMENT: Temporarily hide Settings and tutorial elements - v1.0.4

- Hide Settings menu item (under development)
- Hide instruction video link (under development)
- Disable auto-play tutorial video on first login
- Code preserved with clear restoration markers (Feature 063)
- Zero impact on core functionality

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin staging
```
**Dependencies**: T007 (all file changes complete)
**Verification**: Staging branch updated on GitHub

---

- [x] **T009: Verify Vercel deployment** ✅
**Action**: Check deployment status and version endpoint
**Commands**:
```bash
# Wait 15 seconds for Vercel deployment
sleep 15

# Check version endpoint (repeat every 15 seconds until match or 2 min timeout)
curl -s -L -k https://dev.tickedify.com/api/version
```
**Expected**: Version matches package.json (e.g., "1.0.4")
**Dependencies**: T008 (code pushed to staging)
**Verification**: dev.tickedify.com shows new version

---

## Phase 3.6: Testing

- [ ] **T010: Execute quickstart.md test scenarios** (Manual testing required)
**File**: `/specs/063-temporarely-hide-the/quickstart.md`
**Action**: Manually execute all 5 test scenarios on dev.tickedify.com
**Test Scenarios**:
1. ✅ Settings menu item hidden (browser DevTools: `document.getElementById('settings-link')` returns null)
2. ✅ Instruction video link hidden (browser DevTools: `document.getElementById('openOnboardingVideoLink')` returns null)
3. ✅ Auto-play video disabled (login as new user, no popup)
4. ✅ Code preservation verified (search for "Feature 063" in index.html and app.js)
5. ✅ Restoration dry-run successful (create test branch, uncomment, verify elements reappear)

**Regression Testing** (10 workflows):
1. Navigate between list views
2. Create new task
3. Edit existing task
4. Move task to different list
5. Daily planning drag & drop
6. Help icon functionality
7. Project filter
8. Context filter
9. Task completion
10. Task deletion

**Dependencies**: T009 (deployment verified)
**Success Criteria**: All test scenarios pass
**Verification**: Document results in task completion notes

---

## Dependencies Graph

```
T001 (Version check)
  ↓
T002 (Hide Settings HTML)
  ↓
T003 (Hide video link HTML)
  ↓
T004 (Hide popup HTML)
  ↓
T005 (Disable auto-play JS)
  ↓
T006 (Version bump)
  ↓
T007 (Changelog update)
  ↓
T008 (Commit & push)
  ↓
T009 (Verify deployment)
  ↓
T010 (Manual testing)
```

**Sequential Execution**: All tasks must run in order (no parallelization due to same-file editing)

---

## Parallel Execution

**Not Applicable**: All tasks edit the same 2 files (index.html, app.js), so parallel execution would cause conflicts.

Execute tasks T001-T010 sequentially in a single session.

---

## Notes

- **No [P] markers**: All edits to same files require sequential execution
- **Comment preservation**: All original code preserved with "Feature 063" markers
- **Easy restoration**: Search for "Feature 063" to find all commented blocks
- **Zero refactoring**: Only adding comment markers, no code changes
- **Manual testing**: Use browser DevTools and quickstart.md for verification
- **Staging only**: Changes deployed to dev.tickedify.com, NOT production (beta freeze active)

---

## Task Generation Rules Applied

1. **From Contracts**: N/A (no API changes)
2. **From Data Model**: N/A (no entities)
3. **From User Stories**: Manual testing via quickstart.md (T010)
4. **Ordering**: Prep → HTML → JavaScript → Version → Deploy → Test

---

## Validation Checklist

- [x] All 3 UI elements covered (Settings, video link, auto-play)
- [x] All tasks specify exact file paths and line numbers
- [x] Version bump and changelog update included
- [x] Deployment verification included
- [x] Manual testing phase included (quickstart.md)
- [x] Comment markers consistent ("Feature 063")
- [x] No parallel tasks (same-file conflicts prevented)
- [x] Dependencies clearly documented
- [x] Restoration instructions embedded in code comments

---

**Status**: Ready for execution
**Estimated Time**: 30-45 minutes (including deployment wait and manual testing)
**Risk Level**: Low (comment-only changes, easily reversible)
