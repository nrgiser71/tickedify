# Quickstart: User Task Activity Chart

## Validation Steps

After implementation, verify each acceptance scenario:

### 1. Default Period Load
1. Navigate to admin2.html > Users
2. Search for a user and click to view details
3. **Verify**: Bar chart appears showing "This Week" data
4. **Verify**: Period selector shows "This Week" selected
5. **Verify**: Statistics show Total, Average, Peak Day, Trend

### 2. Period Selection - This Month
1. From user detail view, change period selector to "This Month"
2. **Verify**: Chart updates with current month's daily data
3. **Verify**: X-axis labels show dates for current month
4. **Verify**: Statistics update to reflect month's data

### 3. Period Selection - This Quarter
1. Change period selector to "This Quarter"
2. **Verify**: Chart shows ~90 days of data
3. **Verify**: Scroll or zoom works if needed for many data points

### 4. Period Selection - This Year
1. Change period selector to "This Year"
2. **Verify**: Chart shows Jan 1 to today
3. **Verify**: Statistics show full year aggregation

### 5. Custom Date Range
1. Select "Custom" from period dropdown
2. **Verify**: Two date pickers appear (Start Date, End Date)
3. Select start date: 2025-11-01
4. Select end date: 2025-11-30
5. **Verify**: Chart shows November 2025 data only
6. **Verify**: Statistics update for custom range

### 6. Edge Cases

#### Empty Period
1. Select a date range where user has no tasks
2. **Verify**: Chart shows flat line at 0
3. **Verify**: Statistics show Total: 0, Average: 0, Peak: N/A

#### Invalid Date Range
1. Select end date before start date
2. **Verify**: Error message appears OR date pickers prevent invalid selection

---

## API Testing (curl commands)

### Test 1: Basic Request
```bash
# Login as admin first, then:
curl -s -L -k "https://dev.tickedify.com/api/admin2/users/USER_ID/task-activity?start_date=2025-12-01&end_date=2025-12-12" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

Expected: JSON with activity array, statistics object, period object

### Test 2: User with Many Tasks
```bash
curl -s -L -k "https://dev.tickedify.com/api/admin2/users/USER_ID/task-activity?start_date=2025-01-01&end_date=2025-12-12" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

Expected: Full year of data, 346+ entries in activity array

### Test 3: Invalid Date Format
```bash
curl -s -L -k "https://dev.tickedify.com/api/admin2/users/USER_ID/task-activity?start_date=invalid&end_date=2025-12-12" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

Expected: 400 error with "Invalid date format" message

### Test 4: Date Range Too Large
```bash
curl -s -L -k "https://dev.tickedify.com/api/admin2/users/USER_ID/task-activity?start_date=2023-01-01&end_date=2025-12-12" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

Expected: 400 error with "Date range too large" message

### Test 5: Non-existent User
```bash
curl -s -L -k "https://dev.tickedify.com/api/admin2/users/user_nonexistent/task-activity?start_date=2025-12-01&end_date=2025-12-12" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

Expected: 404 error with "User not found" message

---

## Integration Checklist

- [ ] Chart.js CDN loaded in admin2.html
- [ ] API endpoint responds correctly
- [ ] Frontend renders chart in user details panel
- [ ] Period selector works for all options
- [ ] Custom date pickers show/hide correctly
- [ ] Statistics calculate and display correctly
- [ ] Chart styling matches admin2 theme
- [ ] Empty state handled gracefully
- [ ] Error states display user-friendly messages

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time | < 200ms | Network tab in dev tools |
| Chart render time | < 300ms | console.time() around render |
| Full load (API + render) | < 500ms | User perception |

---

## Common Issues

### Chart doesn't appear
- Check browser console for JavaScript errors
- Verify Chart.js is loaded before chart code
- Check that canvas element exists in DOM

### Data seems wrong
- Verify timezone handling (UTC dates)
- Check that `created_at` (not `afgewerkt`) is used in query
- Compare with SQL query directly on database

### Period selector doesn't update chart
- Verify event listener is attached
- Check that loadTaskActivity() is called on change
- Verify API request is made (Network tab)
