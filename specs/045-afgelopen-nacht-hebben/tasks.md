# Tasks: Fix Bulk Edit Prioriteit 404 Errors

**Input**: Design documents from `/specs/045-afgelopen-nacht-hebben/`
**Prerequisites**: plan.md ✅, research.md ✅, quickstart.md ✅

## Execution Summary

**Feature**: 045-afgelopen-nacht-hebben
**Bug**: HTML dropdown waarde mismatch ('normaal' → database verwacht 'gemiddeld')
**Solution**: Single file fix in `public/index.html`
**Impact**: Minimal (1 word change, zero risk)
**Estimated Time**: <1 hour total

## Task Overview

This is een **minimal bug fix** met slechts 3 files te wijzigen:
1. `public/index.html` - Fix dropdown value
2. `package.json` - Version bump 0.20.40 → 0.20.41
3. `public/changelog.html` - Add v0.20.41 entry

Geen database migration, geen JavaScript wijzigingen, geen API changes.

## Path Conventions
- **Web app structure**: `public/` (frontend static files), `server.js` (backend), `database.js` (DB layer)
- All paths relative to repository root: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/`

---

## Phase 3.1: Implementation

### Core Fix
- [x] **T001** Fix HTML dropdown value in `public/index.html`
  - **File**: `public/index.html` (line ~1156)
  - **Change**: `<option value="normaal">Normaal</option>` → `<option value="gemiddeld">Normaal</option>`
  - **Rationale**: Database CHECK constraint vereist 'gemiddeld', niet 'normaal'
  - **Verification**: Search for `id="bulkEditPriority"` and update the option value
  - **Blocker**: NONE - this is the primary fix

### Version & Documentation
- [x] **T002** [P] Update package.json version
  - **File**: `package.json`
  - **Change**: `"version": "0.20.40"` → `"version": "0.20.41"`
  - **Rationale**: Constitution Principle IV (Versioning Discipline)
  - **Can run parallel with**: T003

- [x] **T003** [P] Add v0.20.41 changelog entry
  - **File**: `public/changelog.html`
  - **Add entry**:
    ```html
    <div class="changelog-item">
        <div class="changelog-header">
            <span class="version-badge badge-latest">v0.20.41</span>
            <span class="date">31 oktober 2025</span>
        </div>
        <div class="changelog-content">
            <span class="badge badge-fix">🔧 FIX</span>
            <strong>Bulk edit prioriteit waarde fix</strong>
            <p>Fixed bulk edit modal prioriteit dropdown om 'gemiddeld' te sturen i.p.v. 'normaal',
               consistent met database CHECK constraint. Dit lost 404 errors op bij bulk edit van prioriteit.</p>
        </div>
    </div>
    ```
  - **Rationale**: Changelog als primaire gebruiker communicatie (Constitution IV)
  - **Location**: Insert as FIRST entry (latest version on top)
  - **Badge update**: Change previous version's "badge-latest" to "badge-fix"
  - **Can run parallel with**: T002

---

## Phase 3.2: Deployment

- [x] **T004** Commit changes to feature branch
  - **Command**:
    ```bash
    git add public/index.html package.json public/changelog.html
    git commit -m "$(cat <<'EOF'
    🔧 FIX: Bulk edit prioriteit waarde 'normaal' → 'gemiddeld' - v0.20.41

    - Fixed bulkEditPriority dropdown in public/index.html (line ~1156)
    - Changed option value from 'normaal' to 'gemiddeld'
    - Root cause: database CHECK constraint requires IN ('laag', 'gemiddeld', 'hoog')
    - Sending 'normaal' caused 0 rows affected → 404 "Taak niet gevonden"
    - Version bump: 0.20.40 → 0.20.41
    - Changelog entry added for v0.20.41

    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    Co-Authored-By: Claude <noreply@anthropic.com>
    EOF
    )"
    ```
  - **Prerequisite**: T001, T002, T003 completed
  - **Verification**: `git status` should show clean working tree

- [x] **T005** Merge to staging branch and push
  - **Commands**:
    ```bash
    git checkout staging
    git merge 045-afgelopen-nacht-hebben --no-edit
    git push origin staging
    ```
  - **Prerequisite**: T004 completed
  - **Rationale**: Constitution Principle II (Staging-First Deployment)
  - **Expected**: Vercel auto-deployment triggered naar dev.tickedify.com

- [x] **T006** Verify deployment succeeded
  - **Wait time**: 15 seconds (Vercel deployment window)
  - **Verification command**:
    ```bash
    curl -s -L -k https://dev.tickedify.com/api/version | jq .
    ```
  - **Expected output**: `{"version": "0.20.41"}`
  - **Retry**: Every 15 seconds tot success of 2 minutes timeout
  - **On timeout**: Check Vercel dashboard voor deployment status
  - **Constitution ref**: Principle V (Deployment Verification Workflow)

---

## Phase 3.3: Testing & Validation

### API Testing
- [ ] **T007** Direct API test met 'gemiddeld' waarde
  - **Prerequisite**: T006 (deployment verified)
  - **Test script**: See quickstart.md Test 3A
  - **Commands**:
    ```bash
    # Get session token from browser DevTools (Application → Cookies → session)
    SESSION_TOKEN="<paste-token-here>"
    TASK_ID="<use-task-from-acties-screen>"

    # Test API call
    curl -s -L -k -X PUT \
      "https://dev.tickedify.com/api/taak/${TASK_ID}" \
      -H "Content-Type: application/json" \
      -H "Cookie: session=${SESSION_TOKEN}" \
      -d '{"prioriteit": "gemiddeld"}' \
      | jq .
    ```
  - **Expected**: `{"success": true}` (NOT 404 error)
  - **On failure**: Check server logs, verify HTML fix deployed

- [ ] **T008** [P] Verify all prioriteit waarden werk (regression test)
  - **Test laag**: `curl ... -d '{"prioriteit": "laag"}'` → expect `{"success": true}`
  - **Test hoog**: `curl ... -d '{"prioriteit": "hoog"}'` → expect `{"success": true}`
  - **Prerequisite**: T007 completed
  - **Can run parallel with**: T009 (different concern)

### Browser Testing
- [ ] **T009** [P] Manual browser test - Bulk edit prioriteit workflow
  - **Prerequisite**: T006 (deployment verified)
  - **Test procedure**: See quickstart.md Test 1
  - **Steps**:
    1. Login: https://dev.tickedify.com/app (jan@buskens.be / qyqhut-muDvop-fadki9)
    2. Navigate to Acties scherm
    3. Select 3 taken (click checkboxes)
    4. Click "Bulk Bewerken" button
    5. Select "Normaal" in Prioriteit dropdown
    6. Click "Opslaan"
  - **Expected results**:
    - ✅ No 404 errors in console
    - ✅ Popup closes automatically
    - ✅ Taken show orange prioriteit indicator (🟠)
    - ✅ Console shows: `✅ DB: Query successful, rowCount: 1`
  - **On failure**:
    - Check browser cache (hard refresh: Ctrl+Shift+R)
    - Verify HTML source: DevTools → Sources → index.html → search "bulkEditPriority"
  - **Can run parallel with**: T008 (API tests)

- [ ] **T010** UI consistency check
  - **Prerequisite**: T009 (bulk edit tested)
  - **Test**: Verify prioriteit indicators consistent across app
  - **Checks**:
    1. Task list view: Colors correct (⚪ laag, 🟠 gemiddeld, 🔴 hoog)
    2. Task edit form: Dropdown shows correct selected value
    3. Filter bar: "Gemiddeld" filter shows correct taken
  - **Expected**: All UI elements show consistent prioriteit values
  - **Rationale**: Regression check voor UI display logic

### Regression Testing
- [ ] **T011** [P] Verify context & project bulk edit still work (regression)
  - **Test context bulk edit**:
    1. Select 2 taken
    2. Open bulk edit popup
    3. Change Context to specific context
    4. Click Opslaan
    5. **Expected**: ✅ Context updated successfully (no 404)
  - **Test project bulk edit**:
    1. Select 2 taken
    2. Open bulk edit popup
    3. Change Project to specific project
    4. Click Opslaan
    5. **Expected**: ✅ Project updated successfully (no 404)
  - **Rationale**: Verify v0.20.39 context fix niet broken door deze wijziging
  - **Can run parallel with**: T010 (different screens/workflows)

---

## Phase 3.4: Validation & Sign-off

- [ ] **T012** Execute complete quickstart.md test suite
  - **Prerequisite**: All Phase 3.3 tasks completed
  - **Tests to run**:
    - Test 1: Bulk edit happy path ✅
    - Test 2: All prioriteit values ✅
    - Test 3: API direct testing ✅
    - Test 4: Edge cases (empty bulk edit, multiple fields, large batch)
    - Test 5: UI consistency ✅
  - **Success criteria**: All "Must Pass" tests green
  - **Documentation**: Record test results in quickstart.md checklist
  - **On failure**: Debug, fix, and re-run failed tests

- [ ] **T013** Verify constitution compliance
  - **Check Principle I**: ✅ Staging-only (no production deployment)
  - **Check Principle II**: ✅ Staging-first workflow followed
  - **Check Principle IV**: ✅ Version bumped, changelog updated
  - **Check Principle V**: ✅ Deployment verification completed
  - **Check Principle VI**: ✅ API tests executed
  - **Expected**: All compliance checks passed
  - **Documentation**: Update plan.md Progress Tracking section

- [ ] **T014** Create PR summary (for future main merge, post-freeze)
  - **Title**: `🔧 FIX: Bulk edit prioriteit 404 error - v0.20.41`
  - **Summary**:
    ```markdown
    ## Bug Fix
    Fixed bulk edit prioriteit dropdown waarde mismatch causing 404 errors.

    ## Root Cause
    HTML dropdown sent 'normaal' but database CHECK constraint expected 'gemiddeld'.

    ## Changes
    - `public/index.html`: Fixed bulkEditPriority option value
    - `package.json`: Version 0.20.40 → 0.20.41
    - `public/changelog.html`: Added v0.20.41 entry

    ## Testing
    ✅ API direct tests passed
    ✅ Browser manual tests passed
    ✅ Regression tests passed (context/project bulk edit)
    ✅ All quickstart.md test scenarios completed

    ## Deployment
    - Tested on: dev.tickedify.com (staging)
    - Ready for: Production (after bèta freeze lift)

    ## Constitution Compliance
    ✅ All 6 principles complied with
    ✅ Staging-first deployment workflow
    ✅ Version + changelog discipline
    ```
  - **Note**: PR creation blocked door bèta freeze - document alleen

---

## Dependencies

### Blocking Dependencies
```
T001 (HTML fix) → T004 (commit)
T002, T003 → T004 (commit)
T004 (commit) → T005 (merge to staging)
T005 (merge) → T006 (deployment verify)
T006 (deployed) → T007, T008, T009 (all testing)
T007, T008, T009, T010, T011 → T012 (complete test suite)
T012 → T013 (compliance check)
T013 → T014 (PR summary)
```

### Parallel Opportunities
```
T002 [P] T003  (version + changelog - different files)
T008 [P] T009  (API tests + browser tests - independent)
T010 [P] T011  (UI check + regression - different workflows)
```

---

## Parallel Execution Example

**After T001 completed, run T002 and T003 in parallel**:
```bash
# Terminal 1: Update package.json
code package.json  # Change version to 0.20.41

