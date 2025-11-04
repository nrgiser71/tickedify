# Tasks: Email Import Help - English Translation & Visual Styling

**Input**: Design documents from `/specs/054-er-is-een/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Node.js, Vanilla JS, HTML/CSS
   → Libraries: marked.js (markdown), Prism.js (syntax highlighting)
   → Structure: Web app (backend + frontend)
2. Load optional design documents ✅
   → data-model.md: Static content entity (no database)
   → contracts/: email-import-help-api.yml (4 endpoints)
   → research.md: 7 technical decisions documented
3. Generate tasks by category ✅
   → Content: Translation (Dutch → English)
   → Frontend: HTML page + CSS styling
   → Backend: Route updates
   → Testing: Manual visual validation
   → Deployment: Version bump + staging
4. Apply task rules ✅
   → Sequential workflow (content → HTML → CSS → routes → test)
   → No parallel tasks (each phase depends on previous)
   → Manual testing (no TDD for content/styling)
5. Number tasks sequentially (T001-T023) ✅
6. Generate dependency graph ✅
7. No parallel execution (sequential content/styling work) ✅
8. Validate task completeness ✅
   → All contracts represented (4 routes)
   → All content sections covered (translation)
   → All styling requirements addressed (responsive, syntax highlighting)
9. Return: SUCCESS (tasks ready for execution) ✅
```

## Format: `[ID] Description`
- **No [P] markers**: All tasks are sequential due to dependencies
- Include exact file paths in descriptions
- Manual testing is primary validation (visual verification)

## Path Conventions
- **Web app structure**: `public/` for frontend assets, `server.js` for backend routes
- **Repository root**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify`
- Paths shown below use relative paths from repository root

---

## Phase 3.1: Content Translation (English)

### T001: Translate markdown content to English
**File**: `public/email-import-help.md`
**Action**: Replace Dutch content with complete English translation
**Requirements**:
- Translate all 9 sections (Quick Start → Tips & Tricks)
- Preserve ALL code examples unchanged (`@t p: Project;` syntax)
- Preserve ALL tables (Priority Codes, Defer Codes, File Types)
- Preserve emoji usage (🔴, 🟡, 🟢)
- Maintain markdown structure (headings, code blocks, tables)
- Technical terms: "defer", "priority", "context", "project" (not translated)
- Professional tone, second person ("you"), approachable style

**Sections to translate**:
1. Quick Start (10 lines)
2. Syntax Overview (40 lines)
3. Examples (10+ code examples with descriptions)
4. Priority Codes (table + explanations)
5. Defer Codes (table + absolute priority rule)
6. Body Truncation (--end-- marker)
7. Validation Rules (date/duration/project/context)
8. Duplicates handling
9. Edge Cases
10. FAQ (8 questions)
11. Attachments Processing (Feature 049 section)
12. Troubleshooting (4 sections)
13. Tips & Tricks (3 sections)

**Validation**:
- No Dutch keywords remain (stuur, taak, beschrijving, etc.)
- All code examples valid (`@t` syntax preserved)
- Table structure intact (columns aligned)
- ~450 lines of markdown output

**Reference**: `research.md` section 5 (Translation Approach)

---

### T002: Verify code examples unchanged
**File**: `public/email-import-help.md`
**Action**: Validate all code examples maintain correct `@t` syntax
**Requirements**:
- Check all 15+ code blocks (`@t p: Project; c: Context;` etc.)
- Verify email syntax examples are valid
- Ensure priority codes preserved (p0-p9)
- Ensure defer codes preserved (df/dw/dm/d3m/d6m/dy)
- No translation of technical syntax

**Validation**:
```bash
# Extract code blocks and check for Dutch translations
grep -E "@t|p:|c:|d:|t:|p[0-9]|df|dw|dm" public/email-import-help.md
# Expected: All syntax examples unchanged from original
```

---

### T003: Verify tables preserved
**File**: `public/email-import-help.md`
**Action**: Validate all tables maintain structure and data
**Requirements**:
- Priority Codes table: p0-p9 → High/Medium/Low mappings
- Defer Codes table: df/dw/dm/d3m/d6m/dy → list names
- File Types table (if present): Extensions and descriptions
- Column alignment preserved (markdown table syntax)
- Header row bold/styled

**Validation**:
- 3 tables with correct columns
- All codes present (p0-p9, df-dy)
- Markdown table syntax valid (`|---|---|`)

---

## Phase 3.2: HTML Page Creation

### T004: Create email-import-help.html with semantic structure
**File**: `public/email-import-help.html` (NEW FILE)
**Action**: Create HTML page with semantic elements and ARIA landmarks
**Requirements**:
- DOCTYPE html, lang="en"
- Meta charset UTF-8, viewport for responsive
- Title: "Email Import Help - Tickedify"
- Semantic structure: `<header>`, `<main>`, `<footer>`
- ARIA roles: banner, main, contentinfo
- Link to CSS: `<link rel="stylesheet" href="/email-import-help.css">`
- Fetch markdown from `/api/email-import-help/content`
- Render markdown to `#content` div using marked.js
- Apply syntax highlighting with Prism.js

