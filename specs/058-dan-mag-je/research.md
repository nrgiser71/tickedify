# Research: Account Settings Block

**Feature**: 058-dan-mag-je
**Date**: 2025-11-05
**Status**: Complete

## Research Questions

### 1. Password Reset Token Generation Strategy

**Question**: How to securely generate and store password reset tokens?

**Research Findings**:
- Industry standard: Cryptographically secure random tokens
- Node.js `crypto.randomBytes()` provides sufficient entropy
- Token should be long enough to prevent brute force (32 bytes = 64 hex characters)
- Store hashed version in database (bcrypt or crypto.createHash)

**Decision**: Use `crypto.randomBytes(32).toString('hex')` for token generation
- **Rationale**:
  - Node.js built-in, no extra dependencies
  - Cryptographically secure random number generator
  - 64 character hex string provides 256 bits of entropy
  - Industry standard approach for password reset tokens

- **Implementation Pattern**:
  ```javascript
  const crypto = require('crypto');

  function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Store hashed token in database
  const token = generateResetToken();
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  // Save hashedToken to database, send plain token via email
  ```

**Alternatives Considered**:
- UUID v4: Rejected - less entropy than crypto.randomBytes (122 bits vs 256 bits)
- JWT tokens: Rejected - overkill for single-use reset tokens, adds complexity
- Third-party libraries (nanoid): Rejected - unnecessary dependency

### 2. Password Reset Email Template

**Question**: What content and format should the password reset email contain?

**Decision**: HTML email with clear call-to-action button and security information
- **Content Requirements**:
  - Clear subject line: "Reset your Tickedify password"
  - Personalized greeting with user's name
  - Explanation of why they received the email
  - Prominent reset button with secure link
  - Link expiration time (24 hours)
  - Security notice: "If you didn't request this, ignore this email"
  - Plain text fallback for email clients that don't support HTML

- **Rationale**:
  - HTML improves user experience with clear visual hierarchy
  - Security transparency builds user trust
  - Expiration time manages user expectations
  - Plain text fallback ensures universal compatibility

- **Mailgun Integration**:
  - Use existing Mailgun setup from Tickedify
  - Template variables: `{{userName}}`, `{{resetLink}}`, `{{expiresIn}}`
  - From: `noreply@tickedify.com`
  - Reply-To: `info@tickedify.com` (for support questions)

**Alternatives Considered**:
- Plain text only: Rejected - poor UX, less professional
- External email template service: Rejected - unnecessary cost and complexity
- Inline email template in code: Accepted - simple and maintainable

### 3. Database Schema for Password Reset Tokens

**Question**: How to store password reset tokens with expiration and single-use enforcement?

**Decision**: Create dedicated `password_reset_tokens` table with constraints
- **Schema Design**:
  ```sql
  CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),  -- IPv4/IPv6 support for audit trail
    user_agent TEXT           -- Browser fingerprint for security
  );

  CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
  CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
  ```

- **Rationale**:
  - Separate table keeps users table clean
  - `token_hash` prevents plaintext token exposure in database
  - `expires_at` enables time-based expiration checks
  - `used_at` enforces single-use constraint (NULL = unused)
  - `ip_address` and `user_agent` provide security audit trail
  - CASCADE delete ensures orphaned tokens are cleaned up
  - Indexes optimize lookup by user_id and expiration queries

- **Token Lifecycle**:
  1. User requests reset → generate token, insert row with expires_at = NOW() + 24 hours
  2. User clicks link → verify token_hash exists, not expired, used_at IS NULL
  3. User completes reset → update used_at = NOW(), update users.password
  4. Cleanup job (optional): DELETE FROM password_reset_tokens WHERE expires_at < NOW()

**Alternatives Considered**:
- Store in users table: Rejected - clutters user schema, hard to support multiple pending resets
- Store in session/cache: Rejected - need persistence for email-based workflow
- JWT tokens (stateless): Rejected - can't revoke/invalidate if user changes email

### 4. Rate Limiting for Password Reset Requests

**Question**: How to prevent abuse of password reset endpoint?

