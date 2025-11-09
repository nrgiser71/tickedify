# Research Document: Page Help Icons

## Overview
Research findings for implementing page help icons with admin-configurable markdown content in Tickedify.

## 1. Existing Architecture Analysis

### Pages Eligible for Help Icons
Based on `/app` SPA architecture analysis, the following pages are eligible (excluding CSV Import and Settings):

1. **Inbox** (`window.currentView = 'inbox'`)
2. **Acties** (`window.currentView = 'acties'`)
3. **Opvolgen** (`window.currentView = 'opvolgen'`)
4. **Dagelijkse Planning** (`window.currentView = 'dagelijkse-planning'`)
5. **Uitgesteld - Wekelijks** (`window.currentView = 'uitgesteld-wekelijks'`)
6. **Uitgesteld - Maandelijks** (`window.currentView = 'uitgesteld-maandelijks'`)
7. **Uitgesteld - 3-maandelijks** (`window.currentView = 'uitgesteld-3maandelijks'`)
8. **Uitgesteld - 6-maandelijks** (`window.currentView = 'uitgesteld-6maandelijks'`)
9. **Uitgesteld - Jaarlijks** (`window.currentView = 'uitgesteld-jaarlijks'`)
10. **Afgewerkt** (`window.currentView = 'afgewerkt'`)
11. **Email Import** (`window.currentView = 'email-import'`)

**Note**: CSV Import and Settings pages are explicitly excluded per requirements.

### Existing Information Message System
**Location**: `public/js/message-modal.js` (100+ lines)

**Key Findings**:
- System uses markdown rendering for message content
- Messages are triggered per-page using `window.location.pathname` or page identifier
- Messages stored in database with page targeting
- Modal/popup UI with carousel navigation for multiple messages
- Admin configuration via `admin2.html` "Berichten" section

**Reusable Components**:
- Markdown rendering infrastructure (likely using Marked.js)
- Modal/popup UI patterns and styling
- Admin2 configuration patterns

## 2. Markdown Rendering Library

**Decision**: Use existing Marked.js library (already in use for information messages)

**Rationale**:
- Already integrated in project (no new dependency)
- Proven to work with existing information message system
- Lightweight and well-maintained
- Supports all required formatting (headings, lists, bold, italic, links)
- Excludes images by default (matches requirement)

**Alternatives Considered**:
- Showdown.js - More features than needed, larger bundle size
- Markdown-it - More complex API, overkill for simple rendering
- Custom parser - Unnecessary complexity when existing solution works

## 3. Page Identification Strategy

**Decision**: Use view-based identifiers matching `window.currentView` pattern

**Rationale**:
- Tickedify is a Single Page Application (SPA) - URL stays `/app`
- Existing codebase uses `window.currentView` or similar view tracking
- Consistent with how information messages already work (page-specific targeting)
- Allows precise targeting of help content to correct screen

**Implementation Pattern**:
```javascript
// Page identifiers (matching view names):
const PAGE_IDS = {
  'inbox': 'Inbox',
  'acties': 'Acties',
  'opvolgen': 'Opvolgen',
  'dagelijkse-planning': 'Dagelijkse Planning',
  'uitgesteld-wekelijks': 'Uitgesteld - Wekelijks',
  'uitgesteld-maandelijks': 'Uitgesteld - Maandelijks',
  'uitgesteld-3maandelijks': 'Uitgesteld - 3-maandelijks',
  'uitgesteld-6maandelijks': 'Uitgesteld - 6-maandelijks',
  'uitgesteld-jaarlijks': 'Uitgesteld - Jaarlijks',
  'afgewerkt': 'Afgewerkt',
  'email-import': 'Email Import'
};
```

## 4. UI Placement & Styling

**Decision**: Place help icon immediately after page title in existing page header

**Rationale**:
- Minimal UI changes to existing layout
- Users naturally look at page title when loading view
- Icon visibility without cluttering interface
- Consistent placement across all pages

**Visual Design**:
- Icon: ❓ or ℹ️ (circle-i) emoji/unicode
- Size: 16-18px (slightly smaller than title)
- Color: `var(--macos-text-secondary)` (muted, non-intrusive)
- Hover state: Color shift to `var(--macos-blue)` with cursor pointer
- Position: Inline with title, 8-10px margin-left

**Popup Styling** (reuse existing information message patterns):
- Modal overlay with blur backdrop
- White content box with border-radius
- Max-width: 600px
- Scrollable content area (FR-013 requirement)
- Close button (X) in top-right
- Markdown content rendered with proper typography

## 5. Admin Interface Integration

**Existing Admin2 Structure**:
- Sidebar navigation with `admin-nav-link` items
- Screen-based layout with `admin-screen` sections
- "Berichten" (Messages) section already exists at line 1574

**Decision**: Add "Page Help" as NEW sidebar menu item (separate from existing "Berichten")

**Rationale**:
- Page help content is different from in-app messages (persistent vs. triggered)
- Separate admin workflow (configure by page vs. configure by message)
- Clearer admin UX with dedicated section
- Avoids confusion between help text and promotional messages

