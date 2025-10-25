# Message Edit Data Contract

**Feature**: 034-als-ik-in
**Type**: Data format specification (geen API wijzigingen)

## Overview

Dit document specificeert de verwachte data formats voor het laden en opslaan van berichten in de admin2 interface. Geen API wijzigingen - alleen documentatie van bestaand gedrag.

## GET /api/admin/messages/:id (Bestaand)

### Response Format
```json
{
  "message": {
    "id": 123,
    "title": "Welkom bij dagelijkse planning",
    "message": "Dit is de bericht inhoud...",
    "message_type": "information",
    "target_type": "specific_users",
    "target_subscription": null,
    "target_users": [42, 89],
    "trigger_type": "next_page_visit",
    "trigger_value": "/app/dagelijkse-planning",
    "publish_at": "2025-10-24T10:00:00.000Z",
    "expires_at": null,
    "active": true,
    "created_at": "2025-10-24T08:00:00.000Z",
    "updated_at": "2025-10-24T09:30:00.000Z"
  }
}
```

### Field Specifications

#### target_type
- **Type**: `string`
- **Values**: `'all'` | `'filtered'` | `'specific_users'`
- **Required**: Yes
- **Default**: `'all'`

#### target_subscription
- **Type**: `string[] | null`
- **Format**: JSON array van subscription types
- **Example**: `["free", "premium"]`
- **Required when**: `target_type === 'filtered'`
- **Null when**: `target_type !== 'filtered'`

#### target_users
- **Type**: `number[] | null`
- **Format**: Array van user IDs (integers)
- **Example**: `[42, 89, 156]`
- **Required when**: `target_type === 'specific_users'`
- **Null when**: `target_type !== 'specific_users'`
- **🐛 BUG**: Frontend laadt deze data NIET in UI state

#### trigger_type
- **Type**: `string`
- **Values**:
  - `'immediate'` - Toon direct
  - `'days_after_signup'` - N dagen na registratie
  - `'first_page_visit'` - Eerste keer op pagina
  - `'nth_page_visit'` - N-de keer op pagina
  - `'next_page_visit'` - Volgende keer op pagina
- **Required**: Yes
- **Default**: `'immediate'`

#### trigger_value
- **Type**: `string | null`
- **Format**: Depends on trigger_type
  - `immediate`: `null`
  - `days_after_signup`: `"7"` (number as string)
  - `first_page_visit`: `"/app/dagelijkse-planning"` (page URL)
  - `nth_page_visit`: `"3:/app/dagelijkse-planning"` (count:page)
  - `next_page_visit`: `"/app/dagelijkse-planning"` (page URL)
- **🐛 BUG**: Page URL mogelijk niet correct geselecteerd in dropdown

## Frontend State Mapping

### Voor target_users
```javascript
// API Response
{
  "target_type": "specific_users",
  "target_users": [42, 89]
}

// MOET worden omgezet naar:
selectedUserIds = [42, 89];
selectedUsersData = {
  42: { naam: "User naam", email: "user@example.com" }, // Fetch or default
  89: { naam: "User naam 2", email: "user2@example.com" }
};

// UI rendering via:
updateSelectedUsersDisplay(); // Toont user badges
```

### Voor trigger_value (page-based)
```javascript
// API Response
{
  "trigger_type": "next_page_visit",
  "trigger_value": "/app/dagelijkse-planning"
}

// MOET worden gezet in:
document.getElementById('nextPageSelect').value = "/app/dagelijkse-planning";

// Verificatie:
// Dropdown moet <option value="/app/dagelijkse-planning"> hebben
// Anders: geen visuele selectie
```

## PUT /api/admin/messages/:id (Bestaand)

### Request Body (Ongewijzigd)
```json
{
  "title": "Updated title",
  "message": "Updated message...",
  "message_type": "information",
  "target_type": "specific_users",
  "target_subscription": null,
  "target_users": [42, 89],
  "trigger_type": "next_page_visit",
  "trigger_value": "/app/dagelijkse-planning",
  "dismissible": true,
  "snoozable": true,
  "publish_at": "2025-10-24T10:00:00.000Z",
  "expires_at": null,
  "button_label": null,
  "button_action": null,
  "button_target": null,
  "active": true
}
```

**Note**: Save functionaliteit is NIET gebroken. Bug is alleen bij LOAD/EDIT.

## Data Integrity Constraints