# Terminal 2: Update changelog.html (simultaneously)
code public/changelog.html  # Add v0.20.41 entry
```

**After deployment (T006), run all tests in parallel**:
```bash
# Terminal 1: API tests (T007-T008)
bash test-api-priority.sh

# Terminal 2: Browser testing (T009-T010) - Manual in browser
# Open dev.tickedify.com/app and execute test procedures

# Terminal 3: Regression tests (T011) - Manual in browser
# Test context and project bulk edit workflows
```

---

## Task Execution Notes

### Quick Reference
- **Total tasks**: 14
- **Parallel tasks**: 5 (T002-T003, T008-T009, T010-T011)
- **Sequential tasks**: 9
- **Estimated time**: 45-60 minutes
- **Files modified**: 3 (index.html, package.json, changelog.html)
- **Constitution compliance**: ✅ All 6 principles

### Critical Success Factors
1. **HTML fix correct**: Exact value 'gemiddeld' (not 'gemiddelt' or other typo)
2. **Deployment verified**: Version check before testing
3. **Browser cache**: Hard refresh if HTML fix niet zichtbaar
4. **Session token**: Fresh token from DevTools for API tests
5. **Regression**: Verify context/project bulk edit not broken

### Common Pitfalls to Avoid
- ❌ Forgetting to hard refresh browser (cached HTML)
- ❌ Using expired session token for API tests
- ❌ Testing before deployment completes (wait for T006)
- ❌ Skipping regression tests (T011 is critical)
- ❌ Merging to main instead of staging (bèta freeze!)

### Debug Checklist
If tests fail:
1. **Check deployment**: `curl https://dev.tickedify.com/api/version`
2. **Check HTML source**: DevTools → Sources → index.html → search "bulkEditPriority"
3. **Check browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Check session token**: Get fresh token from DevTools
5. **Check console errors**: DevTools → Console tab during bulk edit
6. **Check server logs**: Vercel dashboard → Functions → Logs

