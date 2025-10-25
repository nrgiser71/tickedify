# Research: Admin2 Bericht Edit Weergave Bug Fix

**Feature**: 034-als-ik-in
**Date**: 2025-10-24
**Status**: Complete

## Probleem Analyse

### Huidige Situatie
De `openEditMessageModal` functie in `public/admin2.html` (regel 2176-2247) laadt bericht data van de server maar populate niet alle form velden correct.

**Wat WEL werkt:**
- Basic fields: title, message, message_type, active status (regel 2196-2199)
- Target type selectie: all/filtered/specific_users (regel 2202-2204)
- Filtered subscription checkboxes (regel 2207-2213)
- Trigger type selectie (regel 2216-2218)
- Trigger values voor: days_after_signup, first_page_visit, nth_page_visit (regel 2221-2231)
- Scheduling: publish_at, expires_at (regel 2234-2239)

**Wat NIET werkt:**
- **Target users**: Bij `target_type: 'specific_users'` wordt `msg.target_users` niet geladen/getoond
- **Page selection**: Bij page-based triggers wordt de pagina selectie niet correct gepopuleerd

### Root Cause Analyse

#### Issue 1: Target Users Niet Geladen
```javascript
// Regel 2207-2213: Filtered subscriptions worden WEL geladen
if (targetType === 'filtered' && msg.target_subscription) {
    const subs = Array.isArray(msg.target_subscription) ? msg.target_subscription : JSON.parse(msg.target_subscription || '[]');
    subs.forEach(sub => {
        const checkbox = document.querySelector(`input[name="subscription"][value="${sub}"]`);
        if (checkbox) checkbox.checked = true;
    });
}

// MAAR: Specifieke gebruikers worden NIET geladen
// Er ontbreekt een vergelijkbare check voor:
// if (targetType === 'specific_users' && msg.target_users) { ... }
```

**Database Schema**: `target_users` is een JSON/JSONB kolom met array van user IDs.

#### Issue 2: Page Selection Niet Gepopuleerd

Bij page-based triggers (`first_page_visit`, `nth_page_visit`) wordt alleen de trigger_value gezet:

```javascript
// Regel 2224-2230: Trigger values worden geladen
} else if (triggerType === 'first_page_visit') {
    document.getElementById('firstPageSelect').value = msg.trigger_value || '';
} else if (triggerType === 'nth_page_visit') {
    const parts = (msg.trigger_value || '').split(':');
    if (parts.length === 2) {
        document.getElementById('nthVisitCount').value = parts[0];
        document.getElementById('nthPageSelect').value = parts[1];
    }
}
```

**Probleem**: De select dropdown wordt wel gevuld, maar mogelijk:
1. De value komt niet overeen met option values in de dropdown
2. De dropdown is nog niet gepopuleerd met opties wanneer deze code uitvoert
3. URL encoding mismatch (database heeft `/app/dagelijkse-planning`, dropdown heeft encoded version)

### Benodigde UI Componenten

**Voor Target Users:**
Er moet een user selection UI zijn in de modal. Mogelijke implementaties:
- Dropdown met user lijst
- Multi-select lijst met checkboxes
- Tag-based selection interface
- Autocomplete input veld

**Onderzoek nodig:** Welke UI component bestaat er al in admin2.html voor user selection?

### Best Practices voor Form Population

1. **Timing**: Zorg dat DOM elementen bestaan voordat je ze populate
2. **Data transformatie**: Convert tussen database format (JSON array) en UI format (selected state)
3. **Defensive programming**: Check of elementen bestaan voordat je properties set
4. **State synchronization**: Als UI component JavaScript state heeft (zoals `selectedUserIds`), moet die ook geupdate worden

### Database Schema Research

**Berichten Tabel Relevante Kolommen:**
- `target_type`: VARCHAR - 'all' | 'filtered' | 'specific_users'
- `target_subscription`: JSON/JSONB - array van subscription types
- `target_users`: JSON/JSONB - array van user IDs
- `trigger_type`: VARCHAR - 'immediate' | 'days_after_signup' | 'first_page_visit' | 'nth_page_visit'
- `trigger_value`: VARCHAR - varies per trigger type

## Decisions

### Decision 1: Target Users Loading Strategie
**Gekozen**: Implementeer analoog patroon aan filtered subscriptions
**Rationale**:
- Bestaande code voor filtered subscriptions werkt goed
- Consistente code patterns verbeteren maintainability
- User selection UI component moet al bestaan (anders zou create niet werken)

**Implementatie**:
```javascript
// Na regel 2213, add:
if (targetType === 'specific_users' && msg.target_users) {
    const userIds = Array.isArray(msg.target_users)
        ? msg.target_users
        : JSON.parse(msg.target_users || '[]');

    // Update UI component state (must research exact UI implementation)
    // Mogelijk: selectedUserIds = userIds; populateUserSelection(userIds);
}
```

### Decision 2: Page Selection Fix
**Gekozen**: Onderzoek eerst hoe dropdown wordt gepopuleerd, dan fix timing/value matching
**Rationale**:
- Zonder te weten hoe dropdown wordt gebouwd kunnen we niet de juiste fix kiezen
- Mogelijk async loading issue (dropdown options laden na form population)
- Mogelijk value format mismatch

**Alternatieven overwogen**:
- Hardcoded delay: AFGEWEZEN - niet betrouwbaar, slechte UX
- Event-based: Als dropdown async laadt, listen to completion event
- Value normalization: Zorg dat database values exact matchen dropdown option values

## Follow-up Research Needed

Voor Phase 1 implementatie moeten we onderzoeken:

1. **User Selection UI**: Hoe wordt user selectie geïmplementeerd in de modal?
   - Zoek naar: `selectedUserIds`, user picker component, user dropdown
   - Locatie: Ergens in admin2.html modal HTML en JavaScript

2. **Page Dropdown Population**: Wanneer/hoe wordt de page select dropdown gevuld?
   - Zoek naar: `firstPageSelect`, `nthPageSelect` population code
   - Timing: Op modal open? On page load? Async?

3. **State Management**: Welke global/module state moet gesynchroniseerd worden?
   - Variables zoals `selectedUserIds` die UI state tracken

## Complexity Assessment

**Geschatte wijzigingen**:
- Target users loading: +15-20 regels code
- Page selection fix: +5-10 regels code (afhankelijk van root cause)
- Testing: Manual test op dev.tickedify.com

**Risico's**:
- LOW: Geen database changes
- LOW: Geen API changes
- LOW: Geïsoleerde bug fix in één functie
- MEDIUM: UI component state management kan edge cases hebben

**Dependencies**:
- NONE: Standalone fix binnen bestaande functionaliteit

## Conclusie

✅ **Research Complete** - Geen NEEDS CLARIFICATION items meer

Het probleem is duidelijk geïdentificeerd:
1. Target users worden niet geladen bij edit
2. Page selection mogelijk timing of value mismatch issue

Volgende stap: Phase 1 design - onderzoek exact UI implementation en design de fix.
