# Tickedify API Documentation - Complete Index

**Version**: 1.0.15  
**Last Updated**: November 10, 2025  
**Total Endpoints**: 285  
**Documentation Files**: 4 comprehensive guides

---

## Overview

This directory contains complete API documentation for building a native iOS application for Tickedify. The documentation covers all 285 REST API endpoints, authentication flows, data models, and implementation patterns.

---

## Documentation Files

### 1. **API_DOCUMENTATION.md** (Primary Reference)
**Size**: ~2,500 lines | **Purpose**: Complete API specification  
**Best For**: Understanding endpoint details and response formats

**Contents**:
- Authentication endpoints (register, login, logout, password reset)
- User management (profile, settings, storage)
- Task CRUD operations (create, read, update, delete, soft-delete, restore)
- List management (get lists, save order, counts)
- Daily planning & calendar operations
- Projects & contexts
- Recurring task patterns and management
- File attachments (upload, download, preview, delete)
- Email import with @t syntax
- Subscription & payment management
- Admin endpoints overview
- Debug & testing endpoints
- Common response codes and error formats
- Database schema reference
- Deployment information

**Key Sections**:
- Detailed request/response examples for each endpoint
- HTTP method and status codes
- Authentication requirements
- Error response formats
- Business logic notes

---

### 2. **API_ENDPOINTS_REFERENCE.md** (Quick Lookup)
**Size**: ~1,000 lines | **Purpose**: Complete endpoint listing  
**Best For**: Quick reference and endpoint discovery

**Contents**:
- All 285 endpoints in tabular format
- Organized by category
- Line numbers in server.js for code location
- HTTP methods
- Authentication requirements
- Brief description of each endpoint
- Summary statistics by category
- Implementation priority guide
- Performance characteristics
- Error handling priorities

**Organization**:
- 17 categories (Auth, Tasks, Planning, etc.)
- Summary tables
- Quick lookup by method
- Quick lookup by authentication type

---

### 3. **iOS_IMPLEMENTATION_GUIDE.md** (Developer Guide)
**Size**: ~1,500 lines | **Purpose**: Swift code examples and patterns  
**Best For**: Building the native iOS app

**Contents**:
- Complete Swift/SwiftUI code examples
- `TickedifyAuthManager` - Authentication flow
- `TickedifyTaskManager` - Task operations
- `TickedifyListManager` - List management
- `TickedifyPlanningManager` - Daily planning
- `TickedifyEmailManager` - Email import
- `TickedifyAttachmentManager` - File handling
- `TickedifyRecurringManager` - Recurring tasks
- URLSession configuration with SSL pinning
- Date/time handling utilities
- Error handling patterns
- Caching strategies
- Batch operations
- Offline queue support
- Unit testing examples
- Performance tips
- Implementation checklist

**Code Examples**:
- Complete working Swift code snippets
- Proper error handling
- URLSession setup
- Cookie/session management
- Multipart file upload
- Type-safe Swift models
- Async/await patterns

---

### 4. **API_ENDPOINTS_REFERENCE.md** (Complete Listing)
**Size**: ~800 lines | **Purpose**: Complete tabular reference  
**Best For**: Finding specific endpoints and their details

**Quick Reference Tables**:
- 17 category-based tables
- Line numbers in server.js
- HTTP methods
- Endpoint paths
- Authentication type
- Purpose description

---

## Quick Start

### For iOS Developers

1. **Start Here**: `iOS_IMPLEMENTATION_GUIDE.md`
   - Copy authentication manager code
   - Set up URLSession
   - Implement login flow

2. **Reference**: `API_DOCUMENTATION.md`
   - Look up specific endpoint details
   - Check request/response formats
   - Understand error codes

3. **Quick Lookup**: `API_ENDPOINTS_REFERENCE.md`
   - Find endpoint location in server.js
   - See all endpoints by category
   - Check authentication requirements

### For Backend Developers

1. **Start Here**: `API_DOCUMENTATION.md`
   - Complete specification
   - Request/response formats
   - Business logic details

2. **Code Reference**: Check line numbers in `API_ENDPOINTS_REFERENCE.md`
   - Find exact location in server.js
   - Navigate to implementation

---

## Key Statistics

### Endpoint Distribution
- **Authentication**: 13 endpoints (4.6%)
- **User Management**: 26 endpoints (9.1%)
- **Task Management**: 25 endpoints (8.8%)
- **Daily Planning**: 10 endpoints (3.5%)
- **Subscriptions**: 25 endpoints (8.8%)
- **Admin**: 67 endpoints (23.5%)
- **Debug & Testing**: 76 endpoints (26.7%)
- **Other**: 43 endpoints (15.1%)

### Authentication Breakdown
- **Public**: 88 endpoints (31%)
- **Session Required**: 137 endpoints (48%)
- **Admin Required**: 45 endpoints (16%)
- **Special Auth**: 15 endpoints (5%)

### HTTP Method Distribution
- **GET**: 155 endpoints (54%)
- **POST**: 73 endpoints (26%)
- **PUT**: 43 endpoints (15%)
- **DELETE**: 14 endpoints (5%)

