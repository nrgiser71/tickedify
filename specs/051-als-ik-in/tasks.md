# Tasks: Context Management Titel Bug Fix

**Feature**: 051-als-ik-in
**Input**: Design documents from `/specs/051-als-ik-in/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Vanilla JavaScript (ES6+), no framework
   → Structure: Web app, frontend-only fix in public/app.js
   → Scope: Single file, ~5-10 lines of code
2. Load optional design documents:
   → research.md: Option A selected - Fix restoreNormalContainer() title logic
   → data-model.md: No data changes (UI state only)
   → quickstart.md: 6 test scenarios defined
   → contracts/: N/A (geen API changes)
3. Generate tasks by category:
   → Setup: N/A (bestaand project, geen dependencies)
   → Tests: Manual testing via quickstart.md scenarios
   → Core: Single function modification in public/app.js
   → Integration: N/A (geen database, API, of backend changes)
   → Polish: Version bump, changelog, deployment verification
4. Apply task rules:
   → Single file = sequential execution (no [P] markers)
   → Deployment before testing (staging first principe)
5. Number tasks sequentially (T001, T002...)
6. Constitution compliance: Beta freeze, staging-first, version bump
7. Validation: All quickstart scenarios must pass
8. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **No [P] markers**: Alle tasks zijn sequential (single file wijziging)
- Include exact file paths and line numbers where applicable

## Path Conventions
- **Web app structure**: `public/app.js` (frontend), `server.js` (backend - not touched)
- **Testing**: Manual testing op dev.tickedify.com via quickstart.md
- **Deployment**: Staging branch → dev.tickedify.com

---

## Phase 3.1: Code Analysis
**Purpose**: Locate exact code sections that need modification

- [x] **T001** - Locate `restoreNormalContainer()` function in `public/app.js`
  - **File**: `public/app.js`
  - **Expected location**: Around line 7155
  - **Action**: Read function and identify title update logic location
  - **Output**: Confirm line numbers for modification

- [x] **T002** - Analyze current title update flow
  - **File**: `public/app.js`
  - **Functions to review**:
    - `showContextenBeheer()` (line ~7121) - sets title to "Contexten Beheer"
    - `navigeerNaarLijst()` (line ~2097) - has titleAlreadySet flag
    - `restoreNormalContainer()` (line ~7155) - needs fix
  - **Action**: Verify research.md root cause analysis matches current code
  - **Output**: Confirm fix location and approach

---

## Phase 3.2: Implementation
**Purpose**: Apply the fix identified in research.md (Option A)

- [x] **T003** - Fix title update logic in `restoreNormalContainer()`
  - **File**: `public/app.js`
  - **Function**: `restoreNormalContainer(targetLijst = null)`
  - **Location**: Around line 7155-7263
  - **Change**: Move title update logic OUTSIDE the `if (uitgesteldContainer)` block
  - **Implementation**:
    ```javascript
    restoreNormalContainer(targetLijst = null) {
        // ... existing sidebar visibility code ...

        // First check if we're coming from uitgesteld consolidated view
        const uitgesteldContainer = document.querySelector('.uitgesteld-accordion');
        if (uitgesteldContainer) {
            // Clean up scroll indicators
            const scrollIndicators = document.querySelectorAll('.scroll-indicator-fixed');
            scrollIndicators.forEach(indicator => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            });

            // Remove the uitgesteld accordion container completely
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
                contentArea.innerHTML = '';

                // >>> MOVE THIS TITLE UPDATE CODE OUTSIDE THE IF BLOCK <<<
            }
        }

        // ALWAYS update title when restoring (NEW LOCATION)
        const titles = {
            'inbox': 'Inbox',
            'acties': 'Actions',
            'projecten': 'Projects',
            'opvolgen': 'Follow-up',
            'afgewerkte-taken': 'Completed',
            'dagelijkse-planning': 'Daily Planning',
            'contextenbeheer': 'Context Management',
            'uitgesteld-wekelijks': 'Weekly',
            'uitgesteld-maandelijks': 'Monthly',
            'uitgesteld-3maandelijks': 'Quarterly',
            'uitgesteld-6maandelijks': 'Semi-annually',
            'uitgesteld-jaarlijks': 'Yearly'
        };

        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[targetLijst || this.huidigeLijst] || 'Inbox';
        }

        // ... rest of function ...
    }
    ```
  - **Rationale**: Dit zorgt dat titel ALTIJD wordt geupdatet bij restore, niet alleen bij uitgesteld cleanup
  - **Verification**: Code compileert zonder errors

---

## Phase 3.3: Version & Changelog
**Purpose**: Constitution compliance - version bump + changelog update verplicht

- [x] **T004** - Bump version number in package.json
  - **File**: `package.json`
  - **Action**: Increment patch version (bijv. 0.21.25 → 0.21.26)
  - **Format**: Semantic versioning (MAJOR.MINOR.PATCH)
  - **Commit**: Include version bump in same commit as fix

- [x] **T005** - Update changelog with bug fix
  - **File**: `public/changelog.html`
  - **Version**: Same as package.json (bijv. v0.21.26)
  - **Category**: 🔧 FIX
  - **Badge**: `badge-fix`
  - **Description**: "Context Management titel blijft niet meer persistent bij navigatie naar andere secties"
  - **Format**:
    ```html
    <div class="changelog-entry">
        <div class="version-header">
            <span class="version-number">v0.21.26</span>
            <span class="badge badge-fix">Fix</span>
            <span class="release-date">2025-11-03</span>
        </div>
        <div class="changes">
            <div class="change-item">
                <span class="change-icon">🔧</span>
                <span class="change-text">Context Management titel blijft niet meer persistent bij navigatie naar andere secties</span>
            </div>
        </div>
    </div>
    ```
  - **Previous version**: Update badge from "badge-latest" to "badge-fix"
  - **New version**: Set badge as "badge-latest"

---

## Phase 3.4: Deployment
**Purpose**: Deploy to staging for testing (constitutional requirement)

- [x] **T006** - Commit changes to feature branch
  - **Branch**: `051-als-ik-in` (current branch)
  - **Commit message**:
    ```
    🔧 FIX: Context Management titel persistentie bug - v0.21.26

    - Fix restoreNormalContainer() om titel altijd te updaten
    - Titel blijft niet meer "Contexten Beheer" bij navigatie naar andere secties
    - Backwards compatible, geen regressie in andere menu items

    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    Co-Authored-By: Claude <noreply@anthropic.com>
    ```
  - **Files to commit**:
    - `public/app.js` (fix)
    - `package.json` (version bump)
    - `public/changelog.html` (changelog update)
  - **Git commands**:
    ```bash
    git add public/app.js package.json public/changelog.html
    git commit -m "$(cat <<'EOF'
    🔧 FIX: Context Management titel persistentie bug - v0.21.26

    - Fix restoreNormalContainer() om titel altijd te updaten
    - Titel blijft niet meer "Contexten Beheer" bij navigatie naar andere secties
    - Backwards compatible, geen regressie in andere menu items

    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    Co-Authored-By: Claude <noreply@anthropic.com>
    EOF
    )"
    ```

- [x] **T007** - Merge to staging branch
  - **Action**: Merge feature branch naar staging
  - **Commands**:
    ```bash
    git checkout staging
    git merge 051-als-ik-in --no-edit
    ```
  - **Verify**: Merge succeeds zonder conflicts

- [x] **T008** - Push to staging and trigger deployment
  - **Branch**: `staging`
  - **Command**: `git push origin staging`
  - **Expected**: Vercel automatic deployment to dev.tickedify.com
  - **Timeline**: Deployment completes binnen 30-60 seconden

- [x] **T009** - Verify staging deployment (v0.21.26 deployed successfully)
  - **Method**: Poll version endpoint every 15 seconds
  - **Command**: `curl -s -L -k https://dev.tickedify.com/api/version`
  - **Expected output**: `{"version":"0.21.26"}` (new version)
  - **Timeout**: 2 minuten maximum
  - **Verification script**:
    ```bash
    EXPECTED_VERSION="0.21.26"
    for i in {1..8}; do
      VERSION=$(curl -s -L -k https://dev.tickedify.com/api/version | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
      if [ "$VERSION" = "$EXPECTED_VERSION" ]; then
        echo "✅ Deployment verified: v$VERSION"
        break
      else
        echo "⏳ Waiting for deployment... (attempt $i/8, current: v$VERSION)"
        sleep 15
      fi
    done
    ```
  - **Constitution compliance**: `curl -s -L -k` flags gebruikt (geen security prompts)

