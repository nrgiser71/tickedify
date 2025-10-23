# Data Model: Message Preview UI Components

**Feature**: 027-in-admin2-html
**Date**: 2025-10-23

## Overview

Dit document beschrijft de UI componenten voor de message preview functionaliteit. Omdat dit een frontend-only feature is zonder database wijzigingen, focussen we op UI component structuur in plaats van data schema.

---

## UI Components

### 1. Preview Modal Component

**Purpose**: Display message preview in exact end-user rendering format

**Structure**:
```html
<!-- Preview Modal (clone van message-modal structure) -->
<div id="admin-preview-modal-overlay" class="modal-overlay" style="display: none;">
  <div class="message-modal message-information preview-mode">
    <!-- Preview Mode Indicator -->
    <div class="preview-indicator">
      👁️ PREVIEW MODE
    </div>

    <!-- Close Button -->
    <button class="btn-close-modal">×</button>

    <!-- Message Icon -->
    <div class="message-icon fas fa-info-circle"></div>

    <!-- Message Content -->
    <h2 class="message-title">Message Title</h2>
    <div class="message-content">Message body with markdown rendering</div>

    <!-- Optional Action Button -->
    <div class="message-button" style="display: none;">
      <button class="btn-message-action">Button Label</button>
    </div>

    <!-- Optional Snooze Options -->
    <div class="snooze-options" style="display: none;">
      <!-- Snooze buttons -->
    </div>

    <!-- Dismiss/Close Button -->
    <div class="message-footer">
      <button class="btn-message-dismiss">Close Preview</button>
    </div>
  </div>
</div>
```

**Styling Classes**:
- `.modal-overlay`: Full screen overlay backdrop
- `.message-modal`: Main modal container
- `.message-{type}`: Type-specific styling (information, warning, feature, etc.)
- `.preview-mode`: Preview-specific overrides
- `.preview-indicator`: Visual indicator showing this is preview mode

**State Properties**:
- `display`: 'none' (hidden) | 'flex' (visible)
- `message_type`: Determines icon and color scheme
- `content`: Rendered HTML from markdown parsing

**Behavior**:
- Show on preview button click
- Hide on close button click or overlay click
- Disable dismiss tracking (no API call)
- Disable snooze tracking (no API call)
- Disable button action execution (preview only)

---

### 2. List View Preview Button

**Purpose**: Trigger preview from message list table row

**Location**: `public/admin2.html` lijn 2316-2332 (action buttons column)

**Structure**:
```html
<button class="btn btn-sm btn-preview"
        onclick="previewMessageFromList(${msg.id})"
        title="Preview bericht"
        style="padding: 6px 10px; font-size: 12px; margin-right: 5px;">
  👁️
</button>
```

**Styling**:
- Class: `.btn .btn-sm .btn-preview`
- Size: Small button (consistent met Edit/Duplicate/Delete)
- Icon: 👁️ (eye emoji)
- Color: Default button color (niet primary/danger)
- Position: Between "Duplicate" and "Delete" buttons

**Data Flow**:
```javascript
Click → Extract message from currentMessages array → Call showPreview()
```

**Integration**:
- Inserted in `renderMessagesList()` function
- Uses existing `currentMessages` array data
- No additional data fetching required

---

### 3. Detail View Preview Button

**Purpose**: Trigger preview from message edit modal with unsaved changes

**Location**: Message edit modal footer (near submit button)

**Structure**:
```html
<!-- In message edit modal footer -->
<div class="modal-footer">
  <button type="button" class="btn btn-secondary"
          onclick="previewMessageFromForm()">
    👁️ Preview
  </button>
  <button type="submit" class="btn btn-primary" id="message-modal-submit">
    📢 Bericht Aanmaken/Opslaan
  </button>
</div>
```

**Styling**:
- Class: `.btn .btn-secondary`
- Position: Left of submit button
- Icon: 👁️ eye emoji + "Preview" text label
- Color: Secondary button style (not primary)

**Data Flow**:
```javascript
Click → Extract form field values → Build message object → Call showPreview()
```

**Form Fields Extracted**:
- `#msg-title`: Title input
- `#msg-message`: Message textarea
- `#msg-type`: Type select dropdown
- `#msg-button-label`: Optional button label
- `#msg-button-action`: Optional button action
- `#msg-button-target`: Optional button target
- `#msg-dismissible`: Dismissible checkbox
- `#msg-snoozable`: Snoozable checkbox

---

## JavaScript Functions

### Core Preview Functions

