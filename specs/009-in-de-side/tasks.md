# Tasks: Sidebar Tools Section Verwijderen

**Input**: Design documents from `/specs/009-in-de-side/`
**Prerequisites**: plan.md ✓, research.md ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: JavaScript (ES6+), HTML5, CSS3
   → Structure: Existing web app (public/index.html, style.css, app.js)
2. Load optional design documents ✓
   → research.md: Extracted decisions (dropdown removal, CSS spacing)
   → quickstart.md: Manual testing scenarios
   → No data-model.md (frontend-only change)
   → No contracts/ (no API changes)
3. Generate tasks by category ✓
   → Core: HTML restructuring, CSS styling, JavaScript cleanup
   → Testing: Manual browser testing per quickstart.md
   → Deployment: Version bump, changelog, git push to production
4. Apply task rules ✓
   → HTML/CSS/JS = sequential (same feature, coordinated changes)
   → Testing = after implementation
   → Deployment = automated (no approval per user context)
5. Number tasks sequentially (T001-T010) ✓
6. Generate dependency graph ✓
7. Validation ✓
   → No contracts = no contract tests needed
   → No data model = no model tasks needed
   → Manual testing scenarios in quickstart.md
8. Return: SUCCESS (tasks ready for execution) ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **Sequential**: HTML → CSS → JavaScript (coordinated UI changes)

## Path Conventions
- Repository root: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify`
- Frontend files: `public/index.html`, `public/style.css`, `public/app.js`
- Meta files: `package.json`, `public/changelog.html`

---

## Phase 3.1: Setup
**Geen setup nodig** - bestaande project, geen nieuwe dependencies

---

## Phase 3.2: Implementation (Frontend Wijzigingen)

### T001: HTML Restructurering - Verwijder Tools Dropdown Wrapper ✅ COMPLETED
**File**: `public/index.html`
**Locatie**: Regels 119-143

**Taak**:
1. Verwijder de volledige Tools dropdown sectie wrapper (regels 119-143):
   - `<div class="lijst-sectie">` met id `tools-dropdown`
   - `<div class="sectie-header dropdown-header">`
   - `<div class="dropdown-content" id="tools-content">`

2. Herpositioneer 4 menu items direct na "Afgewerkt" item (na regel 116):
   - Dagelijkse Planning (`data-lijst="dagelijkse-planning"`)
   - Contexten Beheer (`data-tool="contextenbeheer"`)
   - CSV Import (`data-tool="csv-import"`)
   - Zoeken (`data-tool="zoeken"`)

3. Behoud alle iconen, data-attributes en class names van de 4 items
4. Plaats items in een nieuwe `<div class="lijst-sectie">` wrapper

**Verwacht resultaat**:
```html
<!-- Regel 114-116: Afgewerkt blijft ongewijzigd -->
<div class="lijst-item" data-lijst="afgewerkt">
    <div class="lijst-icon"><i class="fas fa-check"></i></div>
    <span class="lijst-naam">Afgewerkt</span>
</div>

<!-- NIEUW: Voormalige Tools items zonder dropdown -->
<div class="lijst-sectie">
    <div class="lijst-item" data-lijst="dagelijkse-planning">
        <div class="lijst-icon"><i class="fas fa-calendar"></i></div>
        <span class="lijst-naam">Dagelijkse Planning</span>
    </div>
    <div class="lijst-item" data-tool="contextenbeheer">
        <div class="lijst-icon"><i class="fas fa-tag"></i></div>
        <span class="lijst-naam">Contexten Beheer</span>
    </div>
    <div class="lijst-item" data-tool="csv-import">
        <div class="lijst-icon"><i class="fas fa-file-csv"></i></div>
        <span class="lijst-naam">CSV Import</span>
    </div>
    <div class="lijst-item" data-tool="zoeken">
        <div class="lijst-icon"><i class="fas fa-search"></i></div>
        <span class="lijst-naam">Zoeken</span>
    </div>
</div>

