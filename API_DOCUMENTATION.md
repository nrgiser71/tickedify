# Tickedify API Documentation

**Version**: 1.0.15  
**Last Updated**: November 10, 2025  
**Total Endpoints**: 285  
**Target Audience**: iOS Developers Building Native Apps

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Management](#user-management)
3. [Task Management](#task-management)
4. [List Management](#list-management)
5. [Daily Planning & Calendar](#daily-planning--calendar)
6. [Projects & Contexts](#projects--contexts)
7. [Recurring Tasks](#recurring-tasks)
8. [Attachments & Files](#attachments--files)
9. [Email Import](#email-import)
10. [Subscriptions & Payments](#subscriptions--payments)
11. [Admin Endpoints](#admin-endpoints)
12. [Debug & Testing](#debug--testing)

---

## Authentication Endpoints

### POST /api/auth/register
**Location**: `server.js:4146`  
**Authentication**: None (public endpoint)  
**Rate Limiting**: Recommended (prevent spam)

#### Request Body
```json
{
  "email": "user@example.com",
  "naam": "John Doe",
  "wachtwoord": "SecurePassword123!"
}
```

#### Response (Success)
Status: 200 OK or 201 Created
```json
{
  "success": true,
  "message": "Welkom als beta tester! Account succesvol aangemaakt.",
  "redirect": "/app",
  "user": {
    "id": "user_1699627385892_a1b2c3d",
    "email": "user@example.com",
    "naam": "John Doe",
    "rol": "user",
    "account_type": "beta",
    "subscription_status": "beta_active",
    "importCode": "abc123def456",
    "importEmail": "import+abc123def456@mg.tickedify.com"
  }
}
```

#### Response (Error - Missing Fields)
Status: 400 Bad Request
```json
{
  "success": false,
  "error": "Email, naam en wachtwoord zijn verplicht"
}
```

#### Response (Error - Email Exists)
Status: 409 Conflict
```json
{
  "success": false,
  "error": "Email adres al in gebruik"
}
```

#### Response (Error - Weak Password)
Status: 400 Bad Request
```json
{
  "success": false,
  "error": "Wachtwoord voldoet niet aan de beveiligingseisen",
  "passwordErrors": [
    "Wachtwoord moet minstens 8 karakters lang zijn",
    "Wachtwoord moet minstens één hoofdletter bevatten",
    "Wachtwoord moet minstens één cijfer bevatten"
  ]
}
```

#### Security Notes
- Passwords must be at least 8 characters
- Must contain uppercase, lowercase, numbers, and special characters
- Password validation happens BEFORE email uniqueness check (timing attack prevention)
- Passwords are hashed with bcrypt (salt rounds: 10)
- Beta period detection determines free vs. paid access

---

### POST /api/auth/login
**Location**: `server.js:4307`  
**Authentication**: None (public endpoint)  
**Rate Limiting**: Recommended (prevent brute force)

#### Request Body
```json
{
  "email": "user@example.com",
  "wachtwoord": "SecurePassword123!"
}
```

#### Response (Success - Full Access)
Status: 200 OK
```json
{
  "success": true,
  "message": "Succesvol ingelogd",
  "user": {
    "id": "user_1699627385892_a1b2c3d",
    "email": "user@example.com",
    "naam": "John Doe",
    "rol": "user"
  }
}
```

#### Response (Success - Requires Upgrade)
Status: 200 OK
```json
{
  "success": true,
  "requiresUpgrade": true,
  "expiryType": "trial",
  "message": "Login succesvol, upgrade vereist voor volledige toegang",
  "user": {
    "id": "user_1699627385892_a1b2c3d",
    "email": "user@example.com",
    "naam": "John Doe",
    "rol": "user"
  }
}
```

#### Response (Error - Invalid Credentials)
Status: 401 Unauthorized
```json
{
  "error": "Ongeldige email of wachtwoord"
}
```

#### Response (Error - Account Deactivated)
Status: 401 Unauthorized
```json
{
  "error": "Account is gedeactiveerd"
}
```

#### Session Management
- Sessions are stored in PostgreSQL (connect-pg-simple)
- Session cookies are HTTPOnly and Secure
- Last login timestamp is updated on successful authentication
- Trial expiry is checked before granting access

---

### POST /api/auth/logout
**Location**: `server.js:4428`  
**Authentication**: Session required  
**Method**: POST

#### Request
No body required

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Succesvol uitgelogd"
}
```

#### Response (Error)
Status: 500 Internal Server Error
```json
{
  "error": "Fout bij uitloggen"
}
```

---

### GET /api/auth/me
**Location**: `server.js:6264`  
**Authentication**: Session required  
**Method**: GET

#### Request
No query parameters

#### Response (Success - Full Access)
Status: 200 OK
```json
{
  "id": "user_1699627385892_a1b2c3d",
  "email": "user@example.com",
  "naam": "John Doe",
  "account_type": "regular",
  "subscription_status": "paid",
  "trial_end_date": null,
  "created_at": "2024-11-10T12:00:00Z",
  "hasAccess": true,
  "accessMessage": null,
  "requiresUpgrade": false,
  "expiryType": null
}
```

#### Response (Success - Trial Expired)
Status: 200 OK
```json
{
  "id": "user_1699627385892_a1b2c3d",
  "email": "user@example.com",
  "naam": "John Doe",
  "account_type": "beta",
  "subscription_status": "trialing",
  "trial_end_date": "2024-11-01T00:00:00Z",
  "created_at": "2024-11-10T12:00:00Z",
  "hasAccess": false,
  "accessMessage": "Uw proefperiode is verlopen",
  "requiresUpgrade": true,
  "expiryType": "trial"
}
```

#### Response (Error - Not Authenticated)
Status: 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

---

### POST /api/account/password-reset
**Location**: `server.js:4970`  
**Authentication**: None (public endpoint)  
**Method**: POST

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Reset instructies zijn naar je email gestuurd"
}
```

#### Notes
- Generates a reset token and sends it via email
- Token expires after 24 hours
- Token is one-time use only

---

### POST /api/account/password-reset/confirm
**Location**: `server.js:5088`  
**Authentication**: None (public endpoint)  
**Method**: POST

#### Request Body
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewPassword123!"
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Wachtwoord succesvol gewijzigd"
}
```

---

## User Management

### GET /api/user/info
**Location**: `server.js:3249`  
**Authentication**: Session or Bearer token  
**Method**: GET

#### Query Parameters
- None required

#### Response (Success)
Status: 200 OK
```json
{
  "id": "user_1699627385892_a1b2c3d",
  "email": "user@example.com",
  "naam": "John Doe",
  "rol": "user",
  "actief": true,
  "account_type": "regular",
  "subscription_status": "paid",
  "created_at": "2024-11-10T12:00:00Z",
  "last_login": "2024-11-10T15:30:00Z",
  "storage_used": 1536000,
  "storage_limit": 5368709120
}
```

---

### GET /api/user/email-import-code
**Location**: `server.js:1342`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "importCode": "abc123def456",
  "importEmail": "import+abc123def456@mg.tickedify.com"
}
```

#### Notes
- Import code is used to send tasks via email
- Code is unique per user
- Can be regenerated at any time

---

### POST /api/user/regenerate-import-code
**Location**: `server.js:1373`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "importCode": "xyz789abc123",
  "importEmail": "import+xyz789abc123@mg.tickedify.com",
  "message": "Importcode is opnieuw gegenereerd"
}
```

#### Notes
- Old import code becomes invalid immediately
- Useful for security if code is compromised

---

### GET /api/user/storage-stats
**Location**: `server.js:6053`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "used": 1536000,
  "limit": 5368709120,
  "percentage": 0.029,
  "human_used": "1.5 MB",
  "human_limit": "5 GB",
  "remaining": 5367173120
}
```

---

### PUT /api/user/onboarding-video-seen
**Location**: `server.js:3315`  
**Authentication**: Session required  
**Method**: PUT

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Onboarding status updated"
}
```

---

### GET /api/user-settings
**Location**: `server.js:16500`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "user_id": "user_1699627385892_a1b2c3d",
  "notifications_email": true,
  "notifications_push": false,
  "daily_summary": true,
  "dark_mode": false,
  "language": "nl",
  "timezone": "Europe/Amsterdam",
  "preferences": {
    "show_completed_tasks": false,
    "default_list_view": "grouped",
    "week_starts_on": "monday"
  }
}
```

---

### POST /api/user-settings
**Location**: `server.js:16536`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "notifications_email": true,
  "notifications_push": false,
  "daily_summary": true,
  "dark_mode": false,
  "preferences": {
    "show_completed_tasks": false,
    "default_list_view": "grouped"
  }
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

## Task Management

### GET /api/taak/:id
**Location**: `server.js:8587`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `id` (required): Task ID (e.g., "task_1699627385892_a1b2c3d")

#### Query Parameters
- None

#### Response (Success)
Status: 200 OK
```json
{
  "id": "task_1699627385892_a1b2c3d",
  "titel": "Complete project report",
  "beschrijving": "Finish and submit the Q4 report",
  "project": "Work",
  "context": "Office",
  "prioriteit": "hoog",
  "duur": 60,
  "verschijndatum": "2024-11-10",
  "afgeleid_van": null,
  "lijst": "acties",
  "aangemaakt": "2024-11-10T12:00:00Z",
  "gewijzigd": "2024-11-10T12:00:00Z",
  "afgerond": null,
  "archived": false,
  "herhaling_type": null,
  "herhaling_actief": false,
  "bijlagen": [
    {
      "id": "attachment_123",
      "filename": "report.pdf",
      "size": 2048000,
      "created_at": "2024-11-10T12:00:00Z"
    }
  ],
  "subtaken": [
    {
      "id": "subtask_1",
      "titel": "Review data",
      "afgerond": false,
      "volgorde": 1
    }
  ]
}
```

#### Response (Error - Task Not Found)
Status: 404 Not Found
```json
{
  "error": "Task not found"
}
```

---

### POST /api/taak/add-to-inbox
**Location**: `server.js:7069`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "titel": "New task from inbox",
  "beschrijving": "Optional description",
  "project": "Optional Project",
  "context": "Optional Context",
  "duur": 30,
  "prioriteit": "gemiddeld"
}
```

#### Response (Success)
Status: 201 Created
```json
{
  "success": true,
  "id": "task_1699627385892_a1b2c3d",
  "message": "Task added to inbox"
}
```

#### Notes
- Task is placed in the inbox list
- Can be moved to other lists later
- Appears immediately in the UI

---

### PUT /api/taak/:id
**Location**: `server.js:7111`  
**Authentication**: Session required  
**Method**: PUT

#### URL Parameters
- `id` (required): Task ID

#### Request Body
```json
{
  "titel": "Updated task title",
  "beschrijving": "Updated description",
  "project": "New Project",
  "context": "New Context",
  "prioriteit": "hoog",
  "duur": 90,
  "afgerond": false,
  "herhaling_type": "monthly-day-15-1",
  "herhaling_actief": true
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Task updated",
  "updated": {
    "id": "task_1699627385892_a1b2c3d",
    "titel": "Updated task title",
    "gewijzigd": "2024-11-10T15:30:00Z"
  }
}
```

#### Notes
- Can update any field of the task
- Recurring properties can be modified
- If task is marked complete and has recurrence, next instance is created automatically

---

### DELETE /api/taak/:id
**Location**: `server.js:7423`  
**Authentication**: Session required  
**Method**: DELETE

#### URL Parameters
- `id` (required): Task ID

#### Request Body
```json
{
  "permanently": false
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Task deleted",
  "archived": true
}
```

#### Notes
- Default is soft delete (moves to trash)
- Set `permanently: true` to permanently delete from database
- Soft-deleted tasks can be restored

---

### PUT /api/taak/:id/soft-delete
**Location**: `server.js:7487`  
**Authentication**: Session required  
**Method**: PUT

#### URL Parameters
- `id` (required): Task ID

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Task moved to trash"
}
```

---

### POST /api/taak/:id/restore
**Location**: `server.js:7527`  
**Authentication**: Session required  
**Method**: POST

#### URL Parameters
- `id` (required): Task ID

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Task restored from trash",
  "task": {
    "id": "task_1699627385892_a1b2c3d",
    "titel": "Restored task"
  }
}
```

---

### POST /api/taak/:id/unarchive
**Location**: `server.js:7283`  
**Authentication**: Session required  
**Method**: POST

#### URL Parameters
- `id` (required): Task ID

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Task unarchived"
}
```

---

### PUT /api/taak/:id/prioriteit
**Location**: `server.js:8670`  
**Authentication**: Session required  
**Method**: PUT

#### URL Parameters
- `id` (required): Task ID

#### Request Body
```json
{
  "prioriteit": "hoog"
}
```

#### Allowed Values
- `"hoog"` (High)
- `"gemiddeld"` (Medium)
- `"laag"` (Low)

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Priority updated",
  "task": {
    "id": "task_1699627385892_a1b2c3d",
    "prioriteit": "hoog"
  }
}
```

---

### POST /api/taak/recurring
**Location**: `server.js:8635`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "taskId": "task_1699627385892_a1b2c3d",
  "recurringType": "monthly-day-15-1",
  "baseDate": "2024-11-15"
}
```

#### Recurring Type Formats
- `"dagelijks"` - Every day
- `"daily-N"` - Every N days (e.g., "daily-3" for every 3 days)
- `"werkdagen"` - Weekdays only
- `"weekly-interval-dagen"` - e.g., "weekly-1-1,3,5" (every week on Mon, Wed, Fri)
- `"monthly-day-dag-interval"` - e.g., "monthly-day-15-2" (15th of every 2 months)
- `"monthly-weekday-positie-dag-interval"` - e.g., "monthly-weekday-first-1-1" (first Monday of month)
- `"yearly-dag-maand-interval"` - e.g., "yearly-6-8-1" (August 6th every year)
- `"yearly-special-type-interval"` - e.g., "yearly-special-first-workday-1"
- `"event-dagen-richting-eventnaam"` - e.g., "event-10-before-webinar"

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Recurring pattern set",
  "task": {
    "id": "task_1699627385892_a1b2c3d",
    "herhaling_type": "monthly-day-15-1",
    "herhaling_actief": true,
    "next_occurrence": "2024-12-15"
  }
}
```

---

### POST /api/taak/recover-recurring
**Location**: `server.js:14455`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "taskId": "task_1699627385892_a1b2c3d"
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Recurring task recovered",
  "recoveredCount": 5
}
```

---

### POST /api/bulk/soft-delete
**Location**: `server.js:7591`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "taskIds": [
    "task_1699627385892_a1b2c3d",
    "task_1699627385892_x9y8z7w",
    "task_1699627385892_q1w2e3r"
  ]
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Tasks moved to trash",
  "deletedCount": 3
}
```

---

### POST /api/bulk/restore
**Location**: `server.js:7635`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "taskIds": [
    "task_1699627385892_a1b2c3d",
    "task_1699627385892_x9y8z7w"
  ]
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Tasks restored",
  "restoredCount": 2
}
```

---

### GET /api/prullenbak
**Location**: `server.js:7562`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "tasks": [
    {
      "id": "task_1699627385892_a1b2c3d",
      "titel": "Deleted task",
      "beschrijving": "This was deleted",
      "deleted_at": "2024-11-10T15:30:00Z",
      "archived": true
    }
  ],
  "total": 3
}
```

---

## List Management

### GET /api/lijsten
**Location**: `server.js:6695`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "lijsten": [
    {
      "naam": "acties",
      "display_name": "Acties",
      "count": 12,
      "icon": "lightning",
      "type": "built-in"
    },
    {
      "naam": "gedelegeerd",
      "display_name": "Gedelegeerd",
      "count": 5,
      "type": "built-in"
    },
    {
      "naam": "wachten",
      "display_name": "Wachten",
      "count": 8,
      "type": "built-in"
    },
    {
      "naam": "opvolgen",
      "display_name": "Opvolgen",
      "count": 3,
      "type": "built-in"
    }
  ],
  "custom_lists": [
    {
      "naam": "custom-project-x",
      "display_name": "Project X",
      "count": 7,
      "type": "custom"
    }
  ]
}
```

#### Built-in Lists
- **acties** - Main task list
- **gedelegeerd** - Delegated tasks
- **wachten** - Tasks waiting for response
- **opvolgen** - Follow-up tasks
- **uitgesteld-wekelijks** - Deferred to next week
- **uitgesteld-maandelijks** - Deferred to next month
- **uitgesteld-3maandelijks** - Deferred 3 months
- **uitgesteld-6maandelijks** - Deferred 6 months
- **uitgesteld-jaarlijks** - Deferred to next year

---

### GET /api/lijst/:naam
**Location**: `server.js:6796`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `naam` (required): List name (e.g., "acties", "gedelegeerd", "custom-project-x")

#### Query Parameters
- `filter` (optional): Filter tasks by project or context
- `sort` (optional): Sort order (default: "created_asc")

#### Response (Success)
Status: 200 OK
```json
{
  "naam": "acties",
  "tasks": [
    {
      "id": "task_1699627385892_a1b2c3d",
      "titel": "Complete project report",
      "beschrijving": "Q4 report",
      "project": "Work",
      "context": "Office",
      "prioriteit": "hoog",
      "duur": 60,
      "verschijndatum": "2024-11-10",
      "afgerond": false,
      "herhaling_type": null,
      "volgorde": 1
    }
  ],
  "total": 12
}
```

---

### POST /api/lijst/:naam
**Location**: `server.js:7043`  
**Authentication**: Session required  
**Method**: POST

#### URL Parameters
- `naam` (required): List name

#### Request Body
```json
[
  {
    "id": "task_1699627385892_a1b2c3d",
    "titel": "Task 1",
    "volgorde": 1
  },
  {
    "id": "task_1699627385892_x9y8z7w",
    "titel": "Task 2",
    "volgorde": 2
  }
]
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "List saved"
}
```

#### Notes
- Used to reorder tasks in a list
- Also used to create new tasks via the list endpoint
- Can batch update multiple tasks

---

### DELETE /api/lijst/acties/delete-all
**Location**: `server.js:3789`  
**Authentication**: Session required  
**Method**: DELETE

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "All completed tasks deleted",
  "count": 5
}
```

#### Notes
- Deletes all completed tasks from the "acties" list
- Operation is permanent
- Only affects completed tasks

---

### GET /api/tellingen
**Location**: `server.js:6710`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "acties": 12,
  "gedelegeerd": 5,
  "wachten": 8,
  "opvolgen": 3,
  "total": 28
}
```

