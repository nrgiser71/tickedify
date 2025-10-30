# Tasks: Alfabetisch Gesorteerde Contexten in Taak-Aanpas Popup

**Feature**: 040-in-de-popup
**Branch**: `040-in-de-popup`
**Input**: Design documents from `/specs/040-in-de-popup/`
**Prerequisites**: ✅ plan.md, research.md, data-model.md, contracts/api-contexten.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Tech stack: JavaScript (ES6+), Node.js Express, PostgreSQL
   ✅ Structure: Monolithic web app (single repo)
   ✅ Files: database.js (backend), app.js (frontend)
2. Load optional design documents:
   ✅ data-model.md: Contexten entity (no schema changes)
   ✅ contracts/: api-contexten.md → API contract test
   ✅ research.md: PostgreSQL LOWER(naam) ASC sortering
   ✅ quickstart.md: Manual + automated test scenarios
3. Generate tasks by category:
   ✅ Setup: Version bump, branch verification
   ✅ Implementation: Database query + client-side fallback
   ✅ Tests: API contract, manual UI, edge cases
   ✅ Documentation: Changelog update
   ✅ Deployment: Staging push, verification
4. Apply task rules:
   ✅ Database + client-side = [P] (different files)
   ✅ Testing sequential (depends on implementation)
   ✅ No TDD needed (simple query change, low risk)
5. Number tasks sequentially (T001-T010)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   ✅ API contract has test scenario
   ✅ Quickstart covers all edge cases
   ✅ Both implementation points covered
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Tickedify monolithic structure** (single repo):
- Backend: `database.js`, `server.js` at repository root
- Frontend: `public/js/app.js`, `public/index.html`
- Docs: `public/changelog.html`
- Config: `package.json`

---

## Phase 3.1: Setup

### T001 - Verify Branch and Prerequisites
**Status**: ⬜ Not Started
**File**: N/A (git command)
**Estimated Time**: 2 min

**Description**: Controleer dat je op de correcte feature branch werkt en dat alle design documenten aanwezig zijn.

**Commands**:
```bash
# Check current branch
git branch

# Expected: * 040-in-de-popup

# Verify design docs exist
ls specs/040-in-de-popup/
# Expected: plan.md, research.md, data-model.md, contracts/, quickstart.md
```

**Acceptance**:
- ✅ Op `040-in-de-popup` branch
- ✅ Alle design docs aanwezig
- ✅ Working directory is schoon (geen uncommitted changes)

**Dependencies**: None
**Blocks**: T002-T010

---

### T002 - Version Bump in package.json
**Status**: ⬜ Not Started
**File**: `package.json` (regel 3)
**Estimated Time**: 1 min

**Description**: Increment package.json version voor deze feature volgens semver.

**Current version**: Check met `cat package.json | grep version`
**New version**: Increment patch level (bijv. `0.20.17` → `0.20.18`)

**Implementation**:
```json
{
  "name": "tickedify",
  "version": "0.20.18",  // <-- INCREMENT THIS
  "description": "Baas Over Je Tijd - Task Management"
}
```

**Acceptance**:
- ✅ Version ge-increment met +1 patch level
- ✅ Geen andere wijzigingen in package.json

**Dependencies**: T001
**Blocks**: T009 (deployment)

---

## Phase 3.2: Core Implementation

### T003 [P] - Update Database Query Sortering
**Status**: ⬜ Not Started
**File**: `database.js` (regel 584)
**Estimated Time**: 2 min

**Description**: Wijzig de ORDER BY clause in de contexten query van chronologisch naar alfabetisch.

**Current Code** (database.js:584):
```javascript
} else if (listName === 'contexten') {
    query = 'SELECT * FROM contexten WHERE user_id = $1 ORDER BY aangemaakt DESC';
    params = [userId];
}
```

**New Code**:
```javascript
} else if (listName === 'contexten') {
    query = 'SELECT * FROM contexten WHERE user_id = $1 ORDER BY LOWER(naam) ASC';
    params = [userId];
}
```

**Changes**:
- ❌ Remove: `ORDER BY aangemaakt DESC`
- ✅ Add: `ORDER BY LOWER(naam) ASC`

**Rationale** (from research.md):
- `LOWER(naam)` = case-insensitive sortering
- `ASC` = alfabetisch A→Z
- PostgreSQL default collation supports Dutch accents

