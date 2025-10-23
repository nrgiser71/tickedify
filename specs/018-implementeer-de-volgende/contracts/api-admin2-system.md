# API Contract: System Configuration

**Feature**: Admin Dashboard v2
**Date**: 2025-10-18
**Version**: 1.0

## Base Path
All system configuration endpoints are under `/api/admin2/system/`

## Authentication
All endpoints require:
- Valid session cookie with `account_type = 'admin'`
- Returns `401 Unauthorized` if not authenticated
- Returns `403 Forbidden` if not admin

## Endpoints

### GET /api/admin2/system/settings
Get all system settings.

**Request**:
```http
GET /api/admin2/system/settings HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "settings": [
    {
      "key": "onboarding_video_url",
      "value": "https://www.youtube.com/watch?v=abc123",
      "description": "YouTube URL for onboarding video popup",
      "updated_at": "2025-10-15T12:00:00Z"
    },
    {
      "key": "trial_duration_days",
      "value": "14",
      "description": "Default trial period in days",
      "updated_at": "2025-10-01T10:00:00Z"
    }
  ]
}
```

### PUT /api/admin2/system/settings/:key
Update a system setting.

**Request**:
```http
PUT /api/admin2/system/settings/onboarding_video_url HTTP/1.1
Cookie: connect.sid=s%3A...
Content-Type: application/json

{
  "value": "https://www.youtube.com/watch?v=xyz789"
}
```

**Request Body**:
- `value` (required): New setting value (string)

**Response** (200 OK):
```json
{
  "success": true,
  "key": "onboarding_video_url",
  "old_value": "https://www.youtube.com/watch?v=abc123",
  "new_value": "https://www.youtube.com/watch?v=xyz789",
  "updated_at": "2025-10-18T10:30:00Z"
}
```

**Response** (400 Bad Request - invalid URL for onboarding_video_url):
```json
{
  "error": "Invalid value",
  "message": "onboarding_video_url must be a valid YouTube or Vimeo URL"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Setting not found",
  "message": "No setting with key 'unknown_key'"
}
```

### GET /api/admin2/system/payments
Get all payment configurations.

**Request**:
```http
GET /api/admin2/system/payments HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "configurations": [
    {
      "id": 1,
      "plan_id": "premium-monthly",
      "plan_name": "Premium Maandelijks",
      "tier": "premium",
      "checkout_url": "https://pay.mollie.com/checkout/...",
      "price_monthly": 29.99,
      "price_yearly": null,
      "features": ["unlimited_tasks", "email_import", "priority_support"],
      "is_active": true,
      "created_at": "2025-09-01T10:00:00Z",
      "updated_at": "2025-10-01T12:00:00Z"
    },
    {
      "id": 2,
      "plan_id": "enterprise-monthly",
      "plan_name": "Enterprise Maandelijks",
      "tier": "enterprise",
      "checkout_url": "https://pay.mollie.com/checkout/...",
      "price_monthly": 59.99,
      "price_yearly": null,
      "features": ["unlimited_tasks", "email_import", "priority_support", "custom_integrations"],
      "is_active": true,
      "created_at": "2025-09-01T10:00:00Z",
      "updated_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### PUT /api/admin2/system/payments/:id/checkout-url
Update checkout URL for a payment plan.

**Request**:
```http
PUT /api/admin2/system/payments/1/checkout-url HTTP/1.1
Cookie: connect.sid=s%3A...
Content-Type: application/json

{
  "checkout_url": "https://pay.mollie.com/checkout/new_checkout_id"
}
```

**Request Body**:
- `checkout_url` (required): Valid HTTPS URL, must contain 'mollie.com'

**Response** (200 OK):
```json
{
  "success": true,
  "plan_id": "premium-monthly",
  "old_url": "https://pay.mollie.com/checkout/old_checkout_id",
  "new_url": "https://pay.mollie.com/checkout/new_checkout_id",
  "updated_at": "2025-10-18T10:30:00Z"
}
```

**Response** (400 Bad Request - invalid URL):
```json
{
  "error": "Invalid checkout URL",
  "message": "Checkout URL must be HTTPS and contain 'mollie.com' domain"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Payment configuration not found",
  "message": "No configuration with ID 999"
}
```

## Validation Rules

### Onboarding Video URL
```javascript
// Must match YouTube or Vimeo pattern
const youtubePattern = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)[a-zA-Z0-9_-]+/;
const vimeoPattern = /^https:\/\/(www\.)?vimeo\.com\/\d+/;

// Valid examples:
// ✓ https://www.youtube.com/watch?v=abc123
// ✓ https://youtu.be/abc123
// ✓ https://www.youtube-nocookie.com/embed/abc123
// ✓ https://vimeo.com/123456789

// Invalid examples:
// ✗ http://youtube.com/watch?v=abc123 (not HTTPS)
// ✗ https://sketchy-site.com/video (not YouTube/Vimeo)
```

### Checkout URL
```javascript
// Must be HTTPS and contain 'mollie.com'
const isValidCheckoutUrl = (url) => {
  if (!url.startsWith('https://')) return false;
  if (!url.includes('mollie.com')) return false;
  try {
    new URL(url); // Valid URL format
    return true;
  } catch {
    return false;
  }
};

// Valid examples:
// ✓ https://pay.mollie.com/checkout/abcd1234
// ✓ https://checkout.mollie.com/abcd1234

// Invalid examples:
// ✗ http://pay.mollie.com/checkout/abcd1234 (not HTTPS)
// ✗ https://fake-mollie.com/checkout/abcd1234 (not mollie.com)
// ✗ not-a-url (invalid format)
```

## Audit Logging

All system configuration changes are logged:
```json
{
  "admin_user_id": 1,
  "action": "SETTING_UPDATE",
  "setting_key": "onboarding_video_url",
  "old_value": "https://www.youtube.com/watch?v=abc123",
  "new_value": "https://www.youtube.com/watch?v=xyz789",
  "timestamp": "2025-10-18T10:30:00Z",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Specific validation message",
  "field": "checkout_url" // optional, which field failed
}
```

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

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Setting or payment config not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error",
  "message": "Failed to update configuration"
}
```

## Performance
- Get settings: <100ms
- Update setting: <200ms
- Get payments: <150ms
- Update checkout URL: <200ms

## Testing
Test these endpoints with curl:
```bash
# Get all settings
curl -b cookies.txt https://tickedify.com/api/admin2/system/settings

# Update onboarding video URL
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"value":"https://www.youtube.com/watch?v=xyz789"}' \
  https://tickedify.com/api/admin2/system/settings/onboarding_video_url

# Get all payment configurations
curl -b cookies.txt https://tickedify.com/api/admin2/system/payments

# Update checkout URL
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"checkout_url":"https://pay.mollie.com/checkout/new_id"}' \
  https://tickedify.com/api/admin2/system/payments/1/checkout-url
```

## Security Considerations

- **Input Validation**: Always validate URLs on backend (frontend validation can be bypassed)
- **URL Safety**: Verify HTTPS and trusted domains (YouTube, Vimeo, Mollie)
- **Audit Trail**: Log all changes for compliance and debugging
- **Admin Only**: No public access to system configuration endpoints
- **No Secrets in Settings**: Never store API keys or passwords in system_settings (use environment variables)
