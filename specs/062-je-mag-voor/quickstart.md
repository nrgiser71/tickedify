# Quickstart Guide: Page Help Icons Testing

This guide provides step-by-step test scenarios to validate the page help icons feature.

## Prerequisites

- Access to dev.tickedify.com (staging environment)
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Admin2 access for configuration testing
- Browser with developer tools for debugging

## Test Scenario 1: View Default Help Content

**Objective**: Verify that help icons appear and display default content

### Steps:
1. Navigate to https://dev.tickedify.com/app
2. Log in with test credentials
3. Navigate to Inbox page
4. Locate help icon (❓) next to "Inbox" page title
5. Click the help icon
6. Verify popup appears with markdown-formatted content
7. Verify content includes:
   - Heading "# Inbox"
   - Bold text formatting
   - List items
8. Close popup (click X or outside)
9. Repeat for all eligible pages:
   - Acties
   - Opvolgen
   - Dagelijkse Planning
   - Uitgesteld pages (5 variations)
   - Afgewerkt
   - Email Import

### Expected Results:
- ✅ Help icon visible on all 11 eligible pages
- ✅ Help icon NOT visible on CSV Import and Settings pages
- ✅ Popup opens on click
- ✅ Markdown content renders correctly
- ✅ Popup is scrollable for long content
- ✅ Popup closes on X click or outside click

### API Verification:
```bash
# Test default content retrieval
curl -s -L -k https://dev.tickedify.com/api/page-help/inbox

# Expected response:
# {
#   "pageId": "inbox",
#   "content": "# Inbox\n\nThe **Inbox** is...",
#   "isDefault": true,
#   "modifiedAt": null,
#   "modifiedBy": null
# }
```

---

## Test Scenario 2: Admin Configuration

**Objective**: Verify admin can configure help content

### Steps:
1. Navigate to https://dev.tickedify.com/admin2-login.html
2. Log in with admin credentials
3. Click "Page Help" menu item in left sidebar
4. Verify page list shows all 11 eligible pages
5. Select "Inbox" from page list
6. Verify content editor shows current (default) content
7. Edit content:
   ```markdown
   # Inbox - Custom Help

   **This is custom help content** for testing.

   ## Custom Section
   - Custom point 1
   - Custom point 2

   [Test link](https://example.com)
   ```
8. Click "Save" button
9. Verify success message appears
10. Verify content is immediately updated in editor

### Expected Results:
- ✅ "Page Help" menu item visible in admin sidebar
- ✅ Page Help screen loads successfully
- ✅ All 11 pages listed
- ✅ Content editor shows current content
- ✅ Save button updates database
- ✅ Success toast notification appears
- ✅ Changes persist on page refresh

### API Verification:
```bash
# Test update endpoint (requires admin session)
curl -s -L -k -X PUT https://dev.tickedify.com/api/page-help/inbox \
  -H "Content-Type: application/json" \
  -b "tickedify_admin_session=..." \
  -d '{"content":"# Inbox - Custom Help\n\n**This is custom help content**"}'

# Expected response:
# {
#   "success": true,
#   "pageId": "inbox",
#   "message": "Help content updated successfully"
# }
```

---

## Test Scenario 3: View Custom Help Content

**Objective**: Verify users see updated help content immediately

### Steps:
1. In main app (not admin), navigate to Inbox page
2. Click help icon
3. Verify popup shows CUSTOM content (from Test Scenario 2)
4. Verify all markdown formatting renders:
   - Custom heading
   - Bold text
   - Lists
   - Links (clickable)
5. Close popup

### Expected Results:
- ✅ Custom content displayed (not default)
- ✅ All markdown formatting renders correctly
- ✅ Links are clickable
- ✅ No caching issues (immediate update)

### API Verification:
```bash
# Verify custom content is returned
curl -s -L -k https://dev.tickedify.com/api/page-help/inbox

# Expected response:
# {
#   "pageId": "inbox",
#   "content": "# Inbox - Custom Help\n\n**This is custom help content**...",
#   "isDefault": false,
#   "modifiedAt": "2025-11-09T12:00:00Z",
#   "modifiedBy": "admin"
# }
```

