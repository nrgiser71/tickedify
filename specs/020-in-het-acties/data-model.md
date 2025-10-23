# Data Model: Drag & Drop Popup Week Display Bug

## Overview

This is a **frontend-only bugfix** with no database or API changes required.

## Affected Components

### UI Components

**Planning Popup - Week Display**
- Component: Floating drag & drop panel in "Acties" screen
- DOM Elements:
  - `actiesHuidigeWeek` - Container for current week days
  - `actiesVolgendeWeek` - Container for next week days
  - `actiesDerdeWeek` - Container for third week days (Ctrl-activated)
- Location: `public/app.js:11228` - `generateActiesWeekDays()`

### Data Flow

```
User drags task
    ↓
updateActiesFloatingPanelDates() called (line 11223)
    ↓
generateActiesWeekDays() called (line 11228)
    ↓
Calculate huidigeWeekStart (🐛 BUG HERE - line 11245)
    ↓
Calculate volgendeWeekStart (line 11248)
    ↓
Calculate derdeWeekStart (line 11252)
    ↓
Generate DOM elements for each week
    ↓
Display popup with week options
```

### State Management

**Input State**:
- `vandaag`: Current Date object
- `vandaag.getDay()`: Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)

**Computed State** (BEFORE fix - INCORRECT):
```javascript
// BUG: On Sunday (getDay() = 0), this calculates NEXT Monday
huidigeWeekStart = vandaag.getDate() - vandaag.getDay() + 1
```

**Computed State** (AFTER fix - CORRECT):
```javascript
// FIX: Handle Sunday (0) specially to get current week Monday
const dagVanWeek = vandaag.getDay();
const dagenNaarMaandag = dagVanWeek === 0 ? -6 : -(dagVanWeek - 1);
huidigeWeekStart = vandaag.getDate() + dagenNaarMaandag
```

**Output State**:
- Array of 7 day zones per week
- Each day zone contains:
  - `weekdagAfkorting`: "zo", "ma", "di", "wo", "do", "vr", "za"
  - `dagNummer`: Day of month (1-31)
  - `isoString`: ISO date format "YYYY-MM-DD"
  - `isVandaag`: Boolean flag for current day styling

## Entities

### Day Zone (DOM Element)

**Purpose**: Interactive drop target for planning tasks

**Attributes**:
- `dataset.target`: ISO date string (YYYY-MM-DD)
- `dataset.type`: "planning"
- `className`: "week-day-zone drop-zone-item" + optional "current-day"

**Visual Structure**:
```html
<div class="week-day-zone drop-zone-item [current-day]"
     data-target="2025-10-19"
     data-type="planning">
    <div class="day-name">zo</div>
    <div class="day-date">19</div>
</div>
```

### Week Calculation Logic

**Week Definition**: Monday (start) to Sunday (end)

**Calculation Rules**:
- Current week = Week containing today
- Next week = 7 days after current week start
- Third week = 14 days after current week start (optional, Ctrl-activated)

**Edge Cases**:
- Sunday must be treated as LAST day of current week (not first day of next week)
- Month boundaries: Days can span two months (e.g., Jan 27 - Feb 2)
- Year boundaries: Days can span two years (e.g., Dec 29 - Jan 4)

## Validation Rules

### Date Calculation Validation

**Rule 1**: Current week MUST always include today
- Test: `huidigeWeekStart <= vandaag <= huidigeWeekStart + 6 days`

**Rule 2**: Next week MUST start exactly 7 days after current week
- Test: `volgendeWeekStart = huidigeWeekStart + 7 days`

**Rule 3**: No date gaps between weeks
- Test: `Last day of week N = First day of week N+1 - 1 day`

**Rule 4**: Sunday calculation
- Test: When `vandaag.getDay() === 0`, verify `huidigeWeekStart` is 6 days before today

**Rule 5**: Monday calculation
- Test: When `vandaag.getDay() === 1`, verify `huidigeWeekStart` equals today

## No Schema Changes

This bugfix does not require:
- ❌ Database migrations
- ❌ API endpoint changes
- ❌ Backend logic modifications
- ❌ Data structure changes
- ❌ Storage modifications

All changes are contained within the frontend date calculation logic.