**Decision**: Implement per-user rate limiting with 3 requests per hour
- **Implementation Approach**:
  - Query database: COUNT pending tokens for user_id WHERE created_at > NOW() - INTERVAL '1 hour'
  - If count >= 3: return 429 Too Many Requests
  - Simple, no external dependencies (Redis, etc.)

- **Rationale**:
  - Prevents email bombing attacks
  - 3 per hour is generous for legitimate use (forgotten email, typo, etc.)
  - Database-based implementation works for small user base (<500 users)
  - No additional infrastructure required

- **Error Response**:
  ```json
  {
    "error": "Too many reset requests. Please wait before trying again.",
    "retry_after_seconds": 1800
  }
  ```

**Alternatives Considered**:
- No rate limiting: Rejected - vulnerable to abuse
- IP-based limiting: Rejected - problematic for shared IPs (corporate networks, VPN)
- Redis-based limiting: Rejected - overkill for current scale, adds infrastructure

### 5. Account Statistics Calculation

**Question**: How to efficiently calculate total tasks created and completed for display?

**Decision**: Cache statistics in users table, update via triggers
- **Schema Extension**:
  ```sql
  ALTER TABLE users
    ADD COLUMN total_tasks_created INTEGER DEFAULT 0,
    ADD COLUMN total_tasks_completed INTEGER DEFAULT 0,
    ADD COLUMN stats_updated_at TIMESTAMP DEFAULT NOW();
  ```

- **Update Strategy**:
  - Option A: Database trigger on INSERT/UPDATE to `taken` table (automatic)
  - Option B: Increment counters on task creation/completion API calls (manual)
  - **Choice**: Option B for now (simpler, no trigger complexity)

- **Rationale**:
  - Cached counts avoid expensive `COUNT(*)` queries on every Settings page load
  - `stats_updated_at` enables incremental updates or cache invalidation
  - Counters can be recalculated if they drift: `UPDATE users SET total_tasks_created = (SELECT COUNT(*) FROM taken WHERE taken.eigenaar_id = users.id)`

**Alternatives Considered**:
- Real-time COUNT queries: Rejected - slow for users with thousands of tasks
- Materialized view: Rejected - PostgreSQL materialized views require manual refresh
- External analytics system: Rejected - overkill for simple counters

### 6. Last Login Tracking

**Question**: How to track and display last login timestamp?

**Decision**: Update `users.last_login` on every successful authentication
- **Schema Extension**:
  ```sql
  ALTER TABLE users
    ADD COLUMN last_login TIMESTAMP;
  ```

- **Update Logic**:
  - On successful login: `UPDATE users SET last_login = NOW() WHERE id = $1`
  - Display: "Last login: 2 hours ago" (relative time) or "Never" for new accounts

- **Rationale**:
  - Simple single-column approach
  - No need to track login history (that's out of scope for this feature)
  - Relative time display is more user-friendly than absolute timestamp

**Alternatives Considered**:
- Separate login_history table: Rejected - feature doesn't require history, just most recent
- Track current session separately: Rejected - `last_login` is sufficient

## Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token Generation | crypto.randomBytes(32) | Industry standard, 256-bit entropy |
| Token Storage | Hashed (SHA-256) in dedicated table | Security, single-use enforcement |
| Email Template | HTML with plain text fallback | UX, security transparency |
| Rate Limiting | 3 per hour per user (DB-based) | Abuse prevention, simple |
| Account Statistics | Cached counters in users table | Performance, avoid expensive queries |
| Last Login | Single timestamp column | Simple, sufficient for requirement |

## Open Questions (Resolved)

All technical unknowns have been resolved. Functional scope questions (from spec.md NEEDS CLARIFICATION) are design decisions that will be made in conjunction with user feedback:
- Password reset expiration: **24 hours** (industry standard)
- Rate limiting: **3 per hour** (reasonable for legitimate use)
- Block order: **Account above Subscription** (account is more fundamental than billing)
- Task statistics: **Include** (high value, low complexity)
- Security info (password last changed): **Phase 2** (requires password_last_changed column, defer for simplicity)
- Account deletion, data export, storage quota, multi-language: **Out of scope** (defer to future features)

## Next Steps
Proceed to Phase 1: Design & Contracts
- Generate data-model.md from research decisions
- Create OpenAPI contract for account endpoints
- Define quickstart test scenarios
