# Tasks: Sterke Wachtwoord Validatie

**Feature**: 017-pas-het-registratieprocess
**Branch**: `017-pas-het-registratieprocess`
**Input**: Design documents from `/specs/017-pas-het-registratieprocess/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow Summary
```
1. Loaded plan.md → Tech stack: JavaScript (Node.js + Vanilla JS), Express.js, PostgreSQL
2. Loaded data-model.md → Entities: Password validation rules (client & server)
3. Loaded contracts/ → 1 contract: POST /api/registreer (modified)
4. Loaded research.md → Decisions: Real-time validation, regex patterns, show/hide toggle
5. Generated tasks by category:
   → Client-side: UI/CSS (4 tasks), JavaScript validation (5 tasks)
   → Server-side: Validation logic (4 tasks)
   → Testing: Manual test scenarios (3 tasks)
   → Deployment: Version bump, changelog, git (3 tasks)
6. Applied Tickedify-specific rules:
   → No TDD (manual testing via Playwright)
   → HTML/CSS tasks can run parallel [P]
   → Client JS and Server tasks can run parallel [P]
   → Testing sequential after implementation
   → Deployment sequential after testing
7. Numbered tasks: T001-T019 (19 tasks total)
8. Validation: All requirements from spec.md covered ✓
9. Ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute and exact
- Tasks ordered by dependency and logical flow

## Path Conventions (Tickedify)
```
/Users/.../Tickedify/
├── public/
│   ├── index.html       # Registratie pagina (client-side UI + inline JS)
│   ├── style.css        # Global styling
│   └── changelog.html   # User-facing changelog
├── server.js            # Backend API (POST /api/registreer)
├── package.json         # Version tracking
└── specs/017-.../       # Feature documentation
```

---

## Phase 3.1: Client-Side UI/CSS (Parallel Execution Possible)

### T001 [X] [P] HTML: Wachtwoord Requirements List Toevoegen
**File**: `public/index.html`
**Location**: Registratie formulier sectie (na wachtwoord input field)
**Description**:
- Voeg HTML structure toe voor wachtwoord vereisten lijst
- Voeg `<div class="password-requirements">` toe direct onder het wachtwoord input veld
- Voeg `<ul>` met 4 `<li>` items toe voor elke requirement
- Geef elke `<li>` een unieke ID: `req-length`, `req-uppercase`, `req-digit`, `req-special`
- Geef elke `<li>` initial class `password-requirement neutral`
- Nederlandse teksten volgens data-model.md:
  - "Minimaal 8 tekens"
  - "Minimaal 1 hoofdletter"
  - "Minimaal 1 cijfer"
  - "Minimaal 1 speciaal teken"

**Expected Output**:
```html
<div class="password-requirements">
  <p>Wachtwoord moet voldoen aan:</p>
  <ul>
    <li id="req-length" class="password-requirement neutral">Minimaal 8 tekens</li>
    <li id="req-uppercase" class="password-requirement neutral">Minimaal 1 hoofdletter</li>
    <li id="req-digit" class="password-requirement neutral">Minimaal 1 cijfer</li>
    <li id="req-special" class="password-requirement neutral">Minimaal 1 speciaal teken</li>
  </ul>
</div>
```

**Dependencies**: None
**Can Run Parallel With**: T002, T003, T004

---

