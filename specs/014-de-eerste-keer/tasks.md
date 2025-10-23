# Tasks: YouTube Onboarding Video Popup

**Feature**: 014-de-eerste-keer
**Input**: Design documents from `/specs/014-de-eerste-keer/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Tech stack: JavaScript ES6+, Node.js 16+, PostgreSQL
   ✓ Structure: Tickedify existing (public/, server.js, database.js)
2. Load optional design documents:
   ✓ data-model.md: 2 entities (users extension, system_settings)
   ✓ contracts/: 2 files (api-onboarding.yaml, api-admin-settings.yaml)
   ✓ research.md: YouTube embed, modal patterns, migrations, admin UI
   ✓ quickstart.md: 7 test scenarios
3. Generate tasks by category:
   ✓ Setup: Migration scripts, HTML structure
   ✓ Tests: API tests, integration tests
   ✓ Core: Database functions, API endpoints, frontend classes
   ✓ Integration: Popup triggers, admin UI, sidebar link
   ✓ Polish: Playwright tests, deployment, validation
4. Apply task rules:
   ✓ Different files = marked [P]
   ✓ Same file = sequential
   ✓ Tests before implementation
5. Tasks numbered T001-T020
6. Dependencies documented
7. Parallel execution examples provided
8. Validation:
   ✓ All contracts have tests
   ✓ All entities have migrations
   ✓ All endpoints implemented
   ✓ TDD principles followed
9. SUCCESS - 20 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in task descriptions

## Path Conventions
**Tickedify Web Application Structure**:
- Frontend: `public/` (app.js, style.css, index.html)
- Backend: `server.js`, `database.js`
- Admin: `public/admin.html`, `public/admin.js`
- Migrations: Root directory `migration-014-*.js`

---

## Phase 3.1: Database Setup

- [x] **T001** [P] Create migration script `migration-014-onboarding-video.js`
  - Location: `/migration-014-onboarding-video.js` (repository root)
  - Add `onboarding_video_seen` BOOLEAN to users table
  - Add `onboarding_video_seen_at` TIMESTAMP to users table
  - Create `system_settings` table (key, value, updated_at, updated_by)
  - Insert initial row: `onboarding_video_url = NULL`
  - Implement idempotent checks (column/table existence)
  - Include transaction BEGIN/COMMIT/ROLLBACK
  - Add console logging for migration progress

- [x] **T002** [P] Create rollback script `rollback-014-onboarding-video.js`
  - Location: `/rollback-014-onboarding-video.js` (repository root)
  - DROP columns from users table (IF EXISTS)
  - DROP system_settings table (IF EXISTS)
  - Safe rollback with transaction wrapping

- [x] **T003** Run migration on local/staging database
  - Execute: `node migration-014-onboarding-video.js`
  - Verify users table columns added
  - Verify system_settings table created
  - Verify initial data inserted
  - Test idempotency (run migration twice)

---

## Phase 3.2: Backend - Database Functions (TDD Setup)

- [x] **T004** [P] Add database functions to `database.js`
  - Location: `database.js` (append to file, ~line 1356+)
  - Function: `hasSeenOnboardingVideo(userId)` → Promise<boolean>
  - Function: `markOnboardingVideoSeen(userId)` → Promise<void>
  - Function: `getSystemSetting(key)` → Promise<string|null>
  - Function: `updateSystemSetting(key, value, adminUserId)` → Promise<void>
  - Use prepared statements with parameterized queries
  - Include error handling and logging
  - Export all functions in module.exports

---

## Phase 3.3: Backend - API Endpoints (Tests First)

### Contract Tests (MUST WRITE AND FAIL BEFORE IMPLEMENTATION)

- [x] **T005** [P] API test for GET /api/settings/onboarding-video
  - Create test file (can be inline curl test in quickstart.md)
  - Test authenticated user access
  - Test returns `{url: null}` when not configured
  - Test returns `{url: "..."}` when configured
  - Test 401 when not authenticated
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [x] **T006** [P] API test for PUT /api/user/onboarding-video-seen
  - Create test file (can be inline curl test)
  - Test marks user as seen
  - Test sets timestamp
  - Test returns success message
  - Test 401 when not authenticated
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [x] **T007** [P] API test for PUT /api/settings/onboarding-video (admin)
  - Create test file (can be inline curl test)
  - Test admin can update URL
  - Test validates YouTube URL format
  - Test rejects invalid URLs (400)
  - Test 403 when non-admin user
  - Test 401 when not authenticated
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

### Endpoint Implementation (ONLY AFTER T005-T007 FAIL)

- [x] **T008** Implement GET /api/settings/onboarding-video endpoint
  - Location: `server.js` (API endpoints section, ~line 2000+)
  - Route: `app.get('/api/settings/onboarding-video', async (req, res) => {...})`
  - Call `getSystemSetting('onboarding_video_url')`
  - Return `{url: value}` (null or string)
  - Require authentication middleware
  - **Expected**: Tests T005 now PASS

- [x] **T009** Implement PUT /api/user/onboarding-video-seen endpoint
  - Location: `server.js` (same section)
  - Route: `app.put('/api/user/onboarding-video-seen', async (req, res) => {...})`
  - Call `markOnboardingVideoSeen(req.session.user.id)`
  - Return `{success: true, message: "..."}`
  - Require authentication middleware
  - **Expected**: Tests T006 now PASS

- [x] **T010** Implement PUT /api/settings/onboarding-video endpoint (admin)
  - Location: `server.js` (admin endpoints section, ~line 5800+)
  - Route: `app.put('/api/settings/onboarding-video', async (req, res) => {...})`
  - Validate YouTube URL format (regex check)
  - Check admin permissions (req.session.user.isAdmin)
  - Call `updateSystemSetting('onboarding_video_url', url, adminId)`
  - Return `{success: true, message: "...", url: value}`
  - Return 400 for invalid URL, 403 for non-admin
  - **Expected**: Tests T007 now PASS

---

## Phase 3.4: Frontend - Popup HTML & CSS

- [x] **T011** Add onboarding video popup HTML to `index.html`
  - Location: `public/index.html` (after existing modals, ~line 700+)
  - Structure:
    ```html
    <div id="onboardingVideoPopup" class="popup-overlay" style="display: none;">
      <div class="popup-content onboarding-video-content">
        <button class="close-video-btn">&times;</button>
        <h2>Welkom bij Tickedify</h2>
        <div class="video-container">
          <iframe id="onboardingVideoIframe"
                  width="560" height="315"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowfullscreen>
          </iframe>
        </div>
        <p class="fallback-message" style="display: none;">
          Nog geen welkomstvideo beschikbaar
        </p>
      </div>
    </div>
    ```
  - Follow existing popup HTML patterns

- [x] **T012** Add sidebar link HTML to `index.html`
  - Location: `public/index.html` (sidebar section, bottom, ~line 250)
  - Add link after existing sidebar items:
    ```html
    <a href="#" id="openOnboardingVideoLink" class="sidebar-link">
      <span class="icon">📹</span>
      <span class="label">Instructievideo</span>
    </a>
    ```
  - Match existing sidebar link styling
  - **UPDATED v0.19.1**: Changed "Welkomstvideo" to "Instructievideo"

- [x] **T013** [P] Add popup CSS styling to `style.css`
  - Location: `public/style.css` (after popup styles, ~line 1850+)
  - CSS classes:
    ```css
    .onboarding-video-content {
      max-width: 700px;
    }

    .video-container {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      height: 0;
      overflow: hidden;
    }

    .video-container iframe {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
    }

    .close-video-btn {
      position: absolute;
      top: 16px; right: 16px;
      background: none;
      border: none;
      font-size: 32px;
      cursor: pointer;
      color: var(--macos-text-secondary);
      z-index: 10;
    }

    .fallback-message {
      text-align: center;
      padding: 40px 20px;
      color: var(--macos-text-secondary);
    }
    ```
  - Ensure z-index: 1200 for popup overlay
  - Mobile responsive styles

---

## Phase 3.5: Frontend - JavaScript Implementation

- [x] **T014** Create OnboardingVideoManager class in `app.js`
  - Location: `public/app.js` (after existing modal classes, ~line 300+)
  - Class structure:
    ```javascript
    class OnboardingVideoManager {
      constructor() {
        this.popup = document.getElementById('onboardingVideoPopup');
        this.iframe = document.getElementById('onboardingVideoIframe');
        this.fallback = this.popup.querySelector('.fallback-message');
        this.setupEventListeners();
      }

      setupEventListeners() {
        // ESC key to close
        // Overlay click to close
        // Close button click
        // Sidebar link click
      }

      async showVideo() {
        // Fetch video URL from API
        // Extract YouTube ID
        // Set iframe src or show fallback
        // Display popup
      }

      async closeVideo() {
        // Hide popup
        // Call API to mark as seen
      }

      extractYouTubeId(url) {
        // Parse YouTube URL patterns
        // Return video ID or null
      }
    }
    ```
  - Follow ConfirmModal class pattern (app.js:231-276)

- [x] **T015** Add first-login check to Taakbeheer class
  - Location: `public/app.js` (Taakbeheer initialization, ~line 200+)
  - In `async init()` method after authentication:
    ```javascript
    // Check if user needs to see onboarding video
    const response = await fetch('/api/user/onboarding-status');
    const {seen} = await response.json();

    if (!seen) {
      await this.onboardingVideo.showVideo();
    }
    ```
  - Instantiate OnboardingVideoManager: `this.onboardingVideo = new OnboardingVideoManager();`

- [x] **T016** Add backend endpoint GET /api/user/onboarding-status
  - Location: `server.js` (user endpoints, ~line 500+)
  - Route: `app.get('/api/user/onboarding-status', async (req, res) => {...})`
  - Call `hasSeenOnboardingVideo(req.session.user.id)`
  - Return `{seen: boolean}`
  - Require authentication

---

## Phase 3.6: Admin UI Implementation

- [x] **T017** Add video settings HTML to `admin.html`
  - Location: `public/admin.html` (settings section, ~line 400+)
  - Settings card HTML:
    ```html
    <div class="settings-card">
      <h3>📹 Welkomstvideo Instellingen</h3>
      <div class="form-group">
        <label for="onboardingVideoUrl">YouTube Video URL</label>
        <input type="url" id="onboardingVideoUrl"
               placeholder="https://youtube.com/watch?v=..."
               class="admin-input">
        <small class="help-text">
          Ondersteunt: youtube.com, youtu.be, youtube-nocookie.com
        </small>
      </div>

      <div class="preview-section" id="videoPreview" style="display: none;">
        <h4>Preview</h4>
        <iframe id="previewIframe" width="100%" height="315"></iframe>
      </div>

      <div class="button-group">
        <button id="saveVideoUrl" class="btn btn-primary">💾 Opslaan</button>
        <button id="previewVideo" class="btn btn-secondary">👁️ Preview</button>
        <button id="clearVideoUrl" class="btn btn-danger">🗑️ Verwijderen</button>
      </div>

      <div id="videoUrlStatus" class="status-message"></div>
    </div>
    ```
  - Match existing admin.html styling patterns

- [x] **T018** Add admin settings JavaScript to `admin.js`
  - Location: `public/admin.js` (AdminManager class, ~line 300+)
  - Functions to add:
    ```javascript
    async loadOnboardingSettings() {
      // Fetch current video URL
      // Populate input field
    }

    async saveOnboardingVideo() {
      // Validate URL
      // Show loading indicator
      // PUT request to /api/settings/onboarding-video
      // Show success/error toast
      // Update status message
    }

    isValidYouTubeUrl(url) {
      // Validate YouTube URL patterns
      // Return boolean
    }

    showVideoPreview() {
      // Extract video ID
      // Show preview iframe
    }
    ```
  - Wire up button event listeners in init()
  - Call `loadOnboardingSettings()` on page load

---

## Phase 3.7: Integration & Polish

- [x] **T019** Test complete user flow manually (Quickstart Scenario 1-4)
  - Follow quickstart.md test scenarios 1-4
  - Admin configures video URL
  - New user first login → popup appears
  - User closes popup → marked as seen
  - Second login → no popup
  - Sidebar link → popup reopens
  - Verify all scenarios pass
  - Fix any issues found
  - **COMPLETED**: Deployed to production v0.19.0, tested on jan@buskens.be account

- [x] **T020** [P] Playwright automation test (Quickstart Scenario 7)
  - Use tickedify-testing agent for browser automation
  - Implement test from quickstart.md Playwright section
  - Test first login popup appearance
  - Test popup close and database update
  - Test second login (no popup)
  - Test sidebar link reopening
  - Run test and verify all assertions pass

---

## Dependencies

**Critical Path**:
1. Database setup (T001-T003) must complete first
2. Database functions (T004) required for API endpoints
3. API tests (T005-T007) MUST be written and FAIL before implementation
4. API endpoints (T008-T010) make tests pass
5. Frontend depends on API endpoints being ready
6. Admin UI can develop in parallel with frontend
7. Integration testing last (T019-T020)

**Blocking Relationships**:
- T001 blocks T003, T004
- T004 blocks T008, T009, T010, T016
- T005-T007 block T008-T010 (TDD requirement)
- T008 blocks T015 (needs /api/user/onboarding-status)
- T011-T013 can run in parallel (different files)
- T014-T015 sequential (same file: app.js)
- T017-T018 can run parallel with T011-T016 (different files)
- T019 requires T001-T018 complete
- T020 can run parallel with T019 (different execution context)

---

## Parallel Execution Examples

### Batch 1: Database Setup (After T001-T002 written)
```bash
# Run migration and verify
node migration-014-onboarding-video.js
```

### Batch 2: Tests (TDD - Must fail before implementation)
```bash
# T005-T007: Write API tests (can write in parallel)
# Execute tests - verify they FAIL
curl -s -L -k https://tickedify.com/api/settings/onboarding-video  # Should 404
curl -s -L -k -X PUT https://tickedify.com/api/user/onboarding-video-seen  # Should 404
```

### Batch 3: Frontend HTML/CSS (Independent files)
Launch tasks in parallel using Task tool:
```
Task 1: "Add onboarding video popup HTML to public/index.html per T011 spec"
Task 2: "Add sidebar link HTML to public/index.html per T012 spec"
Task 3: "Add popup CSS styling to public/style.css per T013 spec"
```

### Batch 4: Admin UI (Independent from main app)
Launch in parallel:
```
Task 1: "Add video settings HTML to public/admin.html per T017 spec"
Task 2: "Add admin settings JavaScript to public/admin.js per T018 spec"
```

---

## Validation Checklist

**Contract Coverage**:
- [x] api-onboarding.yaml: GET /api/settings/onboarding-video → T005, T008
- [x] api-onboarding.yaml: PUT /api/user/onboarding-video-seen → T006, T009
- [x] api-admin-settings.yaml: PUT /api/settings/onboarding-video → T007, T010

**Entity Coverage**:
- [x] users table extension → T001 (migration)
- [x] system_settings table → T001 (migration)
- [x] Database functions → T004

**Test Coverage**:
- [x] API contract tests → T005-T007 (before implementation)
- [x] Integration tests → T019 (manual), T020 (Playwright)
- [x] All tests before corresponding implementation ✓

**Parallel Safety**:
- [x] T001-T002: Different files (migration scripts)
- [x] T005-T007: Test files (can write in parallel)
- [x] T011-T013: Different files (HTML, HTML, CSS)
- [x] T017-T018: Different files (admin.html, admin.js)
- [x] No [P] tasks modify same file ✓

**File Path Specificity**:
- [x] Every task includes exact file path
- [x] Line number hints provided where helpful
- [x] Repository root paths clearly indicated

---

## Notes

- **TDD Compliance**: T005-T007 tests MUST fail before T008-T010 implementation
- **Idempotency**: Migration T001 can run multiple times safely
- **Rollback**: T002 provides safe rollback if needed
- **Version Bump**: Update package.json to 0.19.0 after T020 complete
- **Changelog**: Update public/changelog.html with feature description
- **ARCHITECTURE.md**: Add onboarding video section after completion
- **Deployment**: Test on staging (dev.tickedify.com) before production

---

**Task Generation Complete**: 2025-10-14
**Total Tasks**: 20 (T001-T020)
**Estimated Completion**: 6-8 hours development time
**Ready for Execution**: ✅ Use tickedify-feature-builder agent for implementation