### Database Constraints (Ongewijzigd)
- `target_users` moet valid JSON array zijn
- User IDs in `target_users` moeten integers zijn
- `trigger_value` mag niet langer zijn dan VARCHAR limit (256?)

### Frontend Validation (Bestaand Gedrag)
- Als `target_type === 'specific_users'`, moet `selectedUserIds.length > 0`
- Als `target_type === 'filtered'`, moet minimaal 1 subscription geselecteerd zijn
- Page-based triggers moeten valide page URL hebben in `trigger_value`

## Edge Cases Handling

### Missing User Data
**Scenario**: `target_users: [42]` maar user 42 bestaat niet meer in database

**Current behavior**: Onbekend (niet getest in current code)

**Expected behavior na fix**:
```javascript
selectedUserIds = [42];
selectedUsersData = {
  42: { naam: "Gebruiker #42", email: "Unknown" } // Graceful degradation
};
// Badge toont: "Gebruiker #42 (Unknown)"
```

### Empty Arrays
**Scenario**: `target_users: []` of `target_users: null`

**Expected behavior**:
```javascript
selectedUserIds = [];
selectedUsersData = {};
// Display: "Geen gebruikers geselecteerd"
```

### Malformed JSON in Database
**Scenario**: `target_users` kolom bevat invalid JSON

**Expected behavior**:
```javascript
// Catch parse error
try {
  const users = JSON.parse(msg.target_users);
} catch (e) {
  console.error('Invalid target_users JSON:', e);
  selectedUserIds = []; // Fallback to empty
}
```

### Page URL Not in Dropdown Options
**Scenario**: `trigger_value: "/app/old-removed-page"`

**Expected behavior**:
```javascript
const select = document.getElementById('firstPageSelect');
select.value = msg.trigger_value; // Probeert te zetten

// Als geen match: select.value blijft "" (empty)
// Optioneel: Dynamically add option:
if (!select.querySelector(`option[value="${msg.trigger_value}"]`)) {
  const option = document.createElement('option');
  option.value = msg.trigger_value;
  option.textContent = msg.trigger_value + ' (verwijderd)';
  select.appendChild(option);
  select.value = msg.trigger_value; // Nu werkt het
}
```

## Testing Contract

### Test Case: Load Specific Users
**Given**: Database heeft bericht met `target_users: [42, 89]`
**When**: `openEditMessageModal(messageId)` wordt uitgevoerd
**Then**:
- `selectedUserIds === [42, 89]`
- `selectedUsersData` bevat entries voor 42 en 89
- UI toont 2 user badges
- Teller toont "(2)"

### Test Case: Load Page Selection
**Given**: Database heeft bericht met `trigger_value: "/app/dagelijkse-planning"`
**When**: Modal opent en trigger type is gezet
**Then**:
- Correct dropdown is visible (firstPageSelect/nthPageSelect/nextPageSelect)
- `dropdown.value === "/app/dagelijkse-planning"`
- Visueel is correct option geselecteerd in dropdown

### Test Case: Save Round-Trip
**Given**: Bewerk bericht, wijzig user selection en page
**When**: Submit form
**Then**:
- PUT request body bevat nieuwe `target_users` array
- PUT request body bevat nieuwe `trigger_value`
- Na reload: Edit modal toont nieuwe waarden correct

## Non-Functional Requirements

### Performance
- Form population moet instant zijn (<100ms)
- Geen extra API calls voor edit modal (data komt al van /api/admin/messages/:id)
- Lazy loading van user display data is acceptabel voor graceful degradation

### Compatibility
- Must work met bestaande berichten (backward compatible)
- Geen database migratie vereist
- Geen API versioning nodig

### Security
- Geen nieuwe security risico's (gebruikt bestaande authenticated endpoints)
- User IDs worden niet gevalideerd client-side (server doet dit al)

## Summary

**Geen API wijzigingen nodig** - dit contract documenteert bestaand gedrag.

**Fix scope**:
- Frontend JavaScript in `admin2.html` moet correct omgaan met bestaande response data
- State management (`selectedUserIds`, `selectedUsersData`) correct synchroniseren
- Dropdown value assignment timing en format matching

**Contract compliance**:
- ✅ API responses volgen al dit contract
- ❌ Frontend UI population volgt dit contract NOG NIET (dat is de bug)
- ✅ Na fix: Frontend zal compliant zijn
