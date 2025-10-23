# Data Model: Admin2 Delete User Account Bug Fix

**Date**: 2025-10-20
**Feature**: 021-in-admin2-in

## Overview
This bug fix does not introduce new data models or schema changes. It corrects the validation logic for existing user ID handling in the DELETE endpoint.

## Existing Entities

### User
**Table**: `users`
**Primary Key**: `id` (string format: `user_[timestamp]_[alphanumeric]`)

**Relevant Fields**:
- `id`: String - Unique identifier (e.g., `user_1760531416053_qwljhrwxp`)
- `email`: String - User email address
- `created_at`: Timestamp - Account creation date
- `is_admin`: Boolean - Admin privileges flag
- `blocked`: Boolean - Account blocked status

**Relationships**:
- One-to-many with `taken` (tasks)
- One-to-many with `email_imports`
- One-to-many with `sessions`

### Cascade Deletion Behavior
When a user is deleted, the following related records are automatically deleted:

1. **Tasks** (`taken` table)
   - Foreign key: `gebruiker_id` references `users.id`
   - Cascade delete: All tasks owned by the user

2. **Email Imports** (`email_imports` table)
   - Foreign key: `user_id` references `users.id`
   - Cascade delete: All email import records

3. **Sessions** (`sessions` table)
   - Foreign key: `sess` → `userId` (JSON field)
   - Cascade delete: All active/inactive sessions

## ID Format Validation

### Current ID Format
**Pattern**: `user_[timestamp]_[alphanumeric]`
**Example**: `user_1760531416053_qwljhrwxp`

**Components**:
- Prefix: `user_`
- Timestamp: Unix timestamp in milliseconds (13 digits)
- Separator: `_`
- Random suffix: Alphanumeric string (lowercase)

### Validation Rules
**Valid ID**:
- Non-empty string
- Non-whitespace string
- Matches pattern: `user_[0-9]{13}_[a-z0-9]+`

**Invalid ID**:
- Empty string: `""`
- Whitespace only: `"   "`
- Null or undefined

## No Schema Changes Required

This fix operates entirely at the application layer (validation logic). The database schema already correctly stores and handles string-format user IDs.

**Database queries remain unchanged**:
```sql
-- Existing query works for both string and numeric IDs
DELETE FROM users WHERE id = $1
```

PostgreSQL parameterized queries handle the string ID format correctly through parameter binding.

## State Transitions

### Delete Operation Flow
1. **Initial State**: User exists in database with string ID
2. **Validation**: Check ID is non-empty string
3. **Security Checks**:
   - Verify requester is admin
   - Prevent self-deletion
4. **Deletion**: Execute cascade delete
5. **Final State**: User and all related data removed

### No State Changes
This bug fix does not alter any state transitions. It only corrects the validation step to accept the correct ID format.

---

**Summary**: No data model changes required. Fix corrects validation logic to match existing database schema and ID format.