---

## Core Endpoints for iOS

### Must-Have (MVP)
```
POST   /api/auth/register              - User registration
POST   /api/auth/login                 - User login
GET    /api/auth/me                    - Current user
POST   /api/auth/logout                - User logout
POST   /api/taak/add-to-inbox          - Create task
GET    /api/taak/:id                   - Get task
PUT    /api/taak/:id                   - Update task
DELETE /api/taak/:id                   - Delete task
GET    /api/lijst/:naam                - Get list
GET    /api/dagelijkse-planning/:datum - Get daily plan
POST   /api/dagelijkse-planning        - Schedule task
```

### Important (Phase 2)
```
POST   /api/taak/:id/bijlagen          - Upload file
GET    /api/bijlage/:id/download       - Download file
POST   /api/taak/recurring             - Set recurrence
GET    /api/user/email-import-code     - Get email code
GET    /api/subscription/plans         - Subscription plans
POST   /api/subscription/checkout      - Start checkout
```

### Nice-to-Have (Phase 3)
```
GET    /api/subtaken/:parentId         - Get subtasks
POST   /api/mind-dump/preferences      - Settings
GET    /api/counts/sidebar             - Sidebar counts
GET    /api/messages/unread            - Messages
```

---

## Data Models (Swift)

### Core Models in Documentation
- `User` - User profile
- `Task` - Individual task
- `Attachment` - File attachment
- `Subtask` - Subtask of parent task
- `DailyPlanResponse` - Daily plan
- `PlannedTask` - Scheduled task
- `RecurringPattern` - Recurrence type
- `ImportCodeResponse` - Email import
- `SubscriptionStatus` - Subscription info

All with:
- Complete field definitions
- CodingKeys for API mapping
- Proper optionality
- Type safety

---

## Authentication Flow

### Registration
```
User Input → Validate Password → Check Email Unique → Create User → Return Token
```

### Login
```
User Input → Query Database → Verify Password → Check Access → Create Session
```

### Session Management
- HTTPOnly cookies
- PostgreSQL session store
- Automatic cookie handling by URLSession
- 24-hour timeout

### Email Import
```
Send Email → Import Code → Parse @t Syntax → Create Task → Auto-complete Recurring
```

---

## Error Handling

### Common Status Codes
| Code | Meaning | Handle In App |
|------|---------|---------------|
| 200 | Success | Proceed |
| 201 | Created | Proceed |
| 400 | Bad Request | Show validation errors |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show "No access" |
| 404 | Not Found | Show "Not found" |
| 409 | Conflict | Email/resource exists |
| 500 | Server Error | Retry with backoff |
| 503 | Unavailable | Queue operation |

### Error Response Format
```json
{
  "success": false,
  "error": "User-facing message",
  "errorCode": "TECHNICAL_CODE",
  "details": "Additional info"
}
```

---

## Testing the API

### Health Checks
```bash
curl -s https://tickedify.com/api/ping
curl -s https://tickedify.com/api/status
curl -s https://tickedify.com/api/version
```

### Authentication Test
```bash
# Register
curl -X POST https://tickedify.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","naam":"Test","wachtwoord":"Pass123!"}'

# Login
curl -X POST https://tickedify.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","wachtwoord":"Pass123!"}'

# Current User (requires session cookie)
curl -s https://tickedify.com/api/auth/me -b "session_cookie"
```

---

## Recurring Task Patterns

### Supported Patterns
```
dagelijks                           - Every day
daily-N                             - Every N days
werkdagen                           - Weekdays only
weekly-interval-days                - Specific days of week
monthly-day-date-interval           - Nth day of month
monthly-weekday-position-day-interval - e.g., first Monday
yearly-day-month-interval           - Same day every year
yearly-special-type-interval        - Special yearly patterns
event-days-direction-eventname      - Before/after events
```

### Examples
```
dagelijks                  → Daily
daily-3                    → Every 3 days
werkdagen                  → Mon-Fri
weekly-1-1,3,5            → Every week on Mon, Wed, Fri
monthly-day-15-1          → 15th of every month
monthly-weekday-first-1-1 → First Monday of month
yearly-6-8-1              → August 6th every year
event-10-before-webinar   → 10 days before webinar
```

---

## File Upload Specifications

### Constraints
- Maximum file size: 50 MB per file
- Maximum files per task: 5
- Maximum user storage: 5 GB
- Supported formats: Any (validated at upload)

### Multipart Form Data
```
Content-Disposition: form-data; name="file"; filename="document.pdf"
Content-Type: application/pdf
[binary file data]
```

### Upload Response
```json
{
  "success": true,
  "attachment": {
    "id": "att_1699627385892_a1b2c3d",
    "filename": "document.pdf",
    "size": 2048000,
    "created_at": "2024-11-10T15:30:00Z",
    "download_url": "/api/bijlage/att_1699627385892_a1b2c3d/download"
  }
}
```

---

## Email Import @t Syntax