---

## Phase 3.5: Manual Testing
**Purpose**: Execute all test scenarios from quickstart.md

⚠️ **IMPORTANT**: Testing happens on **dev.tickedify.com** (staging), NOT production

**Login credentials** (from constitution):
- Email: jan@buskens.be
- Password: qyqhut-muDvop-fadki9
- URL: https://dev.tickedify.com/app

- [x] **T010** - Test Scenario 1: Context Management → Inbox
  - **Location**: dev.tickedify.com/app
  - **Steps**:
    1. Navigate to Context Management (title: "Contexten Beheer")
    2. Click on "Inbox" in sidebar
  - **Expected**: Titel toont "Inbox" (NOT "Contexten Beheer")
  - **Status**: ✅ PASS - User verified
  - **Reference**: quickstart.md - Primary Bug Test

- [x] **T011** - Test Scenario 2: Context Management → All Regular Lists
  - **Steps**:
    1. Navigate to Context Management
    2. Click on each list and verify title:
       - Inbox → "Inbox"
       - Actions → "Actions"
       - Projects → "Projects"
       - Follow-up → "Follow-up"
       - Completed → "Completed"
  - **Expected**: Alle titels correct
  - **Status**: ✅ PASS - User verified
  - **Reference**: quickstart.md - Test 1

