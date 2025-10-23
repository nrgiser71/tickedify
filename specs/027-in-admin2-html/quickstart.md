# Quickstart Test Guide: Message Preview

**Feature**: 027-in-admin2-html
**Date**: 2025-10-23
**Environment**: dev.tickedify.com (staging)

## Prerequisites

- ✅ Staging deployment (dev.tickedify.com) accessible
- ✅ Admin credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- ✅ At least 3 test messages in database (verschillende types)
- ✅ Browser: Chrome, Safari, or Firefox

---

## Test Scenario 1: List View Preview - Basic

**Objective**: Verify preview button works from message list

### Steps:
1. Open browser → Navigate to `https://dev.tickedify.com/admin2.html`
2. Login met admin credentials (jan@buskens.be)
3. Klik "Berichten" in sidebar navigation
4. Verify message list loads successfully
5. Locate eerste bericht in de tabel
6. Klik **👁️** (preview) button in action column
7. Observe preview modal opens

### Expected Results:
- ✅ Preview modal displays with full screen overlay
- ✅ Modal title matches message title from list
- ✅ Modal content shows message body met markdown rendering
- ✅ Type badge/icon matches message type (info/warning/feature)
- ✅ "👁️ PREVIEW MODE" indicator visible at top
- ✅ Close button (×) visible in top-right corner

### Verification:
- [ ] Modal opened without errors
- [ ] Content matches expected message
- [ ] Styling is consistent with end-user message modal
- [ ] No console errors in browser DevTools

---

## Test Scenario 2: List View Preview - Type Variations

**Objective**: Verify preview correctly handles different message types

### Steps:
1. From message list, klik preview op **Information** type bericht
2. Verify: Blue icon (ℹ️), blue color scheme
3. Sluit preview modal
4. Klik preview op **Warning** type bericht
5. Verify: Warning icon (⚠️), orange color scheme
6. Sluit preview modal
7. Klik preview op **Feature** type bericht
8. Verify: Rocket icon (🚀), green color scheme

### Expected Results:
Each message type shows correct:
- ✅ Icon type (information, warning, feature, tip, educational, important)
- ✅ Color scheme matching message-modal styling
- ✅ Type badge rendering

### Verification:
- [ ] Information type: Blue ℹ️
- [ ] Warning type: Orange ⚠️
- [ ] Feature type: Green 🚀
- [ ] All icons render correctly

---

## Test Scenario 3: List View Preview - Markdown Rendering

**Objective**: Verify markdown parsing works in preview

### Setup:
Create test message met markdown content:
```markdown
# Test Heading

This is **bold text** and *italic text*.

- Bullet item 1
- Bullet item 2

[Click here](https://tickedify.com) to visit Tickedify.

`code example`
```

### Steps:
1. Create new message via admin panel met above markdown
2. Klik preview button
3. Inspect rendered content

### Expected Results:
- ✅ Heading renders as `<h1>` with proper styling
- ✅ Bold text is `<strong>` (bold font)
- ✅ Italic text is `<em>` (italic font)
- ✅ Bullet list renders as `<ul>` with `<li>` items
- ✅ Link is clickable `<a>` with `target="_blank"`
- ✅ Code renders in `<code>` tag with monospace font

### Verification:
- [ ] All markdown syntax renders correctly
- [ ] Links are clickable (but open in new tab)
- [ ] Styling matches end-user message modal
- [ ] No raw markdown visible

---

## Test Scenario 4: Detail View Preview - Unsaved Changes

**Objective**: Verify preview shows unsaved edits from form

### Steps:
1. From message list, klik **✏️** (edit) button op bestaand bericht
2. Edit modal opens met current message data
3. Change title to: **"TEST PREVIEW UNSAVED"**
4. Change message body to: **"This content has NOT been saved yet."**
5. **DO NOT klik save** - leave edit modal open
6. Klik **👁️ Preview** button in modal footer
7. Observe preview modal opens

### Expected Results:
- ✅ Preview shows NEW title: "TEST PREVIEW UNSAVED"
- ✅ Preview shows NEW body: "This content has NOT been saved yet."
- ✅ Changes are visible ZONDER opslaan naar database
- ✅ Preview modal stacks over edit modal

