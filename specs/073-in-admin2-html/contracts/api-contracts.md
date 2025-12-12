# API Contracts: User Task Activity Chart

## GET /api/admin2/users/:id/task-activity

Retrieves task creation activity data for a specific user within a date range.

### Authentication
- Required: Admin session (`requireAdmin` middleware)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User ID (e.g., "user_1750513625687_5458i79dj") |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| start_date | string | Yes | - | Start date (YYYY-MM-DD format) |
| end_date | string | Yes | - | End date (YYYY-MM-DD format, inclusive) |

### Request Example
```
GET /api/admin2/users/user_1750513625687_5458i79dj/task-activity?start_date=2025-12-01&end_date=2025-12-12
```

### Response: 200 OK
```json
{
  "activity": [
    { "date": "2025-12-01", "count": 5 },
    { "date": "2025-12-02", "count": 3 },
    { "date": "2025-12-03", "count": 0 },
    { "date": "2025-12-04", "count": 7 },
    { "date": "2025-12-05", "count": 12 },
    { "date": "2025-12-06", "count": 2 },
    { "date": "2025-12-07", "count": 4 },
    { "date": "2025-12-08", "count": 6 },
    { "date": "2025-12-09", "count": 1 },
    { "date": "2025-12-10", "count": 3 },
    { "date": "2025-12-11", "count": 0 },
    { "date": "2025-12-12", "count": 2 }
  ],
  "statistics": {
    "total": 45,
    "average": 3.75,
    "peak_date": "2025-12-05",
    "peak_count": 12,
    "trend": "down"
  },
  "period": {
    "start_date": "2025-12-01",
    "end_date": "2025-12-12",
    "days": 12
  }
}
```

### Response Fields

#### activity[] (array)
Array of daily task counts, one entry per day in the date range.
- **date**: String in YYYY-MM-DD format
- **count**: Integer >= 0, number of tasks created on that day

Note: Days with no tasks have count = 0, ensuring continuous date series.

#### statistics (object)
- **total**: Integer, sum of all counts in period
- **average**: Float (2 decimals), total / days
- **peak_date**: String (YYYY-MM-DD), date with highest count
- **peak_count**: Integer, count on peak day
- **trend**: String enum:
  - "up" - Second half average > first half by 10%+
  - "down" - Second half average < first half by 10%+
  - "stable" - Change less than 10%

#### period (object)
- **start_date**: String (YYYY-MM-DD), echoes request
- **end_date**: String (YYYY-MM-DD), echoes request
- **days**: Integer, number of days in range (inclusive)

### Error Responses

#### 400 Bad Request - Invalid dates
```json
{
  "error": "Invalid date format",
  "message": "start_date and end_date must be in YYYY-MM-DD format"
}
```

#### 400 Bad Request - Invalid range
```json
{
  "error": "Invalid date range",
  "message": "end_date must be on or after start_date"
}
```

#### 400 Bad Request - Range too large
```json
{
  "error": "Date range too large",
  "message": "Maximum date range is 366 days"
}
```

#### 401 Unauthorized
```json
{
  "error": "Admin authentication required"
}
```

#### 404 Not Found
```json
{
  "error": "User not found",
  "message": "No user with ID user_invalid_123"
}
```

#### 503 Service Unavailable
```json
{
  "error": "Database not available"
}
```

---

## Frontend JavaScript API Client Extension

Add to `API.users` object in `admin2.js`:

```javascript
// In API.users object
getTaskActivity: (id, startDate, endDate) => API.request(
    `/users/${id}/task-activity?start_date=${startDate}&end_date=${endDate}`
),
```

### Usage Example
```javascript
const activity = await API.users.getTaskActivity(
    'user_1750513625687_5458i79dj',
    '2025-12-01',
    '2025-12-12'
);
console.log(activity.statistics.total); // 45
```
