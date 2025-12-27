# Quickstart: Edit Icons in Daily Planning

**Feature**: 078-in-het-daily
**Date**: 2025-12-27

## Manual Testing Guide

### Prerequisites
1. Deploy to staging: `git push origin staging`
2. Wait for Vercel deployment (~15-30 seconds)
3. Open https://dev.tickedify.com/app
4. Login with test credentials (jan@buskens.be)
5. Navigate to "Dagelijkse Planning"

### Test Scenarios

#### Test 1: Sidebar Edit Icon Click
**Steps**:
1. Look at the Actions sidebar (left side)
2. Find a task with the edit icon (✏️) next to the star (⭐)
3. Click the edit icon

**Expected**:
- Planning popup opens
- All task fields are populated (name, project, context, etc.)
- Cancel button returns to planning without changes

#### Test 2: Calendar Edit Icon Click
**Steps**:
1. Ensure at least one task is scheduled in the calendar (right side)
2. Find the edit icon (✏️) next to the delete button (×) in the task header
3. Click the edit icon

**Expected**:
- Planning popup opens
- Task data is correctly loaded
- Can edit and save changes

#### Test 3: Drag & Drop Still Works
**Steps**:
1. In the Actions sidebar, drag a task (not clicking the edit icon)
2. Drop it on a time slot in the calendar

**Expected**:
- Task is scheduled at the dropped time
- No popup opens during drag
- Edit icon does not interfere with drag

#### Test 4: Save Changes Reflect in Both Views
**Steps**:
1. Click edit icon on a task in the calendar
2. Change the project or add notes
3. Click Save

**Expected**:
- Popup closes
- Calendar view shows updated task
- Sidebar view shows updated task (if visible)

#### Test 5: Expand Still Works (Calendar)
**Steps**:
1. Click the chevron (▶) on a calendar task
2. Task details should expand

**Expected**:
- Task expands to show details
- Edit icon click does NOT trigger expand (separate action)

### Verification Checklist

- [ ] Edit icon visible in sidebar (next to star)
- [ ] Edit icon visible in calendar (next to delete button)
- [ ] Click edit icon → popup opens
- [ ] Popup shows correct task data
- [ ] Save changes → views update
- [ ] Cancel → no changes
- [ ] Drag & drop still works
- [ ] Expand/collapse still works
- [ ] Checkbox (complete) still works
- [ ] Star (priority) still works
- [ ] Delete button still works

### Regression Tests

Run these to ensure no breaking changes:
1. Complete a task via checkbox in sidebar → task moves to completed
2. Toggle star priority → star changes state
3. Delete a task from calendar → task removed
4. Expand/collapse calendar items → details show/hide
