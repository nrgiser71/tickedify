# UI Translation Contract: Bulk Edit Properties Modal

## Overview
This contract defines the expected English text translations for all UI elements in the bulk edit properties modal. This serves as the reference for implementation and testing.

## Contract Type
**UI Text Translation Contract** (Non-API)

## HTML Elements Contract

### Modal Structure
**Element**: `#bulkEditModal` modal dialog
**Location**: `/public/index.html` lines 1183-1230

### Text Elements

#### 1. Modal Header
```
Element: <h2 id="bulkEditHeader">
Current (Dutch): "Eigenschappen bewerken voor X taken"
Expected (English): "Edit properties for X tasks"
Note: JavaScript already handles this correctly (app.js:478)
Status: ✅ Already implemented
```

#### 2. Form Labels
```
Element: <label for="bulkEditProject">
Current: "Project:"
Expected: "Project:"
Status: ✅ Already correct

Element: <label for="bulkEditDatum">
Current: "Datum:"
Expected: "Date:"
Status: ❌ Needs translation

Element: <label for="bulkEditContext">
Current: "Context:"
Expected: "Context:"
Status: ✅ Already correct

Element: <label for="bulkEditPriority">
Current: "Prioriteit:"
Expected: "Priority:"
Status: ❌ Needs translation

Element: <label for="bulkEditTime">
Current: "Geschatte tijd (minuten):"
Expected: "Estimated time (minutes):"
Status: ❌ Needs translation
```

#### 3. Project Dropdown Options
```
Element: <select id="bulkEditProject">
Option 1:
  Current: <option value="">-- Geen wijziging --</option>
  Expected: <option value="">-- No change --</option>

Option 2:
  Current: <option value="null">Geen project</option>
  Expected: <option value="null">No project</option>

Status: ❌ Needs translation (both HTML and JavaScript)
```

#### 4. Context Dropdown Options
```
Element: <select id="bulkEditContext">
Option 1:
  Current: <option value="">-- Geen wijziging --</option>
  Expected: <option value="">-- No change --</option>

Option 2:
  Current: <option value="null">Geen context</option>
  Expected: <option value="null">No context</option>

Status: ❌ Needs translation (both HTML and JavaScript)
```

#### 5. Priority Dropdown Options
```
Element: <select id="bulkEditPriority">
Option 1:
  Current: <option value="">-- Geen wijziging --</option>
  Expected: <option value="">-- No change --</option>

Option 2:
  Current: <option value="laag">Laag</option>
  Expected: <option value="laag">Low</option>
  Note: value="laag" MUST remain unchanged (backend contract)

Option 3:
  Current: <option value="gemiddeld">Normaal</option>
  Expected: <option value="gemiddeld">Normal</option>
  Note: value="gemiddeld" MUST remain unchanged (backend contract)

Option 4:
  Current: <option value="hoog">Hoog</option>
  Expected: <option value="hoog">High</option>
  Note: value="hoog" MUST remain unchanged (backend contract)

Status: ❌ Needs translation
```

#### 6. Time Input Placeholder
```
Element: <input type="number" id="bulkEditTime">
Current: placeholder="Optioneel"
Expected: placeholder="Optional"
Status: ❌ Needs translation
```

#### 7. Buttons
```
Element: <button onclick="window.bulkEditCancel()">
Current: "Annuleren"
Expected: "Cancel"
Status: ❌ Needs translation

Element: <button onclick="window.bulkEditSave()">
Current: "Opslaan"
Expected: "Save"
Status: ❌ Needs translation
```

## JavaScript Functions Contract

### populateBulkEditDropdowns()
**Location**: `/public/app.js` lines 357-393

**Required Changes**:
```javascript
// Line 362 - Project dropdown
Current: projectSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                                  '<option value="null">Geen project</option>';
Expected: projectSelect.innerHTML = '<option value="">-- No change --</option>' +
                                   '<option value="null">No project</option>';

// Line 379 - Context dropdown
Current: contextSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                                  '<option value="null">Geen context</option>';
Expected: contextSelect.innerHTML = '<option value="">-- No change --</option>' +
                                   '<option value="null">No context</option>';
```

