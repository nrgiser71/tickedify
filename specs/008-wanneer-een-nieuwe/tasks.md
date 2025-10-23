# Tasks: Lege Inbox Popup Bug Fix

**Input**: Design documents from `/specs/008-wanneer-een-nieuwe/`
**Prerequisites**: plan.md ✅, research.md ✅, quickstart.md ✅
**Branch**: `008-wanneer-een-nieuwe`
**Target Version**: v0.16.33

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Loaded - Bug fix: replace prevInboxCount logic met lastActionWasPlanning flag
2. Load optional design documents:
   ✅ research.md: Implementation strategy met 4 stappen gedefinieerd
   ✅ quickstart.md: 5 test scenarios + 3 edge cases
   ⚠️  data-model.md: N/A - Geen nieuwe entities
   ⚠️  contracts/: N/A - Geen API wijzigingen
3. Generate tasks by category:
   ✅ Setup: Version bump, branch verificatie
   ✅ Implementation: 4 code changes in app.js
   ✅ Testing: 5 scenarios via Playwright
   ✅ Deployment: Staging → Production workflow
4. Apply task rules:
   ⚠️  Single file (app.js) - Geen parallelle taken mogelijk
   ✅ Tests kunnen parallel (verschillende test scenarios)
5. Number tasks sequentially (T001-T015)
6. Return: SUCCESS (15 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All implementation in single file: `public/app.js`

## Path Conventions
- **Web app structure**: `public/app.js` (frontend), `server.js` (backend)
- No backend changes needed - pure frontend fix

---

## Phase 3.1: Setup & Preparation
- [ ] **T001** Verify current branch is `008-wanneer-een-nieuwe`
  - Run: `git branch --show-current`
  - Expected: `008-wanneer-een-nieuwe`
  - If not: `git checkout -b 008-wanneer-een-nieuwe`

- [ ] **T002** Backup current app.js state
  - Copy `public/app.js` to `public/app.js.backup-v0.16.32`
  - For rollback safety

- [ ] **T003** Identify all planning action entry points in app.js
  - Read code around line 4153 (`planTaak()`)
  - Read code around line 9249 (`handleDropInternal()`)
  - Read code around line 2331 (`planTaakWrapper()`)
  - Document line numbers in task notes

---

## Phase 3.2: Implementation (Sequential - Same File)

### Step 1: Add State Flag

- [ ] **T004** Add `lastActionWasPlanning` flag to Taakbeheer constructor
  - **File**: `public/app.js`
  - **Location**: Line ~631 (after `this.prevInboxCount = -1;`)
  - **Add**:
    ```javascript
    this.lastActionWasPlanning = false; // Track if last action was planning a task
    ```
  - **Verify**: Constructor now initializes flag to `false`

### Step 2: Set Flag in Planning Actions

- [ ] **T005** Set flag in `planTaak()` function before API call
  - **File**: `public/app.js`
  - **Location**: Line ~4153 (function `planTaak(id)`)
  - **Add** at start of function (after initial checks, before API call):
    ```javascript
    // Check if this is from inbox to trigger celebration
    const wasInInbox = this.huidigeLijst === 'inbox';
    ```
  - **Add** after successful API call (before `laadHuidigeLijst()`):
    ```javascript
    // Set flag if task was planned from inbox
    if (wasInInbox) {
        this.lastActionWasPlanning = true;
    }
    ```
  - **Verify**: Flag is set when planning task from inbox

- [ ] **T006** Set flag in `handleDropInternal()` for drag & drop
  - **File**: `public/app.js`
  - **Location**: Line ~9249 (function `handleDropInternal(data, uur, position)`)
  - **Find**: Section where task is being moved from inbox
  - **Add** after detecting inbox as source (before render calls):
    ```javascript
    // Check if dropping task from inbox
    const isFromInbox = data.lijst === 'inbox' ||
                        (this.huidigeLijst === 'inbox' && this.taken.some(t => t.id === data.id));
    ```
  - **Add** after successful drop (before final render):
    ```javascript
    // Set flag if task was dropped from inbox
    if (isFromInbox && data.lijst !== 'inbox') {
        this.lastActionWasPlanning = true;
    }
    ```
  - **Verify**: Flag is set when dragging task from inbox to other list/calendar

- [ ] **T007** Set flag in bulk mode planning actions
  - **File**: `public/app.js`
  - **Location**: Search for bulk mode handling (~line 4282 context)
  - **Find**: Location where bulk tasks are planned and inbox becomes empty
  - **Add** after last task in bulk is planned:
    ```javascript
    // Set flag if bulk action cleared inbox
    if (this.huidigeLijst === 'inbox' && this.geselecteerdeTaken.size > 0) {
        this.lastActionWasPlanning = true;
    }
    ```
  - **Verify**: Flag is set when bulk mode clears inbox

### Step 3: Update Popup Trigger Logic

- [ ] **T008** Replace popup trigger check in `renderStandaardLijst()`
  - **File**: `public/app.js`
  - **Location**: Line ~3588-3592
  - **Find**:
    ```javascript
    if (this.huidigeLijst === 'inbox' && this.taken.length === 0) {
        // Check if inbox just got cleared (from >0 to 0) for celebration
        if (this.prevInboxCount > 0) {
            this.triggerInboxCelebration();
        }
    ```
  - **Replace** with:
    ```javascript
    if (this.huidigeLijst === 'inbox' && this.taken.length === 0) {
        // Check if inbox just got cleared by user action
        if (this.lastActionWasPlanning) {
            this.triggerInboxCelebration();
            this.lastActionWasPlanning = false; // Reset after popup
        }
    ```
  - **Verify**: Popup trigger now uses flag instead of counter comparison

- [ ] **T009** Add flag reset for non-empty inbox renders
  - **File**: `public/app.js`
  - **Location**: Line ~3606-3608 (after tracking inbox count)
  - **Find**:
    ```javascript
    // Track inbox count for celebration detection
    if (this.huidigeLijst === 'inbox') {
        this.prevInboxCount = this.taken.length;
    }
    ```
  - **Add** after this block:
    ```javascript
    // Reset planning flag when inbox is not empty
    if (this.huidigeLijst === 'inbox' && this.taken.length > 0) {
        this.lastActionWasPlanning = false;
    }
    ```
  - **Verify**: Flag resets when inbox has tasks

### Step 4: Cleanup (Optional)

- [ ] **T010** Remove deprecated `prevInboxCount` tracking (optional)
  - **File**: `public/app.js`
  - **Note**: Can keep for backwards compatibility or remove if fully replaced
  - **Decision**: KEEP for now - can be removed in future cleanup
  - Mark as "deprecated" in comments if desired

---

## Phase 3.3: Version & Documentation

- [ ] **T011** Update version number in package.json
  - **File**: `package.json`
  - **Change**: `"version": "0.16.32"` → `"version": "0.16.33"`
  - **Verify**: Version matches feature version

- [ ] **T012** Update changelog.html
  - **File**: `public/changelog.html`
  - **Add** new entry at top:
    ```html
    <div class="changelog-item">
        <div class="changelog-header">
            <span class="changelog-version">v0.16.33</span>
            <span class="changelog-date">2025-10-07</span>
            <span class="badge badge-fix">Bug Fix</span>
        </div>
        <div class="changelog-content">
            <h3>🔧 Lege Inbox Popup Fix</h3>
            <ul>
                <li>Nieuwe gebruikers zien geen popup meer bij eerste login met lege inbox</li>
                <li>Popup verschijnt alleen nog na actief plannen van laatste taak</li>
                <li>Verbeterde state tracking met expliciete planning flag</li>
            </ul>
        </div>
    </div>
    ```
  - **Verify**: Changelog updated met nieuwe versie

---

## Phase 3.4: Local Testing

- [ ] **T013** Manual local testing - alle scenarios
  - **Prerequisites**: `npm start` lokaal draaien op localhost:3000
  - **Test Scenario 1**: Clear browser storage → Login → Verify NO popup
  - **Test Scenario 2**: Add 1 inbox task → Plan task → Verify popup SHOWS
  - **Test Scenario 3**: Refresh page → Verify NO popup
  - **Test Scenario 4**: Add task → Plan task → Verify popup SHOWS
  - **Test Scenario 5**: Add 3 tasks → Bulk plan all → Verify popup SHOWS
  - **Document**: All results in task notes

---

## Phase 3.5: Deployment & Testing

- [ ] **T014** Deploy to staging and run automated tests
  - **Commit**: `git add . && git commit -m "🔧 Fix lege inbox popup bug - v0.16.33"`
  - **Push**: `git push origin 008-wanneer-een-nieuwe`
  - **Deploy**: Vercel auto-deploys to dev.tickedify.com
  - **Wait**: 15-30 seconds for deployment
  - **Verify**: `curl -s -L -k https://dev.tickedify.com/api/version` shows v0.16.33
  - **Run tests**: Use tickedify-testing agent voor alle 5 scenarios
    - Navigate to dev.tickedify.com/app
    - Execute quickstart.md test scenarios
    - Verify all assertions pass

- [ ] **T015** Create Pull Request naar main branch (after approval)
  - **Prerequisites**: All staging tests passed ✅
  - **Title**: `🔧 Fix lege inbox popup bug - v0.16.33`
  - **Body**:
    ```markdown
    ## Summary
    Nieuwe gebruikers zien geen popup meer bij eerste login met lege inbox.
    Popup verschijnt alleen na actief plannen van laatste inbox taak.

    ## Changes
    - ✅ Added `lastActionWasPlanning` flag to Taakbeheer class
    - ✅ Set flag in planTaak(), handleDropInternal(), bulk mode
    - ✅ Updated popup trigger logic in renderStandaardLijst()
    - ✅ Version bump to 0.16.33
    - ✅ Changelog updated

    ## Testing
    - ✅ All 5 test scenarios passed on staging
    - ✅ Edge cases verified (delete, multiple actions, quick add)
    - ✅ No console errors
    - ✅ Cross-browser compatible

    ## Deployment
    Tested on: dev.tickedify.com
    Ready for: tickedify.com (production)

    🤖 Generated with [Claude Code](https://claude.com/claude-code)
    ```
  - **Wait**: For explicit approval "JA, DEPLOY NAAR PRODUCTIE"
  - **Merge**: Only after approval received

---

## Dependencies

**Sequential Flow** (Single file - app.js):
1. T001-T003: Setup → T004: Add flag
2. T004: Add flag → T005-T007: Set flag in actions
3. T005-T007: Set flag → T008-T009: Update trigger logic
4. T008-T009: Logic updated → T011-T012: Version bump
5. T011-T012: Documentation → T013: Local testing
6. T013: Local passed → T014: Staging deployment
7. T014: Staging passed → T015: Production PR

**Critical Path**: T001 → T004 → T005 → T006 → T007 → T008 → T014 → T015

**No Parallel Tasks**: All implementation in single file (app.js)

---

## Parallel Execution Example (Testing Only)

```bash
# T014: Testing scenarios kunnen parallel gedraaid worden via tickedify-testing agent:

Task(subagent_type: "tickedify-testing",
     description: "Test scenario 1 - New user",
     prompt: "Test new user login with empty inbox - verify NO popup shows")

Task(subagent_type: "tickedify-testing",
     description: "Test scenario 2 - Plan last task",
     prompt: "Add 1 inbox task, plan it, verify popup SHOWS")

Task(subagent_type: "tickedify-testing",
     description: "Test scenario 3 - Refresh",
     prompt: "After popup, refresh page, verify NO popup")

# Note: Deze kunnen parallel omdat ze verschillende browser sessions gebruiken
```

---

## Notes

### Implementation Details
- **Single file changes**: All code in `public/app.js` - no parallel execution possible
- **State management**: Boolean flag is simpler and more reliable than counter comparison
- **Backwards compatible**: Existing popup behavior intact for planning actions

### Testing Strategy
- **Local first**: Manual testing op localhost before staging
- **Staging validation**: Automated Playwright tests on dev.tickedify.com
- **Production safety**: Only deploy after explicit approval

### Rollback Plan
- **Backup**: `public/app.js.backup-v0.16.32` created in T002
- **Revert**: `git revert HEAD && git push origin main`
- **Quick rollback**: < 2 minutes to previous version

---

## Validation Checklist
*GATE: All must pass before T015 (Production PR)*

**Code Quality**:
- [x] All tasks specify exact file path (public/app.js)
- [x] No tasks modify same section in parallel
- [x] Implementation matches research.md strategy
- [x] Comments added for clarity

**Testing Coverage**:
- [ ] T013: Local tests passed
- [ ] T014: Staging tests passed (5 scenarios + 3 edge cases)
- [ ] No console errors in browser
- [ ] Performance < 50ms for popup trigger

**Deployment Safety**:
- [ ] Version bumped to v0.16.33
- [ ] Changelog updated
- [ ] Staging deployment successful
- [ ] User approval received for production

---

## Task Execution Status

**Phase Status**:
- [ ] Phase 3.1: Setup & Preparation (T001-T003)
- [ ] Phase 3.2: Implementation (T004-T010)
- [ ] Phase 3.3: Version & Documentation (T011-T012)
- [ ] Phase 3.4: Local Testing (T013)
- [ ] Phase 3.5: Deployment & Testing (T014-T015)

**Ready for execution** - Start with T001 ✅
