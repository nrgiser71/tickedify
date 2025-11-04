# Data Model: Email Import Help - English Translation & Visual Styling

**Date**: 2025-01-04
**Feature**: 054-er-is-een

## Overview

This feature involves NO database changes and NO new data entities. It is purely a content translation and presentation layer enhancement. The existing email import help documentation is refactored from Dutch to English and rendered with enhanced visual styling.

---

## Entities

### Static Content Entity: Help Documentation

**Type**: Markdown file (static content, not database-backed)

**Location**: `public/email-import-help.md`

**Attributes**:
- **Language**: English (replaced from Dutch)
- **Format**: Markdown with CommonMark syntax
- **Sections**:
  - Quick Start
  - Syntax Overview
  - Code Examples (10+ examples)
  - Priority Codes table
  - Defer Codes table
  - Validation Rules
  - FAQ (8 questions)
  - Troubleshooting section
  - Tips & Tricks
- **Size**: ~450 lines of markdown (~25KB text file)
- **Code Blocks**: ~15 code examples with `@t` syntax
- **Tables**: 3 tables (Priority Codes, Defer Codes, File Types)

**Relationships**: None (standalone content)

**State Transitions**: None (static content, read-only)

**Validation Rules**:
- ✅ Must be valid markdown (CommonMark compliant)
- ✅ All code examples must use correct `@t` syntax
- ✅ Tables must have consistent column structure
- ✅ All internal links must resolve (e.g., `#validation-rules`)
- ✅ File must be UTF-8 encoded

---

## Presentation Layer Entity: Rendered HTML

**Type**: Client-side rendered HTML from markdown

**Source**: `public/email-import-help.html` (new file)

**Styling**: `public/email-import-help.css` (new file)

**Attributes**:
- **Rendered Content**: HTML generated from markdown via marked.js
- **Syntax Highlighting**: Applied via Prism.js to code blocks
- **Responsive Layout**: CSS media queries for mobile/tablet/desktop
- **Design System**: Tickedify color palette and typography

**Processing Pipeline**:
```
email-import-help.md (static file)
        ↓
  Browser fetch (/api/email-import-help/content)
        ↓
  marked.parse(markdown) → HTML
        ↓
  Prism.highlightAll() → Syntax highlighting
        ↓
  CSS styles applied → Styled presentation
        ↓
  Rendered in DOM (#content element)
```

**Styling Rules**:
- **Headings**:
  - H1: 36px (desktop), 28px (mobile), bold, indigo-600 color
  - H2: 30px (desktop), 24px (mobile), bold, gray-900 color
  - H3: 24px (desktop), 20px (mobile), semi-bold, gray-800 color