#### Notes
- Fast endpoint to get task counts for all lists
- Used for sidebar badge counts

---

### GET /api/counts/sidebar
**Location**: `server.js:6726`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "counts": {
    "inbox": 3,
    "acties": 12,
    "gedelegeerd": 5,
    "wachten": 8,
    "opvolgen": 3,
    "archived": 245
  },
  "overdue": 2,
  "today": 5,
  "this_week": 12
}
```

---

## Daily Planning & Calendar

### GET /api/dagelijkse-planning/:datum
**Location**: `server.js:8262`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `datum` (required): Date in format YYYY-MM-DD (e.g., "2024-11-10")

#### Query Parameters
- `expand` (optional): Include full task details (true/false)

#### Response (Success)
Status: 200 OK
```json
{
  "datum": "2024-11-10",
  "planned_tasks": [
    {
      "id": "planning_1699627385892_a1b2c3d",
      "taak_id": "task_1699627385892_a1b2c3d",
      "titel": "Complete project report",
      "project": "Work",
      "context": "Office",
      "prioriteit": "hoog",
      "duur": 60,
      "afgerond": false,
      "volgorde": 1,
      "geplande_uren": "09:00",
      "taak_details": {
        "beschrijving": "Q4 report",
        "project": "Work"
      }
    }
  ],
  "total_minutes": 240,
  "total_tasks": 4,
  "date_info": {
    "day_of_week": "Friday",
    "is_weekend": false,
    "is_holiday": false
  }
}
```

#### Response (Error - Invalid Date)
Status: 400 Bad Request
```json
{
  "error": "Invalid date format. Use YYYY-MM-DD"
}
```

---

### POST /api/dagelijkse-planning
**Location**: `server.js:8315`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "datum": "2024-11-10",
  "taak_id": "task_1699627385892_a1b2c3d",
  "volgorde": 1,
  "geplande_uren": "09:00"
}
```

