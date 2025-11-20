# Quickstart: Verify "Appear Date" Terminology Change

**Date**: 2025-11-19
**Purpose**: Manual verification guide for "Due Date" → "Appear Date" terminology change
**Time Required**: 15-20 minutes

## Prerequisites
- Access to dev.tickedify.com (staging environment)
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Feature deployed to staging branch
- Browser with developer tools

## Quick Verification Steps

### Step 1: Task Creation Modal (2 min)
**Goal**: Verify date field label says "Appear Date"

1. Navigate to https://dev.tickedify.com/app
2. Login with test credentials
3. Click "New Task" or "+" button to open task creation modal
4. **Verify**: Date field label reads "Appear Date" (NOT "Due Date")
5. **Verify**: Any placeholder text uses "appear" terminology
6. **Verify**: Help icons or tooltips near date field say "Appear Date"

**Expected Result**: ✅ All date-related text says "Appear Date"

---

### Step 2: Task Editing Modal (2 min)
**Goal**: Verify existing tasks show "Appear Date" label

1. Open any existing task from inbox or actions list
2. Task editing modal opens
3. **Verify**: Date field label reads "Appear Date"
4. **Verify**: No "Due Date" text anywhere in the modal

**Expected Result**: ✅ Edit modal uses "Appear Date" terminology

---

### Step 3: Error Messages (3 min)
**Goal**: Verify validation errors use "Appear Date"

1. Open task creation modal
2. Fill in task name, context, duration
3. Leave date field EMPTY
4. Click "Save" or "Create Task"
5. **Verify**: Error message says "Appear Date is required!" (or similar with "Appear Date")
6. Try entering invalid date format (if possible)
7. **Verify**: Error message references "Appear Date", not "Due Date"

**Expected Result**: ✅ All error messages use "Appear Date"

---

### Step 4: List Views (4 min)
**Goal**: Verify no "Due Date" appears in task lists

1. **Inbox View**:
   - Navigate to inbox
   - Check if any column headers or labels say "Due Date"
   - **Verify**: No "Due Date" text visible

2. **Actions View**:
   - Navigate to actions list
   - Check task rows for "Due Date" labels
   - **Verify**: No "Due Date" text visible

3. **Postponed Views**:
   - Navigate to each postponed list (weekly, monthly, etc.)
   - Check for "Due Date" text
   - **Verify**: No "Due Date" text visible

4. **Daily Planning**:
   - Navigate to daily planning view
   - Check date displays and labels
   - **Verify**: No "Due Date" text visible

**Expected Result**: ✅ No "Due Date" text in any list view

---

### Step 5: Help Text & Tooltips (2 min)
**Goal**: Verify help text uses correct terminology

1. Look for "?" or "i" help icons near date fields
2. Hover over help icons
3. **Verify**: Tooltip text uses "Appear Date" or "appear" terminology
4. If help documentation page exists, check for "Due Date"
5. **Verify**: Help docs use "Appear Date"

**Expected Result**: ✅ Help text consistent with new terminology

---

### Step 6: Voice Mode (3 min) [Optional]
**Goal**: Verify voice responses use "appear date"

*Note: Skip this step if voice mode is restricted to certain users*

1. Navigate to voice mode interface
2. Activate voice mode
3. Say: "Create a new task"
4. Listen for system response about setting date
5. **Verify**: Voice says "appear date" not "due date"
6. Try setting a date via voice
7. **Verify**: Confirmation message says "appear date"

**Expected Result**: ✅ Voice mode uses "appear date" terminology

---

### Step 7: Email Templates (4 min) [Optional]
**Goal**: Verify emails use "Appear Date"

*Note: This requires triggering actual emails*

1. Create a new task with date set
2. Check confirmation email (if sent)
3. **Verify**: Email uses "Appear Date" or "appears on" language
4. Check daily planning email (if sent daily)
5. **Verify**: Email references "tasks appearing today" or similar

**Expected Result**: ✅ Email templates use new terminology

**Alternative**: Check email template code in admin interface or server.js

---

## Automated Verification (Bonus)

### Playwright Test
If Playwright test exists:
```bash
# Run automated UI test
npm run test:ui:terminology
# or
playwright test terminology-check.spec.js
```

**Expected Result**: ✅ Test passes, finds zero "Due Date" instances

### Grep Check
```bash
# From repo root
grep -r "Due Date" public/ --include="*.html" --include="*.js"
```

**Expected Result**: ✅ Zero matches in user-facing files
- Changelog references are OK (historical)
- Comments in code are OK (internal)

---

## Success Criteria

**Feature is ready for production when**:
- [x] Step 1: Task creation modal shows "Appear Date"
- [x] Step 2: Task editing modal shows "Appear Date"
- [x] Step 3: Error messages use "Appear Date"
- [x] Step 4: No "Due Date" in any list view
- [x] Step 5: Help text uses "Appear Date"
- [x] Step 6: Voice mode says "appear date" (if tested)
- [x] Step 7: Email templates use "Appear Date" (if tested)
- [x] Bonus: Automated tests pass

**If ANY step fails**: File bug, do NOT deploy to production

---

## Troubleshooting

### "Due Date" still appears in one location
**Action**:
1. Note the exact location (URL, element, context)
2. File bug with screenshot
3. Check if it's cached HTML (hard refresh with Cmd+Shift+R)
4. Verify feature branch is deployed (check /api/version)

### Error message unchanged
**Action**:
1. Check `public/app.js` for hardcoded error strings
2. Search for string literals containing "Due Date"
3. Verify toast notification functions use new text

### Email still says "Due Date"
**Action**:
1. Check `server.js` email template functions
2. Search for email template strings
3. Verify email is not cached (check email headers for date)

---

## Rollback Plan

**If major issues found**:
1. Revert commit on staging branch
2. Redeploy previous version
3. Document issues found
4. Fix issues on feature branch
5. Re-test with this quickstart guide

---

## Next Steps After Verification

1. Update package.json version (e.g., 1.0.128)
2. Update changelog.html with feature description
3. Commit changes to feature branch
4. Merge feature branch to staging
5. Complete this quickstart verification again
6. If all passes: Approve for production deployment
7. Merge staging to main (after beta freeze lifted)

---

**Verification Date**: _____________
**Verified By**: _____________
**Result**: ✅ Pass / ❌ Fail
**Notes**: _____________________________________________