---

## Test Scenario 4: Revert to Default

**Objective**: Verify admin can revert custom content to default

### Steps:
1. In admin2, navigate to Page Help screen
2. Select "Inbox" from page list
3. Click "Revert to Default" button
4. Confirm action in confirmation dialog
5. Verify content editor shows default content again
6. In main app, click Inbox help icon
7. Verify default content is displayed

### Expected Results:
- ✅ "Revert to Default" button visible when custom content exists
- ✅ Confirmation dialog appears
- ✅ Database entry deleted on confirm
- ✅ Default content displayed immediately
- ✅ Main app shows default content

### API Verification:
```bash
# Test delete endpoint
curl -s -L -k -X DELETE https://dev.tickedify.com/api/page-help/inbox \
  -b "tickedify_admin_session=..."

# Expected response:
# {
#   "success": true,
#   "pageId": "inbox",
#   "message": "Help content deleted, reverted to default"
# }

# Verify default returned again
curl -s -L -k https://dev.tickedify.com/api/page-help/inbox

# Expected: isDefault=true, modifiedAt=null
```

---

## Test Scenario 5: Long Content Scrolling

**Objective**: Verify scrollable area for long help content

### Steps:
1. In admin2, navigate to Page Help screen
2. Select any page (e.g., "Acties")
3. Edit content to include VERY LONG text:
   ```markdown
   # Acties - Long Help

   ## Section 1
   [100 lines of text...]

   ## Section 2
   [100 lines of text...]

   ## Section 3
   [100 lines of text...]
   ```
4. Save content
5. In main app, click Acties help icon
6. Verify popup displays with scrollable content area
7. Scroll through content
8. Verify:
   - Popup max-height is reasonable (not full screen)
   - Content scrolls smoothly
   - Scroll indicator visible (if browser supports)
   - Close button always visible (not scrolled away)

### Expected Results:
- ✅ Popup has max-height constraint
- ✅ Content area is scrollable
- ✅ Smooth scrolling behavior
- ✅ Close button remains accessible
- ✅ No layout breaking

---

## Test Scenario 6: Empty Content Handling

**Objective**: Verify empty popup when admin deletes all content

### Steps:
1. In admin2, navigate to Page Help screen
2. Select any page (e.g., "Opvolgen")
3. Delete ALL content from editor (empty string)
4. Click Save
5. Verify validation error: "Content cannot be empty"
6. Click "Revert to Default" to delete database entry
7. In database, manually set content to empty string (testing edge case):
   ```sql
   UPDATE page_help SET content = '' WHERE page_id = 'opvolgen';
   ```
8. In main app, click Opvolgen help icon
9. Verify empty popup appears (per FR-014)

### Expected Results:
- ✅ Admin UI prevents saving empty string
- ✅ Database constraint prevents empty content
- ✅ Edge case (manual DB edit) shows empty popup gracefully
- ✅ No JavaScript errors

---

## Test Scenario 7: Invalid Page ID Handling

**Objective**: Verify error handling for invalid page IDs

### Steps:
1. Test API with invalid page ID:
   ```bash
   curl -s -L -k https://dev.tickedify.com/api/page-help/invalid-page
   ```
2. Verify 404 response:
   ```json
   {
     "error": "Invalid page ID: invalid-page"
   }
   ```
3. Test with excluded page (e.g., "settings"):
   ```bash
   curl -s -L -k https://dev.tickedify.com/api/page-help/settings
   ```
4. Verify 404 response

### Expected Results:
- ✅ Invalid page IDs return 404
- ✅ Excluded pages (settings, csv-import) return 404
- ✅ Clear error messages

---

## Test Scenario 8: Multiple Page Configuration

**Objective**: Verify admin can configure help for all pages

### Steps:
1. In admin2, navigate to Page Help screen
2. For each of the 11 pages:
   - Select page
   - Add unique custom content (e.g., "# {PageName} - Custom")
   - Save
   - Verify success
3. Click "View All" or list view
4. Verify all 11 pages show "Custom" badge or indicator
5. In main app, navigate to each page and verify custom content

