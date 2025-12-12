# Data Model: User Task Activity Chart

## Entities

### Task Activity Data (View/Aggregation)
No new database tables required. This feature uses existing data.

**Source Table**: `taken`
- `id` - Primary key
- `user_id` - Foreign key to users
- `created_at` - Timestamp when task was created (KEY FIELD for this feature)
- `afgewerkt` - Timestamp when task was completed (not used for this feature)

**Aggregation Query Pattern**:
```sql
SELECT
    DATE(created_at) as date,
    COUNT(*) as count
FROM taken
WHERE user_id = $1
  AND created_at >= $2
  AND created_at < $3
GROUP BY DATE(created_at)
ORDER BY date ASC
```

### Period Selection (Client-side State)
No database storage - handled entirely in frontend JavaScript.

**State Fields**:
- `periodType` - Enum: "week", "month", "quarter", "year", "custom"
- `startDate` - Date object (calculated from periodType or custom selection)
- `endDate` - Date object (calculated from periodType or custom selection)

### Statistics Summary (Computed from API Response)
No database storage - computed by backend and returned in API response.

**Fields**:
- `total` - Integer: sum of all daily counts
- `average` - Float: total / number of days
- `peak_date` - String: date with highest count (YYYY-MM-DD)
- `peak_count` - Integer: count on peak day
- `trend` - Enum: "up", "down", "stable"

---

## Relationships

```
users (1) ──────────────── (N) taken
              │
              │ (aggregated via)
              ▼
        task_activity_data
              │
              │ (calculated from)
              ▼
        statistics_summary
```

---

## Validation Rules

### Date Range Validation
- `startDate` must be a valid date
- `endDate` must be a valid date
- `endDate` must be >= `startDate`
- Date range should not exceed 366 days (1 year + leap day)

### Period Type Validation
- Must be one of: "week", "month", "quarter", "year", "custom"
- Default: "week"

---

## State Transitions

### Period Selection Flow
```
[Initial Load]
    → periodType = "week"
    → Calculate startDate = Monday of current week
    → Calculate endDate = Sunday of current week
    → Fetch activity data
    → Render chart

[User Changes Period]
    → Update periodType
    → Recalculate startDate/endDate
    → Fetch activity data
    → Render chart

[User Selects Custom]
    → Show date pickers
    → Wait for both dates selected
    → Validate date range
    → Fetch activity data
    → Render chart
```

---

## Indexes

No new indexes required. The existing `taken` table should already have an index on `user_id`. If performance is slow, consider:

```sql
CREATE INDEX idx_taken_user_created ON taken(user_id, created_at);
```

But this is likely unnecessary given typical data volumes.