#### Response (Success)
Status: 201 Created
```json
{
  "success": true,
  "id": "planning_1699627385892_new",
  "message": "Task scheduled for the day"
}
```

---

### PUT /api/dagelijkse-planning/:id
**Location**: `server.js:8367`  
**Authentication**: Session required  
**Method**: PUT

#### URL Parameters
- `id` (required): Planning record ID

#### Request Body
```json
{
  "volgorde": 2,
  "geplande_uren": "14:00",
  "afgerond": true
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Planning updated",
  "updated": {
    "id": "planning_1699627385892_a1b2c3d",
    "volgorde": 2,
    "afgerond": true
  }
}
```

---

### PUT /api/dagelijkse-planning/:id/reorder
**Location**: `server.js:8388`  
**Authentication**: Session required  
**Method**: PUT

#### URL Parameters
- `id` (required): Planning record ID

#### Request Body
```json
{
  "new_order": [
    "planning_1_id",
    "planning_2_id",
    "planning_3_id"
  ]
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Order updated"
}
```

---

### DELETE /api/dagelijkse-planning/:id
**Location**: `server.js:8410`  
**Authentication**: Session required  
**Method**: DELETE

#### URL Parameters
- `id` (required): Planning record ID

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Planning removed"
}
```

---

### GET /api/ingeplande-acties/:datum
**Location**: `server.js:8479`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `datum` (required): Date in format YYYY-MM-DD

#### Response (Success)
Status: 200 OK
```json
{
  "datum": "2024-11-10",
  "scheduled": [
    {
      "id": "planning_1",
      "taak_id": "task_1",
      "titel": "Task 1",
      "time": "09:00"
    }
  ],
  "count": 1
}
```

---

### GET /api/prioriteiten/:datum
**Location**: `server.js:8725`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `datum` (required): Date in format YYYY-MM-DD

#### Response (Success)
Status: 200 OK
```json
{
  "datum": "2024-11-10",
  "high_priority": 3,
  "medium_priority": 5,
  "low_priority": 4,
  "tasks_by_priority": {
    "hoog": [
      {
        "id": "task_1",
        "titel": "Important task"
      }
    ],
    "gemiddeld": [],
    "laag": []
  }
}
```

---

### POST /api/prioriteiten/reorder
**Location**: `server.js:8748`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "datum": "2024-11-10",
  "priority_order": [
    {
      "id": "task_1",
      "priority": "hoog"
    },
    {
      "id": "task_2",
      "priority": "gemiddeld"
    }
  ]
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Priorities reordered"
}
```

