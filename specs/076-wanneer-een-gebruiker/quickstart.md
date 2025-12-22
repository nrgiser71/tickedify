# Quickstart: Admin Email Notification for Trial Starts

**Feature**: 076-wanneer-een-gebruiker
**Date**: 2025-12-22

## Test Scenario

### Prerequisites
- Access to staging environment (dev.tickedify.com)
- New email address for test registration
- Access to support@tickedify.com inbox (or admin to verify receipt)

### Test Steps

#### 1. Register New User
```
1. Navigate to dev.tickedify.com
2. Click "Registreren" / "Sign Up"
3. Fill in:
   - Email: test-trial-[timestamp]@example.com
   - Name: Test Trial User
   - Password: (valid password)
4. Submit registration
5. You should be redirected to /subscription page
```

#### 2. Select Trial Plan
```
1. On subscription page, select "14 dagen gratis proberen" / "Try 14 days free"
2. Confirm selection
3. You should see success message about trial activation
4. User should be redirected to /app
```

#### 3. Verify Admin Notification
```
1. Check support@tickedify.com inbox
2. Look for email with subject: "Nieuwe Trial Gebruiker voor Tickedify"
3. Verify email contains:
   - User's email address
   - User's name
   - Trial start date (today)
   - Trial end date (14 days from now)
```

### Expected Results

| Step | Expected Outcome |
|------|------------------|
| Registration | User account created, redirected to /subscription |
| Trial Selection | Trial activated, user can access app |
| Admin Email | Email received within 1-2 minutes with correct user data |

### Edge Case Tests

#### Test: Mailgun Unavailable
1. Temporarily invalid Mailgun API key (if possible in staging)
2. Complete trial registration
3. Verify: Trial still activates successfully
4. Verify: Error logged in server console

#### Test: Multiple Trials
1. Register 2-3 test users in quick succession
2. Each selects trial
3. Verify: Separate email received for each user

### API Testing (Alternative)

If UI testing is not available, use direct API calls:

```bash
# 1. Register user
curl -X POST https://dev.tickedify.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-trial@example.com",
    "naam": "Test Trial User",
    "wachtwoord": "SecurePassword123!"
  }'

# 2. Login (get session)
curl -X POST https://dev.tickedify.com/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test-trial@example.com",
    "wachtwoord": "SecurePassword123!"
  }'

# 3. Select trial plan
curl -X POST https://dev.tickedify.com/api/subscription/select \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "planId": "trial_14_days"
  }'
```

### Verification Checklist

- [ ] Trial user can complete registration
- [ ] Trial user can select trial plan
- [ ] Trial is activated successfully
- [ ] Admin receives email notification
- [ ] Email contains correct user information
- [ ] Email has distinct appearance from subscription notifications
- [ ] Trial activation succeeds even if email fails
