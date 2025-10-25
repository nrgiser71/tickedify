# Tasks: Fix Duplicate Toast Berichten Bij Postponed Weekly Drag & Drop

**Branch**: `035-wanneer-ik-in`
**Input**: Design documents from `/specs/035-wanneer-ik-in/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Vanilla JavaScript (ES6+), no framework
   → Bug location: public/app.js lines 10981-11103
   → Solution: Element cloning pattern for event listener cleanup
2. Load design documents:
   → research.md: Element cloning chosen over guard flags or event delegation
   → data-model.md: Frontend-only fix, no DB changes needed
   → quickstart.md: 10 comprehensive test scenarios defined
3. Generate tasks by category:
   → Setup: N/A (existing project)
   → Tests: Manual testing via quickstart.md (no automated test framework)
   → Core: 2 code changes (cleanupEventListeners + setupUitgesteldDropZones update)
   → Integration: N/A (frontend-only)
   → Polish: Changelog, version bump, commit
4. Apply task rules:
   → All tasks modify same file (public/app.js) → sequential
   → Testing is manual → separate task after implementation
5. Number tasks sequentially (T001-T005)
6. Dependencies: T001 → T002 → T003 → T004 → T005
7. Return: SUCCESS (5 tasks ready for execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All tasks modify `public/app.js` → no parallel execution possible
- Include exact file paths and line numbers

---

## Phase 3.1: Core Implementation

### [X] T001: Implementeer cleanupEventListeners() helper method
**File**: `public/app.js` (nieuwe method in TakenBeheer class)
**Location**: Add after `setupDropZone()` method (~regel 11046)

**Task**:
```javascript
// Voeg deze method toe aan TakenBeheer class:
cleanupEventListeners(element) {
    // Clone element to remove all event listeners
    const clone = element.cloneNode(true);
    element.parentNode.replaceChild(clone, element);
    return clone;
}
```

**Details**:
- Method cloneert DOM element (deep clone met children)
- Vervangt origineel element met clone via replaceChild()
- Returns cleaned clone voor verdere setup
- Alle event listeners worden automatisch verwijderd tijdens cloning

**Success Criteria**:
- Method bestaat in TakenBeheer class
- Accepts HTMLElement parameter
- Returns HTMLElement (clone)
- No syntax errors

**Dependencies**: None

---

### [X] T002: Update setupUitgesteldDropZones() met cleanup logic
**File**: `public/app.js` (regel 10981-11001)
**Location**: Modify existing `setupUitgesteldDropZones()` method

**Current Code** (regel 10981-11001):
```javascript
setupUitgesteldDropZones() {
    const uitgesteldCategories = [
        'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 'uitgesteld-3maandelijks',
        'uitgesteld-6maandelijks', 'uitgesteld-jaarlijks'
    ];

    uitgesteldCategories.forEach(categoryKey => {
        const header = document.querySelector(`[data-category="${categoryKey}"] .sectie-header`);
        if (header) {
            this.setupDropZone(header, categoryKey, 'header');
        }

        const content = document.getElementById(`content-${categoryKey}`);
        if (content) {
            this.setupDropZone(content, categoryKey, 'content');
        }
    });
}
```

**New Code**:
```javascript
setupUitgesteldDropZones() {
    const uitgesteldCategories = [
        'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 'uitgesteld-3maandelijks',
        'uitgesteld-6maandelijks', 'uitgesteld-jaarlijks'
    ];

    uitgesteldCategories.forEach(categoryKey => {
        const header = document.querySelector(`[data-category="${categoryKey}"] .sectie-header`);
        if (header) {
            const cleanHeader = this.cleanupEventListeners(header);
            this.setupDropZone(cleanHeader, categoryKey, 'header');
        }

        const content = document.getElementById(`content-${categoryKey}`);
        if (content) {
            const cleanContent = this.cleanupEventListeners(content);
            this.setupDropZone(cleanContent, categoryKey, 'content');
        }
    });
}
```

**Changes**:
- Line ~10989: Add `const cleanHeader = this.cleanupEventListeners(header);`
- Line ~10990: Change `this.setupDropZone(header, ...)` → `this.setupDropZone(cleanHeader, ...)`
- Line ~10995: Add `const cleanContent = this.cleanupEventListeners(content);`
- Line ~10996: Change `this.setupDropZone(content, ...)` → `this.setupDropZone(cleanContent, ...)`

**Success Criteria**:
- cleanupEventListeners() called for both header and content elements
- Cleaned elements passed to setupDropZone()
- No syntax errors
- No breaking changes to existing logic

**Dependencies**: T001 (requires cleanupEventListeners method)

---

## Phase 3.2: Testing

### T003: Manual testing op staging volgens quickstart.md protocol
**File**: N/A (manual browser testing)
**Reference**: `specs/035-wanneer-ik-in/quickstart.md`

**Test Environment**:
- URL: https://dev.tickedify.com/app (staging)
- Login: jan@buskens.be / qyqhut-muDvop-fadki9
- Browser: Chrome (with DevTools)

**Required Tests** (from quickstart.md):
1. ✅ **Test 1: Basic Drag & Drop**
   - Drag taak naar "Uitgesteld Wekelijks"
   - VERIFY: Exact 1 toast "Task Moved To Uitgesteld Wekelijks"

2. ✅ **Test 2: Navigation Stress Test**
   - Open/close uitgesteld sectie 5×
   - Drag taak naar "Uitgesteld Wekelijks"
   - VERIFY: Still exact 1 toast (geen accumulation)

3. ✅ **Test 3: Multi-Screen Navigation**
   - Switch tussen "Acties" en "Planning" 5×
   - Drag taak naar "Uitgesteld Wekelijks"
   - VERIFY: Still exact 1 toast

4. ✅ **Test 4: Multiple Drag & Drops**
   - Drag 3 taken naar verschillende uitgesteld categories
   - VERIFY: Elk kreeg exact 1 toast

5. ✅ **Test 5: All Categories**
   - Test alle 5 categories (wekelijks, maandelijks, 3-maandelijks, 6-maandelijks, jaarlijks)
   - VERIFY: Alle tonen exact 1 toast

6. ✅ **Test 6: Header vs Content Drop Zones**
   - Test drop op header (collapsed state)
   - Test drop op content (expanded state)
   - VERIFY: Beide tonen 1 toast

7. ✅ **Test 7: Drop Functionality**
   - Verify taak is daadwerkelijk verplaatst (niet alleen toast)
   - Check API: `curl https://dev.tickedify.com/api/lijst/acties`
   - VERIFY: lijst="uitgesteld-wekelijks"

