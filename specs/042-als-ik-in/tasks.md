# Tasks: Keyboard Shortcuts Blijven Werken Na Focus Wijziging

**Input**: Design documents from `/specs/042-als-ik-in/`
**Prerequisites**: plan.md, research.md, quickstart.md
**Feature Branch**: `042-als-ik-in`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Found: tech stack = Vanilla JavaScript, structure = public/app.js
2. Load optional design documents:
   ✅ research.md: Capture phase event listener strategie
   ✅ quickstart.md: 5 test scenarios met 11 shortcuts
   ❌ data-model.md: N/A (UI bugfix, geen data wijzigingen)
   ❌ contracts/: N/A (geen API changes)
3. Generate tasks by category:
   → Setup: Version bump, branch check
   → Core: Event listener wijziging in app.js
   → Testing: Manual testing via Playwright (quickstart scenarios)
   → Polish: Changelog update, regression check
4. Apply task rules:
   → Sequential execution (single file app.js)
   → No parallel tasks (alles in één bestand)
   → No TDD (bugfix in bestaande code)
5. Number tasks sequentially (T001-T007)
6. Dependencies: Setup → Implementation → Deploy → Test → Document
7. Validation: All quickstart scenarios covered
8. Return: SUCCESS (7 tasks ready for execution)
```

## Format: `[ID] Description`
- Geen [P] markers - alle tasks zijn sequential (single file)
- Exacte file paths en line numbers waar relevant

## Path Conventions
**Tickedify structure**:
- `public/app.js` - Main application file (~13,000 lines)
- `public/index.html` - HTML met popup element
- `public/changelog.html` - Changelog voor gebruikers
- `package.json` - Version tracking

---

## Phase 3.1: Setup & Preparation

- [x] **T001** - Verify branch en git status
  - **File**: N/A (git command)
  - **Action**:
    - Check huidige branch is `042-als-ik-in`
    - Verify geen uncommitted changes
    - Verify staging branch is up to date
  - **Duration**: 1 min
  - **Command**: `git status && git branch`

- [x] **T002** - Version bump in package.json
  - **File**: `/package.json`
  - **Action**:
    - Read current version
    - Increment patch version (e.g., 0.20.20 → 0.20.21)
    - Save updated package.json
  - **Duration**: 2 min
  - **Dependency**: Must complete before T007 (commit)

---

## Phase 3.2: Core Implementation

- [x] **T003** - Update initPlanningKeyboardShortcuts() naar capture phase
  - **File**: `public/app.js` (lines ~2856-3075)
  - **Action**:
    - Locate: `popup.addEventListener('keydown', (e) => { ... })`
    - Change to: `popup.addEventListener('keydown', (e) => { ... }, { capture: true })`
    - Verify alle keyboard event listeners in deze functie hebben capture option
  - **Rationale**: Capture phase intercepteert events vóór child elements ze kunnen blokkeren
  - **Duration**: 15 min
  - **Dependency**: T001 complete
  - **Critical**: Geen andere code wijzigingen - alleen event listener options

**Detailed implementation**:
```javascript
// VOOR (regel ~2859):
popup.addEventListener('keydown', (e) => {
    // Only handle F-keys when popup is visible
    if (popup.style.display === 'none') return;
    // ... handler code
});