---

## Projects & Contexts

### GET /api/admin/projects
**Location**: `server.js:10816`  
**Authentication**: Admin required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "projects": [
    {
      "id": "proj_1",
      "naam": "Work",
      "kleur": "#FF5733",
      "task_count": 25,
      "gebruiker_count": 1
    },
    {
      "id": "proj_2",
      "naam": "Personal",
      "kleur": "#33FF57",
      "task_count": 12
    }
  ],
  "total": 2
}
```

---

### GET /api/admin/contexts
**Location**: `server.js:10843`  
**Authentication**: Admin required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "contexts": [
    {
      "id": "ctx_1",
      "naam": "Office",
      "symbool": "💼",
      "task_count": 18
    },
    {
      "id": "ctx_2",
      "naam": "Home",
      "symbool": "🏠",
      "task_count": 12
    }
  ],
  "total": 2
}
```

---

## Recurring Tasks

### POST /api/taak/recurring
**Location**: `server.js:8635`  
**Authentication**: Session required  
**Method**: POST

(See [Recurring Tasks section](#recurring-tasks) in Task Management for full details)

---

### GET /api/debug/recurring-tasks-analysis
**Location**: `server.js:14100`  
**Authentication**: Admin required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "total_recurring": 45,
  "active": 38,
  "inactive": 7,
  "by_type": {
    "dagelijks": 12,
    "werkdagen": 5,
    "weekly": 15,
    "monthly": 10,
    "yearly": 3
  },
  "next_occurrences": [
    {
      "task_id": "task_1",
      "titel": "Daily standup",
      "type": "dagelijks",
      "next_date": "2024-11-11"
    }
  ]
}
```

---

## Attachments & Files

### POST /api/taak/:id/bijlagen
**Location**: `server.js:5509`  
**Authentication**: Session required  
**Method**: POST  
**Content-Type**: multipart/form-data

#### URL Parameters
- `id` (required): Task ID

#### Form Data
- `file` (required): File to upload (max 50MB)
- `task_id` (required): Task ID
- `filename` (optional): Custom filename

#### Response (Success)
Status: 201 Created
```json
{
  "success": true,
  "attachment": {
    "id": "att_1699627385892_a1b2c3d",
    "taak_id": "task_1699627385892_a1b2c3d",
    "filename": "report.pdf",
    "mimetype": "application/pdf",
    "size": 2048000,
    "created_at": "2024-11-10T15:30:00Z",
    "download_url": "/api/bijlage/att_1699627385892_a1b2c3d/download"
  }
}
```

#### Response (Error - File Too Large)
Status: 413 Payload Too Large
```json
{
  "error": "File exceeds maximum size of 50MB"
}
```

#### Response (Error - Storage Exceeded)
Status: 507 Insufficient Storage
```json
{
  "error": "Insufficient storage. Used: 5.1GB / Limit: 5GB"
}
```

---

### GET /api/taak/:id/bijlagen
**Location**: `server.js:5644`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `id` (required): Task ID

#### Response (Success)
Status: 200 OK
```json
{
  "task_id": "task_1699627385892_a1b2c3d",
  "attachments": [
    {
      "id": "att_1699627385892_a1b2c3d",
      "filename": "report.pdf",
      "mimetype": "application/pdf",
      "size": 2048000,
      "created_at": "2024-11-10T15:30:00Z",
      "preview_url": "/api/bijlage/att_1699627385892_a1b2c3d/preview"
    }
  ]
}
```

---

### GET /api/bijlage/:id/download
**Location**: `server.js:5785`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `id` (required): Attachment ID

#### Response (Success)
Status: 200 OK  
Content-Type: application/octet-stream

Binary file download

#### Response (Error - Not Found)
Status: 404 Not Found
```json
{
  "error": "Attachment not found"
}
```

#### Response (Error - No Access)
Status: 403 Forbidden
```json
{
  "error": "You do not have access to this attachment"
}
```

---

### GET /api/bijlage/:id/preview
**Location**: `server.js:5904`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `id` (required): Attachment ID

#### Query Parameters
- `size` (optional): Thumbnail size (default: 200x200)

#### Response (Success)
Status: 200 OK  
Content-Type: image/jpeg or image/png

Thumbnail image (for images and PDFs)

#### Notes
- Returns a preview image for supported file types
- PDFs return first page as image
- Images are scaled to requested size

---

### DELETE /api/bijlage/:id
**Location**: `server.js:6007`  
**Authentication**: Session required  
**Method**: DELETE

#### URL Parameters
- `id` (required): Attachment ID

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Attachment deleted",
  "freed_space": 2048000
}
```

---

## Subtasks

### GET /api/subtaken/:parentId
**Location**: `server.js:7734`  
**Authentication**: Session required  
**Method**: GET

#### URL Parameters
- `parentId` (required): Parent task ID

#### Response (Success)
Status: 200 OK
```json
{
  "parent_id": "task_1699627385892_a1b2c3d",
  "subtasks": [
    {
      "id": "subtask_1",
      "titel": "Review data",
      "afgerond": false,
      "volgorde": 1,
      "created_at": "2024-11-10T12:00:00Z"
    },
    {
      "id": "subtask_2",
      "titel": "Create report",
      "afgerond": false,
      "volgorde": 2
    }
  ]
}
```

---

### POST /api/subtaken
**Location**: `server.js:7771`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "parent_id": "task_1699627385892_a1b2c3d",
  "titel": "Review data"
}
```

#### Response (Success)
Status: 201 Created
```json
{
  "success": true,
  "id": "subtask_new",
  "message": "Subtask created"
}
```

---

### PUT /api/subtaken/:id
**Location**: `server.js:7792`  
**Authentication**: Session required  
**Method**: PUT

#### URL Parameters
- `id` (required): Subtask ID

#### Request Body
```json
{
  "titel": "Updated title",
  "afgerond": true
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Subtask updated"
}
```

---

### DELETE /api/subtaken/:id
**Location**: `server.js:7814`  
**Authentication**: Session required  
**Method**: DELETE

#### URL Parameters
- `id` (required): Subtask ID

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Subtask deleted"
}
```

