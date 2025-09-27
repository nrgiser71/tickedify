# Quickstart: Taak Afwerken vanuit Planning Popup

## Feature Overview
Test the complete workflow for the new "Taak afwerken" checkbox functionality in the planning popup.

## Prerequisites
- Tickedify application running locally or on staging
- At least one task in the inbox
- Access to browser developer tools for debugging

## Test Scenarios

### Scenario 1: Normal Planning (Baseline)
**Purpose**: Verify existing functionality remains unchanged

1. **Setup**: Ensure you have a task in inbox
2. **Action**: Click on an inbox task to open planning popup
3. **Verify**: Planning popup opens with normal fields and "Maak actie" button
4. **Action**: Fill in planning fields (project, date, etc.) and click "Maak actie"
5. **Expected Result**: Task moves to acties list with planning information

### Scenario 2: Direct Task Completion
**Purpose**: Test new checkbox completion workflow

1. **Setup**: Ensure you have a task in inbox
2. **Action**: Click on an inbox task to open planning popup
3. **Verify**: "Taak afwerken" checkbox is visible next to task name
4. **Action**: Check the "Taak afwerken" checkbox
5. **Expected Result**:
   - Button text changes from "Maak actie" to "Taak afwerken"
   - Planning field validation indicators disappear
6. **Action**: Click "Taak afwerken" button (without filling planning fields)
7. **Expected Result**:
   - Popup closes
   - Task disappears from inbox
   - Task appears in completed tasks list
   - Success toast notification appears

### Scenario 3: Checkbox Toggle Behavior
**Purpose**: Test UI state management when toggling checkbox

1. **Setup**: Open planning popup for an inbox task
2. **Action**: Check the "Taak afwerken" checkbox
3. **Verify**: Button text is "Taak afwerken", validation disabled
4. **Action**: Uncheck the "Taak afwerken" checkbox
5. **Expected Result**:
   - Button text returns to "Maak actie"
   - Planning field validation re-enabled
   - Form returns to normal planning mode

### Scenario 4: Recurring Task Completion
**Purpose**: Test recurring task logic with direct completion

1. **Setup**: Create a recurring task in inbox (daily, weekly, etc.)
2. **Action**: Open planning popup and check "Taak afwerken"
3. **Action**: Click "Taak afwerken" to complete
4. **Expected Result**:
   - Original task marked as completed
   - New recurring task instance created in inbox
   - Success message indicates recurring task created

### Scenario 5: Error Handling
**Purpose**: Test error scenarios and recovery

1. **Setup**: Open planning popup for an inbox task
2. **Action**: Check "Taak afwerken" checkbox
3. **Simulate**: Disconnect network or cause API error
4. **Action**: Click "Taak afwerken"
5. **Expected Result**:
   - Error toast appears
   - Popup remains open
   - User can retry or cancel

## API Testing

### Manual API Test
Use browser console or API testing tool:

```javascript
// Test direct completion API call
fetch('/api/taak/123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lijst: 'afgewerkt',
    afgewerkt: new Date().toISOString(),
    completedViaCheckbox: true
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

**Expected Response**:
```json
{
  "success": true,
  "task": { ... },
  "recurringTaskCreated": false
}
```

## Database Verification

### Check Task Status in Database
```sql
-- Verify task completion
SELECT id, tekst, lijst, afgewerkt
FROM taken
WHERE id = 123;

-- Should show: lijst='afgewerkt', afgewerkt=[timestamp]
```

### Check Recurring Task Creation
```sql
-- For recurring tasks, verify new instance created
SELECT id, tekst, lijst, verschijndatum, herhaling_type
FROM taken
WHERE tekst LIKE '%recurring task name%'
ORDER BY id DESC
LIMIT 2;

-- Should show original (completed) and new (inbox) instances
```

## Performance Testing

### Response Time Verification
1. Open browser developer tools → Network tab
2. Perform checkbox completion workflow
3. **Expected Performance**:
   - API call completion: <300ms
   - UI state change: <100ms
   - Popup close + list refresh: <500ms total

## Integration Testing

### End-to-End Workflow Test
1. **Start**: Fresh inbox with multiple tasks
2. **Complete**: Use checkbox to complete several tasks
3. **Verify**:
   - Inbox count decreases correctly
   - Completed tasks list increases
   - No tasks lost or duplicated
   - UI state remains consistent

### Cross-Browser Testing
Test the same scenarios in:
- Chrome (primary)
- Firefox
- Safari (if on macOS)

## Troubleshooting

### Common Issues
- **Checkbox not visible**: Check if task is truly in 'inbox' status
- **Button text not changing**: Verify JavaScript event handlers attached
- **API errors**: Check network tab for failed requests, verify authentication
- **Recurring tasks not created**: Check task has `herhaling_aktief = true`

### Debug Tools
- Browser console for JavaScript errors
- Network tab for API request/response inspection
- Application tab to verify session storage
- Test dashboard at `/test-dashboard.html` for backend testing

## Success Criteria
✅ **All scenarios pass without errors**
✅ **Performance meets targets (<300ms API, <100ms UI)**
✅ **No regression in existing planning functionality**
✅ **Recurring task logic preserved**
✅ **Error handling graceful and user-friendly**

## Next Steps
After quickstart validation:
1. Run full test suite via test dashboard
2. Deploy to staging for user acceptance testing
3. Monitor for any edge cases or performance issues
4. Document any discovered limitations or requirements