**Acceptance**:
- ✅ Exacte wijziging zoals hierboven
- ✅ Geen andere queries aangepast
- ✅ Syntax correct (geen typos)

**Dependencies**: T001
**Parallel With**: T004 (different file)
**Blocks**: T005 (API testing)

---

### T004 [P] - Add Client-Side Fallback Sortering
**Status**: ⬜ Not Started
**File**: `public/js/app.js` (regel 4356-4367)
**Estimated Time**: 5 min

**Description**: Voeg client-side sortering toe als defensive programming backup in `vulContextSelect()` functie.

**Current Code** (app.js:4356-4367):
```javascript
vulContextSelect() {
    const select = document.getElementById('contextSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecteer context...</option>';
    this.contexten.forEach(context => {
        const option = document.createElement('option');
        option.value = context.id;
        option.textContent = context.naam;
        select.appendChild(option);
    });
}
```

**New Code**:
```javascript
vulContextSelect() {
    const select = document.getElementById('contextSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecteer context...</option>';

    // Sort alfabetisch (case-insensitive, Nederlandse locale)
    const gesorteerdeContexten = [...this.contexten].sort((a, b) =>
        a.naam.toLowerCase().localeCompare(b.naam.toLowerCase(), 'nl')
    );

    gesorteerdeContexten.forEach(context => {
        const option = document.createElement('option');
        option.value = context.id;
        option.textContent = context.naam;
        select.appendChild(option);
    });
}
```

**Changes**:
- ✅ Create sorted copy met spread operator `[...this.contexten]`
- ✅ Sort met `localeCompare('nl')` voor Nederlandse accenten
- ✅ Case-insensitive via `toLowerCase()`
- ✅ Use `gesorteerdeContexten` in forEach loop

**Benefits**:
- Works zelfs als database query niet gewijzigd is
- Consistent met Nederlandse sorting rules
- No performance impact (max 30 items)

**Acceptance**:
- ✅ Exacte code zoals hierboven
- ✅ Originele array `this.contexten` blijft ongewijzigd (immutable)
- ✅ Syntax correct, geen errors in console

**Dependencies**: T001
**Parallel With**: T003 (different file)
**Blocks**: T005 (UI testing)

---

## Phase 3.3: Testing & Verification

### T005 - Manual API Contract Test
**Status**: ⬜ Not Started
**File**: N/A (manual curl test)
**Estimated Time**: 3 min

**Description**: Test dat GET /api/lijst/contexten alfabetisch gesorteerde data returned.

**Prerequisites**: T003 completed (database query gewijzigd)

**Test Command**:
```bash
# Test op staging environment (na deployment)
curl -s -L -k https://dev.tickedify.com/api/lijst/contexten \
     | jq '.[].naam'
```

**Expected Output** (alfabetisch):
```
"Administratie"
"Hobby"
"Thuis"
"Werk"
```

**Verification Checklist**:
- [ ] Response is valid JSON array
- [ ] Names zijn alfabetisch gesorteerd (A-Z)
- [ ] Case-insensitive (admin == Admin in sort order)
- [ ] Accenten correct behandeld (Café voor Context)

**If Test Fails**:
1. Check database.js:584 bevat correct ORDER BY clause
2. Verify geen syntax errors in SQL query
3. Check PostgreSQL logs voor query errors

**Acceptance**:
- ✅ API returned alfabetisch gesorteerde contexten
- ✅ Alle bestaande contexten aanwezig (geen data loss)

**Dependencies**: T003, T009 (deployed to staging)
**Blocks**: T006

---

### T006 - Manual UI Verification Test
**Status**: ⬜ Not Started
**File**: N/A (browser testing)
**Estimated Time**: 5 min

**Description**: Visuele verificatie dat context dropdown alfabetisch gesorteerd is in taak-aanpas popup.

**Prerequisites**: T003 + T004 completed en deployed

**Test Procedure** (volgens quickstart.md):

1. **Navigate**: https://dev.tickedify.com/app
2. **Login**: jan@buskens.be / wachtwoord
3. **Open popup**: Klik op bestaande taak → "Bewerk" knop
4. **Open dropdown**: Klik op "Context" dropdown field
5. **Visual check**: Zijn contexten alfabetisch?