---

### POST /api/subtaken/:parentId/reorder
**Location**: `server.js:7836`  
**Authentication**: Session required  
**Method**: POST

#### URL Parameters
- `parentId` (required): Parent task ID

#### Request Body
```json
{
  "order": [
    "subtask_1",
    "subtask_3",
    "subtask_2"
  ]
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Subtasks reordered"
}
```

---

## Email Import

### POST /api/email/import
**Location**: `server.js:1504`  
**Authentication**: Special email import code (not session)  
**Method**: POST  
**Content-Type**: multipart/form-data

#### Request Details
Email sent to: `import+{importCode}@mg.tickedify.com`

#### Body Format
```
@t p: Project Name; c: Context Name; d: 2024-11-15; p1; t: 30;

Task description here.
Can be multiple lines.

--END--
Email signature (not included in task)
```

#### @t Syntax Codes

| Code | Description | Example |
|------|-------------|---------|
| `p:` | Project name | `p: Client X` |
| `c:` | Context | `c: Office` |
| `d:` | Due date (ISO) | `d: 2024-11-15` |
| `t:` | Duration (minutes) | `t: 30` |
| `p0-p9` | Priority | `p1` = high, `p2` = medium, `p3+` = low |
| `df` | Defer to follow-up | `df;` |
| `dw` | Defer to weekly | `dw;` |
| `dm` | Defer to monthly | `dm;` |
| `d3m` | Defer quarterly | `d3m;` |
| `d6m` | Defer bi-annual | `d6m;` |
| `dy` | Defer yearly | `dy;` |

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "task": {
    "id": "task_1699627385892_a1b2c3d",
    "titel": "Task description here",
    "project": "Project Name",
    "context": "Context Name",
    "prioriteit": "hoog",
    "duur": 30,
    "verschijndatum": "2024-11-15",
    "lijst": "acties"
  }
}
```

#### Response (Error - Invalid Code)
Status: 400 Bad Request
```json
{
  "error": "Invalid import code"
}
```

#### Error Handling
- Invalid codes are silently ignored
- Task is still created with valid codes
- Duplicate codes use first one
- Defer codes override other properties

---

### GET /api/email-import-help
**Location**: `server.js:824`  
**Authentication**: None (public)  
**Method**: GET

#### Response (Success)
Status: 200 OK  
Content-Type: text/html

Returns HTML documentation for email import feature

---

### GET /api/email-import-help/content
**Location**: `server.js:901`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "title": "Email Import Help",
  "content": "Comprehensive markdown documentation",
  "examples": [
    {
      "subject": "Quick task",
      "body": "Task description"
    }
  ]
}
```

