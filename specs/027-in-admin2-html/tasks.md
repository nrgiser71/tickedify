# Tasks: Message Preview Button

**Input**: Design documents from `/specs/027-in-admin2-html/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Loaded: Vanilla JS frontend-only feature
   ✓ Tech stack: JavaScript ES6+, existing message-modal.js
   ✓ Structure: Monolithic web app (public/ folder)
2. Load optional design documents:
   ✓ data-model.md: 3 UI components (preview modal, 2 buttons)
   ✓ research.md: Modal popup decision, markdown support
   ✓ quickstart.md: 11 test scenarios
3. Generate tasks by category:
   → Setup: Import dependencies, prepare structure
   → Implementation: HTML + JavaScript (no separate tests - manual testing)
   → Integration: Styling and edge cases
   → Testing: Manual validation per quickstart.md
4. Apply task rules:
   → No automated tests (Tickedify uses manual testing)
   → Frontend-only: All tasks in public/admin2.html
   → Sequential tasks (same file modifications)
5. Number tasks sequentially (T001-T013)
6. Generate dependency graph
7. Validation: All quickstart scenarios covered
8. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- **Note**: This is a frontend-only feature with no automated tests per Tickedify conventions

## Path Conventions
- **Primary file**: `public/admin2.html` (admin interface)
- **Dependency**: `public/js/message-modal.js` (already exists, imported)
- **Styling**: `public/style.css` (shared styles, may need additions)
- **Testing**: Manual testing on dev.tickedify.com per quickstart.md

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** [P] Import message-modal.js in admin2.html
  - **File**: `public/admin2.html`
  - **Action**: Add `<script src="js/message-modal.js"></script>` in `<head>` section
  - **Why**: Required for `showMessage()`, `parseMarkdownLinks()`, `getMessageIcon()` functions
  - **Dependencies**: None
  - **Can run in parallel with**: T002

- [ ] **T002** [P] Bump version in package.json
  - **File**: `package.json`
  - **Action**: Increment version from current to next patch (e.g., 0.19.162 → 0.19.163)
  - **Why**: Tickedify requires version bump for all features (per CLAUDE.md)
  - **Dependencies**: None
  - **Can run in parallel with**: T001

---

## Phase 3.2: Core Implementation - Preview Modal HTML

- [ ] **T003** Add preview modal HTML structure to admin2.html
  - **File**: `public/admin2.html`
  - **Location**: Before closing `</body>` tag, after existing modals
  - **Action**: Insert complete preview modal HTML (clone of message-modal structure)
  - **Structure**:
    ```html
    <!-- Message Preview Modal -->
    <div id="admin-preview-modal-overlay" class="modal-overlay" style="display: none; z-index: 10001;">
      <div class="message-modal message-information preview-mode">
        <div class="preview-indicator">👁️ PREVIEW MODE</div>
        <button class="btn-close-modal" onclick="closePreview()">×</button>
        <div class="message-icon fas fa-info-circle"></div>
        <h2 class="message-title">Message Title</h2>
        <div class="message-content">Message content here</div>
        <div class="message-button" style="display: none;"></div>
        <div class="snooze-options" style="display: none;"></div>
        <div class="message-footer">
          <button class="btn-message-dismiss" onclick="closePreview()">Close Preview</button>
        </div>
      </div>
    </div>
    ```
  - **Dependencies**: T001 (message-modal.js must be imported first)
  - **Testing**: Verify modal HTML renders (not visible yet)

---

## Phase 3.3: Core Implementation - List View Preview

- [ ] **T004** Add preview button to message list table rows
  - **File**: `public/admin2.html`
  - **Location**: `renderMessagesList()` function, around line 2316-2332
  - **Action**: Insert preview button in action buttons column BEFORE delete button
  - **Code**:
    ```javascript
    <button class="btn btn-sm btn-preview"
            onclick="previewMessageFromList(${msg.id})"
            title="Preview bericht"
            style="padding: 6px 10px; font-size: 12px; margin-right: 5px; background-color: var(--macos-blue); color: white;">
      👁️
    </button>
    ```
  - **Dependencies**: T003 (preview modal must exist)
  - **Testing**: Button appears in list but may not work yet

- [ ] **T005** Implement previewMessageFromList() JavaScript function
  - **File**: `public/admin2.html`
  - **Location**: In `<script>` section, after existing message functions
  - **Action**: Add function to extract message from currentMessages array and show preview
  - **Code**:
    ```javascript
    /**
     * Preview message from list view
     * @param {number} messageId - ID of message to preview
     */
    function previewMessageFromList(messageId) {
      const message = currentMessages.find(m => m.id === messageId);

      if (!message) {
        console.error('Message not found:', messageId);
        return;
      }

      showPreview(message);
    }
    ```
  - **Dependencies**: T004 (button must call this function)
  - **Testing**: Click preview button in list → should trigger function (may error without T008)

---

## Phase 3.4: Core Implementation - Detail View Preview

- [ ] **T006** Add preview button to message edit modal
  - **File**: `public/admin2.html`
  - **Location**: Message edit modal footer, before submit button (search for `id="message-modal-submit"`)
  - **Action**: Insert preview button in modal footer
  - **Code**:
    ```html
    <button type="button" class="btn btn-secondary"
            onclick="previewMessageFromForm()"
            style="margin-right: 10px;">
      👁️ Preview
    </button>
    ```
  - **Dependencies**: T003 (preview modal must exist)
  - **Testing**: Button appears in edit modal footer

- [ ] **T007** Implement previewMessageFromForm() JavaScript function
  - **File**: `public/admin2.html`
  - **Location**: In `<script>` section, after previewMessageFromList()
  - **Action**: Add function to extract form field values and show preview
  - **Code**:
    ```javascript
    /**
     * Preview message from form fields (edit modal)
     */
    function previewMessageFromForm() {
      const messageData = {
        title: document.getElementById('msg-title')?.value || 'No Title',
        message: document.getElementById('msg-message')?.value || '',
        message_type: document.getElementById('msg-type')?.value || 'information',
        button_label: document.getElementById('msg-button-label')?.value || null,
        button_action: document.getElementById('msg-button-action')?.value || null,
        button_target: document.getElementById('msg-button-target')?.value || null,
        dismissible: document.getElementById('msg-dismissible')?.checked ?? true,
        snoozable: document.getElementById('msg-snoozable')?.checked ?? false
      };

      showPreview(messageData);
    }
    ```
  - **Dependencies**: T006 (button must call this function)
  - **Testing**: Click preview in edit modal → should extract form data

---

## Phase 3.5: Core Implementation - Preview Rendering

- [ ] **T008** Implement showPreview() core rendering function
  - **File**: `public/admin2.html`
  - **Location**: In `<script>` section, before previewMessageFromList()
  - **Action**: Add main preview rendering function (reuses message-modal.js logic)
  - **Code**:
    ```javascript
    /**
     * Show preview modal with message data
     * @param {Object} messageData - Message object to preview
     */
    function showPreview(messageData) {
      const modal = document.getElementById('admin-preview-modal-overlay');
      if (!modal) {
        console.error('Preview modal not found');
        return;
      }

      // Update icon based on message type
      const iconElement = modal.querySelector('.message-icon');
      if (iconElement && typeof getMessageIcon === 'function') {
        const iconClass = getMessageIcon(messageData.message_type || 'information');
        iconElement.className = `message-icon fas ${iconClass}`;
      }

      // Update content
      const titleElement = modal.querySelector('.message-title');
      const contentElement = modal.querySelector('.message-content');

      if (titleElement) titleElement.textContent = messageData.title || 'No Title';
      if (contentElement && typeof parseMarkdownLinks === 'function') {
        contentElement.innerHTML = messageData.message
          ? parseMarkdownLinks(messageData.message)
          : '<p style="color: var(--macos-text-secondary); font-style: italic;">No content</p>';
      }

      // Apply type-specific styling
      const modalElement = modal.querySelector('.message-modal');
      if (modalElement) {
        modalElement.className = `message-modal message-${messageData.message_type || 'information'} preview-mode`;
      }

      // Handle action button
      const buttonContainer = modal.querySelector('.message-button');
      if (messageData.button_label && buttonContainer) {
        buttonContainer.innerHTML = `
          <button class="btn-message-action" disabled
                  title="Preview mode - button disabled"
                  style="opacity: 0.6; cursor: not-allowed;">
            ${messageData.button_label}
          </button>
        `;
        buttonContainer.style.display = 'block';
      } else if (buttonContainer) {
        buttonContainer.style.display = 'none';
      }

      // Handle snooze options
      const snoozeContainer = modal.querySelector('.snooze-options');
      if (messageData.snoozable && snoozeContainer) {
        snoozeContainer.style.display = 'flex';
        snoozeContainer.querySelectorAll('button').forEach(btn => {
          btn.disabled = true;
          btn.style.opacity = '0.6';
          btn.style.cursor = 'not-allowed';
          btn.title = 'Preview mode - snooze disabled';
        });
      } else if (snoozeContainer) {
        snoozeContainer.style.display = 'none';
      }

      // Show modal
      modal.style.display = 'flex';
    }
    ```
  - **Dependencies**: T001 (requires message-modal.js functions), T003 (modal HTML)
  - **Testing**: Preview should now render correctly

- [ ] **T009** Implement closePreview() function
  - **File**: `public/admin2.html`
  - **Location**: In `<script>` section, after showPreview()
  - **Action**: Add function to close preview modal
  - **Code**:
    ```javascript
    /**
     * Close preview modal
     */
    function closePreview() {
      const modal = document.getElementById('admin-preview-modal-overlay');
      if (modal) modal.style.display = 'none';
    }
    ```
  - **Dependencies**: T008 (preview must be shown first)
  - **Testing**: Click close button → modal closes

---

## Phase 3.6: Styling & Polish

- [ ] **T010** Add preview-mode specific CSS styling
  - **File**: `public/admin2.html` (in `<style>` section) or `public/style.css`
  - **Action**: Add CSS for preview-mode indicator and overrides
  - **Code**:
    ```css
    /* Preview Mode Styling */
    .message-modal.preview-mode {
      border: 2px dashed var(--macos-blue);
    }

    .preview-indicator {
      background: var(--macos-blue);
      color: white;
      padding: 8px 16px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px 6px 0 0;
      margin-bottom: 10px;
    }

    .btn-preview {
      background-color: var(--macos-blue) !important;
      color: white !important;
    }

    .btn-preview:hover {
      opacity: 0.9;
    }

    #admin-preview-modal-overlay {
      z-index: 10001 !important; /* Stack over edit modal */
    }
    ```
  - **Dependencies**: T003 (modal HTML with preview-mode class)
  - **Testing**: Preview modal shows dashed border and blue indicator

---

## Phase 3.7: Testing & Validation

- [ ] **T011** Update changelog with preview feature
  - **File**: `public/changelog.html`
  - **Action**: Add entry for message preview feature
  - **Content**:
    ```html
    <div class="changelog-entry">
      <div class="changelog-header">
        <span class="version-badge badge-latest">v0.19.163</span>
        <span class="changelog-date">23 oktober 2025</span>
      </div>
      <div class="changelog-content">
        <div class="changelog-category">
          <div class="category-icon">✨</div>
          <div class="category-title">Nieuwe Features</div>
        </div>
        <ul>
          <li><strong>Admin Preview Button:</strong> Bekijk hoe berichten eruit zien voordat je ze publiceert - preview knop in zowel berichtenlijst als detail scherm</li>
        </ul>
      </div>
    </div>
    ```
  - **Dependencies**: T002 (version number must match)
  - **Testing**: Changelog displays correctly

- [ ] **T012** Manual testing - List view scenarios (quickstart T1-T3)
  - **File**: Manual testing on dev.tickedify.com
  - **Action**: Execute test scenarios from quickstart.md:
    - **Test 1**: List view preview basic functionality
    - **Test 2**: Different message types (info, warning, feature)
    - **Test 3**: Markdown rendering verification
  - **Success Criteria**:
    - ✓ Preview modal opens from list
    - ✓ Content matches message data
    - ✓ Type styling correct
    - ✓ Markdown renders properly
    - ✓ No console errors
  - **Dependencies**: T001-T010 (all implementation complete)

- [ ] **T013** Manual testing - Detail view & edge cases (quickstart T4-T11)
  - **File**: Manual testing on dev.tickedify.com
  - **Action**: Execute remaining test scenarios:
    - **Test 4**: Unsaved changes preview
    - **Test 5**: New message preview
    - **Test 6**: Empty content handling
    - **Test 7**: Long content scrolling
    - **Test 8**: Action button disabled state
    - **Test 9**: Snooze options disabled
    - **Test 10**: Close preview methods
    - **Test 11**: Modal stacking (preview over edit)
  - **Success Criteria**:
    - ✓ All 11 quickstart scenarios pass
    - ✓ Edge cases handled gracefully
    - ✓ No regression in existing functionality
    - ✓ Performance <100ms preview render
  - **Dependencies**: T012 (basic tests must pass first)

---

## Dependencies Graph

```
Setup Phase:
T001 (import message-modal.js) ────┐
T002 (version bump)                 │
                                    ↓
