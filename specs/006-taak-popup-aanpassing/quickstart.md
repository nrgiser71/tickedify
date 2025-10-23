# Quickstart: Checkbox Positie Verificatie

## Doel
Verifieer dat de checkbox om een taak als afgewerkt aan te duiden correct links van de taaknaam staat in de Planning Popup, en dat alle functionaliteit blijft werken.

## Prerequisites
- Tickedify applicatie draait lokaal of op staging
- Ingelogd als gebruiker met bestaande taken
- Browser developer tools beschikbaar voor responsive testing

## Test Procedure

### 1. Visual Layout Verificatie - Desktop

**Actie**: Open Planning Popup met bestaande taak
1. Navigeer naar "Inbox" of "Acties" lijst
2. Klik op een bestaande taak om Planning Popup te openen
3. Observeer de "Taaknaam:" sectie

**Verwacht Resultaat**:
- ✅ Checkbox staat links van het input veld
- ✅ Checkbox en input veld staan op dezelfde horizontale lijn
- ✅ Er is visuele spacing (5-10px) tussen checkbox en input
- ✅ Input field neemt resterende breedte in beslag
- ✅ Layout ziet er natuurlijk en gebalanceerd uit

**Screenshots**: Maak screenshot voor documentatie

### 2. Visual Layout Verificatie - Tablet

**Actie**: Test responsive gedrag op tablet formaat
1. Open browser developer tools (F12)
2. Activeer device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Selecteer iPad (portrait 768x1024)
4. Open Planning Popup met bestaande taak

**Verwacht Resultaat**:
- ✅ Layout blijft horizontal (checkbox links van input)
- ✅ Input field blijft goed leesbaar en bruikbaar
- ✅ Touch target voor checkbox is >44px
- ✅ Geen overlap of text truncation

**Test ook**: iPad landscape (1024x768)

### 3. Visual Layout Verificatie - Mobile

**Actie**: Test op mobile formaat
1. In device toolbar: selecteer iPhone 12 Pro (390x844)
2. Open Planning Popup met bestaande taak

**Verwacht Resultaat**:
- ✅ Checkbox blijft zichtbaar en clickable
- ✅ Input field heeft genoeg ruimte voor text entry
- ✅ Layout blijft horizontal (geen wrap naar nieuwe regel)
- ✅ Popup blijft within viewport zonder horizontal scroll

**Test ook**:
- iPhone SE (kleinste formaat: 375px breed)
- Android large phones (412px breed)

### 4. Functionaliteit Verificatie - Checkbox Toggle

**Actie**: Verifieer dat checkbox functionaliteit intact blijft
1. Open Planning Popup met incomplete taak
2. Klik op de checkbox om taak als afgewerkt te markeren
3. Observeer visuele feedback (checkmark verschijnt)
4. Klik opnieuw om checkbox te un-checken
5. Observeer dat checkmark verdwijnt

**Verwacht Resultaat**:
- ✅ Checkbox reageert direct op klik
- ✅ Visual state (checked/unchecked) is duidelijk
- ✅ Click target is groot genoeg (minimum 24x24px)
- ✅ Geen console errors in developer tools

### 5. Functionaliteit Verificatie - Task Completion

**Actie**: Verifieer dat task completion workflow werkt
1. Open Planning Popup met incomplete taak
2. Check de checkbox om taak af te werken
3. Klik "Maak actie" of "Opslaan" button
4. Observeer dat popup sluit
5. Verifieer in takenoverzicht dat taak status updated

**Verwacht Resultaat**:
- ✅ Taak wordt correct gemarkeerd als afgewerkt
- ✅ Taak verdwijnt uit "Acties" lijst (of toont strike-through)
- ✅ Taak verschijnt in "Afgewerkt" lijst
- ✅ Geen JavaScript errors

### 6. Accessibility Verificatie

**Actie**: Verifieer toegankelijkheid
1. Open Planning Popup
2. Test keyboard navigatie:
   - Tab om naar checkbox te navigeren
   - Spatiebalk om checkbox te togglen
   - Tab om naar input field te gaan
3. Test met screenreader (optioneel)

**Verwacht Resultaat**:
- ✅ Checkbox is focusable via Tab
- ✅ Focus indicator is duidelijk zichtbaar
- ✅ Spatiebalk togglet checkbox correct
- ✅ Logical tab order (checkbox → input → andere velden)

### 7. Cross-browser Verificatie

**Actie**: Test in verschillende browsers
- Chrome/Edge (Chromium)
- Firefox
- Safari (Mac/iOS)

**Verwacht Resultaat**:
- ✅ Layout is consistent across browsers
- ✅ Spacing en alignment zijn identiek
- ✅ Functionaliteit werkt in alle browsers

### 8. Edge Cases

**Test Scenario's**:

#### 8a. Lange Taaknaam
1. Open popup met taak met zeer lange naam (>100 karakters)
2. Observeer layout behavior

**Verwacht**: Input field wraps text, checkbox blijft fixed links

#### 8b. Lege Taaknaam
1. Open popup met lege taaknaam
2. Observeer placeholder text visibility

**Verwacht**: Placeholder is goed zichtbaar naast checkbox

#### 8c. Popup Resize
1. Open popup
2. Resize browser window van breed naar smal
3. Observeer layout aanpassing

**Verwacht**: Layout blijft intact, geen broken alignment

## Success Criteria

**Alle tests moeten slagen voordat feature als compleet wordt beschouwd**:

- [x] Visual layout is correct op desktop, tablet, mobile
- [x] Checkbox functionaliteit werkt (toggle on/off)
- [x] Task completion workflow blijft functioneel
- [x] Accessibility is intact (keyboard, focus)
- [x] Cross-browser compatibiliteit
- [x] Edge cases zijn handled
- [x] Geen console errors of warnings
- [x] Consistent met rest van applicatie design

## Rollback Procedure

**Als tests falen**:
1. Noteer exacte failure scenario
2. Maak screenshots van probleem
3. Revert changes: `git checkout HEAD -- public/index.html public/style.css`
4. Restart development server
5. Analyze failure en create bug fix

## Notes

- Deze test procedure moet worden uitgevoerd op zowel develop (staging) als production deployment
- Test eerst lokaal, dan staging, dan pas production release
- Screenshots van voor/na helpen bij user communication in changelog

## Estimated Time

**Total test duration**: 15-20 minuten
- Visual tests: 5 min
- Functional tests: 5 min
- Cross-browser: 5 min
- Edge cases: 5 min
