# Tasks: Fix Laatste Werkdag Maandelijkse Herhaling

**Input**: Design documents from `/specs/053-ik-heb-een/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/recurring-date-calculation.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Node.js 18.x, Express.js, Vanilla JavaScript
   → Bug locations: server.js:7946-7954, server.js:7642-7649
2. Load optional design documents ✅
   → research.md: Identified root cause and fix strategy
   → data-model.md: No schema changes needed
   → contracts/: API contract with 6 test scenarios
   → quickstart.md: Complete test suite with regression tests
3. Generate tasks by category ✅
   → Setup: Version bump prep
   → Tests: API endpoint verification (6 scenarios)
   → Core: Bug fix at 2 locations in server.js
   → Integration: Staging deployment + verification
   → Polish: Changelog update, git commit
4. Apply task rules ✅
   → Bug fixes can be done sequentially (same file)
   → Test scenarios can run in parallel [P]
   → Deployment verification sequential
5. Number tasks sequentially (T001-T012) ✅
6. Task completeness validated ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different operations, no dependencies)
- Exact file paths included in descriptions
- Constitutional compliance: staging-first, version bump, changelog

---

## Phase 3.1: Pre-Implementation Setup

### T001: Verify current branch and prepare environment ✅
**File**: Git repository
**Action**:
- Confirm current branch is `053-ik-heb-een` ✅
- Ensure working directory is clean ✅
- Read current version from `package.json` ✅
- Document current version for bump planning ✅

**Expected Output**: Current version noted: **0.21.33** → Next version: **0.21.34**

---

## Phase 3.2: Tests First (Verification Strategy)

**Note**: Voor deze bug fix gebruiken we BESTAANDE test endpoint voor verificatie. We schrijven geen nieuwe test files, maar voeren API calls uit om gedrag te verifiëren.

### T002: [P] Verify test endpoint is accessible
**File**: `server.js` (existing endpoint `/api/test-recurring-next/:pattern/:baseDate`)
**Action**:
- Run local server: `npm start`
- Test endpoint availability: `curl -s -L -k http://localhost:3000/api/test-recurring-next/monthly-weekday-last-workday-1/2025-10-31`
- Verify endpoint responds with JSON (may show buggy behavior, that's expected)

**Expected Output**: JSON response (even if dates are incorrect due to bug)

### T003: [P] Document current buggy behavior (baseline)
**File**: Test notes (terminal output or log file)
**Action**:
- Run all 6 test scenarios from `quickstart.md` against LOCAL server
- Document current (buggy) output for each scenario:
  1. `monthly-weekday-last-workday-1/2025-10-31` → expecting bug: `2025-12-31`
  2. `monthly-weekday-last-workday-1/2025-11-28` → check current output
  3. `monthly-weekday-last-workday-1/2025-12-31` → check current output
  4. `monthly-weekday-last-workday-1/2025-01-31` → check current output
  5. `monthly-weekday-last-workday-2/2025-10-31` → check current output
  6. `laatste-werkdag-maand/2025-10-31` → expecting bug: check output
- Save baseline results for comparison after fix

**Expected Output**: Baseline test results showing buggy behavior (31/10 → 31/12 instead of 28/11)

---

## Phase 3.3: Core Implementation (Bug Fix)

**CRITICAL**: These tasks modify the SAME file (`server.js`), so they MUST be done sequentially, NOT in parallel.

### T004: Fix Location 1 - monthly-weekday-last-workday pattern
**File**: `server.js` (around line 7946-7954)
**Action**:
- Locate the code block handling `position === 'last'` within `monthly-weekday-last-workday` pattern
- Current buggy code:
  ```javascript
  } else if (position === 'last') {
      // Last workday of month
      const targetMonth = nextDateObj.getMonth();
      nextDateObj.setMonth(targetMonth + 1);  // ❌ BUG
      nextDateObj.setDate(0);
      while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
          nextDateObj.setDate(nextDateObj.getDate() - 1);
      }
  }
  ```
- Replace with fixed code:
  ```javascript
  } else if (position === 'last') {
      // Last workday of month
      // nextDateObj already has correct target month from line 7938 (+ interval)
      nextDateObj.setMonth(nextDateObj.getMonth() + 1);  // ✅ FIX
      nextDateObj.setDate(0); // Last day of target month
      while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
          nextDateObj.setDate(nextDateObj.getDate() - 1);
      }
  }
  ```
- Remove intermediate `targetMonth` variable
- Add comment explaining the fix

**Expected Output**: Code fixed at Location 1, file saved

### T005: Fix Location 2 - laatste-werkdag-maand Dutch pattern
**File**: `server.js` (around line 7642-7649)
**Action**:
- Locate the code block handling `pattern === 'laatste-werkdag-maand'`
- Current buggy code:
  ```javascript
  } else if (pattern === 'laatste-werkdag-maand') {
      const nextDateObj = new Date(date);
      nextDateObj.setMonth(date.getMonth() + 2);  // ❌ BUG
      nextDateObj.setDate(0);
      while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
          nextDateObj.setDate(nextDateObj.getDate() - 1);
      }
      nextDate = nextDateObj.toISOString().split('T')[0];
  }
  ```
- Replace with fixed code:
  ```javascript
  } else if (pattern === 'laatste-werkdag-maand') {
      const nextDateObj = new Date(date);
      nextDateObj.setMonth(date.getMonth() + 1);  // ✅ FIX: Changed +2 to +1
      nextDateObj.setDate(0); // Last day of next month
      while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
          nextDateObj.setDate(nextDateObj.getDate() - 1);
      }
      nextDate = nextDateObj.toISOString().split('T')[0];
  }
  ```
- Change `+ 2` to `+ 1`
- Add comment explaining the fix

**Expected Output**: Code fixed at Location 2, file saved

### T006: Verify fix locally with test endpoint
**File**: Terminal/API testing
**Action**:
- Restart local server if needed: `npm start`
- Run all 6 test scenarios from `quickstart.md`:
  1. `monthly-weekday-last-workday-1/2025-10-31` → expect: `2025-11-28` ✅
  2. `monthly-weekday-last-workday-1/2025-11-28` → expect: `2025-12-31` ✅
  3. `monthly-weekday-last-workday-1/2025-12-31` → expect: `2026-01-30` ✅
  4. `monthly-weekday-last-workday-1/2025-01-31` → expect: `2025-02-28` ✅
  5. `monthly-weekday-last-workday-2/2025-10-31` → expect: `2025-12-31` ✅
  6. `laatste-werkdag-maand/2025-10-31` → expect: `2025-11-28` ✅
- Compare with baseline from T003
- ALL tests must show CORRECT behavior now

**Expected Output**: All 6 test scenarios pass with correct dates

**Blocker**: If any test fails, return to T004/T005 to debug

---

## Phase 3.4: Version & Changelog

### T007: Bump version in package.json
**File**: `package.json`
**Action**:
- Read current version (from T001)
- Increment patch version: `0.21.33` → `0.21.34`
- Update `"version"` field in `package.json`
- Save file

**Expected Output**: `package.json` updated with new version

### T008: Update changelog with fix description
**File**: `public/changelog.html`
**Action**:
- Add new entry at TOP of changelog (before existing entries)
- Use 🔧 FIX category
- Version: Use new version from T007
- Date: Today's date (2025-11-03)
- Badge: `badge-latest` for newest version
- Update previous `badge-latest` to `badge-fix`
- Description: "Fix maandelijkse herhaling laatste werkdag patroon - slaat geen maand meer over (31/10 → 28/11 correctie)"

**Example Entry**:
```html
<div class="version-entry">
    <div class="version-header">
        <span class="version-number">v0.21.34</span>
        <span class="badge badge-latest">Latest</span>
        <span class="date">3 november 2025</span>
    </div>
    <ul>
        <li>🔧 <strong>FIX:</strong> Maandelijkse herhaling laatste werkdag patroon gecorrigeerd - volgende taak instantie wordt nu correct aangemaakt in de volgende maand (bijv. 31/10 → 28/11) in plaats van een maand over te slaan (31/10 → 31/12)</li>
    </ul>
</div>
```

**Expected Output**: Changelog updated with new entry

---

## Phase 3.5: Git Commit

### T009: Stage changes and create descriptive commit
**File**: Git repository
**Action**:
- Stage modified files:
  - `git add server.js`
  - `git add package.json`
  - `git add public/changelog.html`
- Create commit with descriptive message using HEREDOC:
  ```bash
  git commit -m "$(cat <<'EOF'
  🔧 FIX: Maandelijkse herhaling laatste werkdag bug - v0.21.34

  Probleem:
  - Herhalende taken met "laatste werkdag van maand" patroon sloegen een maand over
  - Voorbeeld: 31/10/2025 → 31/12/2025 (incorrect, slaat november over)
  - Verwacht: 31/10/2025 → 28/11/2025 (laatste werkdag november)

  Oplossing:
  - Location 1 (server.js:7946-7954): monthly-weekday-last-workday pattern
    * Verwijderd: const targetMonth = nextDateObj.getMonth()
    * Vervangen: nextDateObj.setMonth(targetMonth + 1)
    * Door: nextDateObj.setMonth(nextDateObj.getMonth() + 1)
  - Location 2 (server.js:7642-7649): laatste-werkdag-maand Dutch pattern
    * Gewijzigd: setMonth(date.getMonth() + 2) naar + 1

  Root cause:
  - JavaScript setDate(0) trick gaat naar laatste dag van VORIGE maand
  - Dus setMonth(month + 1) + setDate(0) = laatste dag van target maand
  - Bug was: er werd TWEE keer +1 gedaan (interval + extra increment)

  Testing:
  - 6 test scenarios gevalideerd via /api/test-recurring-next endpoint
  - Alle edge cases (februari, jaar grens, weekend) werken correct
  - Backwards compatible met alle andere recurring patterns

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

**Expected Output**: Git commit created with descriptive message

---

## Phase 3.6: Staging Deployment

**Constitutional Requirement**: ALWAYS deploy to staging FIRST, never to main during beta freeze.

### T010: Merge to staging branch and push
**File**: Git repository
**Action**:
- Switch to staging branch: `git checkout staging`
- Merge feature branch: `git merge 053-ik-heb-een --no-edit`
- Push to staging: `git push origin staging`
- Wait for Vercel deployment (automatic)
- Document deployment URL: `https://dev.tickedify.com`

**Expected Output**: Code pushed to staging, Vercel deployment triggered

### T011: Verify staging deployment
**File**: Terminal/API testing
**Action**:
- Wait 15 seconds for Vercel deployment
- Check version endpoint: `curl -s -L -k https://dev.tickedify.com/api/version`
- Verify version matches package.json (0.21.34)
- If not deployed yet, wait another 15 seconds and retry
- Maximum wait: 2 minutes (8 retries)

**Expected Output**: Version endpoint returns `{"version":"0.21.34"}`

**Blocker**: If timeout (2 min), report deployment issue to user

---

## Phase 3.7: Regression Testing on Staging

### T012: [P] Run complete regression test suite on staging
**File**: Terminal/API testing via dev.tickedify.com
**Action**:
- Use Vercel MCP tools or curl with `-s -L -k` flags for dev.tickedify.com access
- Run all 6 test scenarios from `quickstart.md` against STAGING:
  1. Test: `https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-10-31`
     - Expected: `{"nextDate": "2025-11-28", "success": true}`
  2. Test: `https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-11-28`
     - Expected: `{"nextDate": "2025-12-31", "success": true}`
  3. Test: `https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-12-31`
     - Expected: `{"nextDate": "2026-01-30", "success": true}`
  4. Test: `https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-01-31`
     - Expected: `{"nextDate": "2025-02-28", "success": true}`
  5. Test: `https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-2/2025-10-31`
     - Expected: `{"nextDate": "2025-12-31", "success": true}`
  6. Test: `https://dev.tickedify.com/api/test-recurring-next/laatste-werkdag-maand/2025-10-31`
     - Expected: `{"nextDate": "2025-11-28", "success": true}`
- Optional: Run test script from `quickstart.md` (test-recurring-fix.sh)
- Verify ALL tests pass ✅

**Expected Output**: All 6 regression tests pass on staging

**Success Criteria**: 6/6 tests passed = bug fix verified on staging

---

## Dependencies

```
T001 (branch check)
  ↓
T002, T003 (test baseline) [P]
  ↓
T004 (fix location 1)
  ↓
T005 (fix location 2)  [sequential - same file]
  ↓
T006 (local verification)
  ↓
T007 (version bump)
  ↓
T008 (changelog)
  ↓
T009 (git commit)
  ↓
T010 (staging push)
  ↓
T011 (deployment verify)
  ↓
T012 (regression tests)
  ↓
DONE (ready for user acceptance)
```

## Parallel Execution Examples

### Phase 3.2: Test Baseline (can run in parallel)
```bash
# T002 and T003 can run together (different operations)
# Terminal 1: Start server
npm start

# Terminal 2: Test endpoint availability
curl -s -L -k http://localhost:3000/api/test-recurring-next/monthly-weekday-last-workday-1/2025-10-31

# Terminal 2: Document baseline
for scenario in "monthly-weekday-last-workday-1/2025-10-31" "monthly-weekday-last-workday-1/2025-11-28" "laatste-werkdag-maand/2025-10-31"; do
    curl -s -L -k "http://localhost:3000/api/test-recurring-next/$scenario" | jq '.'
done
```

### Phase 3.3: Bug Fix (MUST be sequential - same file)
```bash
# T004 → T005 → T006 in sequence
# DO NOT parallelize - all modify server.js
```

---

## Notes

- **Constitutional Compliance**:
  - ✅ Beta freeze respected: staging deployment only, NO main branch push
  - ✅ Staging-first: dev.tickedify.com testing before any production consideration
  - ✅ Version bump: patch level increment included
  - ✅ Changelog: 🔧 FIX category with clear description
  - ✅ Test-first: API testing via curl, no UI dependencies

- **Risk Mitigation**:
  - Local testing (T006) before staging push
  - Staging regression tests (T012) before user acceptance
  - Backwards compatibility maintained (only 2 patterns affected)

- **Rollback Plan**:
  - If staging tests fail: revert commit, debug, repeat T004-T005
  - If deployment fails: check Vercel logs, retry push
  - Feature branch preserved for troubleshooting

---

## Validation Checklist

- [x] All contracts have corresponding tests (recurring-date-calculation.md → T012)
- [x] All tests come before implementation (T002-T003 → T004-T005)
- [x] Each task specifies exact file path
- [x] Parallel tasks truly independent (T002/T003 are different operations)
- [x] Sequential tasks for same file (T004 → T005 both modify server.js)
- [x] Constitutional requirements met (staging-first, version, changelog)

---

**Tasks Ready for Execution**: 12 tasks generated, dependency-ordered, constitutionally compliant
**Estimated Completion Time**: 30-45 minutes (including staging deployment + verification)
**Next Step**: Execute tasks T001-T012 sequentially (with noted parallel opportunities)