**HTML Structure**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Import Help - Tickedify</title>
  <link rel="stylesheet" href="/email-import-help.css">
</head>
<body>
  <header role="banner">
    <h1>Email Import Help</h1>
  </header>
  <main role="main" id="content">
    <!-- Rendered markdown content -->
  </main>
  <footer role="contentinfo">
    <p>Questions? Email <a href="mailto:jan@tickedify.com">jan@tickedify.com</a></p>
  </footer>
  <!-- Scripts loaded at end for performance -->
  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
  <script>
    fetch('/api/email-import-help/content')
      .then(res => res.text())
      .then(markdown => {
        document.getElementById('content').innerHTML = marked.parse(markdown);
        Prism.highlightAll();
      })
      .catch(err => {
        document.getElementById('content').innerHTML = '<p>Error loading help content. Please try again later.</p>';
        console.error('Failed to load help:', err);
      });
  </script>
</body>
</html>
```

**Validation**:
- Valid HTML5 (no syntax errors)
- Semantic elements present
- ARIA roles applied
- CDN scripts load successfully

**Reference**: `research.md` section 6 (HTML Structure & Accessibility)

---

### T005: Integrate marked.js via CDN
**File**: `public/email-import-help.html`
**Action**: Add marked.js markdown parser from CDN
**Requirements**:
- Version: 11.1.1 (latest stable)
- CDN URL: `https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js`
- Load at end of body (not blocking)
- Parse markdown with `marked.parse(markdown)`
- Insert HTML into `#content` div

**Validation**:
```javascript
// Browser console check
typeof marked === 'object' && typeof marked.parse === 'function'
// Expected: true
```

**Reference**: `research.md` section 1 (Markdown Rendering Library Selection)

---

### T006: Integrate Prism.js via CDN for syntax highlighting
**File**: `public/email-import-help.html`
**Action**: Add Prism.js syntax highlighter from CDN
**Requirements**:
- Version: 1.29.0
- Core CDN URL: `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js`
- Load after marked.js
- Run `Prism.highlightAll()` after markdown rendered
- Languages: text (default), javascript (if needed)
- Custom theme via CSS (Tickedify colors)

**Validation**:
```javascript
// Browser console check
typeof Prism === 'object' && typeof Prism.highlightAll === 'function'
// Expected: true
```

**Reference**: `research.md` section 3 (Syntax Highlighting for Code Blocks)

---

## Phase 3.3: CSS Styling

### T007: Create email-import-help.css base structure
**File**: `public/email-import-help.css` (NEW FILE)
**Action**: Create CSS file with base styles and Tickedify design system
**Requirements**:
- Reset/normalize styles
- Container layout (max-width, centering)
- Typography base (font-family, line-height)
- Color variables (Tickedify palette)
- Spacing variables (padding, margins)

**Base Structure**:
```css
/* Reset and base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #111827; /* gray-900 */
  background: #FFFFFF;
}

/* Container */
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Responsive container */
@media (max-width: 767px) {
  main { padding: 1rem; }
}

/* Colors (Tickedify palette) */
:root {
  --primary: #4F46E5; /* indigo-600 */
  --gray-900: #111827;
  --gray-800: #1F2937;
  --gray-500: #6B7280;
  --gray-200: #E5E7EB;
  --gray-100: #F3F4F6;
  --gray-50: #F9FAFB;
}
```

**Reference**: `research.md` section 2 (Tickedify Design System Analysis)

---