### Expected Results:
- ✅ Admin can configure all 11 pages
- ✅ Each page saves independently
- ✅ No cross-page interference
- ✅ All custom content persists
- ✅ Main app shows correct content for each page

---

## Test Scenario 9: Concurrent Editing (Edge Case)

**Objective**: Verify behavior when multiple admins edit same page

### Steps:
1. Open admin2 in two browser tabs (Tab A and Tab B)
2. In Tab A, select "Inbox" and edit content
3. In Tab B, select "Inbox" and edit content (different changes)
4. In Tab A, click Save
5. In Tab B, click Save (without refreshing)
6. Verify:
   - Tab B's changes overwrite Tab A's changes (last-write-wins)
   - OR: Version conflict warning appears (if implemented)
7. Check database to confirm final state

### Expected Results:
- ✅ Last-write-wins behavior (acceptable for admin use case)
- ✅ No data corruption
- ✅ modified_at reflects latest change

**Note**: Version conflict detection is NOT required for MVP, but document behavior.

---

## Test Scenario 10: Cache Invalidation

**Objective**: Verify cache is invalidated when content changes

### Steps:
1. In main app, click Inbox help icon (loads content, caches in localStorage)
2. In admin2, update Inbox help content
3. In main app (same browser/tab), click Inbox help icon again
4. Verify UPDATED content is displayed (cache invalidated)
5. Check localStorage in browser dev tools
6. Verify cache entry has new timestamp or is refreshed

### Expected Results:
- ✅ Cache is invalidated on content update
- ✅ Users see latest content without page reload
- ✅ localStorage cache TTL is respected (24 hours default)

### API Verification:
```bash
# Check modified_at timestamp
curl -s -L -k https://dev.tickedify.com/api/page-help/inbox | jq '.modifiedAt'

# Client should compare this timestamp with cached timestamp
# If server timestamp is newer → invalidate cache and fetch fresh content
```

---

## Performance Benchmarks

### Response Time Targets:
- `GET /api/page-help/{pageId}`: < 50ms (cached) or < 100ms (database query)
- `PUT /api/page-help/{pageId}`: < 200ms (database write)
- `GET /api/page-help`: < 300ms (list all 11 pages)

### Measurement:
```bash
# Measure API response time
time curl -s -L -k https://dev.tickedify.com/api/page-help/inbox

# Expected: real < 0m0.100s
```

---

## Rollback Procedure

If critical issues are found during testing:

1. **Database Rollback**:
   ```sql
   DROP TABLE page_help;
   ```

2. **Code Rollback**:
   - Revert commits related to feature 062
   - Redeploy previous version

3. **User Impact**:
   - Help icons will not appear (graceful degradation)
   - No data loss (users don't create help content)
   - Admin interface will show error (acceptable for admin-only feature)

---

## Success Criteria

Feature is ready for production when:

- ✅ All 10 test scenarios pass
- ✅ No JavaScript errors in browser console
- ✅ No server errors in application logs
- ✅ API response times meet benchmarks
- ✅ Help icons visible on all 11 eligible pages
- ✅ Admin interface fully functional
- ✅ Default content displays correctly
- ✅ Custom content saves and displays correctly
- ✅ Cache invalidation works as expected
- ✅ Markdown rendering handles all test cases

---

## Troubleshooting

### Help icon not appearing:
- Check browser console for JavaScript errors
- Verify page identifier matches allowed list
- Check CSS styling (icon may be hidden)

### Popup not opening:
- Check event listener attachment
- Verify modal HTML exists in DOM
- Check z-index conflicts with other popups

### Custom content not saving:
- Check admin authentication
- Verify API endpoint is accessible
- Check database connection
- Review server logs for errors

### Default content not falling back:
- Verify DEFAULT_PAGE_HELP object in code
- Check database query logic
- Review fallback condition (if row NOT exists)

---

## Next Steps After Testing

1. Document any issues found
2. Create bug tickets for fixes needed
3. Update default content based on user feedback
4. Plan for production deployment (after beta freeze lift)
5. Monitor usage analytics (which pages get most help clicks)