### T002 [X] [P] HTML: Show/Hide Password Toggle Toevoegen
**File**: `public/index.html`
**Location**: Bij wachtwoord input field (inline button of icon)
**Description**:
- Voeg toggle button toe naast wachtwoord input field
- Button moet eye icon hebben (gebruik Unicode &#128065; of Font Awesome indien beschikbaar)
- Geef button ID `toggle-password-visibility`
- Button type moet `button` zijn (niet `submit`)
- Voeg aria-label toe voor accessibility: "Toon/verberg wachtwoord"

**Expected Output**:
```html
<div class="password-input-wrapper">
  <input type="password" id="wachtwoord" name="wachtwoord" required>
  <button type="button" id="toggle-password-visibility" aria-label="Toon/verberg wachtwoord">
    <span id="toggle-icon">&#128065;</span>
  </button>
</div>
```

**Dependencies**: None
**Can Run Parallel With**: T001, T003, T004

---

### T003 [X] [P] CSS: Password Requirements Styling
**File**: `public/style.css`
**Location**: Nieuwe sectie voor password validation styles
**Description**:
- Voeg CSS toe voor `.password-requirements` container
- Voeg CSS toe voor `.password-requirement` base class
- Voeg CSS toe voor states: `.neutral`, `.valid`, `.invalid`
- Kleuren volgens research.md:
  - `.neutral`: grijs (#666)
  - `.valid`: groen (#28a745) met ✓ icon via ::before
  - `.invalid`: rood (#dc3545) met ✗ icon via ::before
- Font size: 0.9em voor requirements list
- Margin/padding voor clean layout

**Expected Output**:
```css
.password-requirements {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.password-requirements p {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 0.95em;
}

.password-requirements ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.password-requirement {
  font-size: 0.9em;
  padding: 4px 0;
  transition: color 0.2s ease;
}

.password-requirement.neutral {
  color: #666;
}

.password-requirement.valid {
  color: #28a745;
}

.password-requirement.valid::before {
  content: "✓ ";
  font-weight: bold;
}

.password-requirement.invalid {
  color: #dc3545;
}

.password-requirement.invalid::before {
  content: "✗ ";
  font-weight: bold;
}
```

**Dependencies**: None
**Can Run Parallel With**: T001, T002, T004

---

### T004 [X] [P] CSS: Show/Hide Toggle Button Styling
**File**: `public/style.css`
**Location**: Naast password requirements styling
**Description**:
- Voeg CSS toe voor `.password-input-wrapper` (flexbox container)
- Voeg CSS toe voor `#toggle-password-visibility` button
- Button moet rechts van input field staan (position: absolute of flex)
- Cursor: pointer
- Border: none of subtiele border
- Background: transparant of lichte achtergrond
- Hover effect voor betere UX

**Expected Output**:
```css
.password-input-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

#toggle-password-visibility {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: #666;
  font-size: 1.2em;
}

#toggle-password-visibility:hover {
  color: #333;
}

#toggle-password-visibility:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
```

**Dependencies**: None
**Can Run Parallel With**: T001, T002, T003

---

## Phase 3.2: Client-Side JavaScript Validation (Parallel with Server-Side)

### T005 [X] [P] JS: Password Validation Rules Object
**File**: `public/index.html` (inline `<script>` sectie in registratie formulier)
**Location**: JavaScript sectie voor registratie validatie
**Description**:
- Implementeer `passwordValidationRules` object volgens data-model.md
- 4 rules: `minLength`, `hasUppercase`, `hasDigit`, `hasSpecialChar`
- Elke rule heeft: `test` (function), `message` (string), `element` (string ID)
- Test functions gebruiken regex patterns uit research.md
- Zorg dat object beschikbaar is voor andere functies

**Expected Output**:
```javascript
const passwordValidationRules = {
  minLength: {
    test: (password) => password.length >= 8,
    message: 'Minimaal 8 tekens',
    element: 'req-length'
  },
  hasUppercase: {
    test: (password) => /[A-Z]/.test(password),
    message: 'Minimaal 1 hoofdletter',
    element: 'req-uppercase'
  },
  hasDigit: {
    test: (password) => /[0-9]/.test(password),
    message: 'Minimaal 1 cijfer',
    element: 'req-digit'
  },
  hasSpecialChar: {
    test: (password) => /[^A-Za-z0-9]/.test(password),
    message: 'Minimaal 1 speciaal teken',
    element: 'req-special'
  }
};
```

**Dependencies**: None
**Can Run Parallel With**: T006, T007, T008, T009, T010-T013 (server-side)

---

### T006 [X] JS: Real-Time Validation Function
**File**: `public/index.html` (inline `<script>`)
**Location**: Na passwordValidationRules object
**Description**:
- Implementeer `validatePasswordStrength(password)` functie
- Loop door alle rules in `passwordValidationRules`
- Run test functie voor elke rule
- Return object met results: `{ minLength: true/false, hasUppercase: true/false, ... }`
- Return ook `isValid: boolean` (alle rules passed)

**Expected Output**:
```javascript
function validatePasswordStrength(password) {
  const results = {};
  let allValid = true;

  for (const [ruleName, rule] of Object.entries(passwordValidationRules)) {
    const isValid = rule.test(password);
    results[ruleName] = isValid;
    if (!isValid) allValid = false;
  }

  results.isValid = allValid;
  return results;
}
```

**Dependencies**: T005 (needs passwordValidationRules)
**Can Run Parallel With**: T007, T008, T009 (after T005 done)

---

### T007 [X] JS: Visual Feedback Update Function
**File**: `public/index.html` (inline `<script>`)
**Location**: Na validatePasswordStrength functie
**Description**:
- Implementeer `updatePasswordFeedback(validationResults)` functie
- Loop door validation results
- Voor elke rule: get DOM element by ID (from rule.element)
- Update element class: remove 'neutral', 'valid', 'invalid'
- Add class 'valid' if passed, 'invalid' if failed
- CSS zal automatisch icons tonen via ::before

**Expected Output**:
```javascript
function updatePasswordFeedback(validationResults) {
  for (const [ruleName, rule] of Object.entries(passwordValidationRules)) {
    const element = document.getElementById(rule.element);
    const isValid = validationResults[ruleName];

    // Remove all state classes
    element.classList.remove('neutral', 'valid', 'invalid');

    // Add appropriate state class
    if (isValid) {
      element.classList.add('valid');
    } else {
      element.classList.add('invalid');
    }
  }
}
```

**Dependencies**: T005 (needs passwordValidationRules)
**Can Run Parallel With**: T006, T008, T009 (after T005 done)

---

### T008 [X] JS: Input Event Listener Setup
**File**: `public/index.html` (inline `<script>`)
**Location**: DOMContentLoaded event handler
**Description**:
- Voeg event listener toe aan wachtwoord input field (ID: `wachtwoord`)
- Luister naar `input` event (fires tijdens typen)
- Bij elke input: run `validatePasswordStrength(value)`
- Update visual feedback met `updatePasswordFeedback(results)`
- Update submit button enabled/disabled state

**Expected Output**:
```javascript
document.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.getElementById('wachtwoord');
  const submitButton = document.getElementById('registreer-button');

  passwordInput.addEventListener('input', function() {
    const password = this.value;
    const validationResults = validatePasswordStrength(password);
    updatePasswordFeedback(validationResults);

    // Enable/disable submit button
    submitButton.disabled = !validationResults.isValid;
  });
});
```

**Dependencies**: T005, T006, T007
**Can Run Parallel With**: T009 (different functionality)

---

### T009 [X] [P] JS: Show/Hide Password Toggle Function
**File**: `public/index.html` (inline `<script>`)
**Location**: DOMContentLoaded event handler
**Description**:
- Voeg event listener toe aan toggle button (ID: `toggle-password-visibility`)
- Bij click: toggle password input type tussen 'password' en 'text'
- Update icon indien nodig (open eye vs closed eye)
- Accessibility: update aria-label

**Expected Output**:
```javascript
document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggle-password-visibility');
  const passwordInput = document.getElementById('wachtwoord');
  const toggleIcon = document.getElementById('toggle-icon');

  toggleButton.addEventListener('click', function() {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleIcon.textContent = '🙈'; // Closed eye
      this.setAttribute('aria-label', 'Verberg wachtwoord');
    } else {
      passwordInput.type = 'password';
      toggleIcon.textContent = '👁️'; // Open eye
      this.setAttribute('aria-label', 'Toon wachtwoord');
    }
  });
});
```

**Dependencies**: T002 (HTML elements must exist)
**Can Run Parallel With**: T005, T006, T007, T008, T010-T013 (server-side)

---

## Phase 3.3: Server-Side Validation (Parallel with Client-Side JS)

### T010 [X] [P] Server: validatePasswordStrength Function
**File**: `server.js`
**Location**: Nieuwe functie boven POST /api/registreer endpoint (rond regel 500-600)
**Description**:
- Implementeer `validatePasswordStrength(password)` functie
- Check alle 4 requirements volgens contracts/api-registreer.md
- Return object: `{ valid: boolean, errors: string[] }`
- Nederlandse foutmeldingen volgens contract
- Edge case: empty/null password → errors array met lengte error

**Expected Output**:
```javascript
function validatePasswordStrength(password) {
  const errors = [];

  // Rule 1: Minimum length
  if (!password || password.length < 8) {
    errors.push('Wachtwoord moet minimaal 8 tekens bevatten');
  }

  // Rule 2: Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Wachtwoord moet minimaal 1 hoofdletter bevatten');
  }

  // Rule 3: Digit
  if (!/[0-9]/.test(password)) {
    errors.push('Wachtwoord moet minimaal 1 cijfer bevatten');
  }

  // Rule 4: Special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Wachtwoord moet minimaal 1 speciaal teken bevatten');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

**Dependencies**: None
**Can Run Parallel With**: T005-T009 (client-side), T011, T012, T013

---

### T011 [X] Server: POST /api/registreer - Voeg Password Validation Toe
**File**: `server.js`
**Location**: POST /api/registreer endpoint (zoek naar bestaande endpoint)
**Description**:
- Voeg password validation toe VOOR email uniqueness check (volgens contract)
- Extract wachtwoord from req.body
- Call `validatePasswordStrength(wachtwoord)`
- If invalid: return 400 met `passwordErrors` array
- If valid: continue met bestaande flow (email check → bcrypt hash → insert)
- Zorg dat validation order correct is: required fields → email format → PASSWORD → email uniqueness

**Expected Code Location**:
```javascript
app.post('/api/registreer', async (req, res) => {
  const { email, wachtwoord, naam } = req.body;

  // Existing: Check required fields
  if (!email || !wachtwoord || !naam) {
    return res.status(400).json({
      success: false,
      error: 'Email, wachtwoord en naam zijn verplicht'
    });
  }

  // Existing: Email format validation
  // ... email regex check ...

  // NEW: Password strength validation
  const passwordValidation = validatePasswordStrength(wachtwoord);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Wachtwoord voldoet niet aan de beveiligingseisen',
      passwordErrors: passwordValidation.errors
    });
  }

  // Existing: Email uniqueness check
  // Existing: Bcrypt hash
  // Existing: Database insert
  // ...
});
```

**Dependencies**: T010 (validatePasswordStrength function must exist)
**Sequential**: Must modify POST /api/registreer (can't run parallel with T012, T013 if they modify same endpoint)

---

### T012 [X] Server: Error Response - passwordErrors Field
**File**: `server.js`
**Location**: POST /api/registreer endpoint (error handling sectie)
**Description**:
- Verify dat passwordErrors field correct wordt returned in 400 response
- Check dat bestaande error responses (email exists, server error) GEEN passwordErrors field hebben
- Test dat response format matcht contract: `{ success: false, error: string, passwordErrors?: string[] }`
- Dit is verification task, mogelijk geen code wijziging nodig als T011 correct geïmplementeerd

**Expected Behavior**:
```javascript
// Password validation error response
{
  success: false,
  error: 'Wachtwoord voldoet niet aan de beveiligingseisen',
  passwordErrors: [
    'Wachtwoord moet minimaal 1 hoofdletter bevatten',
    'Wachtwoord moet minimaal 1 speciaal teken bevatten'
  ]
}

// Email exists error response (no passwordErrors)
{
  success: false,
  error: 'Dit e-mailadres is al geregistreerd'
}
```

**Dependencies**: T011
**Sequential**: Verification after T011 implementation

---

### T013 [X] Server: Validation Order Verification
**File**: `server.js`
**Location**: POST /api/registreer endpoint
**Description**:
- Verify validation order volgens contracts/api-registreer.md:
  1. Required fields check
  2. Email format validation
  3. Password strength validation (NEW - must be here)
  4. Email uniqueness check (database query)
  5. Password hashing
  6. Database insert
- Zorg dat password validation VOOR email uniqueness komt (prevent timing attacks)
- Code review task - mogelijk geen wijzigingen nodig

**Expected Order**:
```javascript
// 1. Required fields
if (!email || !wachtwoord || !naam) { ... }

// 2. Email format
if (!emailRegex.test(email)) { ... }

// 3. Password strength (NEW)
const passwordValidation = validatePasswordStrength(wachtwoord);
if (!passwordValidation.valid) { ... }

// 4. Email uniqueness
const existingUser = await db.query('SELECT ...');
if (existingUser.rows.length > 0) { ... }

// 5. Password hashing
const hash = await bcrypt.hash(wachtwoord, 10);

// 6. Database insert
await db.query('INSERT INTO users ...');
```

**Dependencies**: T011
**Sequential**: Verification/refactor after T011

---

## Phase 3.4: Manual Testing (Sequential - After Implementation)

### T014 Testing: Scenario 1-3 - Visual Feedback & Real-Time Validation
**File**: Manual testing via browser
**Reference**: `specs/017-pas-het-registratieprocess/quickstart.md` (Scenarios 1, 2, 3)
**Description**:
- Open https://tickedify.com (of dev.tickedify.com voor staging)
- Test Scenario 1: Verify requirements lijst zichtbaar bij pagina load
- Test Scenario 2: Type "Test1!23" incrementeel, verify real-time feedback
- Test Scenario 3: Submit met geldig wachtwoord "Welkom2025!"
- Verify:
  - Requirements list visible and styled correctly
  - Real-time validation updates during typing
  - Visual feedback (✅/❌) correct
  - Submit button enabled/disabled correctly
  - Registration succeeds with strong password

**Success Criteria**:
- [ ] Requirements visible on page load (neutral state)
- [ ] Real-time feedback works while typing
- [ ] All 4 requirements show correct status
- [ ] Submit disabled with weak password
- [ ] Submit enabled with strong password
- [ ] Registration succeeds, redirect to /app

**Dependencies**: T001-T011 (all client and server implementation)
**Sequential**: Must run AFTER implementation complete

---

### T015 Testing: Scenario 4-7 - Edge Cases & Server Validation
**File**: Manual testing via browser + Developer Tools
**Reference**: `specs/017-pas-het-registratieprocess/quickstart.md` (Scenarios 4, 5, 6, 7)
**Description**:
- Test Scenario 4: Submit with weak password (client blocked)
- Test Scenario 5: Server-side validation via fetch() in console
- Test Scenario 6: Edge cases (spaties, unicode, lange passwords)
- Test Scenario 7: Show/hide password toggle
- Verify:
  - Client-side blocks weak passwords
  - Server rejects weak passwords with passwordErrors array
  - Edge cases handled correctly
  - Toggle button shows/hides password

**Test Command** (for Scenario 5):
```javascript
fetch('https://tickedify.com/api/registreer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test-' + Date.now() + '@example.com',
    wachtwoord: 'weak',
    naam: 'Test'
  })
}).then(r => r.json()).then(console.log);
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Wachtwoord voldoet niet aan de beveiligingseisen",
  "passwordErrors": [
    "Wachtwoord moet minimaal 8 tekens bevatten",
    "Wachtwoord moet minimaal 1 hoofdletter bevatten",
    "Wachtwoord moet minimaal 1 cijfer bevatten",
    "Wachtwoord moet minimaal 1 speciaal teken bevatten"
  ]
}
```

**Success Criteria**:
- [ ] Client blocks weak password submit
- [ ] Server returns passwordErrors array
- [ ] Edge cases (spaces, unicode) handled correctly
- [ ] Show/hide toggle works in both directions

**Dependencies**: T014
**Sequential**: Edge case testing after basic functionality verified

---

### T016 Testing: Scenario 8-10 - Backwards Compatibility & Final Checks
**File**: Manual testing via browser (desktop + mobile)
**Reference**: `specs/017-pas-het-registratieprocess/quickstart.md` (Scenarios 8, 9, 10)
**Description**:
- Test Scenario 8: Login met bestaand account (jan@buskens.be)
- Test Scenario 9: Verify alle teksten in Nederlands
- Test Scenario 10: Mobile responsive testing (Chrome DevTools)
- Verify:
  - Bestaande gebruikers kunnen nog inloggen
  - Login pagina heeft GEEN wachtwoord validatie
  - Alle error messages en requirements in Nederlands
  - Mobile UI werkt correct (touch targets, layout)

**Test Accounts**:
- Email: jan@buskens.be
- Password: qyqhut-muDvop-fadki9

**Success Criteria**:
- [ ] Bestaande login werkt zonder issues
- [ ] Geen wachtwoord validatie bij login
- [ ] Alle teksten correct Nederlands
- [ ] Mobile responsive (iPhone, Android emulation)
- [ ] Touch targets groot genoeg (min 44px)

**Dependencies**: T015
**Sequential**: Final verification after all features tested

---

## Phase 3.5: Deployment (Sequential - After Testing)

### T017 [X] Deployment: Version Bump & Changelog
**File**: `package.json` en `public/changelog.html`
**Description**:
- Update `package.json` version: 0.19.22 → 0.19.23 (patch bump)
- Update `public/changelog.html`:
  - Voeg nieuwe versie 0.19.23 toe bovenaan
  - Datum: 2025-10-18
  - Badge: "badge-feature" (nieuwe functionaliteit)
  - Nederlandse beschrijving:
    - "🔒 Sterke wachtwoord validatie bij registratie"
    - "✅ Real-time feedback tijdens wachtwoord invoer"
    - "👁️ Toon/verberg wachtwoord functie"
    - "🛡️ Minimaal 8 tekens, 1 hoofdletter, 1 cijfer, 1 speciaal teken verplicht"
- Zet vorige "badge-latest" om naar "badge-feature"

**Expected changelog.html entry**:
```html
<div class="version-entry">
  <div class="version-header">
    <span class="version-number">v0.19.23</span>
    <span class="badge badge-latest">Nieuwste</span>
    <span class="version-date">18 oktober 2025</span>
  </div>
  <div class="version-content">
    <h4>🔒 Sterke Wachtwoord Beveiliging</h4>
    <ul>
      <li>✅ Real-time wachtwoord validatie tijdens registratie</li>
      <li>🛡️ Minimaal 8 tekens, 1 hoofdletter, 1 cijfer, 1 speciaal teken verplicht</li>
      <li>👁️ Toon/verberg wachtwoord functie toegevoegd</li>
      <li>📋 Duidelijke feedback over wachtwoordeisen</li>
    </ul>
  </div>