<!-- Feedback & Support blijft ongewijzigd (regels 146+) -->
```

**Dependencies**: Geen
**Status**: [ ] Not started

---

### T002: CSS Styling - Voeg Extra Spacing Toe ✅ COMPLETED
**File**: `public/style.css`

**Taak**:
1. Voeg CSS regel toe voor extra spacing tussen "Afgewerkt" en "Dagelijkse Planning"
2. Gebruik 20px margin-top op het eerste item (Dagelijkse Planning)
3. Plaats CSS in de sidebar styling sectie (bij andere `.lijst-item` regels)

**CSS toe te voegen**:
```css
/* Extra ruimte tussen Afgewerkt en Dagelijkse Planning - Feature 009 */
.lijst-item[data-lijst="dagelijkse-planning"] {
    margin-top: 20px;
}
```

**Optioneel**: Verwijder ongebruikte dropdown CSS indien geïsoleerd voor Tools:
- `.dropdown-header` styling (alleen als niet gebruikt door andere dropdowns)
- `.dropdown-arrow` styling (alleen als niet gebruikt door andere dropdowns)
- `.dropdown-content` styling (alleen als niet gebruikt door andere dropdowns)

**Let op**: Controleer eerst of andere sidebar secties ook dropdowns gebruiken (bijv. Projecten, Contexten). Verwijder alleen CSS die specifiek voor Tools dropdown was.

**Dependencies**: T001 (HTML structuur moet eerst gewijzigd zijn)
**Status**: [ ] Not started

---

### T003: JavaScript Cleanup - Verwijder Tools Dropdown Event Listeners ✅ COMPLETED
**File**: `public/app.js`

**Taak**:
1. Zoek naar event listeners op `#tools-dropdown` element
2. Zoek naar event listeners op `#tools-content` element
3. Verwijder alle Tools-specifieke dropdown toggle functionaliteit:
   - Click handlers voor dropdown toggle
   - Arrow rotation logic
   - Show/hide content logic

**Zoekpatronen**:
```javascript
// Voorbeelden van te verwijderen code:
document.getElementById('tools-dropdown')
document.querySelector('#tools-dropdown')
$('#tools-dropdown') // als jQuery gebruikt wordt

// Toggle functionaliteit:
toggleToolsDropdown()
tools-dropdown.addEventListener('click'
toolsContent.style.display
```

**Let op**:
- Laat andere dropdown functionaliteit intact (indien aanwezig)
- Controleer of er algemene dropdown handlers zijn die ook voor Tools gebruikt worden
- Verwijder alleen Tools-specifieke code

**Dependencies**: T001, T002 (UI wijzigingen moeten eerst klaar zijn)
**Status**: [ ] Not started

---

## Phase 3.3: Testing (Manual Verification)

### T004: Browser Testing - Visuele Verificatie ✅ COMPLETED
**Testing Guide**: `specs/009-in-de-side/quickstart.md` - Test Scenario 1

**Taak**:
1. Open browser en navigeer naar `http://localhost:3000` (local) OF staging URL
2. Login met test credentials
3. Controleer visueel:
   - [ ] "Tools" dropdown is niet meer zichtbaar
   - [ ] 4 items zijn direct zichtbaar onder "Afgewerkt"
   - [ ] Extra ruimte is zichtbaar tussen "Afgewerkt" en "Dagelijkse Planning"
   - [ ] Volgorde items klopt (zie quickstart.md)

**Acceptance**: Alle visuele checks passed

**Dependencies**: T001, T002, T003 (alle implementatie klaar)
**Status**: [ ] Not started

---

### T005: Functionaliteit Testing - Menu Items Werken ✅ COMPLETED
**Testing Guide**: `specs/009-in-de-side/quickstart.md` - Test Scenario 2

**Taak**:
Test elk voormalig Tools menu item:
1. **Dagelijkse Planning**:
   - [ ] Klik item → dagelijkse planning view opent
   - [ ] Kalender wordt getoond
   - [ ] Drag & drop werkt

2. **Contexten Beheer**:
   - [ ] Klik item → contexten beheer modal opent
   - [ ] Contexten lijst wordt getoond

3. **CSV Import**:
   - [ ] Klik item → CSV import modal opent
   - [ ] File upload interface werkt

4. **Zoeken**:
   - [ ] Klik item → zoek interface activeert
   - [ ] Zoek veld krijgt focus

**Acceptance**: Alle 4 menu items functioneren zoals voorheen

**Dependencies**: T004 (visuele verificatie eerst)
**Status**: [ ] Not started

