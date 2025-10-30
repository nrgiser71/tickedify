# Data Model: Contexten Sortering

**Feature**: 040-in-de-popup
**Date**: 2025-10-30

## Existing Entity: Contexten

**Database Table**: `contexten`

### Schema (No Changes Required)

```sql
CREATE TABLE contexten (
    id SERIAL PRIMARY KEY,
    naam VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Fields

| Field | Type | Constraints | Purpose | Sorting Impact |
|-------|------|-------------|---------|----------------|
| `id` | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique identifier | ❌ Not used for sorting |
| `naam` | VARCHAR(255) | NOT NULL | Context display name | ✅ **Used for alphabetical sorting** |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | Ownership tracking | ✅ Used in WHERE clause |
| `aangemaakt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp | ❌ Previously used, now replaced by naam |

### Relationships

```
users (1) ----< (N) contexten
  ↓
User has many Contexten
Contexten belongs to User
```

**No changes to relationships** - Feature only affects ordering, not data structure.

---

## Query Changes

### Current Query (database.js:584)

```sql
SELECT * FROM contexten
WHERE user_id = $1
ORDER BY aangemaakt DESC;
```

**Behavior**: Returns newest contexts first (reverse chronological)

### New Query (Proposed)

```sql
SELECT * FROM contexten
WHERE user_id = $1
ORDER BY LOWER(naam) ASC;
```

**Behavior**: Returns contexts alphabetically (A-Z, case-insensitive)

**Changes**:
- ✅ `ORDER BY aangemaakt DESC` → `ORDER BY LOWER(naam) ASC`
- ✅ Case-insensitive via `LOWER()` function
- ✅ Ascending order (`ASC`) for alphabetical A→Z
- ❌ No schema changes
- ❌ No index changes required (small dataset)

---

## Data Flow

```
User Request (UI)
       ↓
app.laadContexten()
       ↓
GET /api/lijst/contexten
       ↓
database.getList('contexten', userId)
       ↓
SQL Query: ORDER BY LOWER(naam) ASC
       ↓
PostgreSQL sorts by: "administratie", "hobby", "thuis", "werk"
       ↓
JSON Response: [{id:3, naam:"Administratie"}, {id:4, naam:"Hobby"}, ...]
       ↓
app.contexten = response (alphabetically sorted)
       ↓
vulContextSelect() renders <option> elements
       ↓
User sees alphabetically sorted dropdown
```

---

## Edge Cases - Data Perspective

### Case Sensitivity

**Example Data**:
```sql
-- Database records
id | naam          | user_id
---|---------------|--------
1  | Werk          | 1
2  | administratie | 1
3  | Hobby         | 1
4  | Thuis         | 1
```

**Query Result with `LOWER(naam)`**:
```
1. administratie  (LOWER = "administratie")
2. Hobby          (LOWER = "hobby")
3. Thuis          (LOWER = "thuis")
4. Werk           (LOWER = "werk")
```

✅ **Case-insensitive sorting works correctly**

---

### Accented Characters

**Example Data**:
```sql
id | naam          | user_id
---|---------------|--------
1  | Café          | 1
2  | Context       | 1
3  | École         | 1
4  | Admin         | 1
```

**PostgreSQL Default Collation (UTF-8)**:
```
1. Admin
2. Café          (é treated as e variant)
3. Context
4. École         (É treated as E variant)
```

✅ **Dutch/French accents sorted correctly by PostgreSQL default locale**

---

### Numbers and Special Characters

**Example Data**:
```sql
id | naam              | user_id
---|-------------------|--------
1  | 2024 Projecten    | 1
2  | Admin             | 1
3  | @Urgent           | 1
4  | _Private          | 1
```

**PostgreSQL ASCII Sorting**:
```
1. @Urgent        (ASCII 64)
2. 2024 Projecten (ASCII 48-57 for digits)
3. _Private       (ASCII 95)
4. Admin          (ASCII 97 for 'a')
```

**Expected Sort Order**: Special chars → Numbers → Letters
✅ **Acceptable behavior** (rare edge case, users typically use letters)

---

### Empty or NULL Values

**Database Constraint**: `naam VARCHAR(255) NOT NULL`

✅ **NULL values prevented by schema**
✅ **Empty strings ("") prevented by application validation** (contextSelect required attribute)

**If empty string somehow exists**:
```sql
-- Empty string sorts first
''
'Admin'
'Werk'
```

**Mitigation**: Frontend validation ensures naam is non-empty before submission

---

## Performance Considerations

### Query Performance

**Dataset Size**:
- Typical user: 5-10 contexts
- Power user: 20-30 contexts maximum
- Database scan: O(n) where n < 30

**Sorting Overhead**:
- PostgreSQL `ORDER BY LOWER(naam)`: O(n log n)
- For n=30: ~148 comparisons (negligible)
- No index required - sorting is instant even without optimization

**Network Transfer**:
- JSON payload: ~1-2 KB for 20 contexts
- No pagination needed
- Single roundtrip fetch

✅ **Performance impact: NEGLIGIBLE**

---

## Backward Compatibility

### Database Level
- ✅ No schema changes → 100% backward compatible
- ✅ Query still returns same columns/data types
- ✅ Only ORDER BY clause changed → safe

### Application Level
- ✅ API response format unchanged (JSON array of objects)
- ✅ Frontend expects array → still receives array
- ✅ Client-side fallback sorting (defense in depth)

### Rollback Strategy
```sql
-- If needed, revert to old query:
SELECT * FROM contexten WHERE user_id = $1 ORDER BY aangemaakt DESC;
```

**Rollback Risk**: 🟢 LOW - Single line change, easily reversible

---

## Testing Data Setup

### Test Scenarios - Required Data

#### Scenario 1: Basic Alphabetical
```sql
INSERT INTO contexten (naam, user_id) VALUES
    ('Werk', 1),
    ('Thuis', 1),
    ('Administratie', 1),
    ('Hobby', 1);
```

**Expected Order**: Administratie, Hobby, Thuis, Werk

#### Scenario 2: Case Variations
```sql
INSERT INTO contexten (naam, user_id) VALUES
    ('PROJECTEN', 1),
    ('admin', 1),
    ('Context', 1);
```

**Expected Order**: admin, Context, PROJECTEN

#### Scenario 3: Accented Characters
```sql
INSERT INTO contexten (naam, user_id) VALUES
    ('École', 1),
    ('Context', 1),
    ('Café', 1),
    ('Admin', 1);
```

**Expected Order**: Admin, Café, Context, École

#### Scenario 4: Numbers & Special
```sql
INSERT INTO contexten (naam, user_id) VALUES
    ('2024 Budget', 1),
    ('Admin', 1),
    ('@Urgent', 1);
```

**Expected Order**: @Urgent, 2024 Budget, Admin

---

## Summary

**Data Model Changes**: ❌ NONE
**Query Changes**: ✅ ORDER BY clause only (database.js:584)
**Schema Migration**: ❌ NOT REQUIRED
**Index Changes**: ❌ NOT REQUIRED
**Backward Compatibility**: ✅ 100% COMPATIBLE
**Performance Impact**: 🟢 NEGLIGIBLE

**Ready for Contracts Phase**: ✅ YES
