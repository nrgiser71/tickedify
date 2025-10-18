# Research: Sterke Wachtwoord Validatie

**Feature**: 017-pas-het-registratieprocess
**Date**: 2025-10-18

## Research Overview

Deze research onderzoekt best practices voor wachtwoord validatie in web applicaties, met focus op client-side en server-side implementaties die passen binnen de Tickedify architectuur (Vanilla JavaScript frontend + Express.js backend).

## Key Research Areas

### 1. Wachtwoord Sterkte Requirements

**Decision**: Minimaal 8 tekens, 1 hoofdletter, 1 cijfer, 1 speciaal teken

**Rationale**:
- **8 tekens minimum**: NIST aanbeveling is minimum 8 tekens voor gebruiker-gekozen wachtwoorden
- **Complexiteit eisen**: Combinatie van types verhoogt entropie en maakt brute-force aanvallen moeilijker
- **Gebruiksvriendelijkheid**: Balans tussen beveiliging en gebruiksgemak - niet te streng dat gebruikers gefrustreerd raken
- **Industry standard**: Deze eisen zijn wijdverspreid geaccepteerd in de industrie

**Alternatives Considered**:
- **12+ tekens alleen**: Hogere beveiliging maar lagere adoptie door gebruikers
- **Passphrase requirement**: Moeilijker te implementeren en valideren
- **HIBP (Have I Been Pwned) check**: Te complex voor huidige scope, mogelijk toekomstige uitbreiding

**References**:
- NIST Special Publication 800-63B (Digital Identity Guidelines)
- OWASP Authentication Cheat Sheet

### 2. Client-Side Validatie Pattern

**Decision**: Real-time validatie met visuele feedback indicators

**Rationale**:
- **Instant feedback**: Gebruikers weten direct of hun wachtwoord voldoet
- **Betere UX**: Voorkomt frustratie van submit → error → retry cycle
- **Educatief**: Helpt gebruikers sterke wachtwoorden te kiezen
- **Vanilla JS compatible**: Kan geïmplementeerd worden zonder frameworks

**Implementation Approach**:
```javascript
// Event listener op input field
wachtwoordInput.addEventListener('input', function() {
  validatePasswordStrength(this.value);
  updateVisualFeedback();
});
```

**Visual Feedback Pattern**:
- ✅ Groen vinkje voor voldane eisen
- ❌ Rood kruisje voor niet-voldane eisen
- ℹ️ Info icoon voor neutrale staat (nog niet getypt)

**Alternatives Considered**:
- **Only on blur**: Minder directe feedback, slechtere UX
- **Only on submit**: Te laat, frustrerende experience
- **Progressive disclosure**: Te complex voor deze use case

### 3. Server-Side Validatie Pattern

**Decision**: Synchrone validatie in POST /api/registreer endpoint

**Rationale**:
- **Beveiliging**: Client-side kan omzeild worden, server-side is definitief
- **Single source of truth**: Server heeft finale autoriteit over wachtwoord acceptatie
- **Eenvoudige implementatie**: Past binnen bestaande Express.js patterns
- **Error handling**: Duidelijke foutmeldingen bij niet-voldoen

**Implementation Pattern**:
```javascript
// In server.js POST /api/registreer
function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push('Minimaal 8 tekens vereist');
  if (!/[A-Z]/.test(password)) errors.push('Minimaal 1 hoofdletter vereist');
  if (!/[0-9]/.test(password)) errors.push('Minimaal 1 cijfer vereist');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Minimaal 1 speciaal teken vereist');
  return errors;
}
```

**Alternatives Considered**:
- **Separate validation endpoint**: Extra roundtrip, niet nodig voor deze use case
- **Database constraint**: Te laat in proces, onduidelijke foutmeldingen
- **Third-party library**: Overkill voor deze eenvoudige regels

### 4. Regex Patterns voor Validatie

**Decision**: Separate regex per requirement voor duidelijke foutmeldingen

**Rationale**:
- **Specifieke feedback**: Elke regel kan apart gecommuniceerd worden
- **Debuggability**: Eenvoudiger te testen en onderhouden
- **Nederlandse foutmeldingen**: Directe mapping naar gebruiker-vriendelijke tekst

**Regex Patterns**:
```javascript
const validators = {
  minLength: (pwd) => pwd.length >= 8,
  hasUppercase: (pwd) => /[A-Z]/.test(pwd),
  hasDigit: (pwd) => /[0-9]/.test(pwd),
  hasSpecialChar: (pwd) => /[^A-Za-z0-9]/.test(pwd)
};
```