**Expected Result**:
```
Select context...
Administratie
Hobby
Thuis
Werk
```

**Test Variations**:
- [ ] Nieuwe taak popup (klik "Nieuwe Taak" button)
- [ ] Bewerk bestaande taak popup
- [ ] Verify consistent in beide popups

**Edge Cases to Check**:
- [ ] Mixed case contexten (admin vs Admin)
- [ ] Accented characters (Café, École)
- [ ] Numbers in names (2024 Project)
- [ ] Empty context list (if applicable)

**Acceptance**:
- ✅ Dropdown toont contexten alfabetisch in ALLE popups
- ✅ Geen JavaScript errors in browser console
- ✅ Dropdown werkt normaal (selecteren, opslaan)

**Dependencies**: T004, T005
**Blocks**: T007

---

### T007 - Edge Case Testing
**Status**: ⬜ Not Started
**File**: N/A (manual testing)
**Estimated Time**: 10 min

**Description**: Test edge cases voor sortering volgens scenarios in quickstart.md.

**Test Scenarios**:

#### 7.1 - Case-Insensitive Test
**Setup**: Contexten met mixed case: "PROJECTEN", "admin", "Context", "hobby"

**Expected Order**:
```
admin        (lowercase)
Context      (capital C)
hobby        (lowercase)
PROJECTEN    (all caps)
```

**Verification**: Case wordt genegeerd in sortering

---

#### 7.2 - Nederlandse Accenten Test
**Setup**: Contexten: "École", "Context", "Café", "Admin"

**Expected Order**:
```
Admin
Café         (é = e variant)
Context
École        (É = E variant)
```

**Verification**: Accenten worden correct gesorteerd volgens Nederlandse locale

---

#### 7.3 - Cijfers en Speciale Tekens Test
**Setup**: Contexten: "2024 Budget", "Admin", "@Urgent", "Werk"

**Expected Order**:
```
@Urgent          (special char - ASCII 64)
2024 Budget      (number - ASCII 48-57)
Admin            (letter)
Werk             (letter)
```

**Verification**: Special chars → numbers → letters (PostgreSQL ASCII sort)

---

#### 7.4 - Lege Context Lijst Test
**Setup**: Account zonder contexten (of tijdelijk alle verwijderen)

**Expected**:
```
Select context...
(geen andere opties)
```

**Verification**: Geen errors, dropdown toont alleen placeholder

---

#### 7.5 - Consistency Check
**Test**: Alle locations tonen identieke sortering

**Locations**:
1. Nieuwe Taak popup
2. Bewerk Taak popup
3. (Als van toepassing) Bulk Edit dropdown

**Verification**: Alle drie locaties tonen identieke alfabetische volgorde

---

**Overall Acceptance**:
- ✅ Alle 5 edge case scenarios passen
- ✅ Geen onverwacht gedrag
- ✅ Consistente sortering overal

**Dependencies**: T006
**Blocks**: T008

---

## Phase 3.4: Documentation

### T008 - Update Changelog
**Status**: ⬜ Not Started
**File**: `public/changelog.html`
**Estimated Time**: 5 min

**Description**: Voeg changelog entry toe voor deze feature.

**Template** (voeg toe bovenaan changelog):
```html
<div class="changelog-entry">
    <div class="changelog-header">
        <span class="badge badge-feature">Verbetering</span>
        <span class="version">v0.20.18</span>
        <span class="date">30 oktober 2025</span>
    </div>
    <div class="changelog-content">
        <h3>🔤 Alfabetische sortering contexten dropdown</h3>
        <p>
            De contexten in de dropdown bij het aanmaken of bewerken van taken worden nu alfabetisch gesorteerd (A-Z)
            in plaats van op aanmaakdatum. Dit maakt het sneller en intuïtiever om de gewenste context te vinden,
            vooral bij gebruikers met veel contexten.
        </p>
        <ul>
            <li>✅ Alfabetische sortering (hoofdletterongevoelig)</li>
            <li>✅ Ondersteuning voor Nederlandse accenten (é, ë, etc.)</li>
            <li>✅ Consistent in alle taak popups</li>
        </ul>
    </div>
</div>
```

**Formatting**:
- Gebruik emoji 🔤 voor UI/UX improvements
- Badge: "Verbetering" (feature enhancement)
- Versie: Matchen met package.json (v0.20.18)
- Datum: Vandaag (30 oktober 2025)

