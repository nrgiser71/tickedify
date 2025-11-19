# Quickstart Testing Guide: Clickable Postponed Tasks

**Feature**: 067-in-het-postponed
**Date**: 2025-01-18
**Environment**: dev.tickedify.com (staging)

## Prerequisites

- Access to dev.tickedify.com staging environment
- Login credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Browser with developer tools (Chrome/Firefox/Safari)
- At least one task in a postponed category for testing

---

## Quick Test (5 minutes)

### Step 1: Setup Test Data
```bash
# Navigate to dev.tickedify.com/app
# Login with test credentials
# Go to postponed screen (Postponed nav link)
# If no tasks exist, create one:
1. Go to Inbox
2. Create task: "Test postponed clickability"
3. Click task to open modal
4. Click "Weekly" defer button
5. Return to Postponed screen
6. Expand "Weekly" section
```

### Step 2: Test Click to Open Modal
```
✓ Click on task text in Weekly section
✓ Verify modal opens immediately
✓ Verify all fields populated correctly:
  - Task name matches
  - Project shows correct value
  - Context shows correct value
  - Due date (if set)
  - Priority (if set)
  - Duration (if set)
```

### Step 3: Test Edit and Save
```
✓ Change task name to "Updated via modal"
✓ Change due date to tomorrow
✓ Click "Create action" button
✓ Verify modal closes
✓ Verify task still in Weekly section
✓ Verify task name updated to "Updated via modal"
✓ Verify due date NOT moved task to daily planning
```

### Step 4: Test Drag & Drop Still Works
```
✓ Drag the updated task from Weekly to Monthly section
✓ Verify task moves to Monthly
✓ Verify no modal opened during drag
```

---

## Comprehensive Test Suite (15 minutes)

### Test 1: Click Opens Modal for All Categories

**Weekly Tasks**:
```
1. Expand Weekly section
2. Click first task
3. ✓ Modal opens with correct data
4. Close modal
```

**Monthly Tasks**:
```
1. Expand Monthly section
2. Click first task
3. ✓ Modal opens with correct data
4. Close modal
```

**Quarterly Tasks**:
```
1. Expand Quarterly section
2. Click first task
3. ✓ Modal opens with correct data
4. Close modal
```

**Bi-annual Tasks**:
```
1. Expand Bi-annual section
2. Click first task
3. ✓ Modal opens with correct data
4. Close modal
```

**Yearly Tasks**:
```
1. Expand Yearly section
2. Click first task
3. ✓ Modal opens with correct data
4. Close modal
```

---

### Test 2: Edit All Field Types

**Setup**: Click any postponed task to open modal

**Edit Each Field**:
```
✓ Task name: Change to "Comprehensive edit test"
✓ Project: Select different project from dropdown
✓ Context: Select different context
✓ Due date: Change to specific date (e.g., 2025-02-15)
✓ Priority: Change to "High"
✓ Duration: Change to 90 minutes
✓ Notes: Add "Testing all fields"
✓ Click "Create action"
✓ Verify all changes saved
✓ Verify task STILL in same postponed category
```

---

### Test 3: Critical Constraint - No Auto-Move

**Scenario 1: Future date to today**
```
1. Click postponed task with future due date
2. Change due date to TODAY
3. Save
4. ✓ Task stays in postponed category
5. ✓ Task does NOT move to daily planning
```

**Scenario 2: Future date to past date**
```
1. Click postponed task
2. Change due date to yesterday
3. Save
4. ✓ Task stays in postponed category
5. ✓ No error shown
```

**Scenario 3: No date to today**
```
1. Click postponed task with no due date
2. Set due date to today
3. Save
4. ✓ Task stays in postponed category
```

---

### Test 4: Explicit List Movement

**Move via Defer Buttons**:
```
1. Click postponed task in Weekly section
2. Click "Monthly" defer button
3. ✓ Modal closes
4. ✓ Task removed from Weekly section
5. Expand Monthly section
6. ✓ Task appears in Monthly section
```

**Move via "Create Action" Button**:
```
1. Click postponed task
2. Fill in required action fields (project, context, date, duration)
3. Click "Create action" button
4. ✓ Modal closes
5. ✓ Task moved to Actions list
6. Navigate to Actions screen
7. ✓ Task appears in Actions list
```

---

### Test 5: Delete Task

**From Modal**:
```
1. Click postponed task
2. Click "Delete" button in modal
3. Confirm deletion (if prompt appears)
4. ✓ Modal closes
5. ✓ Task removed from postponed list
```

**From Task Item**:
```
1. Click delete button (×) on task item (not task content)
2. Confirm deletion
3. ✓ Task removed from postponed list
4. ✓ No modal opened
```

---

### Test 6: Drag & Drop Compatibility

**Drag Task Between Categories**:
```
1. Click and HOLD on task in Weekly section
2. Drag to Monthly section header
3. Release mouse
4. ✓ Task moves to Monthly section
5. ✓ No modal opened
```

**Accidental Drag (Small Movement)**:
```
1. Click on task
2. Move mouse slightly (< 5px) while holding
3. Release mouse
4. ✓ Modal opens (not treated as drag)
```

---

### Test 7: Visual Feedback

**Hover State**:
```
1. Hover over task content (not delete button)
2. ✓ Cursor changes to pointer
3. ✓ Background color changes (highlight)
4. Move mouse away
5. ✓ Background returns to normal
```