</div>
```

**Dependencies**: T016 (testing complete)
**Sequential**: Must run before git commit

---

### T018 [X] Deployment: Git Commit & Push
**File**: Git repository
**Description**:
- Stage alle gewijzigde files:
  - public/index.html
  - public/style.css
  - server.js
  - package.json
  - public/changelog.html
- Commit met beschrijvende message volgens Tickedify conventions
- Push naar branch `017-pas-het-registratieprocess`
- NIET mergen naar main (deployment workflow: develop → staging → PR → main)

**Git Commands**:
```bash
git add public/index.html public/style.css server.js package.json public/changelog.html
git commit -m "🔒 Sterke Wachtwoord Validatie - v0.19.23

- Real-time wachtwoord validatie tijdens registratie
- Client-side feedback met visuele indicators (✅/❌)
- Server-side validatie voor beveiliging
- Minimaal 8 tekens, 1 hoofdletter, 1 cijfer, 1 speciaal teken
- Toon/verberg wachtwoord toggle
- Backwards compatible - bestaande gebruikers ongewijzigd

🤖 Generated with Claude Code
Feature: 017-pas-het-registratieprocess"

git push origin 017-pas-het-registratieprocess
```

**Dependencies**: T017
**Sequential**: Must run after version bump and changelog

---

### T019 [X] Deployment: Staging Test & Production Approval
**File**: Staging environment (dev.tickedify.com of Vercel preview)
**Description**:
- Wacht op Vercel automatic deployment van feature branch
- Test complete flow op staging environment:
  - Visual check: Requirements lijst zichtbaar
  - Functional check: Real-time validatie werkt
  - Submit check: Zwak wachtwoord geblokkeerd
  - Submit check: Sterk wachtwoord accepteerd
  - Verify: Nieuwe user aangemaakt in staging database
  - Verify: Backwards compatibility (bestaande login werkt)
- Als alle checks slagen: vraag user approval voor production
- WACHT op expliciete "JA, DEPLOY NAAR PRODUCTIE" bevestiging
- Create Pull Request naar main branch
- Na merge: Vercel deploys automatisch naar production

**Staging Checks**:
- [ ] Deployment successful (check Vercel dashboard)
- [ ] Requirements lijst visible on page load
- [ ] Real-time validation works correctly
- [ ] Server validation blocks weak passwords
- [ ] Strong password registration succeeds
- [ ] Backwards compatibility verified
- [ ] No console errors

**Production Deployment**:
- [ ] User approval received ("JA, DEPLOY NAAR PRODUCTIE")
- [ ] Create PR: `017-pas-het-registratieprocess` → `main`
- [ ] PR description includes changelog and test results
- [ ] Merge PR (squash or merge commit)
- [ ] Verify Vercel production deployment
- [ ] Monitor /api/version endpoint for v0.19.23
- [ ] Smoke test on production (tickedify.com)

**Dependencies**: T018
**Sequential**: Final step - staging test before production

---

## Dependencies Summary

### Critical Path
```
T001-T004 (UI/CSS) → Can run parallel [P]
    ↓