### Quick Reference
```
@t p: Project; c: Context; d: 2024-11-15; t: 30; p1;

Task description here
Multiple lines allowed

--END--
Signature (not included in task)
```

### Codes
- `p: NAME` - Project (auto-create if needed)
- `c: NAME` - Context (auto-create if needed)
- `d: YYYY-MM-DD` - Due date (ISO format)
- `t: MINUTES` - Duration in minutes
- `p0-p9` - Priority (0-2 high, 2 medium, 3+ low)
- `df` - Defer to follow-up
- `dw` - Defer to weekly
- `dm` - Defer to monthly
- `d3m` - Defer to quarterly
- `d6m` - Defer to bi-annual
- `dy` - Defer to yearly

### Priority Mapping
```
p0, p1         → hoog (high)
p2             → gemiddeld (medium)
p3, p4, ...    → laag (low)
```

### Defer Absolute Priority
When a defer code is used:
- **ALL OTHER CODES ARE IGNORED**
- Task goes directly to appropriate list
- Project and context are not applied
- Duration and priority are not applied

---

## Performance Optimization

### Caching Strategy
```
- Sidebar counts: 5 minute cache
- Lists: 1 minute cache
- User info: Session-long cache
- Preferences: Session-long cache
- Attachments: No cache (real-time)
```

### Batch Operations
```
POST /api/bulk/soft-delete     - Delete multiple
POST /api/bulk/restore         - Restore multiple
PUT  /api/dagelijkse-planning/:id/reorder - Reorder multiple
```

### Pagination
```
GET /api/list?page=1&limit=50
- page: 1-based (optional, default: 1)
- limit: items per page (optional, default: 50, max: 500)
```

---

## Security Best Practices

### For iOS Client
1. **Never log PII** - Don't log email/password
2. **HTTPOnly cookies** - Let URLSession handle
3. **HTTPS only** - No HTTP in production
4. **Validate input** - Check before sending
5. **SSL pinning** - Validate certificate
6. **Secure storage** - Keychain for tokens
7. **Session timeout** - Re-authenticate after 24h

### For Backend
1. Password hashing with bcrypt
2. Timing attack prevention
3. SQL injection prevention
4. CORS validation
5. Rate limiting recommended
6. Regular security audits

---

## Deployment Checklist

### Before Launch
- [ ] Test all authentication flows
- [ ] Test task CRUD operations
- [ ] Test file upload/download
- [ ] Test offline queue (if implemented)
- [ ] Test error handling
- [ ] Test SSL pinning
- [ ] Load test with 1000+ tasks
- [ ] Test on WiFi and cellular
- [ ] Test on iOS 14, 15, 16, 17
- [ ] Test dark mode support
- [ ] Test accessibility features

### In Production
- [ ] Monitor 401 errors (session expiry)
- [ ] Monitor 500 errors (server issues)
- [ ] Monitor upload failures
- [ ] Monitor sync delays
- [ ] Track performance metrics
- [ ] Monitor crash rates
- [ ] Regular security audits

---

## Support & Resources

### Documentation Files
- **API_DOCUMENTATION.md** - Complete specification
- **iOS_IMPLEMENTATION_GUIDE.md** - Swift code examples
- **API_ENDPOINTS_REFERENCE.md** - Quick lookup table

### Server Code
- **server.js** (17,459 lines) - Complete implementation
  - Authentication: lines 4146-4428
  - Tasks: lines 7069-8635
  - Planning: lines 8262-8410
  - Email: lines 1504-2183

### Help Endpoints
- GET `/email-import-help` - Email syntax help
- GET `/api/status` - System status
- GET `/api/version` - Current version

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.15 | Nov 10, 2025 | Complete documentation |
| 1.0.14 | Nov 9, 2025 | UI improvements |
| 1.0.13 | Nov 8, 2025 | Security updates |
| 1.0.12 | Nov 7, 2025 | Bug fixes |

---

## FAQ for iOS Developers

### Q: Do I need to handle session expiry?
**A**: URLSession handles cookies automatically. Just catch 401 errors and prompt re-login.

### Q: Should I cache API responses?
**A**: Cache counts (5 min), lists (1 min). Don't cache tasks or attachments.

### Q: How do I handle offline?
**A**: Queue operations locally, sync when online using batch endpoints.

### Q: What date format should I use?
**A**: ISO 8601 (YYYY-MM-DD for dates, full datetime for timestamps).

### Q: Can I use my own UUID for IDs?
**A**: No, server generates IDs. They're in format: `task_1699627385892_a1b2c3d`

### Q: How do I know when to sync?
**A**: On app launch, after every write operation, and periodically (every 5 mins).

### Q: What about timezone handling?
**A**: Server uses UTC. Convert local time to UTC before sending. Use `TimeZone.current` for offset.

---

## Conclusion

This documentation set provides everything needed to build a robust, feature-complete native iOS client for Tickedify. Start with the iOS_IMPLEMENTATION_GUIDE.md for code examples, reference API_DOCUMENTATION.md for details, and use API_ENDPOINTS_REFERENCE.md as a quick lookup table.

**Happy coding!** 🚀

