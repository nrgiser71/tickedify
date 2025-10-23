# Quickstart: YouTube Onboarding Video Feature Testing

**Feature**: 014-de-eerste-keer
**Date**: 2025-10-14
**Purpose**: End-to-end testing scenario for onboarding video feature

---

## Prerequisites

✅ **Database Migration Completed**:
```bash
node migration-014-onboarding-video.js
```

✅ **Feature Deployed**:
- Version 0.19.0 deployed to staging/production
- `/api/version` endpoint returns `0.19.0`

✅ **Test Accounts**:
- Admin account: `jan@buskens.be` (for admin.html configuration)
- Test user: Fresh account created for first-login testing

---

## Test Scenario 1: Admin Configuration

### Step 1.1: Access Admin Panel
1. Navigate to `https://tickedify.com/admin.html`
2. Login with admin credentials (`jan@buskens.be`)
3. Verify access granted (not 403 Forbidden)

### Step 1.2: Configure Video URL
1. Scroll to "📹 Welkomstvideo Instellingen" section
2. Verify input field is empty (or shows current URL)
3. Enter test YouTube URL:
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
4. Click "💾 Opslaan" button
5. **Expected**: Toast notification "Welkomstvideo URL opgeslagen!"
6. **Expected**: Status message "✅ Opgeslagen"

### Step 1.3: Verify Database Update
```bash
# Connect to database
psql $DATABASE_URL

# Check system_settings table
SELECT * FROM system_settings WHERE key = 'onboarding_video_url';
```

**Expected Output**:
```
key                    | value                                      | updated_at          | updated_by
-----------------------|--------------------------------------------| --------------------|------------
onboarding_video_url   | https://www.youtube.com/watch?v=dQw4w9WgXcQ | 2025-10-14 10:30:00 | 1
```

### Step 1.4: Test Video Preview (Optional)
1. Click "👁️ Preview" button
2. **Expected**: Preview section shows with embedded video
3. Verify video plays correctly
4. Verify fullscreen button works

---

## Test Scenario 2: First Login Popup

### Step 2.1: Create Test User
```bash
# Option A: Register via UI
# Navigate to https://tickedify.com and register new account

# Option B: Database insert
psql $DATABASE_URL -c "
INSERT INTO users (username, password_hash, email, onboarding_video_seen)
VALUES ('testuser', 'hashed_password', 'test@example.com', FALSE)
RETURNING id, username, onboarding_video_seen;
"
```

### Step 2.2: First Login
1. Navigate to `https://tickedify.com/app`
2. Login with test user credentials
3. **Expected**: Onboarding video popup appears automatically
4. **Expected**: Popup contains:
   - YouTube video iframe (embedded, not playing)
   - Close button (X in top-right)
   - Title "Welkom bij Tickedify"

### Step 2.3: Verify Video Embed
1. **Expected**: Video iframe src is:
   ```
   https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?controls=1&fs=1&rel=0&modestbranding=1
   ```
2. Click play button in video
3. **Expected**: Video plays normally
4. Click fullscreen button
5. **Expected**: Video enters fullscreen mode

### Step 2.4: Close Popup
1. Click X button (or press ESC, or click overlay)
2. **Expected**: Popup closes with smooth animation
3. **Expected**: Main app interface visible

### Step 2.5: Verify Database Update
```bash
psql $DATABASE_URL -c "
SELECT id, username, onboarding_video_seen, onboarding_video_seen_at
FROM users
WHERE username = 'testuser';
"
```

**Expected Output**:
```
id | username  | onboarding_video_seen | onboarding_video_seen_at
---|-----------|----------------------|------------------------
 2 | testuser  | t                    | 2025-10-14 10:35:00
```

---

## Test Scenario 3: Second Login (No Auto-Popup)

### Step 3.1: Logout and Re-Login
1. Logout from app
2. Login again with same test user
3. **Expected**: Onboarding popup does NOT appear automatically
4. **Expected**: Normal app interface loads immediately

### Step 3.2: Verify Sidebar Link Visible
1. Look at left sidebar
2. **Expected**: Link visible at bottom: "📹 Welkomstvideo" (or similar label)
3. **Expected**: Link always visible (not hidden after first view)

---

## Test Scenario 4: Manual Popup via Sidebar

### Step 4.1: Click Sidebar Link
1. Click "📹 Welkomstvideo" link in sidebar
2. **Expected**: Onboarding popup appears (same as first login)
3. **Expected**: Video iframe loads with same video

### Step 4.2: Close Popup Again
1. Click X button
2. **Expected**: Popup closes
3. **Expected**: `onboarding_video_seen_at` timestamp does NOT update (already seen)

### Step 4.3: Verify Database Unchanged
```bash
psql $DATABASE_URL -c "
SELECT onboarding_video_seen_at
FROM users
WHERE username = 'testuser';
"
```