---

## Subscriptions & Payments

### GET /api/subscription/plans
**Location**: `server.js:17002`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "plans": [
    {
      "id": "plan_monthly",
      "name": "Monthly",
      "price": 9.99,
      "currency": "EUR",
      "billing_period": "monthly",
      "features": [
        "Unlimited tasks",
        "All features",
        "Priority support"
      ]
    },
    {
      "id": "plan_yearly",
      "name": "Yearly",
      "price": 99.99,
      "currency": "EUR",
      "billing_period": "yearly",
      "features": [
        "Unlimited tasks",
        "All features",
        "Priority support",
        "Save 17%"
      ]
    }
  ]
}
```

---

### POST /api/subscription/checkout
**Location**: `server.js:17043`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "plan_id": "plan_monthly"
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "checkout_url": "https://checkout.plugandpay.com/...",
  "session_id": "session_abc123"
}
```

---

### POST /api/subscription/upgrade
**Location**: `server.js:17110`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "plan_id": "plan_yearly"
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Subscription upgraded",
  "new_plan": "plan_yearly",
  "next_billing": "2024-12-10"
}
```

---

### POST /api/subscription/downgrade
**Location**: `server.js:17191`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{
  "plan_id": "plan_monthly"
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Subscription downgraded",
  "new_plan": "plan_monthly",
  "effective_date": "2024-12-10"
}
```

