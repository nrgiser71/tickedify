# Quickstart: Email Import Help - English Translation & Visual Styling

**Feature**: 054-er-is-een
**Date**: 2025-01-04
**Environment**: dev.tickedify.com (staging)

## Prerequisites

- ✅ Staging branch deployed to dev.tickedify.com
- ✅ Browser with JavaScript enabled (Chrome, Firefox, Safari, Edge)
- ✅ Internet connection for CDN resources (marked.js, Prism.js)

## Test Scenarios

### Scenario 1: Access Help Page (HTML Rendering)

**Objective**: Verify that the help page loads as styled HTML with English content

**Steps**:
1. Open browser and navigate to: `https://dev.tickedify.com/email-import-help`
2. Wait for page to load (should be <2 seconds)
3. Observe the rendered content

**Expected Results**:
- ✅ Page loads successfully (HTTP 200)
- ✅ Title: "Email Import Help - Tickedify"
- ✅ Content is in English (not Dutch)
- ✅ Headings are styled with Tickedify colors (H1 indigo-600, H2/H3 gray-900)
- ✅ Code blocks have gray background (#F3F4F6) with syntax highlighting
- ✅ Tables have borders and alternating row colors (white/gray-50)
- ✅ Responsive layout adapts to browser width
- ✅ No console errors in browser DevTools

**Validation Commands**:
```bash
# Check HTTP status
curl -s -L -k -o /dev/null -w "%{http_code}" https://dev.tickedify.com/email-import-help
# Expected: 200

# Check content-type
curl -s -L -k -I https://dev.tickedify.com/email-import-help | grep -i content-type
# Expected: Content-Type: text/html
```

---

### Scenario 2: Verify English Translation

**Objective**: Confirm all Dutch content is replaced with accurate English translation

**Steps**:
1. Navigate to: `https://dev.tickedify.com/email-import-help`
2. Scroll through all sections:
   - Quick Start
   - Syntax Overview
   - Examples (10+)
   - Priority Codes table
   - Defer Codes table
   - Validation Rules
   - FAQ (8 questions)
   - Troubleshooting
   - Tips & Tricks
3. Verify language is English throughout
4. Check technical terms are accurate (defer, priority, context, project)

**Expected Results**:
- ✅ No Dutch text visible (e.g., "Stuur een email" → "Forward an email")
- ✅ All section headings in English
- ✅ Code examples unchanged (`@t p: Project;` syntax preserved)
- ✅ Table data preserved (p0-p9, df/dw/dm codes)
- ✅ FAQ answers clear and actionable in English
- ✅ Emoji preserved (🔴, 🟡, 🟢 for priority codes)

**Validation Check**:
```bash
# Fetch markdown content
curl -s -L -k https://dev.tickedify.com/api/email-import-help/content > /tmp/help.md

# Check for Dutch keywords (should be 0 results)
grep -i "stuur\|email\|taak\|beschrijving" /tmp/help.md | wc -l
# Expected: 0 (no Dutch keywords)

# Check for English keywords (should be many results)
grep -i "forward\|email\|task\|description" /tmp/help.md | wc -l
# Expected: >10 (English keywords present)
```

---

### Scenario 3: Validate Syntax Highlighting

**Objective**: Verify code blocks have syntax highlighting with Tickedify colors

**Steps**:
1. Navigate to: `https://dev.tickedify.com/email-import-help`
2. Scroll to "Examples" section
3. Inspect code blocks (10+ examples with `@t` syntax)
4. Open browser DevTools → Elements tab
5. Inspect a code block element

**Expected Results**:
- ✅ Code blocks have `<pre><code>` structure
- ✅ Background color: #F3F4F6 (gray-100)
- ✅ Border: 1px solid #E5E7EB (gray-200)
- ✅ Padding: 1rem (16px)
- ✅ Border radius: 0.5rem (8px)
- ✅ Syntax highlighting applied (Prism.js classes: `.token`, `.keyword`, `.string`)
- ✅ Monospace font (Courier New, Monaco, Consolas)
- ✅ Code text readable (contrast ratio ≥4.5:1)

**Validation Check**:
```javascript
// Run in browser console on /email-import-help page
const codeBlocks = document.querySelectorAll('pre code');
console.log(`Found ${codeBlocks.length} code blocks`); // Expected: ≥10

const firstBlock = codeBlocks[0];
const styles = window.getComputedStyle(firstBlock.parentElement);
console.log('Background:', styles.backgroundColor); // Expected: rgb(243, 244, 246)
console.log('Border:', styles.border); // Expected: 1px solid rgb(229, 231, 235)
console.log('Padding:', styles.padding); // Expected: 16px
```

---

### Scenario 4: Validate Table Styling

**Objective**: Verify tables have styled headers and alternating row colors

**Steps**:
1. Navigate to: `https://dev.tickedify.com/email-import-help`
2. Scroll to "Priority Codes" table
3. Inspect table structure in DevTools

**Expected Results**:
- ✅ Table has border: 1px solid #E5E7EB (gray-200)
- ✅ Header row: gray-100 background (#F9FAFB), bold text
- ✅ Data rows: alternating white/gray-50 backgrounds
- ✅ Cell padding: 0.75rem (12px)
- ✅ Text alignment: left for text, center for icons/codes
- ✅ Responsive: horizontal scroll on mobile (<768px)

**Tables to Verify**:
1. Priority Codes (p0-p9 → High/Medium/Low)
2. Defer Codes (df/dw/dm/d3m/d6m/dy → Follow-up/Weekly/Monthly/etc.)
3. Supported File Types (if present)

**Validation Check**:
```javascript
// Run in browser console
const tables = document.querySelectorAll('table');
console.log(`Found ${tables.length} tables`); // Expected: ≥3

const firstTable = tables[0];
const headerCells = firstTable.querySelectorAll('thead th');
const dataRows = firstTable.querySelectorAll('tbody tr');
console.log(`Header cells: ${headerCells.length}`); // Expected: ≥3
console.log(`Data rows: ${dataRows.length}`); // Expected: ≥5

// Check alternating row colors
const rowColors = Array.from(dataRows).map((row, i) => {
  const bg = window.getComputedStyle(row).backgroundColor;
  return { row: i, bg };
});
console.table(rowColors); // Expected: alternating rgb(255,255,255) and rgb(249,250,251)
```

---

### Scenario 5: Test Responsive Design

**Objective**: Verify layout adapts correctly to mobile, tablet, and desktop

**Steps**:
1. Navigate to: `https://dev.tickedify.com/email-import-help`
2. Open browser DevTools → Device Toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Test breakpoints:
   - **Mobile**: 375px width (iPhone SE)
   - **Tablet**: 768px width (iPad)
   - **Desktop**: 1440px width

**Expected Results**:

**Mobile (<768px)**:
- ✅ Full width with 1rem (16px) padding
- ✅ H1: 28px, H2: 24px, H3: 20px
- ✅ Code blocks: horizontal scroll if needed, 14px font
- ✅ Tables: horizontal scroll container
- ✅ No horizontal page scroll (except within scrollable elements)

**Tablet (768-1023px)**:
- ✅ 90% width, centered
- ✅ H1: 32px, H2: 26px, H3: 22px
- ✅ Code blocks: 15px font, natural width
- ✅ Tables: full width with padding

**Desktop (≥1024px)**:
- ✅ 1200px max-width, centered
- ✅ H1: 36px, H2: 30px, H3: 24px
- ✅ Code blocks: 16px font
- ✅ Tables: natural column sizing
- ✅ Proper white space (2rem padding)

**Validation Check**:
```javascript
// Run in browser console at different viewport widths
const container = document.querySelector('main');
const styles = window.getComputedStyle(container);
console.log('Container width:', container.offsetWidth);
console.log('Max-width:', styles.maxWidth);
console.log('Padding:', styles.padding);

// Check heading sizes
const h1 = document.querySelector('h1');
console.log('H1 font-size:', window.getComputedStyle(h1).fontSize);
```

---

### Scenario 6: Performance Testing

**Objective**: Verify page loads in <2 seconds and parsing is fast

**Steps**:
1. Open browser DevTools → Network tab
2. Clear cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)
3. Navigate to: `https://dev.tickedify.com/email-import-help`
4. Wait for full page load
5. Check Network tab timings

**Expected Results**:
- ✅ **Total load time**: <2 seconds (first load)
- ✅ **Cached load time**: <500ms (subsequent loads)
- ✅ **HTML fetch**: <100ms
- ✅ **Markdown fetch** (`/api/email-import-help/content`): <100ms
- ✅ **marked.js CDN**: <200ms (first load), <50ms (cached)
- ✅ **Prism.js CDN**: <200ms (first load), <50ms (cached)
- ✅ **Markdown parsing**: <50ms (visible in console if logged)
- ✅ **Syntax highlighting**: <20ms

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

---

### Scenario 7: Backwards Compatibility

**Objective**: Verify old `/api/email-import-help` route redirects correctly

**Steps**:
1. Navigate to old route: `https://dev.tickedify.com/api/email-import-help`
2. Observe browser behavior

**Expected Results**:
- ✅ HTTP 301 Permanent Redirect to `/email-import-help`
- ✅ Browser automatically follows redirect
- ✅ Final URL in address bar: `https://dev.tickedify.com/email-import-help`
- ✅ Styled help page displays correctly

**Validation Commands**:
```bash
# Check redirect status
curl -s -L -k -I https://dev.tickedify.com/api/email-import-help | grep -E "HTTP|Location"
# Expected:
# HTTP/2 301
# Location: /email-import-help

# Verify final destination
curl -s -L -k -o /dev/null -w "Final URL: %{url_effective}\n" https://dev.tickedify.com/api/email-import-help
# Expected: https://dev.tickedify.com/email-import-help
```

---

### Scenario 8: Accessibility Testing

**Objective**: Verify semantic HTML and ARIA landmarks for screen readers

**Steps**:
1. Navigate to: `https://dev.tickedify.com/email-import-help`
2. Open browser DevTools → Elements tab
3. Inspect HTML structure
4. Run accessibility audit (Lighthouse in Chrome DevTools)

**Expected Results**:
- ✅ Semantic HTML elements: `<header>`, `<main>`, `<footer>`
- ✅ ARIA roles: `role="banner"`, `role="main"`, `role="contentinfo"`
- ✅ Proper heading hierarchy: H1 → H2 → H3 (no skipped levels)
- ✅ `lang="en"` attribute on `<html>` tag
- ✅ Alt text on images (if any)
- ✅ Focus indicators on interactive elements
- ✅ Color contrast ratio ≥4.5:1 (WCAG AA)
- ✅ Lighthouse accessibility score: ≥90

**Validation Commands**:
```bash
# Check HTML lang attribute
curl -s -L -k https://dev.tickedify.com/email-import-help | grep -o 'lang="[^"]*"'
# Expected: lang="en"

# Check semantic elements
curl -s -L -k https://dev.tickedify.com/email-import-help | grep -E "<header|<main|<footer" | wc -l
# Expected: ≥3
```

---

## Success Criteria

All scenarios must pass for feature to be considered complete:

- [x] Scenario 1: HTML page loads with styled content
- [x] Scenario 2: All content translated to English
- [x] Scenario 3: Code blocks have syntax highlighting
- [x] Scenario 4: Tables styled with borders/alternating rows
- [x] Scenario 5: Responsive design works on mobile/tablet/desktop
- [x] Scenario 6: Performance meets <2s load time
- [x] Scenario 7: Backwards compatibility redirect works
- [x] Scenario 8: Accessibility standards met

## Rollback Plan

If any scenario fails:

1. **Immediate**: Revert staging branch to previous commit
   ```bash
   git checkout staging
   git revert HEAD
   git push origin staging
   ```

2. **Investigate**: Check browser console for errors, inspect network requests

3. **Fix**: Address specific failure (translation error, CSS bug, performance issue)

4. **Retest**: Run quickstart scenarios again before re-deploying

## Notes

- This feature requires NO database changes or migrations
- All changes are frontend/content only (low risk)
- CDN dependencies (marked.js, Prism.js) are stable and widely used
- Staging testing is sufficient before production consideration
- Manual testing is primary validation (no automated tests for styling)