// NA:
popup.addEventListener('keydown', (e) => {
    // Only handle F-keys when popup is visible
    if (popup.style.display === 'none') return;
    // ... handler code (unchanged)
}, { capture: true });  // ← ADD THIS
```

---

## Phase 3.3: Deployment

- [x] **T004** - Commit changes naar feature branch
  - **Files**: `public/app.js`, `package.json`
  - **Action**:
    - Stage beide files
    - Commit message: "🐛 FIX: Keyboard shortcuts werken nu onafhankelijk van focus - v0.20.21"
    - Include in commit message: "Event listeners gebruiken nu capture phase"
  - **Duration**: 3 min
  - **Dependency**: T002 (version bump) + T003 (implementation) complete
  - **Command**: `git add public/app.js package.json && git commit -m "..."`

- [x] **T005** - Merge naar staging en deploy
  - **Action**:
    - Checkout staging branch
    - Merge feature branch `042-als-ik-in`
    - Push naar origin staging
    - Wait for Vercel deployment (check dev.tickedify.com/api/version)
  - **Duration**: 2-3 min (including deployment wait)
  - **Dependency**: T004 complete
  - **Validation**: Version number op dev.tickedify.com matches package.json
  - **Commands**:
    ```bash
    git checkout staging
    git merge 042-als-ik-in --no-edit
    git push origin staging
    # Wait 15-30 seconds
    curl -s -L -k https://dev.tickedify.com/api/version
    ```

---

## Phase 3.4: Testing & Validation

- [x] **T006** - Execute quickstart.md test scenarios
  - **File**: `specs/042-als-ik-in/quickstart.md`
  - **Action**: Test alle 5 scenarios via Playwright
    1. **Scenario 1**: Project button + 11 shortcuts
    2. **Scenario 2**: Context button + shortcuts
    3. **Scenario 3**: Rapid element switching
    4. **Scenario 4**: Comprehensive - alle shortcuts individueel
    5. **Scenario 5**: Edge cases (disabled elements, rapid keys, open dropdowns)
  - **Success criteria**:
    - ✅ Alle 11 shortcuts werken na focus op project/context buttons
    - ✅ Geen console errors
    - ✅ Response tijd < 50ms (feels instant)
  - **Duration**: 10-15 min
  - **Dependency**: T005 (staging deployment) complete
  - **Tool**: Playwright via tickedify-testing agent OF manual browser testing

**Shortcuts to test** (met focus op project/context button):
| Shortcut | Expected Action |
|----------|----------------|
| Enter | Sluit popup en slaat op |
| Escape | Sluit popup zonder opslaan |
| F2 | Wijzigt naar project 1 |
| F3 | Wijzigt naar project 2 |
| F4 | Wijzigt naar project 3 |
| F5 | Wijzigt naar project 4 |
| F6 | Wijzigt naar project 5 |
| F7 | Wijzigt naar context 1 |
| F8 | Wijzigt naar context 2 |
| F9 | Wijzigt naar context 3 |
| Shift+F9 | Opent prioriteit modal |

---

## Phase 3.5: Polish & Documentation

- [x] **T007** - Update changelog.html
  - **File**: `public/changelog.html`
  - **Action**:
    - Add new entry voor v0.20.21
    - Category: 🔧 BUGFIX
    - Description: "Keyboard shortcuts werken nu correct na het toevoegen van project of context"
    - Technical detail: "Event listeners gebruiken nu capture phase voor betere event handling"
    - Badge: "badge-fix"
  - **Duration**: 5 min
  - **Dependency**: T006 (testing passed)

**Changelog entry format**:
```html
<div class="version-entry">
    <div class="version-header">
        <span class="version-number">v0.20.21</span>
        <span class="version-date">30 oktober 2025</span>
        <span class="badge badge-fix">Bugfix</span>
    </div>
    <ul class="changes-list">
        <li>🔧 <strong>BUGFIX</strong>: Keyboard shortcuts werken nu correct na het toevoegen van project of context - focus wijziging blokkeert shortcuts niet meer</li>
    </ul>
</div>
```

---

## Dependencies Graph

```
T001 (Branch check)
  ↓
T002 (Version bump) ──┐
  ↓                    │
T003 (Implementation) ─┤
  ↓                    │
T004 (Commit) ←────────┘
  ↓
T005 (Deploy to staging)
  ↓
T006 (Testing)
  ↓
T007 (Changelog)
```

**Critical path**: T001 → T002 → T003 → T004 → T005 → T006 → T007 (100% sequential)

---

## Execution Strategy

**No parallel execution** - alle tasks zijn sequential omdat:
- Alle wijzigingen in één file (public/app.js)
- Git operations zijn sequential
- Testing vereist deployed code
- Documentation vereist successful tests

**Recommended execution**:
```bash
# Execute tasks sequentially via tickedify-bug-hunter agent:
Task(subagent_type: "tickedify-bug-hunter",
     description: "Fix keyboard shortcuts focus issue",
     prompt: "Execute tasks T001-T007 from specs/042-als-ik-in/tasks.md")
```

---

## Validation Checklist
*GATE: Verify before marking feature complete*

**Code Changes**:
- [x] Only event listener options changed (no logic changes)
- [x] All keyboard shortcuts in initPlanningKeyboardShortcuts() updated
- [x] No breaking changes to existing behavior

**Testing**:
- [ ] All 11 shortcuts tested with focus on project button
- [ ] All 11 shortcuts tested with focus on context button
- [ ] Edge cases passed (rapid keys, open dropdowns)
- [ ] No console errors during testing
- [ ] Response time < 50ms

**Documentation**:
- [ ] Version bumped in package.json
- [ ] Changelog entry added
- [ ] Git commit message clear and descriptive

**Deployment**:
- [ ] Staged on dev.tickedify.com
- [ ] Version endpoint returns correct version
- [ ] No deployment errors

---

## Notes

**Implementation simplicity**: Dit is een 1-line wijziging per event listener (toevoegen van `{ capture: true }`). De complexiteit zit in thoroughe testing om te verifiëren dat alle shortcuts blijven werken.

**Testing focus**: Quickstart.md bevat 5 uitgebreide scenarios. T006 moet ALLE scenarios succesvol doorlopen voordat de fix als compleet wordt beschouwd.

**No TDD**: Dit is een bugfix in bestaande code. We refactoren bestaande event listeners, geen nieuwe functionaliteit. Tests zijn manual/integration tests via Playwright.

**Rollback plan**: Als T006 faalt, eenvoudig revert commit en redeploy. Capture phase is een safe change (supported sinds IE11), dus compatibiliteit issues zijn zeer onwaarschijnlijk.

---

## Task Generation Summary

**Total tasks**: 7 (T001-T007)
**Estimated time**: 40-45 minuten
**Parallel tasks**: 0 (all sequential)
**Files modified**: 2 (app.js, changelog.html) + package.json
**Tests**: Manual via quickstart.md scenarios

**Ready for execution**: ✅ All tasks are specific, executable, and have clear success criteria.
