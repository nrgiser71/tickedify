# Quickstart: Select All in Bulk Edit Mode

**Feature**: 069-op-het-acties
**Date**: 2025-11-25

## Test Scenarios

### Scenario 1: Checkbox Appears in Bulk Mode
**Steps**:
1. Navigate to tickedify.com/app
2. Go to "Acties" screen
3. Click "Bulk Edit" button

**Expected**:
- Select All checkbox appears in the header bar
- Checkbox is unchecked
- Checkbox is positioned left of the Bulk Edit button

### Scenario 2: Select All Tasks
**Steps**:
1. Activate bulk edit mode (Scenario 1)
2. Ensure there are visible tasks
3. Click the Select All checkbox

**Expected**:
- All visible tasks get selected (blue circles filled)
- Selection count in toolbar shows total count
- Checkbox shows checked state

### Scenario 3: Deselect All Tasks
**Steps**:
1. Complete Scenario 2 (all tasks selected)
2. Click the Select All checkbox again

**Expected**:
- All tasks get deselected (blue circles empty)
- Selection count shows "0"
- Checkbox shows unchecked state

### Scenario 4: Partial Selection → Click Select All
**Steps**:
1. Activate bulk edit mode
2. Manually click 2-3 individual tasks to select them
3. Verify checkbox shows indeterminate state (-)
4. Click the Select All checkbox

**Expected**:
- ALL visible tasks become selected
- Checkbox changes from indeterminate to checked

### Scenario 5: Indeterminate State Display
**Steps**:
1. Activate bulk edit mode with multiple tasks visible
2. Click one task to select it

**Expected**:
- Checkbox shows indeterminate state (horizontal line or partially filled)
- Selection count shows "1"

### Scenario 6: Filter Integration
**Steps**:
1. Activate bulk edit mode
2. Apply a filter (e.g., project filter)
3. Click Select All checkbox

**Expected**:
- Only filtered (visible) tasks are selected
- Hidden tasks remain unselected
- Checkbox shows checked state relative to visible tasks only

### Scenario 7: Exit Bulk Mode Hides Checkbox
**Steps**:
1. Activate bulk edit mode
2. Select some tasks
3. Click "Bulk Edit" button again to exit bulk mode

**Expected**:
- Bulk mode deactivates
- Select All checkbox disappears
- All selections are cleared

### Scenario 8: Empty Task List
**Steps**:
1. Filter tasks so none are visible
2. Activate bulk edit mode

**Expected**:
- Select All checkbox is visible but disabled
- Clicking checkbox has no effect

### Scenario 9: Keyboard Accessibility
**Steps**:
1. Activate bulk edit mode
2. Press Tab until Select All checkbox is focused
3. Press Space or Enter

**Expected**:
- Checkbox toggles selection state
- Same behavior as mouse click

### Scenario 10: State Persistence During Bulk Actions
**Steps**:
1. Select all tasks via checkbox
2. Click a bulk action (e.g., "Tomorrow")
3. Observe behavior

**Expected**:
- Bulk action executes on selected tasks
- Tasks move/update as expected
- Checkbox state updates based on remaining visible tasks

## Manual Verification Checklist

- [ ] Checkbox appears when bulk mode activates
- [ ] Checkbox hides when bulk mode deactivates
- [ ] Click unchecked → selects all visible tasks
- [ ] Click checked → deselects all tasks
- [ ] Click indeterminate → selects all visible tasks
- [ ] Individual task selection updates checkbox state
- [ ] Filter changes update checkbox state correctly
- [ ] Empty list shows disabled checkbox
- [ ] Keyboard navigation works (Tab + Space/Enter)
- [ ] Visual styling matches existing UI (blue accent color)