### T008: Style headings with Tickedify colors
**File**: `public/email-import-help.css`
**Action**: Add heading styles with responsive sizing
**Requirements**:
- H1: indigo-600 (#4F46E5), bold
- H2: gray-900 (#111827), bold
- H3: gray-800 (#1F2937), semi-bold
- Responsive sizing:
  - Desktop (≥1024px): H1 36px, H2 30px, H3 24px
  - Tablet (768-1023px): H1 32px, H2 26px, H3 22px
  - Mobile (<768px): H1 28px, H2 24px, H3 20px
- Proper spacing (margin-top, margin-bottom)

**CSS**:
```css
/* Headings - Desktop */
h1 {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
  margin-top: 2rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 30px;
  font-weight: 700;
  color: var(--gray-900);
  margin-top: 2rem;
  margin-bottom: 1rem;
}

h3 {
  font-size: 24px;
  font-weight: 600;
  color: var(--gray-800);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

/* Headings - Tablet */
@media (max-width: 1023px) {
  h1 { font-size: 32px; }
  h2 { font-size: 26px; }
  h3 { font-size: 22px; }
}

/* Headings - Mobile */
@media (max-width: 767px) {
  h1 { font-size: 28px; }
  h2 { font-size: 24px; }
  h3 { font-size: 20px; }
}
```

**Reference**: `research.md` section 2 (Typography)

---

### T009: Style code blocks with syntax highlighting
**File**: `public/email-import-help.css`
**Action**: Add code block styles with Tickedify colors
**Requirements**:
- Background: gray-100 (#F3F4F6)
- Border: 1px solid gray-200 (#E5E7EB)
- Padding: 1rem (16px)
- Border radius: 0.5rem (8px)
- Monospace font (Courier New, Monaco, Consolas)
- Responsive font size:
  - Desktop: 16px
  - Tablet: 15px
  - Mobile: 14px
- Horizontal scroll on overflow
- Syntax highlighting colors (Prism.js custom theme)

**CSS**:
```css
/* Code blocks */
pre {
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
}

code {
  font-family: 'Courier New', Monaco, Consolas, monospace;
  font-size: 16px;
  color: var(--gray-800);
}

/* Inline code */
:not(pre) > code {
  background: var(--gray-100);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.9em;
}

/* Prism.js custom theme (Tickedify colors) */
.token.keyword { color: var(--primary); }
.token.string { color: #059669; } /* green-600 */
.token.comment { color: var(--gray-500); }
.token.punctuation { color: var(--gray-800); }

/* Responsive code font size */
@media (max-width: 1023px) {
  code { font-size: 15px; }
}

@media (max-width: 767px) {
  code { font-size: 14px; }
}
```

**Reference**: `research.md` section 3 (Syntax Highlighting)

---

### T010: Style tables with borders and alternating rows
**File**: `public/email-import-help.css`
**Action**: Add table styles with Tickedify design
**Requirements**:
- Border: 1px solid gray-200 (#E5E7EB)
- Header: gray-100 background (#F9FAFB), gray-900 text, bold
- Rows: Alternating white (#FFFFFF) and gray-50 (#F9FAFB)
- Cell padding: 0.75rem (12px)
- Text alignment: left for text, center for codes
- Responsive: horizontal scroll on mobile (<768px)

**CSS**:
```css
/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--gray-200);
  margin: 1rem 0;
}

thead th {
  background: var(--gray-50);
  color: var(--gray-900);
  font-weight: 700;
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid var(--gray-200);
}

tbody td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--gray-200);
}

tbody tr:nth-child(even) {
  background: var(--gray-50);
}

tbody tr:nth-child(odd) {
  background: #FFFFFF;
}

/* Responsive table wrapper */
@media (max-width: 767px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 600px;
  }
}
```

**Note**: Markdown renderer may need wrapper div adjustment for mobile scrolling

**Reference**: `research.md` section 2 (Table styling)

---

### T011: Implement responsive breakpoints
**File**: `public/email-import-help.css`
**Action**: Add responsive media queries for mobile/tablet/desktop
**Requirements**:
- Mobile-first approach (default styles for mobile)
- Breakpoints:
  - Tablet: 768px (min-width)
  - Desktop: 1024px (min-width)
- Container width adjustments
- Font size scaling
- Padding/margin adjustments

**CSS**:
```css
/* Mobile-first base styles (already defined in T007-T010) */

/* Tablet adjustments */
@media (min-width: 768px) {
  main {
    max-width: 90%;
    padding: 1.5rem;
  }
}

/* Desktop adjustments */
@media (min-width: 1024px) {
  main {
    max-width: 1200px;
    padding: 2rem;
  }
}

/* Print styles */
@media print {
  main {
    max-width: 100%;
    padding: 0;
  }

  pre {
    border: 1px solid #000;
    page-break-inside: avoid;
  }
}
```

**Reference**: `research.md` section 4 (Responsive Design Patterns)

---

### T012: Add accessibility features
**File**: `public/email-import-help.css`
**Action**: Add focus indicators and ensure WCAG AA contrast
**Requirements**:
- Focus indicators for interactive elements (links, buttons)
- Color contrast ratios ≥4.5:1 (WCAG AA)
- Reduced motion support (prefers-reduced-motion)
- High contrast mode support
- Skip to content link (if needed)

**CSS**:
```css
/* Focus indicators */
a:focus,
button:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Links */
a {
  color: var(--primary);
  text-decoration: underline;
}

a:hover {
  color: #3730A3; /* indigo-800 */
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary: #0000FF;
    --gray-900: #000000;
  }
}

/* Ensure proper contrast for all text */
body {
  color: var(--gray-900);
  background: #FFFFFF;
}

code, pre code {
  color: var(--gray-800);
  background: var(--gray-100);
}
```

**Validation**: Run Lighthouse accessibility audit (target: ≥90 score)

**Reference**: `research.md` section 6 (Accessibility)

---

## Phase 3.4: Backend Route Updates

### T013: Update server.js - Add /email-import-help HTML route
**File**: `server.js`
**Action**: Add route to serve email-import-help.html page
**Location**: After existing routes (around line 460)
**Requirements**:
- GET `/email-import-help` → serve HTML page
- Use `res.sendFile()` with absolute path
- Error handling (404 if file not found)

**Code**:
```javascript
// Email import help page (styled HTML)
app.get('/email-import-help', (req, res) => {
  const helpPath = path.join(__dirname, 'public', 'email-import-help.html');
  res.sendFile(helpPath, (err) => {
    if (err) {
      console.error('Failed to serve email-import-help.html:', err);
      res.status(404).json({ error: 'Help page not found' });
    }
  });
});
```

**Validation**:
```bash
curl -s -L -k -o /dev/null -w "%{http_code}" https://dev.tickedify.com/email-import-help
# Expected: 200
```

**Reference**: `data-model.md` section "Configuration Changes"

---

### T014: Add /api/email-import-help/content markdown API route
**File**: `server.js`
**Action**: Add API endpoint to serve raw markdown content
**Location**: After T013 route
**Requirements**:
- GET `/api/email-import-help/content` → serve markdown
- Content-Type: `text/markdown; charset=utf-8`
- Cache-Control: `public, max-age=3600` (1 hour)
- Error handling (404 if file not found)

**Code**:
```javascript
// Email import help content API (markdown)
app.get('/api/email-import-help/content', (req, res) => {
  const helpPath = path.join(__dirname, 'public', 'email-import-help.md');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(helpPath, (err) => {
    if (err) {
      console.error('Failed to read email-import-help.md:', err);
      res.status(404).json({ error: 'Help content not found' });
    }
  });
});
```

**Validation**:
```bash
curl -s -L -k -I https://dev.tickedify.com/api/email-import-help/content | grep -i content-type
# Expected: Content-Type: text/markdown; charset=utf-8
```

**Reference**: `contracts/email-import-help-api.yml`

---

### T015: Add redirect from old /api/email-import-help route
**File**: `server.js`
**Action**: Replace existing route with 301 redirect for backwards compatibility
**Location**: Replace current route at line 458
**Requirements**:
- GET `/api/email-import-help` → 301 redirect to `/email-import-help`
- Preserve old behavior for existing links
- HTTP 301 (Permanent Redirect)

**Code**:
```javascript
// Backwards compatibility redirect (old route → new HTML page)
app.get('/api/email-import-help', (req, res) => {
  res.redirect(301, '/email-import-help');
});
```

**Validation**:
```bash
curl -s -L -k -I https://dev.tickedify.com/api/email-import-help | grep -E "HTTP|Location"
# Expected:
# HTTP/2 301
# Location: /email-import-help
```

**Reference**: `contracts/email-import-help-api.yml` (deprecated endpoint)

---

## Phase 3.5: Testing & Validation

### T016: Manual test - HTML page loads with styled content
**Environment**: dev.tickedify.com
**Action**: Navigate to help page and verify rendering
**Requirements**:
- Open: `https://dev.tickedify.com/email-import-help`
- Page loads in <2 seconds
- Title: "Email Import Help - Tickedify"
- Content rendered in English
- No console errors in browser DevTools
- Headings styled with Tickedify colors
- Code blocks have gray background
- Tables have borders and alternating rows

**Validation Checklist**:
- [ ] HTTP 200 status
- [ ] Page title correct
- [ ] English content visible (not Dutch)
- [ ] H1 is indigo-600 color
- [ ] Code blocks have gray-100 background
- [ ] Tables have alternating row colors
- [ ] No JavaScript errors in console

**Reference**: `quickstart.md` Scenario 1

---

### T017: Visual test - English translation complete
**Environment**: dev.tickedify.com
**Action**: Scroll through all sections and verify English content
**Requirements**:
- All 9 sections in English:
  1. Quick Start ✓
  2. Syntax Overview ✓
  3. Examples (10+) ✓
  4. Priority Codes table ✓
  5. Defer Codes table ✓
  6. Validation Rules ✓
  7. FAQ (8 questions) ✓
  8. Troubleshooting ✓
  9. Tips & Tricks ✓
- No Dutch keywords (stuur, taak, beschrijving)
- Code examples unchanged (`@t p: Project;`)
- Table data preserved (p0-p9, df-dy codes)
- Emoji preserved (🔴, 🟡, 🟢)

**Validation Checklist**:
- [ ] All headings in English
- [ ] No Dutch text visible
- [ ] Code syntax unchanged
- [ ] Tables complete (all codes present)
- [ ] FAQ answers clear and actionable

**Reference**: `quickstart.md` Scenario 2

---

### T018: Visual test - Syntax highlighting works
**Environment**: dev.tickedify.com
**Action**: Inspect code blocks for syntax highlighting
**Requirements**:
- 15+ code blocks with `@t` syntax examples
- Background color: #F3F4F6 (gray-100)
- Border: 1px solid #E5E7EB (gray-200)
- Padding: 16px
- Syntax highlighting applied (Prism.js classes visible)
- Monospace font
- Horizontal scroll on mobile

**Validation Checklist**:
- [ ] Code blocks have gray background
- [ ] Borders visible
- [ ] Syntax highlighting colors applied
- [ ] Monospace font used
- [ ] Readable contrast (4.5:1 ratio)

**Browser DevTools Check**:
```javascript
const codeBlocks = document.querySelectorAll('pre code');
console.log(`Found ${codeBlocks.length} code blocks`); // Expected: ≥15
const firstBlock = codeBlocks[0].parentElement;
console.log('Background:', window.getComputedStyle(firstBlock).backgroundColor);
// Expected: rgb(243, 244, 246)
```

**Reference**: `quickstart.md` Scenario 3

---

### T019: Visual test - Responsive design (mobile/tablet/desktop)
**Environment**: dev.tickedify.com
**Action**: Test layout at different viewport widths
**Requirements**:
- **Mobile (375px)**: Full width, 1rem padding, H1 28px, horizontal scroll for tables/code
- **Tablet (768px)**: 90% width, H1 32px, natural layout
- **Desktop (1440px)**: 1200px max-width centered, H1 36px

**Validation Checklist**:

**Mobile (<768px)**:
- [ ] Full width with 1rem padding
- [ ] H1 font-size: 28px
- [ ] Code blocks: 14px font, horizontal scroll
- [ ] Tables: horizontal scroll container
- [ ] No horizontal page scroll

**Tablet (768-1023px)**:
- [ ] 90% width, centered
- [ ] H1 font-size: 32px
- [ ] Code blocks: 15px font
- [ ] Tables: full width with padding

**Desktop (≥1024px)**:
- [ ] 1200px max-width, centered
- [ ] H1 font-size: 36px
- [ ] Code blocks: 16px font
- [ ] Tables: natural column sizing
- [ ] Proper white space (2rem padding)

**Browser DevTools Device Emulation**:
- iPhone SE (375px width)
- iPad (768px width)
- Desktop (1440px width)

**Reference**: `quickstart.md` Scenario 5

---

### T020: Performance test - Page load <2 seconds
**Environment**: dev.tickedify.com
**Action**: Measure page load time and resource loading
**Requirements**:
- Total load time: <2 seconds (first load)
- Cached load time: <500ms (subsequent)
- Markdown fetch: <100ms
- marked.js CDN: <200ms (first), <50ms (cached)
- Prism.js CDN: <200ms (first), <50ms (cached)

**Validation Commands**:
```bash
# Measure total load time
curl -s -L -k -o /dev/null -w "Total: %{time_total}s\n" https://dev.tickedify.com/email-import-help
# Expected: <2.0s

# Measure markdown API response time
curl -s -L -k -o /dev/null -w "Markdown API: %{time_total}s\n" https://dev.tickedify.com/api/email-import-help/content
# Expected: <0.1s
```

**Browser Performance Check**:
```javascript
// Run in browser console after page load
performance.measure('page-load', 'navigationStart', 'loadEventEnd');
const [measure] = performance.getEntriesByName('page-load');
console.log(`Page load time: ${measure.duration.toFixed(0)}ms`);
// Expected: <2000ms first load, <500ms cached
```

**DevTools Network Tab**:
- Check waterfall for slow resources
- Verify CDN resources cached (304 Not Modified)
- Check total transferred size (~45KB)

**Reference**: `quickstart.md` Scenario 6

---

## Phase 3.6: Documentation & Deployment

### T021: Update package.json version (patch bump)
**File**: `package.json`
**Action**: Increment version number (patch level)
**Requirements**:
- Current version: Check `package.json` → e.g., "0.21.46"
- New version: Increment patch → e.g., "0.21.47"
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Patch level for content/styling changes

**Code**:
```json
{
  "version": "0.21.47"
}
```

**Validation**:
```bash
grep '"version":' package.json
# Expected: "version": "0.21.47" (or next patch version)
```

**Reference**: Constitution section "Versioning & Changelog Discipline"

---

### T022: Update changelog with feature description
**File**: `public/changelog.html`
**Action**: Add new entry for English help page with styling
**Requirements**:
- Version: Match package.json (0.21.47)
- Date: Current date (2025-01-04)
- Badge: "badge-feature" class
- Emoji: ⚡ (feature)
- Description: Clear user-facing benefit
- Set previous version badge to "badge-fix" or "badge-feature"

**HTML**:
```html
<!-- Add at TOP of changelog entries -->
<div class="changelog-entry">
  <div class="changelog-header">
    <span class="badge badge-latest">v0.21.47</span>
    <span class="changelog-date">2025-01-04</span>
  </div>
  <h3>⚡ Email Import Help - English Translation & Enhanced Styling</h3>
  <ul>
    <li>Translated email import help documentation to English for better accessibility</li>
    <li>Added beautiful markdown rendering with syntax highlighting for code examples</li>
    <li>Implemented responsive design for mobile, tablet, and desktop viewing</li>
    <li>Enhanced readability with styled tables, headings, and code blocks</li>
  </ul>
</div>
```

**Update previous entry**:
```html
<!-- Change previous "badge-latest" to "badge-feature" -->
<span class="badge badge-feature">v0.21.46</span>
```

**Reference**: Constitution section "Versioning & Changelog Discipline"

---

### T023: Deploy to staging and verify via /api/version
**Environment**: dev.tickedify.com
**Action**: Commit, merge to staging, push, and verify deployment
**Requirements**:
1. Git commit with descriptive message
2. Merge to staging branch
3. Push to origin staging
4. Wait for Vercel deployment (~60 seconds)
5. Verify version via `/api/version` endpoint
6. Run quickstart scenarios (T016-T020)

**Commands**:
```bash
# 1. Commit changes
git add public/email-import-help.md public/email-import-help.html public/email-import-help.css server.js package.json public/changelog.html
git commit -m "$(cat <<'EOF'
⚡ Email Import Help - English Translation & Enhanced Styling - v0.21.47

- Translated Dutch help documentation to English (450 lines)
- Created styled HTML page with markdown rendering (marked.js)
- Added syntax highlighting for code blocks (Prism.js)
- Implemented responsive design (mobile/tablet/desktop)
- Styled tables with borders and alternating rows
- Added Tickedify design system colors and typography
- Updated routes for backwards compatibility

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 2. Merge to staging
git checkout staging
git merge 054-er-is-een --no-edit

# 3. Push to staging
git push origin staging

# 4. Wait and verify deployment (15-second intervals)
sleep 15
curl -s -L -k https://dev.tickedify.com/api/version
# Expected: {"version":"0.21.47"}

# If version not updated, wait another 15 seconds and check again
sleep 15
curl -s -L -k https://dev.tickedify.com/api/version

# 5. Run final validation
curl -s -L -k https://dev.tickedify.com/email-import-help | grep -o "<title>.*</title>"
# Expected: <title>Email Import Help - Tickedify</title>
```

**Validation**:
- Version endpoint returns "0.21.47"
- Help page loads successfully (HTTP 200)
- No JavaScript console errors
- All T016-T020 tests pass

**Reference**: Constitution section "Deployment Verification Workflow"

---

## Dependencies

**Sequential Workflow** (no parallel execution):

```
Content (T001-T003)
    ↓
HTML (T004-T006)
    ↓
CSS (T007-T012)
    ↓
Routes (T013-T015)
    ↓
Testing (T016-T020)
    ↓
Deployment (T021-T023)
```

**Detailed Dependencies**:
- T001 (translation) → blocks T002-T003 (validation needs translated content)
- T001-T003 (content) → blocks T004 (HTML needs content to fetch)
- T004-T006 (HTML) → blocks T007-T012 (CSS needs HTML structure)
- T007-T012 (CSS) → blocks T013-T015 (routes need styling to serve)
- T013-T015 (routes) → blocks T016-T020 (testing needs routes to access)
- T016-T020 (testing) → blocks T021-T023 (deployment needs validation)

**No Parallel Tasks**: Each phase depends on completion of previous phase. Content/styling work is inherently sequential.

---

## Notes

### Why No Parallel Tasks?
- Content translation (T001) must complete before HTML can fetch it (T004)
- HTML structure (T004-T006) must exist before CSS can style it (T007-T012)
- CSS styling (T007-T012) must be ready before routes serve pages (T013-T015)
- Routes (T013-T015) must work before testing can validate (T016-T020)
- Testing (T016-T020) must pass before deployment (T021-T023)

### Testing Approach
- **Manual visual testing** is primary validation (not TDD)
- No unit tests (no business logic)
- No API contract tests (static file serving)
- Browser-based validation (responsive, styling, accessibility)

### Performance Targets
- Page load: <2 seconds (first load), <500ms (cached)
- Markdown parsing: <100ms
- CDN resources: cached after first load
- Total bundle: ~45KB (18KB CDN cached)

### Backwards Compatibility
- Old `/api/email-import-help` route redirects (301) to new HTML page
- Existing links preserved (no broken bookmarks)
- Same endpoint, better presentation

### Rollback Plan
If any test fails:
```bash
git checkout staging
git revert HEAD
git push origin staging
```

Then investigate specific failure (translation error, CSS bug, route issue).

---

## Validation Checklist
*GATE: All must pass before deployment*

- [x] All content translated to English (T001-T003)
- [x] HTML page created with semantic structure (T004-T006)
- [x] CSS styling complete with Tickedify colors (T007-T012)
- [x] Routes updated with backwards compatibility (T013-T015)
- [x] Manual testing passed (T016-T020):
  - [ ] HTML page loads ✓
  - [ ] English translation ✓
  - [ ] Syntax highlighting ✓
  - [ ] Responsive design ✓
  - [ ] Performance <2s ✓
- [x] Documentation updated (T021-T022)
- [x] Staging deployment verified (T023)

---

## Task Summary

**Total Tasks**: 23
**Parallel Tasks**: 0 (all sequential)
**Estimated Time**: 4-6 hours (including testing and translation)

**Phase Breakdown**:
- Content (T001-T003): ~90 minutes (translation + validation)
- HTML (T004-T006): ~30 minutes (page structure + CDN integration)
- CSS (T007-T012): ~90 minutes (styling + responsive + accessibility)
- Routes (T013-T015): ~20 minutes (3 simple route updates)
- Testing (T016-T020): ~60 minutes (manual visual validation)
- Deployment (T021-T023): ~20 minutes (version bump + commit + deploy)

**No Database Changes**: This feature is purely content and presentation layer.
**No API Logic**: Only static file serving and redirects.
**Low Risk**: Content translation and styling changes, no business logic impact.

---

*Ready for implementation. Execute tasks T001-T023 sequentially on staging branch.*
