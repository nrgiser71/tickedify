# Data Model: Sterke Wachtwoord Validatie

**Feature**: 017-pas-het-registratieprocess
**Date**: 2025-10-18

## Overview

Deze feature introduceert wachtwoord validatie regels zonder database schema wijzigingen. De validatie gebeurt in applicatie logica (client-side en server-side) voordat het wachtwoord wordt gehashed en opgeslagen.

## Existing Database Schema (Unchanged)

### Users Table

**Tabel**: `users`
**Status**: Bestaand, geen wijzigingen nodig

```sql
-- Relevante kolommen voor deze feature
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  wachtwoord_hash TEXT NOT NULL,  -- bcrypt hash van gevalideerd wachtwoord
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- ... andere kolommen
);
```

**Wijzigingen**: Geen
**Rationale**: Wachtwoord validatie gebeurt vóór hashing. De `wachtwoord_hash` kolom blijft onveranderd en accepteert alle bcrypt hashes ongeacht de sterkte van het originele wachtwoord.

## Application-Level Data Models

### Wachtwoord Validatie Regels (Client-Side)

**Entity**: `PasswordValidationRules`
**Locatie**: `public/index.html` (inline JavaScript)
**Levensduur**: Per registratie sessie

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
    message: 'Minimaal 1 speciaal teken (!@#$%^&* etc.)',
    element: 'req-special'
  }
};
```

**Attributes**:
- `test` (Function): Validatie functie die boolean retourneert
- `message` (String): Nederlandse gebruiker-vriendelijke beschrijving
- `element` (String): DOM element ID voor visuele feedback

**State**:
```javascript
// Validation state per rule
{
  minLength: true|false|null,     // true=valid, false=invalid, null=not tested
  hasUppercase: true|false|null,
  hasDigit: true|false|null,
  hasSpecialChar: true|false|null
}
```

### Wachtwoord Validatie Result (Server-Side)

**Entity**: `PasswordValidationResult`
**Locatie**: `server.js` (POST /api/registreer)
**Levensduur**: Per request

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

**Return Type**:
```javascript
{
  valid: boolean,      // true als alle regels voldaan zijn
  errors: string[]     // Array van Nederlandse foutmeldingen
}
```

## UI State Model

### Password Input Field State

**Component**: Wachtwoord invoer veld
**Locatie**: `public/index.html`

```javascript
const passwordFieldState = {
  value: '',              // Huidige wachtwoord waarde
  visible: false,         // Password visibility (show/hide toggle)
  validationStatus: {     // Per-rule validation status
    minLength: null,
    hasUppercase: null,
    hasDigit: null,
    hasSpecialChar: null
  },
  isValid: false,         // Overall validation status
  showRequirements: true  // Requirements list zichtbaarheid
};
```

**State Transitions**:
```
Initial State (null)
  → User types → Validating (testing rules)
  → All pass → Valid (true) → Enable submit
  → Some fail → Invalid (false) → Disable submit
  → User modifies → Re-validate
```

### Visual Feedback States

**CSS Classes voor Requirements List Items**:
```css
.password-requirement {
  /* Base styling */
}

.password-requirement.neutral {
  color: #666;              /* Grijs - nog niet getest */
}

.password-requirement.valid {
  color: #28a745;           /* Groen - voldoet */
}

.password-requirement.valid::before {
  content: "✓ ";            /* Vinkje icoon */
}

.password-requirement.invalid {
  color: #dc3545;           /* Rood - voldoet niet */
}

.password-requirement.invalid::before {
  content: "✗ ";            /* Kruisje icoon */
}
```

## API Request/Response Models

### POST /api/registreer Request

**Bestaand Model** (ongewijzigd):
```javascript
{
  email: string,           // Email address
  wachtwoord: string,      // Plain text password (HTTPS encrypted in transit)
  naam: string             // User's name
}
```

**Nieuwe Validatie**: `wachtwoord` veld moet nu voldoen aan strength requirements

### POST /api/registreer Response

**Success Response** (ongewijzigd):
```javascript
{
  success: true,
  message: "Account succesvol aangemaakt"
}
```

**Error Response** (uitgebreid):
```javascript
{
  success: false,
  error: string,                    // Algemene foutmelding
  passwordErrors: string[] | null   // Specifieke wachtwoord validatie fouten (NIEUW)
}
```

**Voorbeelden**:
```javascript
// Zwak wachtwoord
{
  success: false,
  error: "Wachtwoord voldoet niet aan de beveiligingseisen",
  passwordErrors: [
    "Wachtwoord moet minimaal 1 hoofdletter bevatten",
    "Wachtwoord moet minimaal 1 speciaal teken bevatten"
  ]
}