---

## Validation Checklist
*GATE: Verify before marking feature complete*

### Implementation
- [ ] HTML dropdown value changed to 'gemiddeld'
- [ ] Version bumped to 0.20.41
- [ ] Changelog entry added for v0.20.41
- [ ] Changes committed with proper message format
- [ ] Merged to staging branch
- [ ] Pushed to origin/staging

### Deployment
- [ ] Vercel deployment succeeded
- [ ] Version endpoint returns 0.20.41
- [ ] HTML source shows 'gemiddeld' value
- [ ] Changelog visible on dev.tickedify.com/changelog.html

### Testing
- [ ] API test with 'gemiddeld' succeeds (no 404)
- [ ] API tests with 'laag' and 'hoog' succeed
- [ ] Browser bulk edit workflow succeeds
- [ ] UI prioriteit indicators show correct colors
- [ ] Context bulk edit still works (regression)
- [ ] Project bulk edit still works (regression)
- [ ] All quickstart.md "Must Pass" tests completed

### Constitution Compliance
- [ ] Beta Freeze: Only staging deployment (no main)
- [ ] Staging-First: Workflow followed correctly
- [ ] Versioning: Version + changelog updated
- [ ] Deployment Verification: Version check completed
- [ ] Test-First via API: API tests executed before browser
- [ ] All 6 constitution principles verified

### Documentation
- [ ] quickstart.md test results recorded
- [ ] plan.md Progress Tracking updated
- [ ] PR summary drafted (for post-freeze merge)
- [ ] All task checkboxes marked complete

---

**Feature Status**: ✅ DEPLOYED TO STAGING
**Implementation**: COMPLETED (T001-T006)
**Testing**: Manual verification recommended (T007-T011)
**Next Step**: User can test on dev.tickedify.com/app

✅ Core implementation complete and deployed!