---

### POST /api/subscription/cancel
**Location**: `server.js:17270`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Subscription cancelled",
  "cancellation_date": "2024-12-10"
}
```

---

### POST /api/subscription/reactivate
**Location**: `server.js:17319`  
**Authentication**: Session required  
**Method**: POST

#### Request Body
```json
{}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Subscription reactivated",
  "status": "active"
}
```

---

### GET /api/subscription/status
**Location**: `server.js:4801`  
**Authentication**: Session required  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "status": "active",
  "plan": "plan_yearly",
  "billing_period": "yearly",
  "next_billing_date": "2025-11-10",
  "cancel_at_period_end": false,
  "trial_end_date": null
}
```

---

### POST /api/webhooks/plugpay
**Location**: `server.js:17375`  
**Authentication**: Secret key verification  
**Method**: POST

#### Request Body (from Plug & Pay)
```json
{
  "event": "charge.success",
  "customer_id": "cust_123",
  "amount": 9.99,
  "currency": "EUR",
  "reference": "ref_123",
  "timestamp": 1699627385
}
```

#### Response (Success)
Status: 200 OK
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

#### Notes
- Verifies webhook signature with secret key
- Updates subscription status in database
- Triggers email notifications
- Handles failed payments and retries

---

## Version & Health

### GET /api/version
**Location**: `server.js:8000`  
**Authentication**: None (public)  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "version": "1.0.15",
  "build_date": "2024-11-10T12:00:00Z",
  "environment": "production",
  "status": "operational"
}
```

---

### GET /api/ping
**Location**: `server.js:803`  
**Authentication**: None (public)  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "status": "pong",
  "timestamp": "2024-11-10T15:30:00Z"
}
```