- **Code Blocks**:
  - Background: gray-100 (#F3F4F6)
  - Border: 1px solid gray-200 (#E5E7EB)
  - Padding: 1rem
  - Border radius: 0.5rem
  - Syntax highlighting: Prism.js custom theme
- **Tables**:
  - Border: 1px solid gray-200
  - Header: gray-100 background, gray-900 text, bold
  - Rows: Alternating white/gray-50 backgrounds
  - Padding: 0.75rem per cell
- **Responsive**:
  - Mobile (<768px): Full width, horizontal scroll for tables/code
  - Tablet (768-1023px): 90% width, natural layout
  - Desktop (≥1024px): 1200px max-width, centered

---

## Configuration Changes

### Server Route Updates

**Existing Route** (server.js:458):
```javascript
app.get('/api/email-import-help', (req, res) => {
  const helpPath = path.join(__dirname, 'public', 'email-import-help.md');
  res.sendFile(helpPath);
});
```

**New Routes**:
```javascript
// Main help page (HTML with renderer)
app.get('/email-import-help', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'email-import-help.html'));
});

// API endpoint for markdown content (used by renderer)
app.get('/api/email-import-help/content', (req, res) => {
  const helpPath = path.join(__dirname, 'public', 'email-import-help.md');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.sendFile(helpPath);
});

// Backwards compatibility (redirect old route)
app.get('/api/email-import-help', (req, res) => {
  res.redirect(301, '/email-import-help');
});
```

**Rationale for Route Changes**:
- `/email-import-help` → User-facing HTML page with styling
- `/api/email-import-help/content` → API for fetching markdown
- `/api/email-import-help` → Redirects to new HTML page (backwards compat)

---

## File Structure

### New Files

```
public/
├── email-import-help.html     (NEW) ~80 lines
├── email-import-help.css      (NEW) ~200 lines
└── email-import-help.md       (UPDATED) ~450 lines (English)
```

**email-import-help.html**:
- Semantic HTML structure
- Links to marked.js and Prism.js via CDN
- Inline JavaScript for markdown rendering
- ARIA landmarks for accessibility

**email-import-help.css**:
- Tickedify design system colors
- Responsive breakpoints (768px, 1024px)
- Typography styles (headings, body, code)
- Table styling (borders, alternating rows)
- Code block styling (background, syntax highlighting)

**email-import-help.md**:
- Complete English translation of Dutch original
- All sections preserved (Quick Start → Tips & Tricks)
- Code examples unchanged (syntax validation)
- Tables reformatted for consistency

---

## Dependencies

### External Libraries (CDN-hosted)

**marked.js**:
- Version: 11.1.1 (latest stable)
- Source: `https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js`
- Size: ~10KB minified
- License: MIT
- Purpose: Markdown to HTML parsing

**Prism.js**:
- Version: 1.29.0
- Core: `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js`
- Theme: Custom CSS (Tickedify colors)
- Languages: text, javascript (minimal)
- Size: ~2KB core + ~1KB per language
- License: MIT
- Purpose: Syntax highlighting for code blocks

**Total External Dependencies**: ~13KB (marked.js 10KB + Prism.js 3KB)

### No Database Dependencies

- ✅ No PostgreSQL schema changes
- ✅ No migrations required
- ✅ No data seeding
- ✅ No database queries added/modified

---

## Testing Validation

### Content Validation

**Markdown Parsing**:
- ✅ All 450 lines parse without errors
- ✅ Headings render correctly (H1, H2, H3 hierarchy)
- ✅ Code blocks preserve syntax and formatting
- ✅ Tables render with correct column alignment
- ✅ Internal links resolve (#syntax-overview, #faq, etc.)

**Translation Accuracy**:
- ✅ All technical terms correctly translated
- ✅ Code examples unchanged (Dutch → English)
- ✅ Table data preserved (p0-p9, df/dw/dm codes)
- ✅ FAQ answers accurate and complete
- ✅ Troubleshooting steps clear and actionable

### Visual Validation

**Desktop (≥1024px)**:
- ✅ 1200px max-width container, centered
- ✅ Headings: H1 36px, H2 30px, H3 24px
- ✅ Code blocks: 16px font, syntax highlighted
- ✅ Tables: Full width, natural column sizing
- ✅ Proper spacing (2rem padding, 1.5rem margins)

**Tablet (768-1023px)**:
- ✅ 90% width container
- ✅ Headings: H1 32px, H2 26px, H3 22px
- ✅ Code blocks: 15px font, horizontal scroll if needed
- ✅ Tables: Full width with responsive padding

**Mobile (<768px)**:
- ✅ Full width with 1rem padding
- ✅ Headings: H1 28px, H2 24px, H3 20px
- ✅ Code blocks: 14px font, horizontal scroll
- ✅ Tables: Horizontal scroll container

### Performance Validation

**Load Time**:
- ✅ Target: <2 seconds initial load
- ✅ Markdown fetch: ~50ms
- ✅ marked.js CDN: ~100ms (50ms cached)
- ✅ Prism.js CDN: ~100ms (50ms cached)
- ✅ Markdown parsing: ~20ms (450 lines)
- ✅ Syntax highlighting: ~10ms (15 code blocks)
- ✅ **Total**: ~280ms first load, ~120ms cached

**Bundle Size**:
- HTML: ~2KB
- CSS: ~5KB
- Markdown: ~25KB
- marked.js: 10KB (CDN)
- Prism.js: 3KB (CDN)
- **Total**: ~45KB (18KB CDN cached)

---

## Summary

This feature involves NO data model changes in the traditional sense. It is purely:

1. **Content transformation**: Dutch markdown → English markdown
2. **Presentation enhancement**: Plain text → Styled HTML with syntax highlighting
3. **Route updates**: API endpoint + HTML page for backwards compatibility

**Key Points**:
- ✅ Zero database impact
- ✅ Zero schema changes
- ✅ Static file updates only
- ✅ Client-side rendering (no server load increase)
- ✅ CDN-hosted dependencies (no bundle bloat)

**Risk**: Minimal - content and styling changes only, no business logic modifications.
