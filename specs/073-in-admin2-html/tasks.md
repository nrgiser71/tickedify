# Tasks: User Task Activity Chart

**Input**: Design documents from `/specs/073-in-admin2-html/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Format
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## File Targets
```
server.js                    # Backend API endpoint
public/admin2.html           # Frontend HTML structure
public/admin2.js             # Frontend JavaScript logic
```

---

## Phase 3.1: Setup
- [x] T001 Check if Chart.js is already included in `public/admin2.html`, if not add CDN link in `<head>` section

## Phase 3.2: Backend Implementation
- [x] T002 Add `getTaskActivity` method to `API.users` object in `public/admin2.js` (lines ~51-69)
  ```javascript
  getTaskActivity: (id, startDate, endDate) => API.request(
      `/users/${id}/task-activity?start_date=${startDate}&end_date=${endDate}`
  ),
  ```
- [x] T003 Add `GET /api/admin2/users/:id/task-activity` endpoint in `server.js` after line ~13716 with:
  - Admin authentication (`requireAdmin` middleware)
  - Date validation (YYYY-MM-DD format, valid range, max 366 days)
  - User existence check (return 404 if not found)
  - Database query: aggregate `taken.created_at` by day for user within date range
  - Fill missing dates with count 0 for continuous series
  - Calculate statistics: total, average, peak_date, peak_count, trend
  - Return JSON per contract in `contracts/api-contracts.md`

## Phase 3.3: Frontend HTML Structure
*Note: T004-T006 modify the same file (admin2.html), execute sequentially*

- [x] T004 Add Task Activity Chart section HTML in `public/admin2.html` after line ~1375 (after Task Summary stats-grid), include:
  - Section header "Task Activity"
  - Period selector dropdown with options: This Week, This Month, This Quarter, This Year, Custom
  - Custom date range container (hidden by default) with two date inputs
  - Canvas element for Chart.js (id="task-activity-chart")
- [x] T005 Add Activity Statistics grid HTML in `public/admin2.html` directly after the chart canvas:
  - Stats grid with 4 stat-cards: Total Tasks, Average/Day, Peak Day, Trend
  - IDs: `activity-stat-total`, `activity-stat-average`, `activity-stat-peak`, `activity-stat-trend`
- [x] T006 Add CSS styles for Task Activity section in `public/admin2.html` `<style>` block:
  - Chart container sizing
  - Period selector styling
  - Custom date picker container styling
  - Trend indicator colors (up=green, down=red, stable=gray)

## Phase 3.4: Frontend JavaScript Logic
*Note: T007-T012 modify the same file (admin2.js), execute sequentially*

- [x] T007 Add Chart.js instance variable and helper functions at appropriate location in `public/admin2.js`:
  - `let taskActivityChart = null;` (module-level variable)
  - `calculatePeriodDates(periodType)` function returning {startDate, endDate} for week/month/quarter/year
- [x] T008 Add `loadTaskActivity(userId, startDate, endDate)` async function in `public/admin2.js`:
  - Call `API.users.getTaskActivity(userId, startDate, endDate)`
  - Handle loading state (show spinner or message)
  - Handle error state (display error message)
  - Call `renderTaskActivityChart(data)` on success
  - Call `renderActivityStatistics(data.statistics)` on success
- [x] T009 Add `renderTaskActivityChart(data)` function in `public/admin2.js`:
  - Destroy existing chart if exists (`if (taskActivityChart) taskActivityChart.destroy()`)
  - Create new Chart.js bar chart with:
    - Labels: data.activity.map(d => d.date)
    - Data: data.activity.map(d => d.count)
    - Styling consistent with admin2 theme (use existing color variables)
    - Responsive: true
    - Proper axis labels
- [x] T010 Add `renderActivityStatistics(statistics)` function in `public/admin2.js`:
  - Update `activity-stat-total` with statistics.total
  - Update `activity-stat-average` with statistics.average (format to 1 decimal)
  - Update `activity-stat-peak` with statistics.peak_date and statistics.peak_count
  - Update `activity-stat-trend` with trend indicator (arrow + color)
- [x] T011 Add period selector event handler in `public/admin2.js`:
  - Listen for change on period dropdown
  - If "custom": show date picker container
  - Else: hide date picker, calculate dates via `calculatePeriodDates()`, call `loadTaskActivity()`
- [x] T012 Add custom date picker event handlers in `public/admin2.js`:
  - Listen for change on both date inputs
  - Validate: end >= start
  - If valid: call `loadTaskActivity()` with custom dates
  - If invalid: show error message

## Phase 3.5: Integration
- [x] T013 Update `Screens.loadUserDetails()` in `public/admin2.js` (around line 1254) to call `loadTaskActivity()` with default period ("week") after loading user data successfully

## Phase 3.6: Testing & Validation
- [ ] T014 [P] API testing: Test endpoint with curl commands per `quickstart.md`:
  - Basic request (valid dates)
  - Invalid date format (expect 400)
  - Date range too large (expect 400)
  - Non-existent user (expect 404)
- [ ] T015 [P] UI testing: Verify all acceptance scenarios per `quickstart.md`:
  - Default period load
  - Period selection (Month, Quarter, Year)
  - Custom date range
  - Empty data state
  - Error state handling

## Phase 3.7: Polish & Deploy
- [x] T016 Verify chart styling matches admin2 theme (colors, fonts, spacing)
- [x] T017 Version bump in `package.json` and changelog update
- [ ] T018 Commit, merge to staging, verify deployment on dev.tickedify.com

---

## Dependencies
```
T001 → T004 (Chart.js must be loaded before canvas)
T003 → T008 (API endpoint must exist before frontend can call it)
T004 → T005 → T006 (HTML structure before styling)
T007 → T008 → T009 → T010 (helper functions before main logic)
T011, T012 → T013 (event handlers before integration)
T013 → T014, T015 (implementation before testing)
T014, T015 → T016 → T017 → T018 (testing before polish and deploy)
```

## Parallel Execution Groups

### Group A: Backend (sequential - same file server.js)
```
T003 (API endpoint)
```

### Group B: Frontend HTML (sequential - same file admin2.html)
```
T001 → T004 → T005 → T006
```

### Group C: Frontend JS (sequential - same file admin2.js)
```
T002 → T007 → T008 → T009 → T010 → T011 → T012 → T013
```

### Group D: Testing [P] (parallel - independent activities)
```bash
# Can run T014 and T015 in parallel after T013 is complete
Task(subagent_type: "tickedify-testing", prompt: "API testing per quickstart.md")
Task(subagent_type: "tickedify-testing", prompt: "UI testing per quickstart.md")
```

### Recommended Execution Order
1. **First**: T001 (Chart.js setup)
2. **Then parallel**:
   - T002 + T003 (can run in parallel - different files)
3. **Then sequential**: T004 → T005 → T006 (admin2.html)
4. **Then sequential**: T007 → T008 → T009 → T010 → T011 → T012 → T013 (admin2.js)
5. **Then parallel**: T014 + T015 (testing)
6. **Finally**: T016 → T017 → T018 (polish & deploy)

---

## Validation Checklist
- [x] API contract has corresponding endpoint task (T003)
- [x] All entities from data-model accounted for (aggregation via API, no new models)
- [x] All acceptance scenarios have test tasks (T014, T015)
- [x] Parallel tasks truly independent (T014/T015 are separate testing activities)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task in same group

---

## Notes
- All UI text must be in English per CLAUDE.md language policy
- Use existing admin2 design patterns (stats-grid, btn classes, color variables)
- Trend calculation: compare first half vs second half of period, 10% threshold
- Empty state: show chart with all zeros, statistics show "N/A" for peak