- [x] **T012** - Test Scenario 3: Context Management → Special Sections
  - **Steps**:
    1. Navigate to Context Management
    2. Click on:
       - Daily Planning → "Daily Planning"
       - Postponed → "Postponed"
       - Search → "Search"
  - **Expected**: Alle titels correct
  - **Status**: ✅ PASS - User verified
  - **Reference**: quickstart.md - Test 2

- [x] **T013** - Test Scenario 4: Round-Trip Navigation
  - **Test A**: Inbox → Context Management → Inbox
    - Start: Inbox (title: "Inbox")
    - Navigate: Context Management (title: "Contexten Beheer")
    - Return: Inbox (title: "Inbox")
  - **Test B**: Daily Planning → Context Management → Daily Planning
    - Start: Daily Planning (title: "Daily Planning")
    - Navigate: Context Management (title: "Contexten Beheer")
    - Return: Daily Planning (title: "Daily Planning")
  - **Expected**: Titels blijven correct bij round-trip
  - **Status**: ✅ PASS - User verified
  - **Reference**: quickstart.md - Test 3

- [x] **T014** - Test Scenario 5: Browser Navigation
  - **Steps**:
    1. Navigate: Inbox → Context Management → Actions
    2. Browser back → Context Management (verify title: "Contexten Beheer")
    3. Browser back → Inbox (verify title: "Inbox")
    4. Browser forward → Context Management (verify title: "Contexten Beheer")
  - **Expected**: Titel correct bij browser back/forward
  - **Status**: ✅ PASS - User verified
  - **Reference**: quickstart.md - Test 4

