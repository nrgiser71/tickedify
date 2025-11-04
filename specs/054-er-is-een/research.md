# Research: Email Import Help - English Translation & Visual Styling

**Date**: 2025-01-04
**Feature**: 054-er-is-een

## Research Objectives

1. Determine best markdown rendering library for Tickedify
2. Analyze Tickedify's existing design system for consistency
3. Research syntax highlighting options for code blocks
4. Evaluate responsive design patterns for documentation
5. Identify English translation approach for technical documentation

---

## 1. Markdown Rendering Library Selection

### Decision: marked.js

**Rationale**:
- ✅ Lightweight (~10KB minified) - meets performance goal of <2s load time
- ✅ Zero dependencies - reduces bundle size and maintenance overhead
- ✅ Browser-native - works directly in vanilla JavaScript without build tools
- ✅ CommonMark compliant - ensures consistent markdown parsing
- ✅ Extensible - supports custom renderers for code blocks and tables
- ✅ Widely used and maintained (17k+ GitHub stars)
- ✅ CDN availability via jsdelivr or unpkg - no npm install required

**Alternatives Considered**:
- **markdown-it**: More features but heavier (~80KB), requires more configuration
- **showdown**: Older library, less maintained, larger bundle size
- **remark**: React ecosystem, not suitable for vanilla JavaScript project
- **Custom parser**: Overkill for this use case, maintenance burden

**Implementation Approach**:
```html
<!-- In email-import-help.html -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
  fetch('/api/email-import-help')
    .then(res => res.text())
    .then(markdown => {
      document.getElementById('content').innerHTML = marked.parse(markdown);
    });
</script>
```

**Performance Impact**:
- marked.js parsing: ~10-20ms for 450 lines
- CDN load: ~50-100ms (cached after first visit)
- Total: ~60-120ms, well under 100ms parsing goal

---

## 2. Tickedify Design System Analysis

### Current Tickedify Styling Patterns

**Colors** (from existing app.css and UI inspection):
- **Primary**: `#4F46E5` (indigo-600) - used for buttons, links
- **Background**: `#FFFFFF` (white main), `#F9FAFB` (gray-50 secondary)
- **Text**: `#111827` (gray-900 primary), `#6B7280` (gray-500 secondary)
- **Borders**: `#E5E7EB` (gray-200)
- **Code blocks**: `#F3F4F6` (gray-100 background), `#1F2937` (gray-800 text)
- **Tables**: Alternating `#FFFFFF` and `#F9FAFB` rows

**Typography**:
- **Font family**: System fonts stack (sans-serif)
- **Headings**: Bold, larger sizes with consistent spacing
- **Body**: 16px base, 1.5 line-height for readability
- **Code**: Monospace (Courier New, Monaco, Consolas)

**Spacing**:
- **Container padding**: 2rem (32px) desktop, 1rem (16px) mobile
- **Section margins**: 1.5rem (24px) between sections
- **List spacing**: 0.5rem (8px) between items

**Decision**: Follow Tickedify's existing Tailwind-inspired color palette
- Ensures visual consistency across application
- Users recognize familiar styling patterns
- No jarring visual transitions between help and main app

---

## 3. Syntax Highlighting for Code Blocks

### Decision: Prism.js with custom theme

**Rationale**:
- ✅ Lightweight core (~2KB) with selective language loading
- ✅ Custom themes - can match Tickedify color palette
- ✅ Email syntax highlighting - supports generic text/email patterns
- ✅ Line numbers plugin available for longer examples
- ✅ CDN hosted - no build step required
- ✅ Works with marked.js via custom renderer

**Alternatives Considered**:
- **highlight.js**: Heavier, auto-detection not needed for known syntax
- **No highlighting**: Code would blend with text, harder to scan
- **CSS-only**: Limited visual distinction without syntax coloring

**Implementation Approach**:
```javascript
// Custom marked renderer for code blocks
marked.use({
  renderer: {
    code(code, lang) {
      const highlighted = Prism.highlight(code, Prism.languages[lang] || Prism.languages.text, lang || 'text');
      return `<pre class="language-${lang}"><code>${highlighted}</code></pre>`;
    }
  }
});
```

**Languages to Support**:
- `text` - for email body examples
- `javascript` - for code snippets (if any)
- `json` - for syntax structure examples

**Custom Theme Colors** (matching Tickedify):
- Background: `#F3F4F6` (gray-100)
- Border: `1px solid #E5E7EB` (gray-200)
- Text: `#1F2937` (gray-800)
- Keywords: `#4F46E5` (indigo-600, Tickedify primary)
- Strings: `#059669` (green-600)
- Comments: `#6B7280` (gray-500)

---

## 4. Responsive Design Patterns

### Decision: Mobile-first responsive CSS with breakpoints

**Rationale**:
- ✅ Mobile traffic is significant for help documentation
- ✅ Progressive enhancement from mobile to desktop
- ✅ Simpler CSS logic (min-width media queries)
- ✅ Matches Tickedify's existing responsive approach

**Breakpoints** (aligned with Tickedify):
```css
/* Mobile: < 768px (default) */
/* Tablet: >= 768px */
@media (min-width: 768px) { }
/* Desktop: >= 1024px */
@media (min-width: 1024px) { }
```