---

### T006: Responsive Testing - Desktop/Tablet/Mobile ✅ COMPLETED
**Testing Guide**: `specs/009-in-de-side/quickstart.md` - Test Scenario 3

**Taak**:
Test op 3 schermformaten:

1. **Desktop (1920x1080)**:
   - [ ] Sidebar volledig zichtbaar
   - [ ] Alle items passen zonder scroll
   - [ ] Spacing consistent

2. **Tablet (768x1024)**:
   - [ ] Sidebar gedrag correct
   - [ ] Menu items toegankelijk
   - [ ] Touch-friendly spacing

3. **Mobile (375x667)**:
   - [ ] Sidebar overlay/drawer werkt
   - [ ] Toggle button functioneert
   - [ ] Items zijn scrollbaar
   - [ ] Touch targets voldoende groot

**Acceptance**: Responsive gedrag werkt op alle breakpoints

**Dependencies**: T005 (functionaliteit eerst)
**Status**: [ ] Not started

---

### T007: Regression Testing - Andere Sidebar Items ✅ COMPLETED
**Testing Guide**: `specs/009-in-de-side/quickstart.md` - Test Scenario 4

**Taak**:
Verifieer dat bestaande functionaliteit intact is:

1. Test navigatie naar andere items:
   - [ ] Inbox → laden werkt
   - [ ] Acties → laden werkt
   - [ ] Projecten → laden werkt
   - [ ] Contexten → laden werkt
   - [ ] Vandaag → laden werkt
   - [ ] Afgewerkt → laden werkt

2. Test Feedback sectie:
   - [ ] Bug Melden modal opent
   - [ ] Feature Request modal opent

**Acceptance**: Geen regressies in bestaande functionaliteit

**Dependencies**: T006 (responsive testing eerst)
**Status**: [ ] Not started

---

## Phase 3.4: Deployment

### T008: Version Bump en Changelog Update ✅ COMPLETED
**Files**: `package.json`, `public/changelog.html`

**Taak**:

1. **Version bump** in `package.json`:
   - Huidige versie: `0.16.33`
   - Nieuwe versie: `0.16.34`
   - Update `"version"` field

2. **Changelog update** in `public/changelog.html`:
   - Voeg nieuwe versie entry toe bovenaan
   - Gebruik datum: 2025-10-08
   - Categorie: 🎨 UI Improvement
   - Badge class: `badge-feature`
   - Verander vorige versie badge van `badge-latest` naar `badge-feature`

**Changelog entry template**:
```html
<div class="version-entry">
    <div class="version-header">
        <span class="version-badge badge-latest">v0.16.34</span>
        <span class="version-date">8 oktober 2025</span>
    </div>
    <div class="changes">
        <div class="change-category">
            <div class="category-header">
                <span class="category-icon">🎨</span>
                <span class="category-name">UI Verbetering</span>
            </div>
            <ul class="category-changes">
                <li>Sidebar navigatie vereenvoudigd: Tools dropdown verwijderd</li>
                <li>Menu items (Dagelijkse Planning, Contexten Beheer, CSV Import, Zoeken) nu direct zichtbaar onder Afgewerkt</li>
                <li>Extra visuele ruimte toegevoegd tussen Afgewerkt en Dagelijkse Planning voor betere hiërarchie</li>
            </ul>
        </div>
    </div>
</div>
```

**Dependencies**: T007 (alle testing passed)
**Status**: [ ] Not started

---

### T009: Git Commit en Push naar Main (Productie) ✅ COMPLETED
**Branch**: `009-in-de-side` → merge naar `main`

**Taak**:

1. **Controleer huidige branch**:
   ```bash
   git branch  # Moet 009-in-de-side tonen
   ```

2. **Stage alle wijzigingen**:
   ```bash
   git add public/index.html public/style.css public/app.js package.json public/changelog.html
   ```