// Email al in gebruik (bestaand gedrag)
{
  success: false,
  error: "Dit e-mailadres is al geregistreerd"
}
```

## Validation Flow

### Client-Side Validation Flow

```
1. User types in password field
   ↓
2. Event listener fires 'input' event
   ↓
3. Run all validation rules
   ↓
4. Update visual feedback for each rule
   ↓
5. Update overall validation state
   ↓
6. Enable/disable submit button based on state
```

### Server-Side Validation Flow

```
1. Receive POST /api/registreer request
   ↓
2. Validate password strength FIRST
   ↓ (fail)
3a. Return 400 with passwordErrors
   ↓ (pass)
3b. Check email uniqueness
   ↓
4. Hash password with bcrypt
   ↓
5. Insert into users table
   ↓
6. Return success response
```

## Edge Cases & Validation

### Edge Case Handling

| Scenario | Client Behavior | Server Behavior |
|----------|----------------|-----------------|
| Empty password | All rules show invalid | Reject with "minimaal 8 tekens" |
| Only spaces | All rules fail | Reject (spaces don't count as special chars) |
| Unicode characters | Allowed in special chars | Allowed in special chars |
| Very long password (>100 chars) | Accept if valid | Accept (bcrypt handles length) |
| Copy-paste | Validate immediately on paste | Validate normally |
| Browser autofill | Validate on blur or submit attempt | Validate normally |

### Character Classification

**Hoofdletters**: A-Z (Latin uppercase only)
**Cijfers**: 0-9 (ASCII digits only)
**Speciale tekens**: Alles behalve A-Z, a-z, 0-9 (inclusief: !@#$%^&*()_+-=[]{}|;:,.<>?/~` en spaties)

**Rationale**: Eenvoudige regex patterns, geen Unicode complexiteit

## Data Privacy & Security

### Password Handling Rules

**Client-Side**:
- ❌ NOOIT wachtwoord opslaan in localStorage/sessionStorage
- ❌ NOOIT wachtwoord loggen naar console (zelfs niet in dev)
- ✅ Clear password field na succesvolle registratie
- ✅ Use autocomplete="new-password" attribute

**Server-Side**:
- ❌ NOOIT plain text password opslaan in database
- ❌ NOOIT plain text password loggen
- ✅ Validate VOORDAT hashing
- ✅ Use bcrypt voor hashing (bestaand gedrag)
- ✅ Return generic errors (niet "wachtwoord te zwak" - geef specifieke regels)

**Transport**:
- ✅ HTTPS verplicht (Vercel default)
- ✅ Password in POST body (niet in URL)

## Backwards Compatibility

### Bestaande Gebruikers

**Impact**: GEEN
**Rationale**: Bestaande wachtwoord hashes blijven geldig. Login flow verandert niet.

**Toekomstige Optie**:
```javascript
// Mogelijk toekomstige feature: prompt voor sterker wachtwoord
if (user.created_at < PASSWORD_POLICY_UPDATE_DATE && user.weak_password_flag) {
  // Suggest password update (niet forceren)
}
```

### Database Queries

**Geen wijzigingen nodig**:
```sql
-- Bestaande INSERT blijft werken
INSERT INTO users (email, wachtwoord_hash, naam, ...)
VALUES ($1, $2, $3, ...);

-- Bestaande SELECT voor login blijft werken
SELECT * FROM users WHERE email = $1;
```

## Testing Data Models

### Test Wachtwoorden

**Valid Passwords** (voor acceptance testing):
```
"Welkom2025!"      // Alle eisen voldaan
"Test@123"         // Exact 8 tekens, alle eisen
"MyP@ssw0rd"       // Mixed case, special, digit
"Strong#Pass1"     // Langer wachtwoord
```

**Invalid Passwords** (voor edge case testing):
```
"test"             // Te kort, geen hoofdletter, geen cijfer, geen special
"Test1234"         // Geen speciaal teken
"test@123"         // Geen hoofdletter
"Test@test"        // Geen cijfer
"       "          // Alleen spaties (7 stuks, te kort)
"Tst!1"            // Te kort (5 chars)
```

## Summary

Deze feature introduceert:
- ✅ Application-level validatie (geen database schema wijzigingen)
- ✅ Client-side real-time feedback model
- ✅ Server-side definitieve validatie model
- ✅ Backwards compatible (bestaande users ongewijzigd)
- ✅ Duidelijke error response structuur

Next: Generate API contracts voor POST /api/registreer validatie
