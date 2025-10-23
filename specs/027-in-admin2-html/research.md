# Research: Message Preview Button

**Feature**: 027-in-admin2-html
**Date**: 2025-10-23

## Research Questions

### 1. Preview Display Method (FR-007 from spec)

**Question**: Hoe moet de preview getoond worden - als modal popup, inline expansion, apart preview paneel, of nieuwe tab?

**Research Findings**:

**Option 1: Modal Popup** ✅ **SELECTED**
- **Pros**:
  - Consistent met bestaande admin2.html modals
  - Full screen space voor message content preview
  - Kan existing message-modal CSS/structure hergebruiken
  - No context switch required
  - Clean separation tussen preview en edit mode
- **Cons**:
  - Requires additional overlay/modal HTML
  - Modal stacking mogelijk (preview modal over edit modal)
- **Implementation**: Clone message-modal structure in admin2.html with `preview-mode` class

**Option 2: Inline Expansion**
- **Pros**: Minimal code changes
- **Cons**:
  - Zou tabel layout breken in list view
  - Te beperkte ruimte voor full message preview
  - Moeilijk om exact end-user styling te repliceren
- **Rejected**: Insufficient space, poor UX

**Option 3: Separate Preview Pane**
- **Pros**: Side-by-side comparison mogelijk
- **Cons**:
  - Major UI restructuring required
  - Inconsistent met bestaande admin interface patterns
  - Complex responsive design
- **Rejected**: Too complex, inconsistent with existing UX

**Option 4: New Tab/Window**
- **Pros**: Full isolation, geen modal stacking
- **Cons**:
  - Breekt workflow (window management)
  - Requires separate preview page
  - Lost context when switching tabs
- **Rejected**: Poor workflow, unnecessary complexity

**Decision**: **Modal Popup**
- Reuse existing `.message-modal` structure from index.html
- Add `preview-mode` identifier to distinguish from live modals
- Stack preview modal with higher z-index if opened from edit modal

---

### 2. Message Formatting Support (FR-011 from spec)

**Question**: Ondersteunen berichten markdown of HTML formatting, of is het plain text?

**Research Findings**:

**Existing Implementation Analysis**:
- Reviewed `public/js/message-modal.js` (lijn 158-231)
- `parseMarkdownLinks(text)` function already implemented
- Supported markdown features:
  - **Headers**: `#`, `##`, `###`
  - **Bold**: `**text**` or `__text__`
  - **Italic**: `*text*` or `_text_`
  - **Code**: `` `code` ``
  - **Links**: `[text](url)`
  - **Lists**: `- item` or `1. item`
  - **Highlight**: `==text==`
  - **Horizontal rule**: `---`

**Security Analysis**:
- HTML escaping implemented (lijn 162-165)
- Prevents XSS via `&`, `<`, `>` escaping
- Links use `target="_blank"` and `rel="noopener noreferrer"`
- Safe for user-generated content

**Current Usage**:
- Database inspection shows existing messages use markdown
- Admin forms allow markdown input
- End users see rendered markdown via `parseMarkdownLinks()`

**Decision**: **Markdown Support**
- Preview MUST use `parseMarkdownLinks()` for consistency
- No additional libraries needed - existing parser is sufficient
- Preview shows exact rendering that end users will see

---

### 3. Preview Rendering Strategy

**Question**: How to render preview content while reusing existing message-modal.js logic?

**Research Findings**:

**Existing Functions Analysis**:
```javascript
// message-modal.js exports:
showMessage(message)           // Line 42: Core rendering function
parseMarkdownLinks(text)       // Line 158: Markdown → HTML
getMessageIcon(type)           // Line 145: Type → FA icon class
```

**Option 1: Import and Reuse** ✅ **SELECTED**
- Include message-modal.js in admin2.html
- Call `showMessage()` with preview data
- Override dismiss/snooze/button behavior for preview mode
- Add preview mode indicator

**Option 2: Duplicate Logic**
- Copy rendering logic to admin2.html
- Maintain two separate implementations
- **Rejected**: DRY violation, maintenance burden

**Option 3: Shared Component Module**
- Extract rendering to shared module
- Import in both files
- **Rejected**: Over-engineering for current need

**Decision**: Import message-modal.js in admin2.html
- Minimal code duplication
- Guaranteed consistency with end-user rendering
- Override only preview-specific behavior (no API calls)

---

### 4. Data Extraction Patterns

**Question**: How to extract message data from list view vs. detail view?

**List View Data Extraction**:
```javascript
// Messages already loaded in currentMessages array
// On preview button click:
function previewMessageFromList(messageId) {
  const message = currentMessages.find(m => m.id === messageId);
  showPreview(message);
}
```

**Detail View Data Extraction**:
```javascript
// Extract from form fields:
function previewMessageFromForm() {
  const formData = {
    title: document.getElementById('msg-title').value,
    message: document.getElementById('msg-message').value,
    message_type: document.getElementById('msg-type').value,
    button_label: document.getElementById('msg-button-label')?.value,
    button_action: document.getElementById('msg-button-action')?.value,
    button_target: document.getElementById('msg-button-target')?.value,
    dismissible: document.getElementById('msg-dismissible')?.checked,
    snoozable: document.getElementById('msg-snoozable')?.checked
  };
  showPreview(formData);
}
```

**Edge Cases**:
- Empty title/message: Show gracefully
- Invalid markdown: parseMarkdownLinks handles safely
- Missing button fields: Conditional rendering already exists
- Long content: Scrollable modal (existing behavior)

---

## Best Practices Applied

### 1. Code Reuse
- Leverage existing message-modal.js functions
- No duplication of markdown parsing logic
- Consistent styling via shared CSS classes

### 2. UX Consistency
- Preview modal matches end-user message modal exactly
- Same icons, colors, fonts, spacing
- Preview mode indicator prevents confusion

### 3. Performance
- Client-side rendering (no API calls)
- Instant preview (<100ms)
- No network latency

### 4. Maintainability
- Single source of truth for message rendering
- Changes to message-modal.js automatically apply to preview
- Minimal admin2.html modifications

---

## Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Preview Display** | Modal popup | Consistent UX, full space, reusable structure |
| **Formatting** | Markdown via parseMarkdownLinks() | Existing implementation, security, consistency |
| **Rendering** | Reuse showMessage() function | DRY principle, guaranteed consistency |
| **Data Source** | Client-side (list array / form fields) | No API needed, instant preview |
| **Preview Mode** | Add `preview-mode` class & indicator | Distinguish from live messages |

---

## Implementation Notes

### Files to Modify
1. **public/admin2.html**:
   - Add preview modal HTML structure
   - Add preview buttons (list + detail)
   - Import message-modal.js
   - Add preview-specific JavaScript

2. **No backend changes required**:
   - Preview is 100% client-side
   - No new API endpoints
   - No database modifications

### Dependencies
- Existing: Font Awesome icons (already loaded)
- Existing: message-modal.js (need to import)
- Existing: style.css (shared styles)

### Testing Strategy
- Manual testing on dev.tickedify.com
- Test scenarios in quickstart.md
- Edge cases: empty, long, special characters

---

**Phase 0 Complete**: All NEEDS CLARIFICATION resolved, ready for Phase 1 design
