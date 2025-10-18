# API Contract: Admin Dashboard Statistics

**Feature**: Admin Dashboard v2
**Date**: 2025-10-18
**Version**: 1.0

## Base Path
All statistics endpoints are under `/api/admin2/stats/`

## Authentication
All endpoints require:
- Valid session cookie with `account_type = 'admin'`
- Returns `401 Unauthorized` if not authenticated
- Returns `403 Forbidden` if not admin

## Endpoints

### GET /api/admin2/stats/home
Get all statistics for home dashboard screen.

**Request**:
```http
GET /api/admin2/stats/home HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "users": {
    "total": 156,
    "active_7d": 42,
    "active_30d": 89,
    "new_today": 3,
    "new_week": 12,
    "new_month": 28,
    "inactive_30d": 67,
    "inactive_60d": 45,
    "inactive_90d": 23
  },
  "subscriptions": {
    "free": 120,
    "premium": 30,
    "enterprise": 6
  },
  "trials": {
    "active": 18,
    "conversion_rate": 23.5
  },
  "recent_registrations": [
    {
      "id": 156,
      "email": "new@example.com",
      "naam": "New User",
      "created_at": "2025-10-18T14:30:00Z",
      "subscription_tier": "free"
    }
    // ... up to 10 most recent
  ]
}
```

### GET /api/admin2/stats/growth
Get user growth data for chart (last 30 days).

**Request**:
```http
GET /api/admin2/stats/growth HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "period": "30d",
  "data": [
    {
      "date": "2025-09-18",
      "new_users": 2,
      "cumulative": 128
    },
    {
      "date": "2025-09-19",
      "new_users": 5,
      "cumulative": 133
    }
    // ... 30 days
  ]
}
```

### GET /api/admin2/stats/tasks
Get task statistics.

**Request**:
```http
GET /api/admin2/stats/tasks HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "total": 5423,
  "completion_rate": 67.8,
  "created": {
    "today": 12,
    "week": 89,
    "month": 342
  }
}
```

### GET /api/admin2/stats/emails
Get email import statistics.

**Request**:
```http
GET /api/admin2/stats/emails HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "total_imports": 1234,
  "imported": {
    "today": 5,
    "week": 34,
    "month": 156
  },
  "users_with_import": {
    "count": 42,
    "percentage": 26.9
  }
}
```

### GET /api/admin2/stats/database
Get database size and table statistics.

**Request**:
```http
GET /api/admin2/stats/database HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "database_size": "245 MB",
  "database_size_bytes": 257048576,
  "tables": [
    {
      "name": "taken",
      "size": "156 MB",
      "size_bytes": 163577856,
      "row_count": 5423
    },
    {
      "name": "users",
      "size": "12 MB",
      "size_bytes": 12582912,
      "row_count": 156
    },
    {
      "name": "email_imports",
      "size": "45 MB",
      "size_bytes": 47185920,
      "row_count": 1234
    }
    // ... all tables
  ]
}
```

### GET /api/admin2/stats/revenue
Get payment and revenue statistics.

**Request**:
```http
GET /api/admin2/stats/revenue HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "mrr": 1250.00,
  "by_tier": [
    {
      "tier": "premium",
      "user_count": 30,
      "price_monthly": 29.99,
      "revenue": 899.70
    },
    {
      "tier": "enterprise",
      "user_count": 6,
      "price_monthly": 59.99,
      "revenue": 359.94
    }
  ],
  "payment_configs": [
    {
      "plan_id": "premium-monthly",
      "plan_name": "Premium Maandelijks",
      "tier": "premium",
      "checkout_url": "https://pay.mollie.com/checkout/...",
      "price_monthly": 29.99,
      "is_active": true
    }
    // ... all configs
  ]
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Not authenticated",
  "message": "Please login as admin"
}
```

### 403 Forbidden
```json
{
  "error": "Not authorized",
  "message": "Admin access required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database error",
  "message": "Failed to fetch statistics"
}
```

## Performance
- Target response time: <200ms
- Caching: Client can cache for 30 seconds
- Rate limit: None (admin only, low traffic)

## Testing
Test these endpoints with:
```bash
# Home stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/home

# Growth data
curl -b cookies.txt https://tickedify.com/api/admin2/stats/growth

# Task stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/tasks

# Email stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/emails

# Database stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/database

# Revenue stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/revenue
```