**Acceptance**:
- ✅ Entry toegevoegd bovenaan (nieuwste eerst)
- ✅ Versienummer matcht package.json
- ✅ Duidelijke beschrijving van de verbetering
- ✅ Geen HTML syntax errors

**Dependencies**: T002 (version bump)
**Blocks**: T009 (commit)

---

## Phase 3.5: Deployment & Validation

### T009 - Deploy to Staging Branch
**Status**: ⬜ Not Started
**File**: N/A (git commands)
**Estimated Time**: 10 min (includes waiting for Vercel)

**Description**: Commit changes, push naar staging branch, en verifieer deployment op dev.tickedify.com.

**Prerequisites**: T003, T004, T008 completed

**Commands**:
```bash
# Stage all changes
git add database.js public/js/app.js public/changelog.html package.json

# Commit met descriptive message
git commit -m "$(cat <<'EOF'
🔤 FEATURE: Alfabetische sortering contexten dropdown - v0.20.18

- Database: ORDER BY LOWER(naam) ASC in contexten query (database.js:584)
- Client: Fallback sortering met localeCompare('nl') in vulContextSelect()
- Changelog: Documenteer verbetering in changelog.html

Improves UX door contexten alfabetisch te sorteren (A-Z, case-insensitive)
in plaats van chronologisch. Ondersteunt Nederlandse accenten correct.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Switch to staging branch
git checkout staging

# Merge feature branch
git merge 040-in-de-popup --no-edit

# Push to staging (triggers Vercel deployment)
git push origin staging

# Wait 30 seconds for Vercel deployment
echo "Waiting for Vercel deployment..."
sleep 30

# Verify deployed version
curl -s -L -k https://dev.tickedify.com/api/version
```

**Expected Version Output**:
```json
{"version":"0.20.18","environment":"staging"}
```

**Verification Checklist**:
- [ ] Git commit succesvol
- [ ] Merge naar staging succesvol
- [ ] Push naar origin staging succesvol
- [ ] Vercel deployment triggered (check Vercel dashboard)
- [ ] Version endpoint returned v0.20.18

**If Deployment Fails**:
1. Check Vercel logs via dashboard
2. Verify git push succeeded (`git log origin/staging`)
3. Wait additional 30 seconds and re-check version endpoint

**Acceptance**:
- ✅ Code gepusht naar staging branch
- ✅ Vercel deployment compleet
- ✅ Version endpoint returned correcte versie (0.20.18)

**Dependencies**: T003, T004, T008
**Blocks**: T010 (regression testing)

---

### T010 - Regression Testing
**Status**: ⬜ Not Started
**File**: N/A (manual testing)
**Estimated Time**: 10 min

**Description**: Verify dat de feature werkt EN geen bestaande functionaliteit breekt.

**Prerequisites**: T009 deployed naar staging

**Regression Test Checklist**:

#### Feature Tests (from quickstart.md)
- [ ] Context dropdown is alfabetisch gesorteerd in nieuwe taak popup
- [ ] Context dropdown is alfabetisch gesorteerd in bewerk popup
- [ ] Case-insensitive sortering werkt correct
- [ ] Nederlandse accenten correct gesorteerd

#### Regression Tests (bestaande functionaliteit)
- [ ] Context selecteren en opslaan werkt normaal
- [ ] Nieuwe context aanmaken werkt (+ button)
- [ ] Bestaande taken bewerken werkt zonder errors
- [ ] Projecten dropdown (andere dropdown) ongewijzigd
- [ ] Prioriteiten dropdown ongewijzigd
- [ ] Taak opslaan naar dagelijkse planning werkt
- [ ] Geen JavaScript errors in browser console
- [ ] Geen 500 errors in Network tab

#### Performance Tests
- [ ] Dropdown laadt instant (<100ms)
- [ ] Geen merkbare vertraging vs vorige versie
- [ ] API response tijd <100ms (via Network tab)

**Test Procedure**:
1. Open dev.tickedify.com/app
2. Login met jan@buskens.be
3. Voer alle bovenstaande checks uit
4. Document eventuele issues

**Acceptance**:
- ✅ Feature werkt zoals verwacht (alfabetische sortering)
- ✅ Geen regressie in bestaande functionaliteit
- ✅ Geen errors in console of network tab
- ✅ Performance is acceptabel