- [x] **T015** - Test Scenario 6: Regression Test (Other Tools)
  - **Test**: Search → Inbox
    1. Click "Search" in sidebar (title: "Search")
    2. Click "Inbox" in sidebar (title: "Inbox")
  - **Expected**: Geen regressie, titels correct
  - **Status**: ✅ PASS - User verified
  - **Reference**: quickstart.md - Test 6

---

## Phase 3.6: Regression Verification
**Purpose**: Verify no breaking changes in other functionality

- [x] **T016** - Verify sidebar navigation works normally
  - **Test areas**:
    - Inbox navigation
    - Actions/Projects/Follow-up navigation
    - Daily Planning navigation
    - Postponed navigation
    - Search tool navigation
  - **Expected**: Alle navigatie flows werken zoals voorheen
  - **Status**: ✅ PASS - User verified

- [x] **T017** - Verify UI state consistency
  - **Check**:
    - Sidebar active state highlighting (correct item is "actief")
    - Task input container visibility (alleen Inbox toont input)
    - Page title matches active menu item
  - **Expected**: UI state consistent en correct
  - **Status**: ✅ PASS - User verified

- [x] **T018** - Check browser console for errors
  - **Action**: Open DevTools (F12) en check Console tab
  - **Expected**: Geen JavaScript errors tijdens navigatie
  - **If errors found**: Document error messages en report
  - **Status**: ✅ NO ERRORS - User verified

---

## Phase 3.7: Performance Verification
**Purpose**: Verify fix meets performance goals (<16ms title update)

- [x] **T019** - Visual update speed test
  - **Test**: Navigate from Context Management → Inbox
  - **Observe**: Title change visueel
  - **Expected**: Instant update, no flicker, no delay
  - **Performance goal**: <16ms (single frame)
  - **Status**: ✅ PASS - User verified (instant update)

- [x] **T020** - Browser DevTools performance check
  - **Method**: Observe performance in DevTools
  - **Expected**: Geen excessive reflows of repaints
  - **Status**: ✅ PASS - User verified

---

## Phase 3.8: Documentation & Cleanup
**Purpose**: Update documentation en cleanup

- [x] **T021** - Update ARCHITECTURE.md (if exists)
  - **File**: `ARCHITECTURE.md`
  - **Section**: UI Components / Navigation
  - **Update**: Document restoreNormalContainer() title management fix
  - **Optional**: Alleen als ARCHITECTURE.md bestaat

- [x] **T022** - Verify all test results documented
  - **Action**: Document test results in this tasks.md
  - **Format**: Mark each test scenario as ✅ PASS or ❌ FAIL
  - **Required**: All scenarios must PASS before proceeding
  - **Status**: ✅ COMPLETE - All tests PASSED and documented

---

## Dependencies

### Phase Dependencies
- **Phase 3.1 (Analysis)** → **Phase 3.2 (Implementation)**
  - T001, T002 must complete before T003
- **Phase 3.2 (Implementation)** → **Phase 3.3 (Version)**
  - T003 must complete before T004, T005
- **Phase 3.3 (Version)** → **Phase 3.4 (Deployment)**
  - T004, T005 must complete before T006
- **Phase 3.4 (Deployment)** → **Phase 3.5 (Testing)**
  - T009 (deployment verification) must complete before T010-T015
- **Phase 3.5 (Testing)** → **Phase 3.6 (Regression)**
  - T010-T015 must PASS before T016-T018
- **Phase 3.6 (Regression)** → **Phase 3.7 (Performance)**
  - T016-T018 must PASS before T019-T020
- **Phase 3.7 (Performance)** → **Phase 3.8 (Documentation)**
  - All testing PASS before T021-T022

### Task Dependencies
- T001 → T002 (analyze after locate)
- T002 → T003 (implement after analysis confirms)
- T003 → T004 (version bump after code change)
- T003 → T005 (changelog after code change)
- T004, T005 → T006 (commit all changes together)
- T006 → T007 (merge after commit)
- T007 → T008 (push after merge)
- T008 → T009 (verify after push)
- T009 → T010, T011, T012, T013, T014, T015 (test after deployment confirmed)

