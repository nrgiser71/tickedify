# Data Model: Admin2 Bericht Edit Weergave Bug Fix

**Feature**: 034-als-ik-in
**Date**: 2025-10-24

## Overview

Deze bug fix wijzigt GEEN database schema. Het gaat om correct laden van bestaande data in de frontend UI.

## Database Entities (Bestaand)

### Messages Tabel
Geen wijzigingen aan het schema. Bug fix gebruikt bestaande kolommen:

**Relevante kolommen voor deze fix:**
- `target_type`: VARCHAR - 'all' | 'filtered' | 'specific_users'
- `target_users`: JSON/JSONB - Array van user IDs (INTEGER[])
- `trigger_type`: VARCHAR - 'immediate' | 'days_after_signup' | 'first_page_visit' | 'nth_page_visit' | 'next_page_visit'
- `trigger_value`: VARCHAR - Bevat pagina URL voor page-based triggers

**Voorbeeld data:**
```json
{
  "id": 123,
  "title": "Welkom bij dagelijkse planning",
  "target_type": "specific_users",
  "target_users": [42, 89],
  "trigger_type": "next_page_visit",
  "trigger_value": "/app/dagelijkse-planning"
}
```

## Frontend State Model

### JavaScript Global State (admin2.html)

**Bestaande state variables:**
```javascript
let selectedUserIds = [];           // Array<number> - Currently selected user IDs
let selectedUsersData = {};         // Object<userId, {naam, email}> - User display data
```

**Bug:** Bij edit modal open wordt deze state NIET gesynchroniseerd met database data.

**Fix vereist:** Populate beide variabelen met data van server response.

## Data Flow (Current vs Fixed)

### Current (Buggy) Flow
```
1. User clicks "Bewerken" op bericht
2. openEditMessageModal(messageId) called
3. Fetch /api/admin/messages/{messageId}
4. Response: { message: {...target_users: [42, 89], trigger_value: "/app/dagelijkse-planning"} }
5. Fill basic fields (title, message, type) ✅
6. Fill target_type radio button ✅
7. Call handleTargetTypeChange() to show/hide sections ✅
8. ❌ BUG: target_users array NOT loaded into selectedUserIds/selectedUsersData
9. ❌ BUG: Page selection might not be set correctly
10. Result: Empty user selection, wrong page shown
```

### Fixed Flow
```
1. User clicks "Bewerken" op bericht
2. openEditMessageModal(messageId) called
3. Fetch /api/admin/messages/{messageId}
4. Response: { message: {...target_users: [42, 89], trigger_value: "/app/dagelijkse-planning"} }
5. Fill basic fields (title, message, type) ✅
6. Fill target_type radio button ✅
7. Call handleTargetTypeChange() to show/hide sections ✅
8. ✅ FIX: Load target_users into state + render UI
9. ✅ FIX: Ensure page selects are properly populated
10. Result: Correct user badges shown, correct page selected
```

## UI Components Affected

### User Selection Component
**Location**: admin2.html userSearchSection div
**State**: `selectedUserIds` array + `selectedUsersData` object
**Display**: User badges rendered by `updateSelectedUsersDisplay()`

**Required data transformation:**
```javascript
// Server response
msg.target_users = [42, 89];  // Array of user IDs

// Must become:
selectedUserIds = [42, 89];
selectedUsersData = {
  42: { naam: "Jan Buskens", email: "jan@buskens.be" },
  89: { naam: "Test User", email: "test@example.com" }
};
```

**Challenge:** Server response heeft alleen user IDs, geen user display data (naam, email).
**Solutions:**
1. Fetch user data voor elke ID (extra API calls)
2. Server response uitbreiden met user data (backend change - vermijden voor simple fix)
3. Show user IDs in badges tot user data beschikbaar is (graceful degradation)

**Gekozen oplossing**: #3 - Show user IDs initially, lazy load full data als nodig.

### Page Selection Dropdowns
**Components:**
- `#firstPageSelect` - Voor first_page_visit trigger
- `#nthPageSelect` - Voor nth_page_visit trigger
- `#nextPageSelect` - Voor next_page_visit trigger (indien bestaat)

**Expected behavior:**
```javascript
// Database heeft:
trigger_value = "/app/dagelijkse-planning"

// Dropdown option values moeten exact matchen:
<option value="/app/dagelijkse-planning">Dagelijkse Planning</option>

// Set via:
document.getElementById('firstPageSelect').value = msg.trigger_value;
```

**Potential issues:**
- URL encoding mismatches
- Dropdown not yet populated when value is set
- Async option loading

## Validation Rules

### Data Integrity
- `target_users` moet valid JSON array zijn in database
- User IDs in array moeten integers zijn
- Page URLs in `trigger_value` moeten valid path strings zijn

### UI State Consistency
- `selectedUserIds.length` moet matchen aantal getoonde user badges
- Selected page in dropdown moet exact matchen `trigger_value` database waarde
- Target type radio moet gesynchroniseerd zijn met getoonde sections

## Edge Cases

### User Data Edge Cases
1. **Deleted user**: User ID in database bestaat niet meer als actieve user
   - Display: Show user ID, niet naam
   - Behavior: Allow edit, user blijft in selection

2. **Empty target_users**: Database heeft `null` of `[]`
   - Display: "Geen gebruikers geselecteerd"
   - Behavior: Normal, target type is 'all' of 'filtered'

3. **Malformed JSON**: Database heeft invalid JSON in target_users
   - Fallback: Empty array, log error
   - User sees: "Geen gebruikers geselecteerd"

### Page Selection Edge Cases
1. **Page niet in dropdown**: trigger_value bevat URL die niet in opties lijst staat
   - Display: Dropdown shows blank/first option
   - Behavior: Allow manual re-selection
   - Solution: Create option dynamically of toon warning

2. **URL format mismatch**: Database heeft `/app/page`, dropdown heeft `#page`
   - Detect: value set failed (dropdown value blijft empty)
   - Solution: Normalize URLs before comparison

## No Backend Changes Required

**Belangrijke constraint**: Dit is een pure frontend bug fix.

**Bestaande API endpoints blijven ongewijzigd:**
- `GET /api/admin/messages/{id}` - Response bevat al alle benodigde data
- `PUT /api/admin/messages/{id}` - Accepteert al correct formaat voor save

**Geen database migraties nodig**: Alle benodigde kolommen bestaan al.

## Summary

Deze fix betreft alleen JavaScript state management in `public/admin2.html`:
- Populate `selectedUserIds` en `selectedUsersData` bij edit modal open
- Ensure page dropdowns correct vullen met database values
- Handle edge cases gracefully (deleted users, missing pages)
- Maintain consistency tussen UI state en database state