**Expected**: Timestamp matches original from Step 2.5 (not updated)

---

## Test Scenario 5: Fallback (No Video Configured)

### Step 5.1: Clear Video URL (Admin)
1. Login to admin.html
2. Navigate to "📹 Welkomstvideo Instellingen"
3. Clear the input field (empty string)
4. Click "🗑️ Verwijderen" button
5. **Expected**: Status message "✅ Video URL verwijderd"

### Step 5.2: Verify Database Cleared
```bash
psql $DATABASE_URL -c "
SELECT value FROM system_settings WHERE key = 'onboarding_video_url';
"
```

**Expected**: `value` is NULL

### Step 5.3: Create New Test User
1. Register new user `testuser2`
2. Login for first time
3. **Expected**: Popup appears automatically
4. **Expected**: Fallback message visible:
   ```
   Nog geen welkomstvideo beschikbaar
   ```
5. **Expected**: No video iframe visible

### Step 5.4: Close Fallback Popup
1. Click X button
2. **Expected**: Popup closes
3. **Expected**: User marked as seen in database (even though no video shown)

---

## Test Scenario 6: Multi-Device Tracking

### Step 6.1: Close Popup on Device A
1. Login as `testuser` on Desktop Chrome
2. **Expected**: Popup appears (if user reset, otherwise sidebar test)
3. Close popup

### Step 6.2: Login on Device B
1. Login as same `testuser` on Mobile Safari
2. **Expected**: Popup does NOT appear automatically
3. **Expected**: Sidebar link visible

**Rationale**: Tracking is per account (database), not per browser (cookie)

---

## Test Scenario 7: Invalid YouTube URL

### Step 7.1: Enter Invalid URL (Admin)
1. Login to admin.html
2. Enter invalid URL:
   ```
   https://example.com/not-a-youtube-url
   ```
3. Click "💾 Opslaan"
4. **Expected**: Error message "❌ Ongeldige YouTube URL"
5. **Expected**: Value NOT saved to database

### Step 7.2: Verify Validation
```bash
psql $DATABASE_URL -c "
SELECT value FROM system_settings WHERE key = 'onboarding_video_url';
"
```

**Expected**: Value unchanged (still NULL or previous valid URL)

---

## API Testing (Alternative to UI)

### Test API Endpoint: Get Video URL
```bash
curl -s -L -k -X GET https://tickedify.com/api/settings/onboarding-video \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response** (with video):
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Expected Response** (no video):
```json
{
  "url": null
}
```

### Test API Endpoint: Mark as Seen
```bash
curl -s -L -k -X PUT https://tickedify.com/api/user/onboarding-video-seen \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Onboarding video marked as seen"
}
```

### Test API Endpoint: Update URL (Admin)
```bash
curl -s -L -k -X PUT https://tickedify.com/api/settings/onboarding-video \
  -H "Cookie: connect.sid=YOUR_ADMIN_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Onboarding video URL updated",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

---

## Playwright Automation Test

### Automated Test Script (test-onboarding.spec.js)
```javascript
// Use tickedify-testing agent for automated Playwright testing
test('onboarding video first login flow', async ({ page }) => {
  // Create new user
  await page.goto('https://tickedify.com');
  await page.click('text=Registreren');
  await page.fill('#username', 'testuser-' + Date.now());
  await page.fill('#password', 'test123');
  await page.click('button[type=submit]');

  // Verify popup appears
  await expect(page.locator('#onboardingVideoPopup')).toBeVisible();
  await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toBeVisible();

  // Close popup
  await page.click('.close-video-btn');
  await expect(page.locator('#onboardingVideoPopup')).not.toBeVisible();

  // Logout and login again
  await page.click('#logoutBtn');
  await page.click('text=Inloggen');
  await page.fill('#loginUsername', 'testuser');
  await page.fill('#loginPassword', 'test123');
  await page.click('#loginSubmit');

  // Verify popup does NOT appear
  await expect(page.locator('#onboardingVideoPopup')).not.toBeVisible();

  // Click sidebar link
  await page.click('text=Welkomstvideo');
  await expect(page.locator('#onboardingVideoPopup')).toBeVisible();
});
```

---

## Success Criteria

✅ **All 7 test scenarios pass**
✅ **API endpoints respond correctly**
✅ **Database updates verified**
✅ **No console errors in browser**
✅ **Mobile responsive (sidebar link works on small screens)**
✅ **GDPR-compliant (youtube-nocookie.com used)**

---

## Rollback Procedure (If Needed)

If critical issues found in production:

```bash
# 1. Rollback database
node rollback-014-onboarding-video.js

# 2. Revert code changes
git checkout main
git revert [commit-hash]
git push origin main

# 3. Deploy previous version
vercel --prod
```

---

**Quickstart Complete**: 2025-10-14
**Next**: Phase 2 - Task Generation (via /tasks command)