---

### GET /api/status
**Location**: `server.js:807`  
**Authentication**: None (public)  
**Method**: GET

#### Response (Success)
Status: 200 OK
```json
{
  "status": "operational",
  "database": "connected",
  "cache": "working",
  "storage": "working",
  "email": "working",
  "timestamp": "2024-11-10T15:30:00Z"
}
```

---

## Common Response Codes

### Success Responses
- **200 OK** - Successful GET, PUT, POST without resource creation
- **201 Created** - Successful POST that creates a resource
- **204 No Content** - Successful DELETE

### Client Error Responses
- **400 Bad Request** - Invalid request parameters or missing required fields
- **401 Unauthorized** - Authentication failed or session expired
- **403 Forbidden** - Authenticated but not authorized for resource
- **404 Not Found** - Resource does not exist
- **409 Conflict** - Resource already exists (e.g., duplicate email)
- **413 Payload Too Large** - File or request body too large

### Server Error Responses
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - Database or other service not available

---

## Error Response Format

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERR_INVALID_REQUEST",
  "details": "Additional details if applicable"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password too weak"
  }
}
```

---

## Authentication

### Session-Based Authentication
- Used for web browser clients
- Session cookie (httpOnly, secure)
- Stored in PostgreSQL via connect-pg-simple
- Default timeout: 24 hours

### Query Parameters
- Not used for authentication in this API
- All authentication via HTTP headers and cookies

### Bearer Token (Optional)
- Some endpoints support `Authorization: Bearer <token>` header
- Token format not specified in current implementation
- Falls back to session validation

---

## Rate Limiting

Not explicitly implemented but recommended:
- Login attempts: 5 per minute per IP
- Email import: 10 per hour per user
- General API: 100 requests per minute per user
- Bulk operations: 10 per hour per user

---

## Pagination

Most list endpoints support pagination:

### Query Parameters
- `page` (optional, default: 1)
- `limit` (optional, default: 50, max: 500)
- `offset` (optional): Alternative to page

### Response Format
```json
{
  "items": [...],
  "page": 1,
  "limit": 50,
  "total": 245,
  "has_more": true
}
```

---

## Testing

### Test Endpoints
- `GET /api/ping` - Simple connectivity test
- `GET /api/status` - Full system health check
- `GET /api/version` - Current version info
- `GET /api/v1/test` - API functionality test

---

## iOS Implementation Notes

### Session Management
1. After login, session cookie is automatically stored
2. All subsequent requests include cookie automatically
3. No need to manually handle token
4. Session expires after 24 hours of inactivity

### Dates & Times
- All dates: ISO 8601 format (YYYY-MM-DD)
- All times: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- Timezone: UTC (server performs conversion)
- Parse as: `ISO8601DateFormatter` or equivalent

### File Uploads
- Maximum file size: 50MB per file
- Maximum files per request: 5
- Use multipart/form-data for file uploads
- Server validates file types and sizes

### Error Handling
1. Check HTTP status code first
2. Parse JSON response for error details
3. Log `errorCode` for debugging
4. Display user-friendly error messages
5. Retry with exponential backoff for 5xx errors

### Performance Tips
1. Use `/api/tellingen` instead of `/api/lijst/:naam` just for counts
2. Use `/api/counts/sidebar` for all counts at once
3. Cache attachment previews locally
4. Implement pagination for large lists
5. Use date filters to reduce data transfer

---

## Database Schema Reference

### Core Tables
- **users** - User accounts and authentication
- **taken** - Individual tasks
- **lijsten** - Task lists (dynamic mapping)
- **planning** - Daily planning entries
- **projecten** - Projects
- **contexten** - Contexts
- **bijlagen** - File attachments
- **subtaken** - Subtasks

### Recurring Task Fields
- `herhaling_type` VARCHAR(50) - Recurrence pattern
- `herhaling_actief` BOOLEAN - Whether recurrence is active
- `herhaling_waarde` INTEGER - Legacy field

### Recurring Pattern Types
- Daily: `dagelijks` or `daily-N`
- Weekdays: `werkdagen`
- Weekly: `weekly-interval-days`
- Monthly (date): `monthly-day-date-interval`
- Monthly (weekday): `monthly-weekday-position-day-interval`
- Yearly: `yearly-day-month-interval`
- Event-based: `event-days-direction-eventname`

---

## Deployment Information

### Production Environment
- **Domain**: tickedify.com
- **Staging**: dev.tickedify.com
- **API Base URL**: https://tickedify.com/api
- **Staging API URL**: https://dev.tickedify.com/api

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `SESSION_SECRET` - Session encryption key
- `MAILGUN_API_KEY` - Email service
- `MAILGUN_DOMAIN` - mg.tickedify.com
- `B2_APPLICATION_KEY` - Backblaze B2 storage
- `GHL_API_KEY` - GoHighLevel integration (optional)

### Storage Configuration
- Primary: Backblaze B2
- Max file size: 50MB
- Max storage per user: 5GB
- File types: Any (no restriction at API level)