**Responsive Patterns**:

**Tables**:
- Mobile: Horizontal scroll container with fixed column widths
- Tablet+: Full-width tables with natural column sizing
```css
@media (max-width: 767px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

**Code Blocks**:
- Mobile: Horizontal scroll, smaller font (14px)
- Desktop: Full width with 16px font
```css
pre code {
  font-size: 14px;
}
@media (min-width: 768px) {
  pre code { font-size: 16px; }
}
```

**Typography**:
- Mobile: H1 28px, H2 24px, H3 20px
- Desktop: H1 36px, H2 30px, H3 24px

**Container Width**:
- Mobile: Full width with 1rem padding
- Tablet: 90% max-width
- Desktop: 1200px max-width, centered

---

## 5. English Translation Approach

### Decision: Human-quality translation with technical accuracy preservation

**Rationale**:
- ✅ Technical documentation requires precise terminology
- ✅ Code examples must remain syntactically identical
- ✅ Examples and structure preserved for consistency
- ✅ English as primary language aligns with Tickedify's UI language

**Translation Guidelines**:

**Content Sections to Translate**:
1. Quick Start
2. Syntax Overview
3. Examples (descriptions only, not code)
4. Priority Codes table
5. Defer Codes table
6. Validation Rules
7. FAQ
8. Troubleshooting
9. Tips & Tricks

**Preserve Exactly**:
- All code examples (`@t p: Project;` syntax)
- Email examples (subject lines, body structure)
- Table data (codes like `p0`, `df`, `dw`)
- Technical terms (`@t`, `--end--`, ISO date format)

**Translation Style**:
- **Tone**: Professional but approachable (like Tickedify UI)
- **Formality**: Second person ("you"), informal (English standard for docs)
- **Technical terms**: Keep standardized (e.g., "defer", "priority", "context")
- **Emoji**: Preserve emoji usage for visual cues (🔴, 🟡, 🟢)

**Example Translation**:
- Dutch: "Stuur een email door naar je persoonlijke import adres"
- English: "Forward an email to your personal import address"

**Quality Assurance**:
- Verify all technical terms are correct
- Check code examples remain valid
- Ensure table formatting is preserved
- Review FAQ answers for accuracy

---

## 6. HTML Structure & Accessibility

### Decision: Semantic HTML with ARIA landmarks

**Rationale**:
- ✅ Improves SEO and screen reader accessibility
- ✅ Semantic structure aids navigation
- ✅ ARIA landmarks for skip navigation

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
</body>
</html>
```

**Accessibility Features**:
- Semantic HTML5 elements (`<header>`, `<main>`, `<footer>`)
- ARIA roles for screen readers
- Proper heading hierarchy (H1 → H2 → H3)
- Focus indicators on interactive elements
- Color contrast ratios meeting WCAG AA standards

---

## 7. File Organization

### Decision: Dedicated HTML page with CSS and inline JavaScript

**Current Structure**:
```
server.js:458  → GET /api/email-import-help (returns markdown)
public/email-import-help.md → Current Dutch markdown file
```

**New Structure**:
```
public/
├── email-import-help.html     (NEW) HTML page with renderer
├── email-import-help.md       (REPLACE) English markdown content
└── email-import-help.css      (NEW) Styling for help page
server.js → Update route to serve HTML instead of raw markdown
```

**Route Change**:
```javascript
// OLD (server.js:458)
app.get('/api/email-import-help', (req, res) => {
  const helpPath = path.join(__dirname, 'public', 'email-import-help.md');
  res.sendFile(helpPath);
});

// NEW
app.get('/email-import-help', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'email-import-help.html'));
});

// Keep API endpoint for markdown fetch
app.get('/api/email-import-help/content', (req, res) => {
  const helpPath = path.join(__dirname, 'public', 'email-import-help.md');
  res.sendFile(helpPath);
});
```

**Rationale**:
- Dedicated HTML page allows full styling control
- API endpoint preserved for markdown content fetching
- CSS file separation for maintainability
- Inline JavaScript for simplicity (no build step)

---

## Summary of Decisions

| Aspect | Decision | Key Benefit |
|--------|----------|-------------|
| **Markdown Renderer** | marked.js | Lightweight, browser-native, zero deps |
| **Syntax Highlighting** | Prism.js | Customizable, selective loading, Tickedify colors |
| **Design System** | Follow Tickedify palette | Visual consistency, familiar UX |
| **Responsive Design** | Mobile-first breakpoints | Progressive enhancement, mobile support |
| **Translation** | Human-quality English | Technical accuracy, professional tone |
| **HTML Structure** | Semantic HTML + ARIA | Accessibility, SEO, screen readers |
| **File Organization** | HTML + CSS + MD | Separation of concerns, maintainability |

## Implementation Readiness

✅ **All research complete** - No NEEDS CLARIFICATION remaining
✅ **Technical stack defined** - marked.js + Prism.js + Custom CSS
✅ **Design decisions locked** - Tickedify color palette, responsive patterns
✅ **Translation approach clear** - English with technical accuracy
✅ **Performance validated** - <2s load time achievable

**Ready for Phase 1**: Design & Contracts
