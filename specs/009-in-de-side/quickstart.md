# Quickstart: Sidebar Tools Section Verwijderen - Testing Guide

**Feature**: 009-in-de-side
**Version**: 0.16.34 (verwacht)
**Date**: 2025-10-08

## Doel
Verifieer dat de Tools dropdown is verwijderd en alle menu items correct functioneren in hun nieuwe flat structuur.

---

## Pre-requisites

- ✅ Deployment naar productie voltooid
- ✅ Browser beschikbaar (Chrome/Safari/Firefox)
- ✅ Toegang tot tickedify.com/app
- ✅ Login credentials: jan@buskens.be / qyqhut-muDvop-fadki9

---

## Test Scenario 1: Visuele Verificatie

**Doel**: Controleer dat de UI correct is aangepast

### Stappen:

1. **Open applicatie**
   ```
   Navigate to: https://tickedify.com/app
   Login: jan@buskens.be / qyqhut-muDvop-fadki9
   ```

2. **Controleer sidebar navigatie**
   - [ ] "Tools" openklapbaar menu item is **NIET** zichtbaar
   - [ ] Geen dropdown chevron icon naast Tools icon
   - [ ] 4 nieuwe menu items zijn direct zichtbaar onder "Afgewerkt"

3. **Verifieer volgorde items**

   Verwachte volgorde in sidebar:
   ```
   📥 Inbox
   ✅ Acties
   📋 Projecten
   🏷️  Contexten
   ⏰ Vandaag
   ✔️  Afgewerkt

   [EXTRA RUIMTE - visueel zichtbaar]

   📅 Dagelijkse Planning
   🏷️  Contexten Beheer
   📄 CSV Import
   🔍 Zoeken

   💬 Feedback & Support
   ```

4. **Controleer spacing**
   - [ ] Er is **duidelijk meer ruimte** tussen "Afgewerkt" en "Dagelijkse Planning"
   - [ ] Ruimte is visueel vergelijkbaar met spacing tussen sidebar secties
   - [ ] Ongeveer 20px extra margin boven "Dagelijkse Planning"

**✅ Acceptance Criteria**: Alle checkboxes checked, visuele structuur klopt

---

## Test Scenario 2: Functionaliteit Verificatie

**Doel**: Controleer dat alle menu items nog steeds correct werken

### Test 2.1: Dagelijkse Planning

1. Klik op **"Dagelijkse Planning"** in sidebar
2. **Verwacht resultaat**:
   - [ ] Dagelijkse planning view wordt geladen
   - [ ] Kalender wordt getoond met vandaag's datum
   - [ ] Taken kunnen worden gesleept naar kalender

### Test 2.2: Contexten Beheer

1. Klik op **"Contexten Beheer"** in sidebar
2. **Verwacht resultaat**:
   - [ ] Contexten beheer modal/view opent
   - [ ] Bestaande contexten worden getoond
   - [ ] Nieuwe contexten kunnen worden toegevoegd

### Test 2.3: CSV Import

1. Klik op **"CSV Import"** in sidebar
2. **Verwacht resultaat**:
   - [ ] CSV import modal opent
   - [ ] File upload interface is beschikbaar
   - [ ] Mapping interface werkt correct

### Test 2.4: Zoeken

1. Klik op **"Zoeken"** in sidebar
2. **Verwacht resultaat**:
   - [ ] Zoek interface/modal wordt geactiveerd
   - [ ] Zoek veld krijgt focus
   - [ ] Zoeken werkt over alle taken

**✅ Acceptance Criteria**: Alle 4 menu items functioneren zoals voorheen

---

## Test Scenario 3: Responsive Verificatie

**Doel**: Controleer responsive gedrag op verschillende schermformaten

### Test 3.1: Desktop (1920x1080)

1. Open browser op full screen desktop
2. **Controleer**:
   - [ ] Sidebar is volledig zichtbaar
   - [ ] Alle menu items passen zonder scroll
   - [ ] Spacing tussen items is consistent

### Test 3.2: Tablet (768x1024)

1. Resize browser naar tablet breedte (768px)
2. **Controleer**:
   - [ ] Sidebar gedrag is correct (collapsed/expanded)
   - [ ] Menu items blijven toegankelijk
   - [ ] Touch-friendly spacing behouden

### Test 3.3: Mobile (375x667)

1. Resize browser naar mobile breedte (375px) OF test op mobiel device
2. **Controleer**:
   - [ ] Sidebar wordt overlay/drawer
   - [ ] Toggle button werkt correct
   - [ ] Alle menu items zijn scrollbaar indien nodig
   - [ ] Items zijn touch-friendly (voldoende touch target size)

**✅ Acceptance Criteria**: Responsive gedrag werkt op alle breakpoints

---

## Test Scenario 4: Regression Testing

**Doel**: Verifieer dat bestaande functionaliteit niet is broken

### Test 4.1: Andere Sidebar Items

1. Test navigatie naar andere sidebar items:
   - [ ] Inbox → laden werkt
   - [ ] Acties → laden werkt
   - [ ] Projecten → laden werkt
   - [ ] Contexten → laden werkt
   - [ ] Vandaag → laden werkt
   - [ ] Afgewerkt → laden werkt

### Test 4.2: Feedback & Support

1. Controleer dat Feedback sectie nog werkt:
   - [ ] Bug Melden modal opent
   - [ ] Feature Request modal opent

**✅ Acceptance Criteria**: Geen regressies in bestaande functionaliteit

---

## Test Scenario 5: Cross-Browser Testing

**Doel**: Verifieer consistentie over browsers

### Browsers te testen:

1. **Chrome** (latest)
   - [ ] Visuele verificatie passed
   - [ ] Functionaliteit verificatie passed

2. **Safari** (latest)
   - [ ] Visuele verificatie passed
   - [ ] Functionaliteit verificatie passed

3. **Firefox** (latest)
   - [ ] Visuele verificatie passed
   - [ ] Functionaliteit verificatie passed

**✅ Acceptance Criteria**: Consistente ervaring in alle browsers

---

## Rollback Procedure (indien nodig)

**Indien kritieke bugs worden gevonden**:

1. **Identificeer issue**:
   ```
   Beschrijf exact wat niet werkt
   Browser + OS versie
   Screenshots indien mogelijk
   ```

2. **Git rollback**:
   ```bash
   git checkout main
   git revert [commit-hash-van-feature]
   git push origin main
   ```

3. **Deployment verificatie**:
   ```bash
   # Check na 15-30 seconden
   curl -s -L -k https://tickedify.com/api/version
   # Versie moet terug naar 0.16.33
   ```

---

## Success Criteria Samenvatting

Feature wordt **APPROVED** als:

- ✅ Alle 5 test scenarios slagen
- ✅ Geen visuele bugs in 3+ browsers
- ✅ Geen functionaliteit regressies
- ✅ Responsive design werkt correct
- ✅ Performance is niet verslechterd

---

## Notities voor Tester

**Bekende verwachtingen**:
- Sidebar heeft nu 10 directe items (was 6 + 1 dropdown met 4 items)
- Visuele hiërarchie is platter maar duidelijker
- Geen functionaliteit wijzigingen - alleen UI reorganisatie

**Focus areas**:
- Spacing tussen "Afgewerkt" en "Dagelijkse Planning" moet duidelijk zijn
- Alle 4 voormalige Tools items moeten functioneren
- Mobile touch targets moeten voldoende groot zijn

---

**Testing Status**: Ready for execution na deployment