3. **Commit met beschrijvende message**:
   ```bash
   git commit -m "$(cat <<'EOF'
   🎨 Sidebar Tools dropdown verwijderd - v0.16.34

   Vereenvoudigt sidebar navigatie door openklapbaar Tools menu te vervangen
   met direct zichtbare menu items onder Afgewerkt.

   Wijzigingen:
   - HTML: Tools dropdown wrapper verwijderd (index.html:119-143)
   - HTML: 4 menu items nu flat onder Afgewerkt (Dagelijkse Planning, Contexten Beheer, CSV Import, Zoeken)
   - CSS: 20px extra margin-top op Dagelijkse Planning item voor visuele scheiding
   - JavaScript: Tools dropdown event listeners verwijderd uit app.js
   - Version bump: 0.16.33 → 0.16.34
   - Changelog updated met UI improvement entry

   Testing:
   ✅ Visuele verificatie (desktop/tablet/mobile)
   ✅ Functionaliteit verificatie (alle 4 items werken)
   ✅ Responsive testing (3 breakpoints)
   ✅ Regression testing (geen broken features)

   Feature: 009-in-de-side

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

4. **Merge naar main en push** (automatisch naar productie per user context):
   ```bash
   git checkout main
   git merge 009-in-de-side --no-ff
   git push origin main
   ```

**User Context**: Deployment moet automatisch naar productie zonder expliciete approval.

**Dependencies**: T008 (version bump en changelog eerst)
**Status**: [ ] Not started

---

### T010: Deployment Verificatie ✅ COMPLETED
**Endpoint**: `https://tickedify.com/api/version`

**Taak**:

1. **Wacht op Vercel deployment** (15-30 seconden na push)

2. **Controleer deployment** (elke 15 seconden tot 2 minuten max):
   ```bash
   curl -s -L -k https://tickedify.com/api/version | jq -r '.version'
   # Verwacht: "0.16.34"
   ```

3. **Bij success**:
   - [ ] Versie is 0.16.34
   - [ ] Report: "✅ Deployment succesvol naar productie"

4. **Bij timeout (>2 minuten)**:
   - [ ] Report: "⚠️ Deployment timeout - controleer Vercel dashboard"
   - [ ] Check: https://vercel.com/dashboard

5. **Visuele verificatie op productie**:
   - Open https://tickedify.com/app
   - Controleer dat Tools dropdown weg is
   - Controleer dat 4 items zichtbaar zijn onder Afgewerkt

**Acceptance**: Versie 0.16.34 live op productie, UI wijzigingen zichtbaar

**Dependencies**: T009 (git push moet eerst)
**Status**: [ ] Not started

---

## Dependencies Graph

```
T001 (HTML)
  └─→ T002 (CSS)
       └─→ T003 (JavaScript)
            └─→ T004 (Visuele Testing)
                 └─→ T005 (Functionaliteit Testing)
                      └─→ T006 (Responsive Testing)
                           └─→ T007 (Regression Testing)
                                └─→ T008 (Version Bump & Changelog)
                                     └─→ T009 (Git Commit & Push)
                                          └─→ T010 (Deployment Verificatie)
```

**Critical Path**: T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010

**Total Tasks**: 10 sequential tasks
**Estimated Time**: 45-60 minuten (inclusief testing en deployment wait time)

---

## Parallel Execution

**Geen parallel execution mogelijk** - alle tasks zijn sequential omdat:
- T001-T003: Gecoördineerde UI wijzigingen (HTML → CSS → JS cleanup)
- T004-T007: Testing moet in volgorde (visueel → functionaliteit → responsive → regression)
- T008-T010: Deployment workflow is lineair (version bump → commit → verificatie)

---

## Notes

- **No TDD**: Frontend UI reorganisatie - manual testing per quickstart.md
- **No API changes**: Puur frontend wijziging, geen backend impact
- **No database changes**: Alleen DOM/CSS/JavaScript wijzigingen
- **Deployment**: Automatisch naar productie na push naar main (per user context)
- **Testing**: Handmatig via browser (desktop/tablet/mobile)
- **Rollback**: Git revert beschikbaar in quickstart.md indien nodig

---

## Validation Checklist
*GATE: Checked before task execution*

- [x] All tasks have exact file paths specified
- [x] Testing scenarios defined in quickstart.md
- [x] No parallel tasks (all sequential due to coordinated UI changes)
- [x] Dependencies clearly documented
- [x] Deployment workflow includes verification steps
- [x] Rollback procedure available in quickstart.md
- [x] User context incorporated (auto-deploy to production)

---

**Status**: ✅ Tasks ready for execution - proceed with T001