## Validation Contract

### Visual Validation
All text elements MUST:
1. Display in English
2. Maintain original layout (no wrapping or overflow)
3. Use consistent terminology with rest of application
4. Be grammatically correct

### Functional Validation
1. Form submission MUST work unchanged
2. Dropdown population MUST work unchanged
3. Value attributes MUST remain unchanged (backend contract)
4. All event handlers MUST function correctly

## Testing Contract

### Manual Test Cases
```
Test 1: Open bulk edit modal
  - Given: 2+ tasks selected
  - When: Click "Edit Properties" button
  - Then: Modal opens with all text in English

Test 2: Verify form labels
  - Given: Modal is open
  - When: Inspect form labels
  - Then: All labels are in English (Date, Priority, Estimated time)

Test 3: Verify dropdown options
  - Given: Modal is open
  - When: Open each dropdown
  - Then: All options display in English

Test 4: Verify buttons
  - Given: Modal is open
  - When: Inspect buttons
  - Then: "Cancel" and "Save" buttons display correctly

Test 5: Verify placeholder
  - Given: Modal is open
  - When: Focus time input
  - Then: Placeholder shows "Optional"
```

### Automated Test Cases (Playwright)
```javascript
test('Bulk edit modal displays all text in English', async ({ page }) => {
  // Setup: Select 2+ tasks
  await page.goto('https://dev.tickedify.com/app');
  await page.click('[data-test="bulk-mode-toggle"]');
  await page.click('[data-test="task-checkbox"]:nth-of-type(1)');
  await page.click('[data-test="task-checkbox"]:nth-of-type(2)');

  // Open bulk edit modal
  await page.click('button:has-text("Edit Properties")');

  // Verify header
  await expect(page.locator('#bulkEditHeader')).toContainText('Edit properties for 2 tasks');

  // Verify labels
  await expect(page.locator('label[for="bulkEditDatum"]')).toHaveText('Date:');
  await expect(page.locator('label[for="bulkEditPriority"]')).toHaveText('Priority:');
  await expect(page.locator('label[for="bulkEditTime"]')).toHaveText('Estimated time (minutes):');

  // Verify dropdown options
  await expect(page.locator('#bulkEditProject option[value=""]')).toHaveText('-- No change --');
  await expect(page.locator('#bulkEditProject option[value="null"]')).toHaveText('No project');
  await expect(page.locator('#bulkEditContext option[value=""]')).toHaveText('-- No change --');
  await expect(page.locator('#bulkEditContext option[value="null"]')).toHaveText('No context');
  await expect(page.locator('#bulkEditPriority option[value="laag"]')).toHaveText('Low');
  await expect(page.locator('#bulkEditPriority option[value="gemiddeld"]')).toHaveText('Normal');
  await expect(page.locator('#bulkEditPriority option[value="hoog"]')).toHaveText('High');

  // Verify placeholder
  await expect(page.locator('#bulkEditTime')).toHaveAttribute('placeholder', 'Optional');

  // Verify buttons
  await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  await expect(page.locator('button:has-text("Save")')).toBeVisible();
});
```

## Acceptance Criteria
- [ ] All Dutch text elements translated to English
- [ ] HTML modal elements updated (index.html)
- [ ] JavaScript function strings updated (app.js)
- [ ] Layout remains intact (no visual regressions)
- [ ] Form functionality unchanged (submit/cancel works)
- [ ] Backend value attributes unchanged
- [ ] Manual testing passed on dev.tickedify.com
- [ ] Playwright tests passed (if implemented)

## Backward Compatibility
**Impact**: None - This is a frontend-only change
**Backend Impact**: None - Value attributes remain unchanged
**API Impact**: None - No API changes
**Database Impact**: None - No schema changes

## Notes
- This is a pure translation contract - no business logic changes
- Backend expects Dutch value attributes (laag/gemiddeld/hoog) - DO NOT change
- Only display text is translated
- Consistent with existing English terminology in Tickedify
