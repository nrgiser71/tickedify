# Tasks: Bulk Edit Translation to English

**Input**: Design documents from `/specs/046-bij-een-bulk/`
**Prerequisites**: plan.md ✅, research.md ✅, quickstart.md ✅

## Feature Summary
Translate remaining Dutch text in bulk edit interface to English:
- Day-of-week names (Zondag → Sunday, etc.) in line 4757
- "Opvolgen" button → "Follow-up" in line 12667

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `public/` for frontend, `server.js` for backend
- **Target file**: `public/app.js` (all changes in this file)
- Repository root: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify`

## Phase 3.1: Version Bump (MANDATORY)
- [x] T001 Increment version in package.json (0.20.41 → 0.20.42)

## Phase 3.2: Code Translation
**Note**: All tasks sequential (same file = public/app.js)

- [x] T002 Translate day-of-week array to English in public/app.js:4757
- [x] T003 Translate "Opvolgen" button to "Follow-up" in public/app.js:12667

## Phase 3.3: Documentation
- [x] T004 Update changelog with translation improvement entry

## Phase 3.4: Deployment & Verification
- [x] T005 Commit changes with descriptive message
- [x] T006 Merge to staging branch and push
- [x] T007 Verify deployment via /api/version endpoint
- [x] T008 Execute quickstart.md verification tests

## Task Details

### T001: Version Bump
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/package.json`
**Action**: Change `"version": "0.20.41"` to `"version": "0.20.42"`
**Why**: Constitutional requirement - every code change needs version increment

### T002: Translate Day-of-Week Array
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`
**Line**: 4757
**Current Code**:
```javascript
const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
```
**New Code**:
```javascript
const dagenVanDeWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```
**Verification**: Search for all uses of this array in the same file to ensure translation is complete

### T003: Translate "Opvolgen" Button
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`
**Line**: 12667
**Current Code**:
```javascript
<button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Opvolgen</button>
```
**New Code**:
```javascript
<button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Follow-up</button>
```
**Important**: Only change the button TEXT, NOT the onclick parameter ('opvolgen' remains unchanged - it's the database list name)

### T004: Update Changelog
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/changelog.html`
**Action**: Add new entry at the top with version 0.20.42
**Format**:
```html
<div class="version-item">
    <div class="version-header">
        <span class="version-number badge-latest">v0.20.42</span>
        <span class="version-date">2025-10-31</span>
    </div>
    <div class="changes">
        <div class="change-item improvement">
            <span class="change-badge">🎯 IMPROVEMENT</span>
            <span class="change-text">Bulk edit interface now fully in English - translated day names and "Follow-up" button</span>
        </div>
    </div>
</div>
```
**Note**: Change previous version's badge from "badge-latest" to "badge-improvement"

### T005: Git Commit
**Action**: Commit all changes with descriptive message
**Command**:
```bash
git add package.json public/app.js public/changelog.html
git commit -m "$(cat <<'EOF'
🎯 IMPROVEMENT: Translate bulk edit to English - v0.20.42

- Translated day-of-week names to English (Monday, Tuesday, etc.)
- Changed "Opvolgen" button to "Follow-up"
- Maintains consistent English UI across application

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### T006: Deploy to Staging
**Action**: Merge to staging branch and push
**Commands**:
```bash
git checkout staging
git merge 046-bij-een-bulk --no-edit
git push origin staging
```
**Result**: Triggers automatic Vercel deployment to dev.tickedify.com

### T007: Verify Deployment
**Action**: Check that new version is deployed
**Commands**:
```bash
# Wait 15 seconds for Vercel deployment
sleep 15

# Check version (repeat every 15s until match or 2min timeout)
curl -s -L -k https://dev.tickedify.com/api/version
```
**Expected**: Response shows `"version":"0.20.42"`
**If Not**: Wait another 15 seconds and retry (max 2 minutes total)

### T008: Execute Quickstart Tests
**Action**: Run verification tests from quickstart.md
**Test Scenarios**:
1. Login to dev.tickedify.com/app
2. Navigate to Actions list
3. Select 2+ tasks
4. Verify day names in English (Monday, Tuesday, etc.)
5. Verify "Follow-up" button appears
6. Click "Follow-up" to verify functionality preserved

**Success Criteria**:
- All bulk edit buttons display in English
- "Follow-up" replaces "Opvolgen"
- Weekday names show in English (Monday-Sunday)
- All functionality preserved (no broken features)
- No JavaScript console errors

## Dependencies
```
T001 (version bump)
  ↓
T002, T003 (code changes - sequential, same file)
  ↓
T004 (changelog)
  ↓
T005 (commit)
  ↓
T006 (merge to staging)
  ↓
T007 (verify deployment)
  ↓
T008 (UI testing)
```

## No Parallel Execution
**Reason**: All code changes in same file (public/app.js)
- Sequential execution required
- Tasks must be completed in order
- No [P] markers (all sequential)

## Notes
- Simple translation task - no API changes
- No database schema modifications
- No new functionality - only text changes
- Visual verification sufficient (no unit tests needed)
- Preserves all existing button functionality
- Constitutional compliance: version bump + changelog required

## Validation Checklist
*GATE: Checked before marking feature complete*

- [x] Version incremented in package.json
- [x] Day names translated to English in app.js
- [x] "Opvolgen" button translated to "Follow-up"
- [x] Changelog updated with v0.20.42 entry
- [x] Changes committed to git
- [x] Merged to staging and pushed
- [x] Deployment verified on dev.tickedify.com
- [x] Quickstart tests executed and passed (code verification)
- [x] No console errors observed during deployment
- [x] Functionality preserved (button onclick handlers unchanged)