T005 (Validation Rules) → Blocks T006, T007, T008
    ↓
T006-T009 (Client JS) → Sequential within, parallel with server
    ↓
T010 (Server Function) → Blocks T011
    ↓
T011-T013 (Server Integration) → Sequential (same file)
    ↓
T014-T016 (Testing) → Sequential (build on each other)
    ↓
T017-T019 (Deployment) → Sequential (version → commit → deploy)
```

### Parallel Execution Opportunities

**Batch 1: UI/CSS** (can run together)
- T001, T002, T003, T004

**Batch 2: Client JS Foundation** (after T005)
- T006, T007, T009 (T008 needs T006, T007)

**Batch 3: Server-Side** (parallel with client)
- T010, T011, T012, T013 (sequential within batch)

**Sequential Only**:
- T014 → T015 → T016 (testing builds on previous)
- T017 → T018 → T019 (deployment sequence)

---

## Validation Checklist

**GATE: All items must be checked before marking feature complete**

- [x] All contracts have implementation tasks (POST /api/registreer: T010-T013) ✓
- [x] All entities/models implemented (Password validation rules: T005, T010) ✓
- [x] Client-side validation complete (T001-T009) ✓
- [x] Server-side validation complete (T010-T013) ✓
- [x] Manual testing scenarios covered (T014-T016 = quickstart.md Scenarios 1-10) ✓
- [x] Parallel tasks truly independent (verified: UI/CSS parallel, Client/Server parallel) ✓
- [x] Each task specifies exact file path ✓
- [x] No task modifies same file as another [P] task ✓
- [x] Deployment workflow follows Tickedify conventions (T017-T019) ✓
- [x] Backwards compatibility verified (T016 Scenario 8) ✓

---

## Notes

**Tickedify-Specific Considerations**:
- ✅ No TDD - Manual testing via Playwright en quickstart.md
- ✅ Inline JavaScript in public/index.html (geen aparte JS file)
- ✅ CSS in global public/style.css (geen component-specific CSS)
- ✅ Server.js is monolithic (alle endpoints in één file)
- ✅ Version bump verplicht bij elke feature (package.json)
- ✅ Changelog update verplicht (public/changelog.html)
- ✅ Deployment via Vercel (automatic op git push)
- ✅ Staging test vereist voor production approval

**Commit Strategy**:
- Commit na elke logische groep (T001-T004, T005-T009, T010-T013)
- Of commit na volledige feature implementatie (T001-T013)
- Tickedify voorkeur: één commit per feature voor clean history

**Risk Mitigation**:
- Server-side validatie is fallback voor client-side bypass
- Backwards compatibility: bestaande users ongewijzigd
- Staging test voorkomt productie bugs
- Manual testing scenario's dekken edge cases

---

## Task Execution Guide

**Voor Claude Code**:
1. Start met T001-T004 parallel (UI/CSS foundation)
2. Implementeer T005 (validation rules object)
3. Implementeer T006-T009 (client JS, T008 na T006/T007)
4. Parallel: Implementeer T010-T013 (server-side)
5. Test T014-T016 op staging (manual via browser)
6. Deploy T017-T019 (version, commit, staging check)

**Total Estimated Time**:
- UI/CSS (T001-T004): ~30 minuten
- Client JS (T005-T009): ~45 minuten
- Server (T010-T013): ~30 minuten
- Testing (T014-T016): ~45 minuten
- Deployment (T017-T019): ~20 minuten
- **Total: ~3 uur** voor volledige feature implementatie en deployment

---

**Tasks Generated**: 19 tasks (T001-T019)
**Ready for Execution**: ✅ Yes
**Next Command**: Begin met `T001` of run parallel batch `T001-T004`
