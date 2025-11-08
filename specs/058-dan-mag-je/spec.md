# Feature Specification: Account Settings Block

**Feature Branch**: `058-dan-mag-je`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "Dan mag je nu een blok toevoegen voor de account. Daar moet dezelfde informatie staan als bovenaan in de sidebar (zonder het emailadres en bijhorende knoppen). Maar er moet wel een knop staan om het paswoord te resetten. Heb jij nog ideeën om aan het account blok toe te voegen?"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature: Add account information block to Settings screen
2. Extract key concepts from description
   ’ Show user info from sidebar (name only, no email/buttons)
   ’ Add password reset functionality
   ’ Suggest additional account features
3. For each unclear aspect:
   ’ Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   ’ User views account info, initiates password reset
5. Generate Functional Requirements
   ’ Each requirement must be testable
   ’ Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   ’ If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a logged-in user, I want to view my account information and manage my account settings in one centralized location within the Settings screen, so I can easily access my profile details and security options without navigating to multiple places.

### Acceptance Scenarios
1. **Given** a user is logged in and opens the Settings screen, **When** they view the Account section, **Then** they see their full name, account created date, last login timestamp, and a "Reset Password" button
2. **Given** a user views their account information, **When** they click the "Reset Password" button, **Then** they receive a password reset email and see a confirmation message
3. **Given** a user has requested a password reset, **When** they check their email, **Then** they receive a reset link that expires after 24 hours
4. **Given** a user wants to understand their account status, **When** they view the Account block, **Then** they see how long they've been using Tickedify (account age)

### Edge Cases
- What happens when a user clicks "Reset Password" multiple times in quick succession? (Rate limiting)
- How does the system handle expired password reset links?
- What information is shown for newly created accounts (same day registration)?
- Should there be a visual indicator when password was last changed?

---

## Requirements *(mandatory)*

### Functional Requirements

**Display Requirements:**
- **FR-001**: System MUST display the user's full name in the Account block
- **FR-002**: System MUST display the account creation date in a readable format (e.g., "Member since October 2025")
- **FR-003**: System MUST display the last login timestamp (e.g., "Last login: 2 hours ago" or "Last login: November 5, 2025 at 14:30")
- **FR-004**: System MUST NOT display the user's email address in the Account block (as specified by user)
- **FR-005**: System MUST NOT include logout functionality in the Account block (remains in sidebar only)

**Password Reset Requirements:**
- **FR-006**: System MUST provide a clearly labeled "Reset Password" button in the Account block
- **FR-007**: System MUST send a password reset email when the button is clicked
- **FR-008**: Password reset emails MUST include a secure, single-use token link
- **FR-009**: Password reset links MUST expire after [NEEDS CLARIFICATION: expiration time - suggest 24 hours, is this acceptable?]
- **FR-010**: System MUST display a success toast notification after sending reset email: "Password reset email sent. Check your inbox."
- **FR-011**: System MUST [NEEDS CLARIFICATION: Should there be rate limiting on reset requests? Suggest max 3 per hour per user]

**Additional Account Features (Suggestions):**
- **FR-012**: System SHOULD display total number of tasks created by the user (lifetime statistics)
- **FR-013**: System SHOULD display total number of completed tasks (productivity metric)
- **FR-014**: System SHOULD provide a "Delete Account" option with confirmation dialog [NEEDS CLARIFICATION: Is account deletion required? What happens to user data?]
- **FR-015**: System SHOULD provide an "Export My Data" button to download all user tasks and settings [NEEDS CLARIFICATION: Is data export required for GDPR compliance?]
- **FR-016**: System SHOULD display account storage usage (e.g., "Storage used: 2.4 MB / 100 MB") [NEEDS CLARIFICATION: Is there a storage quota per user?]
- **FR-017**: System SHOULD provide option to change display language [NEEDS CLARIFICATION: Is multi-language support planned?]
- **FR-018**: System SHOULD show when password was last changed (security transparency)

**Visual Consistency:**
- **FR-019**: Account block MUST follow the same visual design patterns as the Subscription block (consistent padding, borders, typography)
- **FR-020**: Account block MUST be positioned [NEEDS CLARIFICATION: Should Account block appear above or below Subscription block?]

### Key Entities *(include if feature involves data)*

- **User Account**: Contains user identification (name), account lifecycle dates (created_at, last_login), security metadata (password_last_changed), and usage statistics (task counts)
- **Password Reset Token**: Temporary security token with expiration timestamp, one-time use flag, and association to user account
- **Account Statistics**: Aggregated metrics including total tasks created, completed tasks count, storage usage

---

## Clarification Questions for User

1. **Password Reset Expiration**: Should reset links expire after 24 hours, or different timeframe?
2. **Rate Limiting**: Should we limit password reset requests (e.g., max 3 per hour)?
3. **Account Deletion**: Should users be able to delete their account? What happens to their data?
4. **Data Export**: Should users be able to export all their data (GDPR compliance)?
5. **Storage Quota**: Is there a storage limit per user account?
6. **Multi-Language**: Is language selection needed, or English-only for now?
7. **Block Order**: Should Account appear above or below the Subscription block?
8. **Task Statistics**: Would users find lifetime task counts (created/completed) valuable?
9. **Security Info**: Should we show when password was last changed?

---

## Suggested Additional Features (Optional Discussion)

### High Value Additions
- **Account Activity Log**: Show recent security-relevant actions (login history, password changes)
- **Two-Factor Authentication**: Enable 2FA setup within Account block
- **Connected Devices**: Show list of devices/browsers currently logged in
- **Email Preferences**: Control which notification emails to receive

### Low Priority Additions
- **Profile Picture Upload**: Replace default avatar icon with custom image
- **Display Name vs Full Name**: Allow users to set a display name different from legal name
- **Timezone Selection**: Override automatic timezone detection
- **Account Badge**: Show "Beta Tester" or "Pro User" badges

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (9 clarifications needed)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (Account block only, no other Settings changes)
- [x] Dependencies identified (requires existing Settings screen infrastructure from Feature 056)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (show name, hide email, add password reset, suggest features)
- [x] Ambiguities marked (9 NEEDS CLARIFICATION questions)
- [x] User scenarios defined (4 scenarios with edge cases)
- [x] Requirements generated (20 requirements with suggestions)
- [x] Entities identified (User Account, Password Reset Token, Account Statistics)
- [ ] Review checklist passed (awaiting clarification answers)

---

**Next Step**: User should review the 9 clarification questions and provide answers to proceed with `/plan` command.
