# Research: Temporarily Hide Settings & Tutorial Elements

**Feature**: 063-temporarely-hide-the
**Date**: 2025-06-19

## Overview

This feature requires temporarily hiding three UI elements by commenting out code. No external research needed as the implementation is straightforward HTML/JavaScript commenting.

## Technical Decisions

### Decision 1: HTML Comment Wrapping for Visible Elements

**Decision**: Use HTML comments (`<!-- -->`) to wrap Settings menu item, instruction video link, and onboarding video popup.

**Rationale**:
- Preserves exact code without modification
- Browser ignores commented HTML (elements not rendered)
- Easily reversible by removing comment markers
- Standard practice for temporary code disabling
- No performance impact (browser doesn't parse commented HTML)

**Alternatives Considered**:
1. **CSS `display: none`**: Rejected
   - Requires adding CSS class or inline style
   - Harder to find later (scattered across HTML and CSS)
   - Could conflict with existing styles
   - Less obvious that code is temporarily hidden

2. **JavaScript conditional rendering**: Rejected
   - Adds unnecessary complexity
   - Requires feature flag infrastructure
   - Violates NFR-001 (minimal code modification)
   - Over-engineering for simple temporary hide

**Implementation**:
```html
<!-- TEMPORARILY HIDDEN - Feature 063 - Restore by uncommenting
<div class="lijst-item" data-tool="settings" id="settings-link">
    <div class="lijst-icon"><i class="fas fa-cog"></i></div>
    <span class="lijst-naam">Settings</span>
</div>
END TEMPORARILY HIDDEN - Feature 063 -->
```

---

### Decision 2: JavaScript Multi-Line Comment for Auto-Play Logic

**Decision**: Use JavaScript multi-line comment (`/* */`) to disable auto-play logic in app.js.

**Rationale**:
- Standard JavaScript commenting practice
- Preserves exact code without modification
- Easy to search for restoration ("Feature 063")
- No risk of syntax errors (unlike line-by-line `//' comments)
- Clear visual block in code editor

**Alternatives Considered**:
1. **Line-by-line `//` comments**: Rejected
   - More error-prone (easy to miss a line)
   - Harder to uncomment (must remove `//` from each line)
   - Less visually distinct in code editor

2. **Feature flag (boolean check)**: Rejected
   - Adds code complexity (if statement wrapping)
   - Violates NFR-001 (minimal modification)
   - Requires configuration infrastructure
   - Over-engineering for temporary disable

**Implementation**:
```javascript
// TEMPORARILY DISABLED - Feature 063 - Restore by uncommenting
/*
// Feature 014: Check if user needs to see onboarding video (first login)
try {
    const response = await fetch('/api/user/onboarding-status');
    if (response.ok) {
        const { seen } = await response.json();
        if (!seen) {
            await this.onboardingVideo.showVideo();
        }
    }
} catch (error) {
    console.error('Fout bij controleren onboarding status:', error);
}
*/
// END TEMPORARILY DISABLED - Feature 063
```

---

### Decision 3: Clear Comment Markers with Feature Number

**Decision**: Include "TEMPORARILY HIDDEN - Feature 063" and "END TEMPORARILY HIDDEN - Feature 063" markers in all comment blocks.

**Rationale**:
- Makes code searchable (`grep "Feature 063"` finds all blocks)
- Clear intent (temporary, not permanent deletion)
- Links to feature documentation in specs/063-*
- Restoration instructions embedded in code
- Professional code maintenance practice

**Alternatives Considered**:
1. **No markers (just HTML/JS comments)**: Rejected
   - Hard to find commented blocks later
   - Unclear why code is commented out
   - Risk of permanent deletion by other developers
   - No link to feature documentation

2. **Generic markers ("TODO: restore")**: Rejected
   - No feature tracking
   - Unclear when to restore
   - No link to spec documentation
   - Generic TODOs often ignored

**Marker Format**:
```
<!-- TEMPORARILY HIDDEN - Feature 063 - Restore by uncommenting
[original code here]
END TEMPORARILY HIDDEN - Feature 063 -->
```

---

## Implementation Locations Discovered

### 1. Settings Menu Item
**File**: `/public/index.html`
**Lines**: 142-145
**Content**:
```html
<div class="lijst-item nav-section-gap" data-tool="settings" id="settings-link">
    <div class="lijst-icon"><i class="fas fa-cog"></i></div>
    <span class="lijst-naam">Settings</span>
</div>
```

**Related JavaScript**:
- `/public/app.js` line 7241: Click handler (`case 'settings':`)
- `/public/app.js` line 7996: `showSettings()` function implementation

**Action**: Wrap HTML in comment markers. Leave JavaScript intact (harmless if HTML hidden).

---

### 2. Instruction Video Link
**File**: `/public/index.html`
**Lines**: 148-154
**Content**:
```html
<!-- Instructional Video -->
<div class="lijst-sectie">
    <a href="#" id="openOnboardingVideoLink" class="lijst-item">
        <div class="lijst-icon"><i class="fas fa-video"></i></div>
        <span class="lijst-naam">Instruction Video</span>
    </a>
</div>
```

**Related JavaScript**:
- `/public/app.js` lines 572-578: Event listener for click

**Action**: Wrap entire `<div class="lijst-sectie">` block in comment markers. Leave JavaScript intact (event listener won't bind if element doesn't exist).

---

### 3. Auto-Play Tutorial Video
**File**: `/public/index.html`
**Lines**: 852-869
**Content**: Onboarding video popup modal HTML

**File**: `/public/app.js`
**Lines**: 1159-1172
**Content**: Auto-play logic on first login
```javascript
// Feature 014: Check if user needs to see onboarding video (first login)
try {
    const response = await fetch('/api/user/onboarding-status');
    if (response.ok) {
        const { seen } = await response.json();
        if (!seen) {
            // User has not seen the onboarding video yet - show it
            await this.onboardingVideo.showVideo();
        }
    }
} catch (error) {
    console.error('Fout bij controleren onboarding status:', error);
    // Continue loading app even if onboarding check fails
}
```

**Related JavaScript**:
- `/public/app.js` lines 537-656: `OnboardingVideoManager` class

**Action**:
- Wrap popup HTML in comment markers (lines 852-869)
- Comment out auto-play logic ONLY (lines 1159-1172)
- Leave OnboardingVideoManager class intact (harmless if not called)
- Leave event listeners intact (won't bind if HTML element missing)

---

## Best Practices Applied

### 1. Minimal Code Modification (NFR-001) ✅
- Only adding comment markers
- Zero code refactoring
- No logic changes
- No file moves or renames

### 2. Easy Restoration (NFR-002) ✅
- Search for "Feature 063" to find all blocks
- Remove comment markers to restore
- No code rewriting needed
- Restoration instructions embedded in comments

### 3. No Impact on Other Code (NFR-003) ✅
- JavaScript handlers remain (harmless if HTML missing)
- No CSS changes (layout auto-adjusts when elements hidden)
- No API changes (endpoints remain functional)
- Other navigation items unaffected

### 4. No Performance Degradation (NFR-004) ✅
- Commented HTML not parsed by browser
- Commented JavaScript not executed
- No additional HTTP requests
- Identical page load performance

---

## Risks & Mitigations

### Risk 1: Accidental Permanent Deletion
**Likelihood**: Low
**Impact**: Medium (code restoration requires git history search)
**Mitigation**:
- Clear "TEMPORARILY HIDDEN" markers prevent misunderstanding
- Feature 063 spec documents restoration requirement
- Git history preserves original code

### Risk 2: Merge Conflicts During Restoration
**Likelihood**: Low (beta freeze active, no parallel main branch development)
**Impact**: Low (easy to resolve - uncomment blocks)
**Mitigation**:
- Feature developed on feature branch
- Staged on staging branch only (no main merge during beta freeze)
- Clear comment block boundaries

### Risk 3: User Confusion (Missing Features)
**Likelihood**: Medium (users may look for Settings/video)
**Impact**: Low (features under development, temporary absence expected)
**Mitigation**:
- Beta users aware of ongoing development
- Features not critical for core task management workflow
- Easy to restore if user feedback demands it

---

## Conclusion

No external research required. Implementation approach is straightforward HTML/JS commenting with clear restoration markers. All technical decisions favor simplicity, reversibility, and minimal code impact per constitutional principles.

**Ready for Phase 1**: Design & Contracts (data-model.md, quickstart.md generation)