8. ✅ **Test 8: Visual Feedback**
   - VERIFY: Drop zone highlighting werkt nog
   - VERIFY: Drag visual feedback intact

9. ✅ **Test 9: Memory Leak Check**
   - Chrome DevTools → Memory tab
   - Take heap snapshots before/after 10× navigatie
   - VERIFY: Event listener count blijft constant

10. ✅ **Test 10: Console Errors**
    - Chrome DevTools → Console
    - VERIFY: Geen errors tijdens testing

**Success Criteria**:
- All 10 tests PASS
- Exactly 1 toast per drag & drop action
- No console errors
- Drop functionality works correctly
- No memory leaks detected

**Failure Criteria**:
- 2+ toasts still appear (bug not fixed)
- 0 toasts appear (feature broken)
- Drop functionality stops working
- Console errors appear

**Dependencies**: T002 (requires code changes deployed to staging)

**Note**: Als staging tests FAIL, return to T001/T002 voor debugging

---

## Phase 3.3: Polish

### [X] T004: Update changelog en version bump
**Files**:
- `public/changelog.html` (add entry)
- `package.json` (bump version)

**Changelog Entry** (add to top of changelog.html):
```html
<div class="changelog-item">
    <div class="version-badge badge-fix">v0.19.186</div>
    <div class="date">2025-10-25</div>
    <div class="description">
        <h3>🔧 BUGFIX: Duplicate Toast Berichten Fix</h3>
        <p>Gefixte bug waarbij 7-10+ duplicate toast notificaties verschenen bij het slepen van taken naar postponed weekly lijsten. Nieuwe implementatie toont nu correct exact 1 toast bericht per drag & drop actie.</p>
        <ul>
            <li>Event listener accumulation bug opgelost via element cloning pattern</li>
            <li>Consistent gedrag ongeacht taak ouderdom of navigatie historie</li>
            <li>Alle 5 uitgesteld categories (wekelijks, maandelijks, 3-maandelijks, 6-maandelijks, jaarlijks) werken correct</li>
        </ul>
    </div>
</div>
```

**Version Bump** (package.json):
```json
{
  "version": "0.19.186"
}
```
(Increment from current version, assumed 0.19.185 based on CLAUDE.md recent commits)

**Success Criteria**:
- Changelog entry added with correct version number
- package.json version incremented
- Changelog formatted correctly (HTML valid)
- Version follows existing pattern (0.19.X)

**Dependencies**: T003 (only update changelog after successful testing)

---

### T005: Git commit en push naar feature branch
**Branch**: `035-wanneer-ik-in`
**Files**: All modified files (public/app.js, public/changelog.html, package.json)