**Alternatives Considered**:
- **Single complex regex**: Moeilijk te onderhouden, onduidelijke foutmeldingen
- **Zxcvbn library**: Te zwaar voor eenvoudige requirement check
- **Character counting**: Minder elegant, meer code

### 5. UI/UX Patterns

**Decision**: Inline requirements lijst met real-time status updates

**Rationale**:
- **Proactive guidance**: Gebruikers zien vereisten voordat ze typen
- **Progressive feedback**: Status update tijdens typen
- **Accessibility**: Screenreader friendly met ARIA labels
- **Consistent met Tickedify**: Past bij bestaande UI patterns

**Visual Design**:
```html
<div class="password-requirements">
  <p>Wachtwoord moet voldoen aan:</p>
  <ul>
    <li id="req-length" class="neutral">Minimaal 8 tekens</li>
    <li id="req-uppercase" class="neutral">Minimaal 1 hoofdletter</li>
    <li id="req-digit" class="neutral">Minimaal 1 cijfer</li>
    <li id="req-special" class="neutral">Minimaal 1 speciaal teken</li>
  </ul>
</div>
```

**CSS Classes**:
- `.neutral` - Grijs, nog niet gevalideerd
- `.valid` - Groen met ✓, voldoet aan eis
- `.invalid` - Rood met ✗, voldoet niet aan eis

**Alternatives Considered**:
- **Progress bar**: Minder specifieke feedback
- **Tooltip on hover**: Minder zichtbaar, slechte mobile UX
- **Modal met uitleg**: Te invasief voor registratie flow

### 6. Show/Hide Password Toggle

**Decision**: Eye icon button naast wachtwoord veld

**Rationale**:
- **Gebruiksvriendelijkheid**: Gebruikers kunnen typo's checken
- **Industry standard**: Wijdverspreid patroon, herkenbaarheid
- **Accessibility**: Kan met keyboard bediend worden
- **Eenvoudige implementatie**: Toggle input type attribute

**Implementation**:
```javascript
toggleButton.addEventListener('click', function() {
  const input = document.getElementById('wachtwoord');
  input.type = (input.type === 'password') ? 'text' : 'password';
  // Update icon
});
```

**Alternatives Considered**:
- **Checkbox "Toon wachtwoord"**: Minder elegant UI
- **Hover to reveal**: Slecht voor mobile, accessibility issues
- **Geen toggle**: Frustreert gebruikers bij lange/complexe wachtwoorden

### 7. Backwards Compatibility

**Decision**: Bestaande gebruikers niet migreren, alleen nieuwe registraties

**Rationale**:
- **Geen breaking changes**: Bestaande users kunnen blijven inloggen
- **Eenvoudige rollout**: Geen database migratie nodig
- **Toekomstige optie**: Kan later "verplicht wachtwoord update" flow toevoegen
- **Veilig**: Nieuwe gebruikers krijgen sterkere beveiliging

**Implementation Impact**:
- Alleen POST /api/registreer endpoint wijzigt
- POST /api/login blijft ongewijzigd
- Database schema blijft ongewijzigd (wachtwoord_hash kolom blijft hetzelfde)

**Alternatives Considered**:
- **Force password reset**: Te invasief voor bèta gebruikers
- **Gradual migration**: Te complex voor huidige scope
- **Apply to password changes**: Goede toekomstige uitbreiding

## Technical Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| Requirements | 8 char, 1 upper, 1 digit, 1 special | NIST compliant, industry standard |
| Client Validation | Real-time with visual feedback | Best UX, instant guidance |
| Server Validation | Synchronous in /api/registreer | Security, single source of truth |
| Regex Pattern | Separate patterns per rule | Clear error messages |
| UI Pattern | Inline requirements list | Proactive, accessible |
| Show/Hide | Eye icon toggle | Industry standard, familiar |
| Compatibility | New registrations only | No breaking changes |

## Open Questions (None)

Alle technische beslissingen zijn genomen. Geen NEEDS CLARIFICATION items.

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate data-model.md (wachtwoord validatie regels)
- Generate API contracts (POST /api/registreer validation)
- Generate quickstart.md (manual test scenario)
- Update CLAUDE.md met nieuwe feature context

## References

- NIST SP 800-63B: https://pages.nist.gov/800-63-3/sp800-63b.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- MDN Password Input: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/password
- W3C ARIA Best Practices: https://www.w3.org/WAI/ARIA/apg/