**If Issues Found**:
- Document exact issue (screenshot, console logs)
- Create rollback plan (revert to previous version)
- Fix issue on feature branch, re-deploy

**Dependencies**: T009
**Blocks**: None (feature complete na deze task)

---

## Dependencies Graph

```
T001 (Verify Branch)
  ├─→ T002 (Version Bump)
  │     └─→ T008 (Changelog)
  │           └─→ T009 (Deploy Staging)
  │                 └─→ T010 (Regression Test)
  │
  ├─→ T003 [P] (Database Query)
  │     └─→ T005 (API Test)
  │           └─→ T006 (UI Test)
  │                 └─→ T007 (Edge Cases)
  │                       └─→ T008
  │
  └─→ T004 [P] (Client Fallback)
        └─→ T006 (UI Test)
```

**Critical Path**: T001 → T003 → T005 → T006 → T007 → T008 → T009 → T010

**Parallel Opportunities**:
- T003 + T004 (different files, no dependencies)
- T002 kan parallel met T003/T004 (separate concern)

---

## Parallel Execution Examples

### Example 1: Implementation Phase
**Run T003 and T004 in parallel** (different files):

```bash
# Launch both implementation tasks simultaneously
# T003: Database query
# T004: Client-side fallback
```

**Expected**: Beide taken compleet binnen 5-7 minuten totaal (vs 7 min sequential)

### Example 2: Version + Implementation
**Run T002, T003, T004 parallel** (all independent files):

```bash
# T002: package.json version bump
# T003: database.js query change
# T004: app.js client-side sort
```

**Expected**: Alle drie compleet binnen 5 minuten totaal

---

## Rollback Procedure

**If feature heeft problemen na deployment**:

### Quick Rollback (5 min)

```bash
# Revert database.js query
# File: database.js line 584
# Change back to:
query = 'SELECT * FROM contexten WHERE user_id = $1 ORDER BY aangemaakt DESC';

# Commit rollback
git add database.js
git commit -m "🔧 ROLLBACK: Revert context sortering naar chronologisch - v0.20.19"

# Push to staging
git checkout staging
git merge rollback-branch --no-edit
git push origin staging

# Verify rollback
curl -s -L -k https://dev.tickedify.com/api/version
```

**Rollback Risk**: 🟢 LOW - Single query change, geen data loss mogelijk

---

## Validation Checklist
*GATE: All checks must pass before considering feature complete*

### Design Coverage
- [x] All contracts have corresponding tests (api-contexten.md → T005)
- [x] All implementation points covered (database.js → T003, app.js → T004)
- [x] All test scenarios from quickstart.md → T006, T007
- [x] Edge cases documented → T007 sub-scenarios

### Task Quality
- [x] Each task specifies exact file path
- [x] Parallel tasks truly independent (T003 + T004 = different files)
- [x] No task modifies same file as another [P] task
- [x] Dependencies clearly documented
- [x] Rollback procedure documented

### Completeness
- [x] Setup tasks (T001-T002)
- [x] Implementation tasks (T003-T004)
- [x] Testing tasks (T005-T007)
- [x] Documentation tasks (T008)
- [x] Deployment tasks (T009-T010)

---

## Task Summary

| Phase | Tasks | Total Time | Can Parallelize |
|-------|-------|------------|-----------------|
| Setup | T001-T002 | 3 min | No |
| Implementation | T003-T004 | 7 min | Yes (5 min if parallel) |
| Testing | T005-T007 | 18 min | No (sequential) |
| Documentation | T008 | 5 min | No |
| Deployment | T009-T010 | 20 min | No |
| **TOTAL** | **10 tasks** | **53 min** | **48 min with parallel** |

---

## Notes
- [P] tasks = different files, no dependencies, can run parallel
- Manual testing required (no automated Playwright needed for this simple feature)
- No TDD cycle needed (low risk query change + defensive client-side backup)
- Commit after critical tasks (T003, T004, T008)
- **BELANGRIJK**: Deploy naar staging ONLY - productie is BEVROREN (bèta freeze)

---

**Tasks Status**: ✅ READY FOR EXECUTION
**Generated**: 2025-10-30
**Total Tasks**: 10 (numbered T001-T010)