### Critical Path
`T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → ... → T022`

**Total tasks**: 22 (all sequential, no parallel execution)

---

## Validation Checklist
*GATE: Checked before marking implementation complete*

- [x] No contracts → No contract test tasks needed ✅
- [x] No entities → No model tasks needed ✅
- [x] No tests before implementation → Manual testing after deployment ✅
- [x] No parallel tasks → Single file modification ✅
- [x] Each task specifies exact file path ✅
- [x] No task modifies same file as another task ✅
- [x] All quickstart.md scenarios covered in tasks ✅
- [x] Constitution compliance verified:
  - [x] Beta freeze: Staging only, geen productie deployment
  - [x] Staging-first: Testing op dev.tickedify.com
  - [x] Version bump: T004 included
  - [x] Changelog: T005 included
  - [x] Deployment verification: T009 with curl commands
  - [x] Testing: T010-T015 cover all scenarios

---

## Success Criteria

### Implementation Complete When:
- [x] All 22 tasks marked as complete ✅
- [x] All test scenarios PASS (T010-T015) ✅
- [x] No regression detected (T016-T018) ✅
- [x] Performance goals met (T019-T020) ✅
- [x] No console errors (T018) ✅
- [x] Staging deployment verified (T009) ✅

**🎉 ALL SUCCESS CRITERIA MET - IMPLEMENTATION COMPLETE!**

### Ready for Production When:
⚠️ **BLOCKED by Beta Freeze** - Production deployment NOT allowed until freeze lift
- Staging testing complete and all tests pass
- User approval obtained
- "BÈTA FREEZE IS OPGEHEVEN" instruction received
- Then: Merge staging → main → production deployment

---

## Timeline Estimate
- **Phase 3.1 (Analysis)**: 5 minutes (T001-T002)
- **Phase 3.2 (Implementation)**: 10 minutes (T003)
- **Phase 3.3 (Version)**: 5 minutes (T004-T005)
- **Phase 3.4 (Deployment)**: 10 minutes (T006-T009)
- **Phase 3.5 (Testing)**: 15 minutes (T010-T015)
- **Phase 3.6 (Regression)**: 5 minutes (T016-T018)
- **Phase 3.7 (Performance)**: 3 minutes (T019-T020)
- **Phase 3.8 (Documentation)**: 2 minutes (T021-T022)

**Total Estimated Time**: ~55 minutes

---

## Notes
- No [P] markers: Single file modification vereist sequential execution
- Constitutional compliance: Beta freeze, staging-first, version bump all respected
- Testing strategy: Manual testing op staging (dev.tickedify.com) via quickstart scenarios
- No Playwright automation required (manual testing sufficient voor deze fix)
- Regression testing critical: Verify other menu items not broken
- Performance goal: <16ms title update (instant visual change)

## Task Execution Commands

### Implementation Phase (T003)
```bash
# Open app.js at the restoreNormalContainer function
# Apply the fix as described in T003
# Verify no syntax errors
```

### Version & Changelog Phase (T004-T005)
```bash
# Update package.json version
# Update changelog.html with new entry
```

### Deployment Phase (T006-T009)
```bash
# Commit changes
git add public/app.js package.json public/changelog.html
git commit -m "🔧 FIX: Context Management titel persistentie bug - v0.21.26 ..."

# Merge to staging
git checkout staging
git merge 051-als-ik-in --no-edit
git push origin staging

# Verify deployment
curl -s -L -k https://dev.tickedify.com/api/version
```

### Testing Phase (T010-T015)
```bash
# Manual testing on https://dev.tickedify.com/app
# Follow quickstart.md scenarios
# Document results in this tasks.md
```

---

**Generated**: 2025-11-03
**Ready for execution**: ✅ YES
**Constitutional compliance**: ✅ VERIFIED
**Estimated completion**: ~55 minutes
