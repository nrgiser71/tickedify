# UI Contract: Select All Checkbox

**Feature**: 069-op-het-acties
**Date**: 2025-11-25

## Component: Select All Checkbox

### Element Specification

| Property | Value |
|----------|-------|
| Element ID | `bulk-select-all` |
| Element Type | `<input type="checkbox">` |
| Container | `.bulk-controls-container` |
| Initial State | `display: none` |

### Visual States

#### 1. Hidden State (Bulk Mode Off)
```css
#bulk-select-all {
    display: none;
}
```

#### 2. Unchecked State (No Selection)
```css
#bulk-select-all {
    display: inline-block;
}
```
- `checkbox.checked = false`
- `checkbox.indeterminate = false`

#### 3. Checked State (All Selected)
```css
#bulk-select-all:checked {
    /* Browser default checked styling */
}
```
- `checkbox.checked = true`
- `checkbox.indeterminate = false`

#### 4. Indeterminate State (Partial Selection)
```css
#bulk-select-all:indeterminate {
    /* Browser default indeterminate styling */
}
```
- `checkbox.checked = false`
- `checkbox.indeterminate = true`

#### 5. Disabled State (No Tasks)
```css
#bulk-select-all:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```
- `checkbox.disabled = true`

### Positioning Requirements

```
┌─────────────────────────────────────────────────────────┐
│  Header Bar                                              │
│  ┌──────────┐ ┌─────────────┐                           │
│  │ ☐ Select │ │ Bulk Edit   │                           │
│  │   All    │ │             │                           │
│  └──────────┘ └─────────────┘                           │
└─────────────────────────────────────────────────────────┘
│
│  Tasks List
│  ┌──────────────────────────────────────────────────────┐
│  │ ○ Task 1 description...                              │
│  │ ● Task 2 description... (selected)                   │
│  │ ○ Task 3 description...                              │
│  └──────────────────────────────────────────────────────┘
```

The Select All checkbox MUST:
- Be left-aligned before the Bulk Edit button
- Be vertically centered with the button
- Be visible only when bulk mode is active

### Interaction Contract

| User Action | Expected Behavior |
|-------------|-------------------|
| Click checkbox (unchecked) | Select all visible tasks |
| Click checkbox (checked) | Deselect all tasks |
| Click checkbox (indeterminate) | Select all visible tasks |
| Click individual task | Update checkbox state accordingly |
| Toggle filter | Update checkbox state based on new visible tasks |
| Exit bulk mode | Hide checkbox |

### Accessibility Requirements

| Attribute | Value |
|-----------|-------|
| `aria-label` | "Select all tasks" |
| `title` | "Select/deselect all visible tasks" |
| Tab order | Focusable via Tab key |
| Keyboard | Space/Enter to toggle |

### CSS Styling Contract

```css
#bulk-select-all {
    /* Size: match visual weight of selection circles */
    width: 18px;
    height: 18px;

    /* Positioning */
    margin-right: 12px;
    vertical-align: middle;

    /* Cursor */
    cursor: pointer;

    /* Accent color to match theme */
    accent-color: #007aff;
}

#bulk-select-all:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

### State Update Events

The checkbox state MUST be updated when:
1. `toggleBulkModus()` is called (show/hide)
2. `toggleTaakSelectie()` is called (update checked/indeterminate)
3. `selecteerAlleTaken()` is called (set checked)
4. `deselecteerAlleTaken()` is called (set unchecked)
5. Filter is applied/removed (recalculate based on visible tasks)
6. `renderActiesLijst()` completes (sync with visible tasks)