**Click Feedback**:
```
1. Click task
2. ✓ No delay before modal appears (<50ms)
3. ✓ Modal appears smoothly
4. ✓ No flicker or layout shift
```

---

### Test 8: Keyboard Navigation

**Tab Navigation**:
```
1. Click postponed task to open modal
2. Press Tab repeatedly
3. ✓ Focus moves through all form fields in logical order
4. ✓ Focus trapped within modal (doesn't escape to background)
```

**Escape to Close**:
```
1. Open modal
2. Press Escape key
3. ✓ Modal closes without saving
4. ✓ Task unchanged
```

**Enter to Save**:
```
1. Open modal
2. Make a change
3. Press Enter key
4. ✓ Modal closes and changes saved
```

---

### Test 9: Mobile Responsive

**On Mobile Device or Responsive Mode**:
```
1. Resize browser to mobile width (375px)
2. Navigate to Postponed screen
3. Expand Weekly section
4. Click/tap on task
5. ✓ Modal appears properly sized for mobile
6. ✓ All fields are accessible
7. ✓ Touch events work (no need for double-tap)
8. Edit task and save
9. ✓ Changes persist
```

---

### Test 10: Edge Cases

**Empty Fields**:
```
1. Click postponed task with minimal data (only task name)
2. ✓ Modal opens without errors
3. ✓ Empty fields show defaults or placeholders
4. ✓ Save works without errors
```

**Long Task Name**:
```
1. Create task with very long name (200+ characters)
2. Defer to Weekly
3. Click task in postponed screen
4. ✓ Modal opens
5. ✓ Full task name visible in modal input field
6. ✓ No layout breaks
```

**Special Characters**:
```
1. Create task with special chars: "Test <>&\"'éàç"
2. Defer to Weekly
3. Click task
4. ✓ Task name properly escaped/rendered
5. ✓ No XSS or rendering issues
```

**Rapid Clicking**:
```
1. Double-click or triple-click task quickly
2. ✓ Only one modal instance opens
3. ✓ No errors in console
4. Close modal and try again
5. ✓ Works consistently
```

---

## Regression Tests (Ensure Nothing Broke)

### Other Lists Still Work
```
✓ Click task in Inbox → modal opens
✓ Click task in Actions → modal opens
✓ Click task in Follow-up → modal opens
✓ Click task in Daily Planning → modal opens
```

### Delete Buttons Still Work
```
✓ Click delete (×) on postponed task → task deleted
✓ Click delete (×) on inbox task → task deleted
```

### Drag & Drop Elsewhere
```
✓ Drag task from Actions to Daily Planning → works
✓ Drag task within Daily Planning calendar → works
```

---

## Performance Verification

### Timing Measurements

**Open Dev Tools → Performance Tab**:
```
1. Start recording
2. Click postponed task
3. Stop recording when modal fully rendered
4. ✓ Time to modal visible: <50ms
5. ✓ Time to form populated: <100ms
6. ✓ No long tasks blocking main thread
```

**Network Tab**:
```
1. Open postponed screen
2. Click task
3. ✓ No unexpected API calls on click
4. Edit and save
5. ✓ Only one PUT /api/taak/:id request
6. ✓ Response time <200ms
```

---

## Browser Compatibility

Test in multiple browsers:

**Chrome/Edge**:
```
✓ Click works
✓ Drag & drop works
✓ Modal renders correctly
```

**Firefox**:
```
✓ Click works
✓ Drag & drop works
✓ Modal renders correctly
```

**Safari** (Desktop):
```
✓ Click works
✓ Drag & drop works
✓ Modal renders correctly
```

**Safari** (iOS):
```
✓ Tap works
✓ Touch drag works
✓ Modal renders correctly
```

---

## Console Error Check

**Open Dev Tools → Console Tab**:
```
✓ No errors when clicking task
✓ No errors when modal opens
✓ No errors when saving
✓ No warnings about event handlers
```

---

## Success Criteria

**All tests must pass**:
- ✓ Tasks in all 5 postponed categories are clickable
- ✓ Modal opens with correct data for clicked task
- ✓ All task properties can be edited and saved
- ✓ Tasks stay in postponed list when due date changed
- ✓ Tasks only move when user clicks defer/action buttons
- ✓ Drag & drop still works without conflicts
- ✓ Visual feedback (cursor, hover) works correctly
- ✓ Keyboard navigation works
- ✓ Mobile touch events work
- ✓ No regressions in other lists
- ✓ No console errors
- ✓ Performance meets targets (<50ms modal open)

---

## Rollback Plan

If critical issues found:

```bash
# On feature branch:
git checkout staging
git revert HEAD  # Revert the feature commit
git push origin staging

# Wait for Vercel deployment
# Verify rollback successful on dev.tickedify.com
```

---

## Deployment Checklist

Before merging to staging:
- [ ] All quickstart tests passed locally
- [ ] Version bumped in package.json
- [ ] Changelog updated with feature description
- [ ] Commit message follows project style
- [ ] No console errors

After staging deployment:
- [ ] Verify version via curl: `curl -s -L -k https://dev.tickedify.com/api/version`
- [ ] Run quickstart tests on staging
- [ ] Get user approval for production merge

---

**Testing Complete**: Report results and any issues found to project owner