### Verification:
- [ ] Preview reflects unsaved form changes
- [ ] Title shows edited value
- [ ] Message body shows edited value
- [ ] Original message unchanged in list (after closing)

---

## Test Scenario 5: Detail View Preview - New Message

**Objective**: Verify preview works when creating new message

### Steps:
1. From Berichten scherm, klik **"+ Nieuw Bericht"** button
2. Create message modal opens (empty form)
3. Fill in:
   - Title: **"New Test Message"**
   - Message: **"This is a **bold** new message with [link](https://example.com)"**
   - Type: **Feature**
   - Keep defaults for other fields
4. **DO NOT submit** - leave form filled
5. Klik **👁️ Preview** button
6. Observe preview modal

### Expected Results:
- ✅ Preview shows: "New Test Message" as title
- ✅ Preview shows markdown rendered body
- ✅ Type is Feature (green, 🚀 icon)
- ✅ No errors (message doesn't exist in DB yet)

### Verification:
- [ ] Preview works for unsaved new message
- [ ] All form data reflected in preview
- [ ] Type styling applied correctly
- [ ] No console errors

---

## Test Scenario 6: Edge Case - Empty Content

**Objective**: Verify preview handles empty/missing content gracefully

### Steps:
1. Create new message met:
   - Title: **"Empty Message Test"**
   - Message body: **(leave completely empty)**
   - Type: Information
2. Klik preview button

### Expected Results:
- ✅ Preview modal opens zonder errors
- ✅ Title shows: "Empty Message Test"
- ✅ Body shows placeholder: "No content" (greyed out/italic)
- ✅ No JavaScript errors thrown
- ✅ Modal structure intact

### Verification:
- [ ] Empty content handled gracefully
- [ ] No console errors
- [ ] User-friendly empty state shown
- [ ] Modal closeable

---

## Test Scenario 7: Edge Case - Very Long Content

**Objective**: Verify preview handles long messages with scrolling

### Setup:
Create message met very long body (500+ words of lorem ipsum)

### Steps:
1. Create message met long content
2. Klik preview button
3. Observe modal behavior

### Expected Results:
- ✅ Modal displays with scrollbar for content
- ✅ Content scrollable binnen modal
- ✅ Modal doesn't break page layout
- ✅ Close button remains visible
- ✅ Preview indicator stays at top

### Verification:
- [ ] Long content scrollable
- [ ] Layout not broken
- [ ] All UI elements accessible
- [ ] Smooth scrolling behavior

---

## Test Scenario 8: Preview with Action Button

**Objective**: Verify action buttons shown but disabled in preview

### Steps:
1. Create/edit message met:
   - Button Label: **"Learn More"**
   - Button Action: **Navigate**
   - Button Target: **/app**
2. Klik preview
3. Observe action button in preview

### Expected Results:
- ✅ Button visible in preview
- ✅ Button shows label "Learn More"
- ✅ Button is **disabled** (greyed out)
- ✅ Hover shows tooltip: "Preview mode - button disabled"
- ✅ Click does NOT navigate

### Verification:
- [ ] Action button renders
- [ ] Button is disabled
- [ ] Tooltip shows preview mode warning
- [ ] No navigation occurs on click

---

## Test Scenario 9: Preview with Snooze Options

**Objective**: Verify snooze buttons shown but disabled in preview

### Steps:
1. Create/edit message met:
   - Snoozable: **checked** ✓
2. Klik preview
3. Observe snooze buttons in preview

### Expected Results:
- ✅ Snooze options visible (1 hour, 1 day, etc.)
- ✅ All snooze buttons **disabled**
- ✅ Hover shows: "Preview mode - snooze disabled"
- ✅ Click does NOT trigger snooze

### Verification:
- [ ] Snooze options render
- [ ] Buttons are disabled
- [ ] No API calls on click
- [ ] Tooltip indicates preview mode

---

## Test Scenario 10: Close Preview Modal

**Objective**: Verify all close methods work correctly

### Steps:
1. Open preview from list view
2. Method 1: Klik **× (close button)** in top-right
3. Verify modal closes → Reopen preview
4. Method 2: Klik **"Close Preview"** button in footer
5. Verify modal closes → Reopen preview
6. Method 3: Klik **overlay background** (outside modal)
7. Verify modal closes

### Expected Results:
- ✅ All 3 methods successfully close modal
- ✅ No errors in console
- ✅ Return to previous view (list or edit modal)
- ✅ No data lost (if in edit mode)

### Verification:
- [ ] × button closes preview
- [ ] Footer button closes preview
- [ ] Overlay click closes preview
- [ ] Edit modal data preserved (if applicable)

---

## Test Scenario 11: Preview from Edit Modal - Modal Stacking

**Objective**: Verify preview modal stacks correctly over edit modal

### Steps:
1. Open edit modal voor bestaand bericht
2. Klik preview button
3. Observe both modals on screen

### Expected Results:
- ✅ Preview modal appears OVER edit modal (higher z-index)
- ✅ Both modals visible (preview in front)
- ✅ Close preview → returns to edit modal (still open)
- ✅ Edit modal data preserved

### Verification:
- [ ] Preview modal has higher z-index
- [ ] Modal stacking works correctly
- [ ] Closing preview returns to edit
- [ ] No layout issues

---

## Performance Checks

### Loading Performance
- [ ] Preview modal opens instantly (<100ms)
- [ ] No visible lag when clicking preview button
- [ ] Markdown parsing completes quickly
- [ ] No network requests (client-side only)

### Browser Compatibility
- [ ] Chrome: All scenarios pass
- [ ] Safari: All scenarios pass
- [ ] Firefox: All scenarios pass
- [ ] Mobile browsers: Responsive design works

---

## Regression Checks

**Ensure existing functionality not broken:**

- [ ] Message list still loads correctly
- [ ] Edit message modal still works
- [ ] Create new message still works
- [ ] Delete message still works
- [ ] Toggle active/inactive still works
- [ ] End-user message modal (on app) still works
- [ ] No console errors on any page

---

## Final Validation

### Code Quality
- [ ] No console errors during any test
- [ ] No console warnings
- [ ] Browser DevTools Network tab: No preview-related requests
- [ ] Clean browser console log

### User Experience
- [ ] Preview feels instant and responsive
- [ ] Modal animations smooth
- [ ] Clear visual feedback (preview mode indicator)
- [ ] Intuitive close behavior
- [ ] Consistent styling across browsers

### Documentation
- [ ] All test scenarios documented in this file
- [ ] Edge cases covered
- [ ] Known limitations documented (if any)

---

## Known Limitations

1. **Modal Stacking**: Preview over edit modal may have z-index issues on some browsers
   - **Workaround**: Ensure preview has `z-index: 10001` (edit modal is 10000)

2. **Long Links**: Very long URLs may break layout in narrow viewports
   - **Workaround**: CSS word-break property applied

3. **Markdown Complexity**: Very complex nested markdown may not render perfectly
   - **Acceptable**: parseMarkdownLinks handles 95% of use cases

---

## Success Criteria Summary

**Feature is ready for production when:**
- ✅ All 11 test scenarios pass
- ✅ No console errors in any scenario
- ✅ Performance <100ms for preview
- ✅ All browsers compatible
- ✅ Regression checks pass
- ✅ Edge cases handled gracefully

---

**Test Completion Date**: _________________
**Tester**: _________________
**Result**: ⬜ PASS | ⬜ FAIL (with issues documented)

---

## Troubleshooting

### Preview Modal Doesn't Open
- Check: Is message-modal.js loaded in admin2.html?
- Check: Console errors for missing functions?
- Check: HTML structure matches expected?

### Markdown Not Rendering
- Check: Is parseMarkdownLinks() function accessible?
- Check: Content properly escaped?
- Check: innerHTML vs textContent usage?

### Styling Incorrect
- Check: Are message-modal CSS classes loaded?
- Check: Type class applied correctly?
- Check: Z-index conflicts?

### Form Data Not Previewing
- Check: Form field IDs match?
- Check: Optional chaining for nullable fields?
- Check: Default values provided?

---

**Quickstart Complete**: Ready for manual testing on staging