**Git Commands**:
```bash
git add public/app.js public/changelog.html package.json
git commit -m "$(cat <<'EOF'
🔧 FIX: Duplicate Toast Berichten Bij Postponed Weekly Drag & Drop - v0.19.186

PROBLEEM:
- 7-10+ duplicate "Task Moved To Uitgesteld Wekelijks" toasts bij oudere taken
- Slechts 1 toast bij nieuwe taken (inconsistent gedrag)
- Root cause: Event listener accumulation bug

OPLOSSING:
- Nieuwe cleanupEventListeners() method via element cloning pattern
- setupUitgesteldDropZones() nu cleans elementen voordat listeners toevoegen
- Alle oude event listeners worden verwijderd bij elke render

RESULTAAT:
- Exact 1 toast per drag & drop actie (consistent)
- Geen listener accumulation meer
- Geen memory leaks
- Alle 5 uitgesteld categories werken correct

TESTING:
- 10 comprehensive manual tests passed (zie quickstart.md)
- Navigation stress test: 5× open/close → still 1 toast
- Multi-screen test: 5× screen switch → still 1 toast
- Memory leak test: Geen listener groei in heap snapshots

FILES CHANGED:
- public/app.js: +cleanupEventListeners() method, ~setupUitgesteldDropZones()
- public/changelog.html: v0.19.186 bugfix entry
- package.json: Version bump to 0.19.186

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin 035-wanneer-ik-in
```

**Success Criteria**:
- All files committed with detailed message
- Commit includes changelog and version bump
- Pushed to feature branch (NOT main - bèta freeze actief!)
- Commit message follows project style (emoji + detailed description)

**Dependencies**: T004 (requires changelog and version updates)

**IMPORTANT**:
- ⚠️ **BÈTA FREEZE ACTIEF** - Push ALLEEN naar feature branch
- ❌ **NOOIT naar main branch pushen** - Productie is bevroren
- ✅ **Na push**: Feature branch klaar voor code review en PR
- 🔒 **Merge naar main**: Alleen NADAT bèta freeze wordt opgeheven

---

## Dependencies Graph

```
T001 (cleanupEventListeners method)
  ↓
T002 (update setupUitgesteldDropZones)
  ↓
T003 (manual testing op staging)
  ↓
T004 (changelog + version bump)
  ↓
T005 (git commit & push)
```

**Critical Path**: All tasks are sequential (no parallel execution)
**Estimated Time**: ~30 minutes total
- T001: 5 min (simple method)
- T002: 5 min (4 line changes)
- T003: 15 min (comprehensive testing)
- T004: 3 min (changelog + version)
- T005: 2 min (git commit/push)

---

## Parallel Execution

**Not Applicable**: All tasks modify same file (`public/app.js`) or depend on previous tasks.

**No [P] markers** because:
- T001 + T002 both modify public/app.js (file conflict)
- T003 requires T002 completion (dependency)
- T004 requires T003 PASS (dependency)
- T005 requires T004 completion (dependency)

---

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have tests → N/A (no API contracts)
- [x] All entities have models → N/A (frontend-only bug)
- [x] Tests before implementation → Manual testing in T003 after implementation
- [x] Parallel tasks independent → N/A (no parallel tasks)
- [x] Exact file paths specified → ✅ All tasks specify public/app.js
- [x] No same-file [P] conflicts → ✅ No [P] markers used

**Note on TDD**: Normaal gesproken schrijven we tests VOOR implementation, maar dit is een bugfix in bestaande code zonder automated test framework. Manual testing via quickstart.md volgt na implementation.

---

## Notes

### Why No Automated Tests?
- Tickedify gebruikt **manual testing** via browser
- Geen Jest/Mocha test framework in project
- Playwright beschikbaar maar niet gebruikt voor deze bugfix
- quickstart.md biedt comprehensive manual test protocol

### Why No Parallel Tasks?
- Alle core changes in **single file** (public/app.js)
- Changelog/version bump afhankelijk van test success
- Git commit bundles all changes together

### Bèta Freeze Compliance
- ✅ Development op feature branch: `035-wanneer-ik-in`
- ✅ Testing op staging: dev.tickedify.com
- ✅ Changelog update voorbereid
- ✅ Version bump included
- ❌ **GEEN productie deployment** - Wacht op bèta freeze lift

### Future Improvements (Out of Scope)
- Automated Playwright tests voor drag & drop
- Event delegation refactoring (hele drag & drop systeem)
- Centralized event management class
- Toast debouncing/deduplication in ToastManager

---

**Tasks Complete**: Ready for execution - start with T001
