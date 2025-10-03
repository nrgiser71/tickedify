# Tasks: Verwijderen 'Geblokkeerd & Pauzes' Blok

**Input**: Design documents from `/specs/004-in-het-dagelijkse/`
**Prerequisites**: plan.md (✅), quickstart.md (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Loaded - UI removal scope defined
   ✅ Tech stack: Vanilla JavaScript, HTML5, CSS3
   ✅ Structure: Frontend only (public/ directory)
2. Load optional design documents:
   ✅ quickstart.md: Testing scenarios extracted
   ❌ data-model.md: N/A (no data model changes)
   ❌ contracts/: N/A (no API endpoints)
   ❌ research.md: N/A (no research needed)
3. Generate tasks by category:
   ✅ Setup: Git safety check
   ✅ Tests: Pre-implementation verification
   ✅ Core: HTML/CSS removal from app.js
   ✅ Integration: N/A (no integrations)
   ✅ Polish: Regression testing, deployment
4. Apply task rules:
   ✅ Sequential execution (single file modifications)
   ✅ No parallel tasks (all changes in app.js)
   ✅ Manual testing before deployment
5. Number tasks sequentially (T001-T009)
6. Generate dependency graph
7. Create parallel execution examples: N/A (sequential workflow)
8. Validate task completeness:
   ✅ Pre-verification before changes
   ✅ HTML removal defined
   ✅ CSS cleanup included
   ✅ Testing steps specified
   ✅ Deployment workflow included
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **No [P] markers**: All tasks modify same file (public/app.js) - must be sequential
- Include exact line numbers for precise modifications

## Path Conventions
- **Web app frontend**: `public/` at repository root
- All modifications in `public/app.js` and potentially `public/style.css`

---

## Phase 3.1: Pre-Implementation Safety
- [x] **T001** Controleer huidige git branch is `004-in-het-dagelijkse`
  - Run: `git branch --show-current`
  - Verwacht: `004-in-het-dagelijkse`
  - Als niet correct: `git checkout 004-in-het-dagelijkse`

- [x] **T002** Verifieer pre-implementation staat (quickstart verificatie)
  - Open https://tickedify.com/app in browser
  - Log in met credentials: jan@buskens.be / qyqhut-muDvop-fadki9
  - Navigeer naar Dagelijkse Planning scherm
  - Verifieer dat "🔒 Geblokkeerd & Pauzes" blok AANWEZIG is met:
    - Header met chevron icon
    - Sectie "🔒 Geblokkeerd" met 4 template items (30/60/90/120 min)
    - Sectie "☕ Pauzes" met 3 template items (5/10/15 min)
  - Screenshot maken indien mogelijk voor before/after vergelijking

---

## Phase 3.2: Core Implementation

- [x] **T003** Verwijder HTML blok uit public/app.js (regels 8290-8312)
  - Bestand: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`
  - Te verwijderen: Volledig `<div class="templates-sectie collapsible" id="templates-sectie">` blok
  - Start regel: ~8290 (zoek naar: `<!-- Templates - collapsible section -->`)
  - Eind regel: ~8312 (inclusief sluitende `</div>` van templates-sectie)
  - Verificatie: Zoek bevestiging dat regels volledig verwijderd zijn
  - **BELANGRIJK**: Laat andere secties (tijd-sectie, prioriteiten-sectie) intact

- [x] **T004** Controleer en verwijder CSS voor .templates-sectie in public/style.css
  - Bestand: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/style.css`
  - Zoek naar: `.templates-sectie` CSS regels
  - Indien aanwezig: verwijder alle `.templates-sectie` specifieke styling
  - Indien niet aanwezig: skip deze stap (geen actie nodig)
  - Verificatie: Grep op "templates-sectie" returnt geen resultaten in style.css

- [x] **T005** Verwijder debug UI slider voor templates-sectie (optioneel cleanup)
  - Bestand: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`
  - Regels: ~12015-12018
  - Zoek naar: `<label>templates-sectie height:</label>`
  - Verwijder volledig debug slider element voor templates-sectie
  - Ook verwijder: regel ~12048 `document.querySelector('.templates-sectie').style.height = '';`
  - **BELANGRIJK**: Laat andere debug sliders (acties-sectie, tijd-instellingen) intact

---

## Phase 3.3: Version & Deployment

- [x] **T006** Update version in package.json
  - Bestand: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/package.json`
  - Lees huidige version (bijv. "0.16.22")
  - Increment patch level (bijv. "0.16.22" → "0.16.23")
  - Update version field in package.json
  - Verificatie: `cat package.json | grep version`

- [x] **T007** Update changelog met deze wijziging
  - Bestand: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/changelog.html`
  - Voeg nieuwe entry toe bovenaan met:
    - Nieuwe version number (uit T006)
    - Datum: 2025-10-03
    - Badge: `badge-fix` (UI cleanup)
    - Icon: 🧹
    - Beschrijving: "Verwijderd 'Geblokkeerd & Pauzes' blok uit Dagelijkse Planning voor opgeruimdere interface"
  - Update vorige "badge-latest" naar "badge-fix"
  - Zet nieuwe entry op "badge-latest"

- [x] **T008** Git commit en push naar develop branch
  - Commit message: "🧹 Verwijder 'Geblokkeerd & Pauzes' blok uit Dagelijkse Planning - versie [VERSION]"
  - Voeg Co-Authored-By footer toe volgens CLAUDE.md richtlijnen
  - Commands:
    ```bash
    git add public/app.js public/style.css public/changelog.html package.json
    git commit -m "$(cat <<'EOF'
    🧹 Verwijder 'Geblokkeerd & Pauzes' blok uit Dagelijkse Planning - versie [VERSION]

    - Verwijderd volledig templates-sectie HTML blok (regels 8290-8312)
    - Verwijderd CSS voor .templates-sectie (indien aanwezig)
    - Verwijderd debug UI slider voor templates-sectie
    - UI cleanup voor opgeruimder Dagelijkse Planning scherm

    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    Co-Authored-By: Claude <noreply@anthropic.com>
    EOF
    )"
    git push origin 004-in-het-dagelijkse
    ```
  - Verificatie: `git log -1` toont correcte commit

---

## Phase 3.4: Testing & Verification

- [x] **T009** Deploy naar staging en wacht op deployment
  - Staging deployment gebeurt automatisch via Vercel bij git push
  - Wacht 15 seconden
  - Check deployment status via: `curl -s -L -k https://tickedify.com/api/version`
  - Herhaal elke 15 seconden tot version matcht nieuwe version uit package.json
  - Max wachttijd: 2 minuten
  - Bij timeout: rapporteer deployment issue