**Menu Item Spec**:
```html
<li class="admin-nav-item">
    <a href="#page-help" class="admin-nav-link" data-screen="page-help">
        <span class="admin-nav-icon">❓</span>
        <span>Page Help</span>
    </a>
</li>
```

## 6. Default Help Content Strategy

**Decision**: Embed default English help content directly in code (not in database initially)

**Rationale**:
- Deployment simplicity (no database migration with content)
- Content is code-level documentation
- Admin can override via admin2 interface
- Fallback if database entry deleted

**Content Sources for Defaults**:
- Baas Over Je Tijd methodology (for conceptual explanations)
- Feature functionality (e.g., recurring tasks, drag & drop)
- Workflow guidance (how to use each page effectively)

**Example Default Content**:
```markdown
# Inbox

The **Inbox** is where all new tasks arrive before being processed. This is the starting point of the Baas Over Je Tijd method.

## How to use
- Add tasks quickly without worrying about details
- Process inbox regularly to move tasks to appropriate lists
- Use drag & drop to move tasks to Acties or Opvolgen

## Tips
- Keep inbox empty through regular processing
- Don't leave tasks in inbox for more than 24 hours
```

## 7. Database Schema Design

**Decision**: Single table `page_help` with simple structure

**Schema**:
```sql
CREATE TABLE page_help (
  page_id VARCHAR(50) PRIMARY KEY,  -- e.g., 'inbox', 'acties'
  content TEXT NOT NULL,             -- Markdown content
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_by VARCHAR(50)            -- Admin user identifier
);
```

**Rationale**:
- Simple structure matches simple requirement
- page_id as PRIMARY KEY ensures one help content per page
- modified_at/modified_by for audit trail
- No user-specific content (same help for all users)

## 8. API Endpoint Design

**Decision**: RESTful endpoints following existing Tickedify patterns

**Endpoints**:
1. `GET /api/page-help/:pageId` - Fetch help content for specific page
2. `PUT /api/page-help/:pageId` - Update help content (admin only)
3. `GET /api/page-help` - List all page help content (admin only)

**Response Format**:
```javascript
// GET /api/page-help/inbox
{
  "pageId": "inbox",
  "content": "# Inbox\n\nThe **Inbox** is...",
  "modifiedAt": "2025-11-09T10:30:00Z",
  "modifiedBy": "admin"
}

// If no custom content, return default from code
{
  "pageId": "inbox",
  "content": "[default content]",
  "isDefault": true
}
```

## 9. Performance Considerations

**Decision**: Client-side caching with localStorage

**Rationale**:
- Help content rarely changes
- Reduces server load (11 pages × N users = many requests)
- Instant popup display (no loading state)
- Cache invalidation via version number or timestamp

**Implementation**:
```javascript
// Cache key pattern:
localStorage.setItem(`help-content-${pageId}`, JSON.stringify({
  content: "...",
  cachedAt: Date.now()
}));

// Cache TTL: 24 hours (help content changes infrequently)
const CACHE_TTL = 24 * 60 * 60 * 1000;
```

## 10. Testing Strategy

**Decision**: Multi-layer testing approach

**Layers**:
1. **API Testing** (via curl):
   - GET endpoints return correct content
   - PUT endpoints update database
   - Default fallback works when no DB entry

2. **UI Testing** (via Playwright):
   - Help icon appears on all eligible pages
   - Click opens popup with correct content
   - Markdown rendering displays properly
   - Scrollable area works for long content
   - Close button dismisses popup

3. **Admin Testing** (manual):
   - Page Help menu item navigates correctly
   - Page selector shows all eligible pages
   - Content editor saves changes
   - Changes reflect immediately in main app

**Test Priorities**:
- HIGH: API endpoints, default content fallback
- MEDIUM: UI interaction, markdown rendering
- LOW: Admin interface workflow (manual testing sufficient)

## Summary of Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Markdown Library | Existing Marked.js | Already integrated, proven to work |
| Page Identification | View-based IDs | Matches SPA architecture |
| UI Placement | After page title | Natural, non-intrusive |
| Popup Styling | Reuse information messages | Consistency, no new components |
| Admin Menu | NEW "Page Help" item | Separate from "Berichten", clearer UX |
| Default Content | Code-embedded English | Deployment simplicity, fallback |
| Database Schema | Simple `page_help` table | Matches simple requirement |
| API Design | RESTful GET/PUT | Follows existing patterns |
| Performance | localStorage caching | Reduces load, instant display |
| Testing | Multi-layer (API + UI + manual) | Balanced coverage |

## Open Questions Resolved

1. ✅ Page list confirmed (11 eligible pages)
2. ✅ Markdown library decided (reuse Marked.js)
3. ✅ Page ID strategy decided (view-based)
4. ✅ Admin menu placement decided (new item, not under Berichten)
5. ✅ Default content strategy decided (code-embedded)
6. ✅ Performance optimization decided (localStorage cache)

## Next Phase: Data Model & Contracts

Ready to proceed to Phase 1 design with all technical unknowns resolved.