```javascript
/**
 * Show preview modal with message data
 * @param {Object} messageData - Message object to preview
 */
function showPreview(messageData) {
  // Get preview modal element
  const modal = document.getElementById('admin-preview-modal-overlay');

  // Render message content using existing showMessage() logic
  // but with preview-mode overrides:
  // - No dismiss API call
  // - No snooze API call
  // - No button action execution
  // - Show preview indicator

  renderPreviewContent(messageData);
  modal.style.display = 'flex';
}

/**
 * Extract message from list and show preview
 * @param {number} messageId - Message ID from table row
 */
function previewMessageFromList(messageId) {
  // Find message in currentMessages array
  const message = currentMessages.find(m => m.id === messageId);

  if (!message) {
    console.error('Message not found:', messageId);
    return;
  }

  showPreview(message);
}

/**
 * Extract form data and show preview
 */
function previewMessageFromForm() {
  // Build message object from form fields
  const messageData = {
    title: document.getElementById('msg-title')?.value || '',
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

/**
 * Render preview content (reuses message-modal.js logic)
 * @param {Object} message - Message data
 */
function renderPreviewContent(message) {
  // Update icon based on message type
  const iconElement = document.querySelector('#admin-preview-modal-overlay .message-icon');
  if (iconElement) {
    const iconClass = getMessageIcon(message.message_type || 'information');
    iconElement.className = `message-icon fas ${iconClass}`;
  }

  // Update content using parseMarkdownLinks
  const titleElement = document.querySelector('#admin-preview-modal-overlay .message-title');
  const contentElement = document.querySelector('#admin-preview-modal-overlay .message-content');

  if (titleElement) titleElement.textContent = message.title || 'No Title';
  if (contentElement) {
    contentElement.innerHTML = message.message
      ? parseMarkdownLinks(message.message)
      : '<p style="color: var(--macos-text-secondary);">No content</p>';
  }

  // Apply type-specific styling
  const modalElement = document.querySelector('#admin-preview-modal-overlay .message-modal');
  if (modalElement) {
    modalElement.className = `message-modal message-${message.message_type || 'information'} preview-mode`;
  }

  // Handle action button
  const buttonContainer = document.querySelector('#admin-preview-modal-overlay .message-button');
  if (message.button_label && buttonContainer) {
    buttonContainer.innerHTML = `
      <button class="btn-message-action" disabled
              title="Preview mode - button disabled">
        ${message.button_label}
      </button>
    `;
    buttonContainer.style.display = 'block';
  } else if (buttonContainer) {
    buttonContainer.style.display = 'none';
  }

  // Handle snooze options
  const snoozeContainer = document.querySelector('#admin-preview-modal-overlay .snooze-options');
  if (message.snoozable && snoozeContainer) {
    snoozeContainer.style.display = 'flex';
    // Disable snooze buttons in preview
    snoozeContainer.querySelectorAll('button').forEach(btn => {
      btn.disabled = true;
      btn.title = 'Preview mode - snooze disabled';
    });
  } else if (snoozeContainer) {
    snoozeContainer.style.display = 'none';
  }
}

/**
 * Close preview modal
 */
function closePreview() {
  const modal = document.getElementById('admin-preview-modal-overlay');
  if (modal) modal.style.display = 'none';
}
```

---

## Component Lifecycle

### List View Preview Flow
```
1. User clicks 👁️ button in message table row
   ↓
2. previewMessageFromList(messageId) called
   ↓
3. Message found in currentMessages array
   ↓
4. showPreview(message) renders content
   ↓
5. Modal displays with preview-mode styling
   ↓
6. User clicks close → closePreview()
```

### Detail View Preview Flow
```
1. User editing message in modal
   ↓
2. User clicks "👁️ Preview" button
   ↓
3. previewMessageFromForm() extracts form values
   ↓
4. Build message object from current form state
   ↓
5. showPreview(messageData) renders content
   ↓
6. Modal displays with unsaved changes
   ↓
7. User clicks close → return to edit modal
```

---

## Preview Mode Overrides

### Visual Indicators
- **Preview Indicator Badge**: "👁️ PREVIEW MODE" at top of modal
- **Disabled Buttons**: Action buttons greyed out with disabled attribute
- **Tooltip Messages**: "Preview mode - button disabled"

### Behavior Overrides
- **No Dismiss Tracking**: Skip `/api/messages/{id}/dismiss` call
- **No Snooze Tracking**: Skip `/api/messages/{id}/snooze` call
- **No Button Actions**: Prevent navigation/external links
- **Close Only**: Only action is to close preview modal

### Styling Overrides
```css
.message-modal.preview-mode {
  /* Optional: subtle visual difference for preview */
  border: 2px dashed var(--macos-blue);
  opacity: 0.95;
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

.message-modal.preview-mode .btn-message-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## Edge Cases Handling

### Empty Content
```javascript
// If message or title is empty
if (!message.message) {
  contentElement.innerHTML = '<p style="color: var(--macos-text-secondary); font-style: italic;">No content</p>';
}
```

### Long Content
- Modal is scrollable (existing behavior from message-modal)
- Max-height with overflow-y: auto
- Content doesn't break layout

### Special Characters
- parseMarkdownLinks() already handles HTML escaping
- XSS protection built-in
- Special characters render safely

### Invalid Markdown
- parseMarkdownLinks() gracefully handles invalid syntax
- Falls back to plain text rendering
- No errors thrown

### Missing Form Fields
- Use optional chaining `?.value`
- Provide default values
- Handle null/undefined gracefully

---

## Dependencies

### Required External Functions (from message-modal.js)
- `getMessageIcon(type)`: Type → Font Awesome icon class
- `parseMarkdownLinks(text)`: Markdown → HTML with XSS protection

### Required External Data
- **List view**: `currentMessages` array (already exists in admin2.html)
- **Detail view**: Form DOM elements (already exists in edit modal)

### No New Dependencies
- No new libraries
- No API endpoints
- No database changes
- No external services

---

## Success Criteria

### Functional Requirements Met
- ✅ Preview button in message list (FR-001)
- ✅ Preview button in detail view (FR-002)
- ✅ Clearly labeled buttons (FR-003)
- ✅ End-user format rendering (FR-004)
- ✅ Type indicator badges (FR-005)
- ✅ Correct content formatting (FR-006)
- ✅ Modal popup display (FR-007 - resolved)
- ✅ Close preview functionality (FR-008)
- ✅ Unsaved changes preview (FR-009)
- ✅ Empty content handling (FR-010)
- ✅ Markdown rendering (FR-011 - resolved)

### User Experience Goals
- Instant preview (<100ms)
- Identical to end-user view
- Clear preview mode indication
- No accidental actions (buttons disabled)
- Smooth workflow integration

---

**Phase 1 Complete**: UI components designed, ready for task generation
