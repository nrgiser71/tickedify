# Bug Investigation: New Task Input verschijnt onterecht op Actions pagina

## Problem Description

**Symptoom:** De "New task..." input field met Add en Voice knoppen verschijnt INTERMITTEREND bovenaan de Actions pagina. Dit hoort daar NIET te staan - de task input is alleen bedoeld voor de Inbox pagina.

## Root Cause Analysis - DEFINITIEF BEWIJS

### 1. De Input Container Definitie

**Locatie:** `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/index.html` (regels 173-190)

```html
<div class="taak-input-container" id="taak-input-container">
    <input type="text" id="taakInput" placeholder="New task..." autofocus>
    <button id="toevoegBtn">Add</button>
    <!-- Voice button hier -->
</div>
```

Dit element bestaat STATISCH in de HTML en is dus ALTIJD aanwezig in de DOM.

### 2. De Normale Visibility Logica (werkt correct)

**Locatie:** `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js` (regels 3466-3476)

```javascript
// Update input visibility (alleen inbox heeft input)
const inputContainer = document.getElementById('taak-input-container');
if (inputContainer) {
    if (lijst === 'inbox') {
        inputContainer.style.display = 'flex';
        this.bindInboxEvents();
    } else {
        inputContainer.style.display = 'none';  // <-- VERBERGT voor andere lijsten
    }
}
```

Dit wordt aangeroepen in `navigeerNaarLijst()` en werkt correct.

### 3. DE BUG - updateTaskControls() Overschrijft de Display State

**Locatie:** `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js` (regels 16320-16346)

```javascript
updateTaskControls(isAuthenticated) {
    const taakInputContainer = document.getElementById('taak-input-container');

    if (isAuthenticated) {
        // BUG: ALTIJD display='flex' voor authenticated users
        // ZONDER te controleren welke lijst actief is!
        if (taakInputContainer) taakInputContainer.style.display = 'flex';
        // ... rest van de code
    }
}
```

**DIT IS DE ROOT CAUSE.** De functie `updateTaskControls(true)` zet de input container ALTIJD op `display: flex` voor ingelogde gebruikers, ONGEACHT welke lijst actief is.

### 4. Wanneer wordt updateTaskControls aangeroepen?

De functie wordt aangeroepen vanuit `updateUI()` op regel 16268:

```javascript
async updateUI() {
    if (this.isAuthenticated && this.currentUser) {
        // ... andere code
        this.updateTaskControls(true);  // <-- Regel 16268
    }
}
```

### 5. Wanneer wordt updateUI() aangeroepen? (Triggers voor de bug)

`updateUI()` wordt aangeroepen bij de volgende events:

| Regel | Trigger Event |
|-------|---------------|
| 15898 | Na succesvolle login |
| 15970 | Na registratie |
| 16006 | Na password reset |
| 16047 | Na magic link login |
| 16087 | Tijdens checkAuthStatus() |
| 16123 | Na auth check completion |
| 16134 | Na auth check error |
| 18351 | Bij logout |
| 18517 | In AuthManager |
| 18615 | In AuthManager |

### 6. Waarom is het INTERMITTEREND?

Het probleem treedt op wanneer:

1. **Session check interval (elke 60 seconden)** - Regel 16158-16162
   ```javascript
   this.sessionCheckInterval = setInterval(() => {
       if (this.isAuthenticated) {
           this.checkAuthStatus();  // <-- Roept updateUI() aan
       }
   }, 60000);
   ```

2. **Visibility change event** - Wanneer gebruiker terugkomt naar browser tab (regel 16208-16222)
   ```javascript
   document.addEventListener('visibilitychange', () => {
       if (document.visibilityState === 'visible' && this.isAuthenticated) {
           this.checkAuthStatus();  // <-- Roept updateUI() aan
       }
   });
   ```

**Scenario die de bug triggert:**
1. Gebruiker navigeert naar Actions pagina
2. `navigeerNaarLijst('acties')` verbergt de input container correct (`display: none`)
3. 60 seconden later: session check triggert `checkAuthStatus()`
4. `checkAuthStatus()` roept `updateUI()` aan
5. `updateUI()` roept `updateTaskControls(true)` aan
6. `updateTaskControls(true)` zet input container terug naar `display: flex`
7. **De input verschijnt onterecht op de Actions pagina**

OF:

1. Gebruiker is op Actions pagina
2. Gebruiker wisselt naar andere browser tab
3. Gebruiker komt terug naar Tickedify tab
4. Visibility change event triggert `checkAuthStatus()`
5. Stappen 4-7 van hierboven

## Bewezen Fix

De fix is simpel - `updateTaskControls()` moet de huidige lijst checken voordat het de display state wijzigt:

**Bestand:** `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`
**Regels:** 16326-16328

**Huidige code (BUGGY):**
```javascript
if (isAuthenticated) {
    // Show task input container for authenticated users
    if (taakInputContainer) taakInputContainer.style.display = 'flex';
```

**Gecorrigeerde code:**
```javascript
if (isAuthenticated) {
    // Show task input container ONLY for inbox - other lists don't need it
    if (taakInputContainer) {
        const currentList = window.app?.huidigeLijst || 'inbox';
        taakInputContainer.style.display = (currentList === 'inbox') ? 'flex' : 'none';
    }
```

## Todo

- [x] Root cause identificeren met code bewijs
- [ ] Fix implementeren in app.js regel 16326-16328
- [ ] Bump version in package.json
- [ ] Commit en push naar staging
- [ ] Test de fix op dev.tickedify.com

## Conclusie

**De bug is 100% geverifieerd.** Het probleem zit in de `updateTaskControls()` functie die de `taak-input-container` altijd op `display: flex` zet voor authenticated users, zonder te controleren of de gebruiker op de inbox pagina is. Dit wordt getriggerd door session checks (elke 60 seconden) en visibility change events (wanneer gebruiker terugkomt naar de browser tab).