HTML Structure:                     │
T003 (preview modal HTML) ──────────┘
    │
    ├─→ T004 (list preview button)
    │       └─→ T005 (previewMessageFromList function)
    │
    ├─→ T006 (detail preview button)
    │       └─→ T007 (previewMessageFromForm function)
    │
    └─→ T008 (showPreview rendering) ←─┬─ T005
            │                           └─ T007
            └─→ T009 (closePreview)

Styling:
T010 (CSS styling) ← T003

Testing:
T011 (changelog) ← T002
T012 (list view tests) ← T001-T010
T013 (detail view + edge cases) ← T012
```

---

## Parallel Execution Examples

### Parallel Group 1: Setup (can run simultaneously)
```bash
# T001 and T002 can run in parallel (different files)
```

**Note**: Most tasks are sequential since they modify the same file (public/admin2.html)

---

## Task Execution Strategy

### Sequential Execution Recommended
Since this feature modifies primarily one file (`public/admin2.html`), tasks should be executed sequentially in order T001 → T013.

### Checkpoints
- **After T003**: Preview modal HTML structure exists (not functional yet)
- **After T005**: List view preview works
- **After T007**: Detail view preview works
- **After T009**: Full preview functionality complete
- **After T010**: Styling polished
- **After T013**: Feature validated and ready for staging deployment

---

## Notes

- **No automated tests**: Tickedify uses manual testing per CLAUDE.md conventions
- **Same file modifications**: Most tasks modify `public/admin2.html` → sequential execution
- **Manual testing**: quickstart.md provides comprehensive test scenarios
- **Staging only**: BÈTA FREEZE active - deploy to dev.tickedify.com only
- **Version tracking**: Must bump package.json version (T002)
- **Changelog**: Required for all features (T011)

---

## Validation Checklist
*GATE: Verify before marking feature complete*

- [x] All UI components have corresponding tasks (modal, 2 buttons)
- [x] All JavaScript functions have implementation tasks
- [x] All quickstart scenarios covered in testing tasks (T12-T13)
- [x] Styling task included (T010)
- [x] Changelog task included (T011)
- [x] Version bump task included (T002)
- [x] Dependencies clearly documented
- [x] Each task specifies exact file path
- [x] Sequential vs parallel execution clarified

---

## Deployment Checklist (Post-Implementation)

- [ ] All tasks T001-T013 completed
- [ ] Manual tests pass (11 scenarios from quickstart.md)
- [ ] No console errors in browser DevTools
- [ ] Version bumped in package.json
- [ ] Changelog updated
- [ ] Git commit with descriptive message
- [ ] Push to staging branch
- [ ] Deploy to dev.tickedify.com
- [ ] Final validation on staging environment
- [ ] **DO NOT deploy to production** (BÈTA FREEZE active)

---

**Total Tasks**: 13
**Estimated Time**: 3-4 hours (including manual testing)
**Complexity**: Medium (frontend-only, no API/database changes)
**Risk**: Low (client-side preview, no data modification)