- [x] **T010** Post-implementation visual verification (quickstart testing)
  - Open https://tickedify.com/app in browser (hard refresh: Cmd+Shift+R)
  - Log in met credentials: jan@buskens.be / qyqhut-muDvop-fadki9
  - Navigeer naar Dagelijkse Planning scherm
  - **Verwacht resultaat**:
    - ❌ "Geblokkeerd & Pauzes" blok is NIET meer zichtbaar
    - ✅ "⏰ Tijd" sectie is nog steeds aanwezig en functioneel
    - ✅ "⭐ Top 3 Prioriteiten" sectie is nog steeds aanwezig en functioneel
  - Screenshot maken voor after staat
  - Rapporteer SUCCESS of FAILURE met details

- [x] **T011** Regression testing - Collapsible sections
  - Test "⏰ Tijd" sectie:
    - Klik op header om in/uit te klappen
    - Verifieer collapse animatie werkt
    - Wijzig starttijd en eindtijd
    - **Verwacht**: Functionaliteit ongewijzigd
  - Test "⭐ Top 3 Prioriteiten" sectie:
    - Klik op header om in/uit te klappen
    - Verifieer collapse animatie werkt
    - Bekijk bestaande prioriteiten
    - **Verwacht**: Functionaliteit ongewijzigd
  - Rapporteer eventuele issues

- [x] **T012** Regression testing - Planning functionaliteit
  - Test drag & drop:
    - Sleep een taak uit "Acties" lijst naar planning kalender
    - Verifieer dat taak correct wordt toegevoegd
    - **Verwacht**: Drag & drop werkt ongewijzigd
  - Test planning resize:
    - Resize de planning kolom breedte via resize handle
    - **Verwacht**: Resize werkt normaal
  - Check browser console:
    - Open Developer Tools (F12)
    - Check Console tab voor errors
    - **Verwacht**: Geen nieuwe errors
  - Rapporteer eventuele issues

---

## Dependencies

**Sequential Flow** (all tasks modify same files):
```
T001 (Git branch check)
  ↓
T002 (Pre-verification)
  ↓
T003 (HTML removal) → blocks T004-T005
  ↓
T004 (CSS cleanup)
  ↓
T005 (Debug UI cleanup)
  ↓
T006 (Version bump) → blocks T007-T008
  ↓
T007 (Changelog update)
  ↓
T008 (Git commit & push) → blocks T009-T012
  ↓
T009 (Deployment verification)
  ↓
T010 (Visual verification)
  ↓
T011 (Collapsible regression)
  ↓
T012 (Planning regression)
```

**Critical Path**: T001 → T002 → T003 → T006 → T008 → T009 → T010

**Checkpoint Gates**:
- After T002: Bevestig blok is aanwezig (baseline)
- After T008: Deployment succesvol naar staging
- After T010: Bevestig blok is verwijderd (goal achieved)
- After T012: All regression tests passed

---

## Parallel Example

**N/A for this feature** - All tasks modify the same file (public/app.js) and must be executed sequentially to avoid conflicts.

---

## Notes

- **No parallel tasks**: Single file modifications require sequential execution
- **Manual testing required**: Browser-based visual verification essential
- **Deployment workflow**: Automated via Vercel, but requires version verification
- **Rollback available**: `git checkout HEAD~1 public/app.js` if issues arise
- **Complexity**: Very low - simple UI cleanup without business logic changes

---

## Task Generation Rules Applied

1. **From Contracts**: N/A (no API contracts)
2. **From Data Model**: N/A (no data model)
3. **From User Stories**:
   - Quickstart verification scenarios → T002, T010, T011, T012
4. **Ordering**:
   - Setup (T001) → Verification (T002) → Implementation (T003-T005) → Version (T006-T007) → Deploy (T008-T009) → Testing (T010-T012)

---

## Validation Checklist
*GATE: Checked before execution*

- [x] All contracts have corresponding tests: N/A (no contracts)
- [x] All entities have model tasks: N/A (no entities)
- [x] All tests come before implementation: ✅ T002 (pre-verification) before T003 (implementation)
- [x] Parallel tasks truly independent: N/A (no parallel tasks)
- [x] Each task specifies exact file path: ✅ All paths specified
- [x] No task modifies same file as another [P] task: ✅ No [P] tasks (sequential only)

---

**Status**: ✅ Ready for execution via `/implement` command or manual task completion
